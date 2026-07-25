package crmcalendar

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/emersion/go-ical"
	"github.com/emersion/go-webdav/caldav"
)

// basicAuthTransport adds HTTP Basic Authentication to every request.
type basicAuthTransport struct {
	username string
	password string
}

func (t *basicAuthTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if t.username != "" && t.password != "" {
		auth := base64.StdEncoding.EncodeToString([]byte(t.username + ":" + t.password))
		req.Header.Set("Authorization", "Basic "+auth)
	}
	return http.DefaultTransport.RoundTrip(req)
}

type SyncService struct {
	repo *Repository
}

func NewSyncService(repo *Repository) *SyncService {
	return &SyncService{repo: repo}
}

func (s *SyncService) SyncAccount(ctx context.Context, acct *CalendarAccount) error {
	log.Printf("Syncing calendar for %s (provider: %s)", acct.Email, acct.Provider)

	httpClient := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &basicAuthTransport{
			username: acct.CalDAVUsername,
			password: acct.CalDAVPassword,
		},
	}
	client, err := caldav.NewClient(httpClient, acct.CalDAVURL)
	if err != nil {
		return fmt.Errorf("caldav client: %w", err)
	}

	principal := "/"
	homeSet, err := client.FindCalendarHomeSet(ctx, principal)
	if err != nil {
		homeSet, err = client.FindCalendarHomeSet(ctx, acct.CalDAVURL)
		if err != nil {
			return fmt.Errorf("find home set: %w", err)
		}
	}

	calendars, err := client.FindCalendars(ctx, homeSet)
	if err != nil {
		return fmt.Errorf("find calendars: %w", err)
	}

	for _, cal := range calendars {
		log.Printf("  Syncing calendar: %s", cal.Path)
		if err := s.syncCalendar(ctx, client, cal.Path, acct); err != nil {
			log.Printf("  Error syncing %s: %v", cal.Path, err)
		}
	}

	s.repo.UpdateLastSync(ctx, acct.ID)
	return nil
}

func (s *SyncService) syncCalendar(ctx context.Context, client *caldav.Client, calendarPath string, acct *CalendarAccount) error {
	from := time.Now().AddDate(0, -1, 0)
	to := time.Now().AddDate(0, 3, 0)

	query := &caldav.CalendarQuery{
		CompRequest: caldav.CalendarCompRequest{
			Name:     "VCALENDAR",
			AllProps: true,
			AllComps: true,
		},
		CompFilter: caldav.CompFilter{
			Name:  "VCALENDAR",
			Start: from,
			End:   to,
			Comps: []caldav.CompFilter{
				{Name: "VEVENT", Start: from, End: to},
			},
		},
	}

	objects, err := client.QueryCalendar(ctx, calendarPath, query)
	if err != nil {
		return fmt.Errorf("query calendar: %w", err)
	}

	for _, obj := range objects {
		if obj.Data == nil {
			continue
		}
		ev, err := s.parseEvent(obj.Data, acct)
		if err != nil {
			log.Printf("  Error parsing event: %v", err)
			continue
		}
		if ev != nil {
			ev.ContactID = s.findMatchingContact(ctx, acct.BusinessID, ev.Title, ev.Description)
			if err := s.repo.UpsertEvent(ctx, ev); err != nil {
				log.Printf("  Error saving event: %v", err)
			}
		}
	}
	return nil
}

func (s *SyncService) parseEvent(cal *ical.Calendar, acct *CalendarAccount) (*CalendarEvent, error) {
	for _, comp := range cal.Children {
		if comp.Name != ical.CompEvent {
			continue
		}

		ev := &CalendarEvent{
			AccountID:  acct.ID,
			BusinessID: acct.BusinessID,
		}

		if p := comp.Props.Get(ical.PropUID); p != nil {
			ev.UID = p.Value
		}
		if p := comp.Props.Get(ical.PropSummary); p != nil {
			ev.Title = p.Value
		}
		if p := comp.Props.Get(ical.PropDescription); p != nil {
			ev.Description = p.Value
		}
		if p := comp.Props.Get(ical.PropLocation); p != nil {
			ev.Location = p.Value
		}

		status := ""
		if p := comp.Props.Get(ical.PropStatus); p != nil {
			status = strings.ToLower(p.Value)
		}
		if status == "" {
			ev.Status = "confirmed"
		} else {
			ev.Status = status
		}

		st, err := comp.Props.DateTime(ical.PropDateTimeStart, time.UTC)
		if err == nil {
			ev.StartTime = st
		}
		et, err := comp.Props.DateTime(ical.PropDateTimeEnd, time.UTC)
		if err == nil {
			ev.EndTime = et
		}

		if ev.StartTime.IsZero() {
			continue
		}
		if ev.EndTime.IsZero() {
			ev.EndTime = ev.StartTime.Add(1 * time.Hour)
		}

		// Check all-day: value has no time component
		if p := comp.Props.Get(ical.PropDateTimeStart); p != nil && p.Value != "" {
			ev.IsAllDay = !strings.Contains(p.Value, "T")
		}

		return ev, nil
	}
	return nil, nil
}

func (s *SyncService) findMatchingContact(ctx context.Context, businessID, title, description string) *string {
	text := strings.ToLower(title + " " + description)
	if text == "" {
		return nil
	}
	var contactID string
	err := s.repo.db.QueryRow(ctx,
		`SELECT id FROM crm_contacts WHERE business_id = $1 AND (LOWER(name) LIKE '%' || $2 || '%' OR LOWER(email) LIKE '%' || $2 || '%') LIMIT 1`,
		businessID, text).Scan(&contactID)
	if err != nil {
		return nil
	}
	return &contactID
}
