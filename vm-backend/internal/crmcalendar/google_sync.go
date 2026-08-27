package crmcalendar

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// googleTokenRow mirrors the oauth_tokens row for a google-calendar token.
type googleTokenRow struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    *time.Time
}

// getGoogleToken loads the stored google-calendar OAuth token for a user.
func (s *SyncService) getGoogleToken(ctx context.Context, userID string) (*googleTokenRow, error) {
	var row googleTokenRow
	var expiresAt *time.Time
	err := s.repo.db.QueryRow(ctx,
		`SELECT access_token, refresh_token, expires_at FROM oauth_tokens
		 WHERE user_id = $1 AND provider = 'google-calendar' ORDER BY updated_at DESC LIMIT 1`,
		userID).Scan(&row.AccessToken, &row.RefreshToken, &expiresAt)
	if err != nil {
		return nil, fmt.Errorf("load google token: %w", err)
	}
	row.ExpiresAt = expiresAt
	return &row, nil
}

// refreshGoogleToken exchanges the refresh token for a fresh access token.
func (s *SyncService) refreshGoogleToken(ctx context.Context, userID string, row *googleTokenRow) error {
	credsPath := os.Getenv("GOOGLE_CREDENTIALS_PATH")
	if credsPath == "" {
		credsPath = "config/google-credentials.json"
	}
	b, err := os.ReadFile(credsPath)
	if err != nil {
		return fmt.Errorf("read google credentials: %w", err)
	}
	var creds struct {
		Web struct {
			ClientID     string   `json:"client_id"`
			ClientSecret string   `json:"client_secret"`
			RedirectURIs []string `json:"redirect_uris"`
		} `json:"web"`
	}
	if err := json.Unmarshal(b, &creds); err != nil {
		return fmt.Errorf("parse google credentials: %w", err)
	}
	cfg := &oauth2.Config{
		ClientID:     creds.Web.ClientID,
		ClientSecret: creds.Web.ClientSecret,
		RedirectURL:  "https://venturemate.net/auth/google/callback",
		Scopes:       []string{"https://www.googleapis.com/auth/calendar"},
		Endpoint:     google.Endpoint,
	}
	tok := &oauth2.Token{AccessToken: row.AccessToken, RefreshToken: row.RefreshToken, Expiry: time.Now().Add(-time.Hour)}
	src := cfg.TokenSource(ctx, tok)
	newTok, err := src.Token()
	if err != nil {
		return fmt.Errorf("refresh google token: %w", err)
	}
	row.AccessToken = newTok.AccessToken
	if newTok.RefreshToken != "" {
		row.RefreshToken = newTok.RefreshToken
	}
	// Persist the refreshed token so future syncs reuse it.
	now := time.Now()
	_, _ = s.repo.db.Exec(ctx,
		`UPDATE oauth_tokens SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
		 WHERE user_id = $4 AND provider = 'google-calendar'`,
		row.AccessToken, row.RefreshToken, now.Add(time.Hour), userID)
	return nil
}

// syncGoogleCalendar pulls events from the Google Calendar v3 API using the
// stored OAuth token (refreshing it when needed).
func (s *SyncService) syncGoogleCalendar(ctx context.Context, acct *CalendarAccount) error {
	tok, err := s.getGoogleToken(ctx, acct.UserID)
	if err != nil {
		return fmt.Errorf("google sync for %s: %w", acct.Email, err)
	}
	if tok.ExpiresAt == nil || time.Now().After(*tok.ExpiresAt) {
		if tok.RefreshToken == "" {
			return fmt.Errorf("google token for %s has no refresh token — reconnect the calendar", acct.Email)
		}
		if err := s.refreshGoogleToken(ctx, acct.UserID, tok); err != nil {
			return fmt.Errorf("refresh token for %s: %w", acct.Email, err)
		}
	}

	timeMin := time.Now().AddDate(0, -1, 0).Format(time.RFC3339)
	timeMax := time.Now().AddDate(0, 3, 0).Format(time.RFC3339)
	apiURL := "https://www.googleapis.com/calendar/v3/calendars/" + url.QueryEscape("primary") +
		"/events?timeMin=" + url.QueryEscape(timeMin) +
		"&timeMax=" + url.QueryEscape(timeMax) +
		"&singleEvents=true&maxResults=250&orderBy=startTime"

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return fmt.Errorf("build google request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)

	httpClient := &http.Client{Timeout: 30 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("google api request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 5<<20))
	if err != nil {
		return fmt.Errorf("read google response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		// Token may have expired mid-flight — one retry after refresh.
		if resp.StatusCode == http.StatusUnauthorized && tok.RefreshToken != "" {
			if rerr := s.refreshGoogleToken(ctx, acct.UserID, tok); rerr == nil {
				req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
				resp2, err2 := httpClient.Do(req)
				if err2 == nil {
					defer resp2.Body.Close()
					body2, err2 := io.ReadAll(io.LimitReader(resp2.Body, 5<<20))
					if err2 == nil && resp2.StatusCode == http.StatusOK {
						body = body2
					} else if err2 == nil {
						return fmt.Errorf("google api retry: %d %s", resp2.StatusCode, truncate(string(body2), 300))
					}
				}
			}
		}
		return fmt.Errorf("google api: %d %s", resp.StatusCode, truncate(string(body), 300))
	}

	var payload struct {
		Items []struct {
			ID          string `json:"id"`
			Summary     string `json:"summary"`
			Description string `json:"description"`
			Location    string `json:"location"`
			Status      string `json:"status"`
			Start       struct {
				DateTime string `json:"dateTime"`
				Date     string `json:"date"`
			} `json:"start"`
			End struct {
				DateTime string `json:"dateTime"`
				Date     string `json:"date"`
			} `json:"end"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return fmt.Errorf("parse google events: %w", err)
	}

	count := 0
	for _, item := range payload.Items {
		ev := &CalendarEvent{
			AccountID:   acct.ID,
			BusinessID:  acct.BusinessID,
			UID:         item.ID,
			Title:       item.Summary,
			Description: item.Description,
			Location:    item.Location,
			Status:      item.Status,
		}
		if ev.Status == "" {
			ev.Status = "confirmed"
		}
		if item.Start.DateTime != "" {
			t, err := time.Parse(time.RFC3339, item.Start.DateTime)
			if err == nil {
				ev.StartTime = t.UTC()
			}
		} else if item.Start.Date != "" {
			t, err := time.Parse("2006-01-02", item.Start.Date)
			if err == nil {
				ev.StartTime = t.UTC()
				ev.IsAllDay = true
			}
		}
		if item.End.DateTime != "" {
			t, err := time.Parse(time.RFC3339, item.End.DateTime)
			if err == nil {
				ev.EndTime = t.UTC()
			}
		} else if item.End.Date != "" {
			t, err := time.Parse("2006-01-02", item.End.Date)
			if err == nil {
				ev.EndTime = t.UTC()
			}
		}
		if ev.StartTime.IsZero() {
			continue
		}
		if ev.EndTime.IsZero() {
			ev.EndTime = ev.StartTime.Add(1 * time.Hour)
		}
		ev.ContactID = s.findMatchingContact(ctx, acct.BusinessID, ev.Title, ev.Description)
		if err := s.repo.UpsertEvent(ctx, ev); err != nil {
			log.Printf("  Error saving google event %q: %v", ev.Title, err)
			continue
		}
		count++
	}
	log.Printf("  Google sync for %s: %d events", acct.Email, count)
	s.repo.UpdateLastSync(ctx, acct.ID)
	return nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return strings.TrimSpace(s[:n]) + "..."
}
