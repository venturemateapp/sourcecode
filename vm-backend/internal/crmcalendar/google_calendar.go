package crmcalendar

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	calendar "google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

// GoogleCalendarSync syncs events from Google Calendar using OAuth tokens stored in oauth_tokens.
type GoogleCalendarSync struct {
	repo     *Repository
	clientID string
	secret   string
}

// StoredToken matches the oauth_tokens table structure.
type StoredToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	Expiry       string `json:"expiry"`
}

func NewGoogleCalendarSync(repo *Repository) *GoogleCalendarSync {
	// Try to load credentials from the same google-credentials.json used for signup
	credsPath := os.Getenv("GOOGLE_CREDENTIALS_PATH")
	if credsPath == "" {
		credsPath = "config/google-credentials.json"
	}
	clientID, secret := "", ""
	if b, err := os.ReadFile(credsPath); err == nil {
		var c struct {
			Web struct {
				ClientID     string `json:"client_id"`
				ClientSecret string `json:"client_secret"`
			} `json:"web"`
		}
		if json.Unmarshal(b, &c) == nil {
			clientID = c.Web.ClientID
			secret = c.Web.ClientSecret
		}
	}
	return &GoogleCalendarSync{repo: repo, clientID: clientID, secret: secret}
}

// SyncEventsForUser fetches Google Calendar events for a user and stores them in crm_events.
func (g *GoogleCalendarSync) SyncEventsForUser(ctx context.Context, userID, businessID, email, accessToken, refreshToken string) error {
	if g.clientID == "" || g.secret == "" {
		return fmt.Errorf("Google OAuth credentials not configured")
	}

	// Create or reuse a Google Calendar account entry
	accounts, err := g.repo.ListAccounts(ctx, businessID)
	if err != nil {
		return fmt.Errorf("list accounts: %w", err)
	}
	var accountID string
	for _, a := range accounts {
		if a.Provider == "google-calendar" {
			accountID = a.ID
			break
		}
	}
	if accountID == "" {
		acct := &CalendarAccount{
			UserID:     userID,
			BusinessID: businessID,
			Email:      email,
			Provider:   "google-calendar",
		}
		if err := g.repo.CreateAccount(ctx, acct); err != nil {
			return fmt.Errorf("create google calendar account: %w", err)
		}
		accountID = acct.ID
	}

	// Create OAuth2 token
	tok := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
	}
	config := &oauth2.Config{
		ClientID:     g.clientID,
		ClientSecret: g.secret,
		Endpoint:     google.Endpoint,
		Scopes:       []string{calendar.CalendarScope},
	}

	client := config.Client(ctx, tok)
	srv, err := calendar.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return fmt.Errorf("create calendar service: %w", err)
	}

	// List all calendars
	calList, err := srv.CalendarList.List().Do()
	if err != nil {
		return fmt.Errorf("list calendars: %w", err)
	}

	totalEvents := 0
	for _, cal := range calList.Items {
		if cal.Deleted {
			continue
		}
		now := time.Now()
		minTime := now.AddDate(0, -1, 0).Format(time.RFC3339)
		maxTime := now.AddDate(0, 3, 0).Format(time.RFC3339)

		events, err := srv.Events.List(cal.Id).
			TimeMin(minTime).
			TimeMax(maxTime).
			SingleEvents(true).
			OrderBy("startTime").
			Do()
		if err != nil {
			log.Printf("Failed to list events for calendar %s: %v", cal.Summary, err)
			continue
		}

		for _, event := range events.Items {
			if event.Status == "cancelled" {
				continue
			}

			startTime := parseGoogleTime(event.Start)
			endTime := parseGoogleTime(event.End)
			isAllDay := event.Start != nil && event.Start.Date != "" && event.Start.DateTime == ""

			calEvent := &CalendarEvent{
				AccountID:   accountID,
				BusinessID:  businessID,
				UID:         event.ICalUID,
				Title:       event.Summary,
				Description: event.Description,
				Location:    event.Location,
				StartTime:   startTime,
				EndTime:     endTime,
				IsAllDay:    isAllDay,
				Status:      event.Status,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}

			if err := g.repo.UpsertEvent(ctx, calEvent); err != nil {
				log.Printf("Failed to upsert event %s: %v", event.Id, err)
			}
			totalEvents++
		}
	}

	g.repo.UpdateLastSync(ctx, accountID)
	log.Printf("Synced %d events from Google Calendar for user %s", totalEvents, userID)
	return nil
}

func parseGoogleTime(gt *calendar.EventDateTime) time.Time {
	if gt == nil {
		return time.Now()
	}
	if gt.DateTime != "" {
		t, err := time.Parse(time.RFC3339, gt.DateTime)
		if err == nil {
			return t
		}
	}
	if gt.Date != "" {
		t, err := time.Parse("2006-01-02", gt.Date)
		if err == nil {
			return t
		}
	}
	return time.Now()
}
