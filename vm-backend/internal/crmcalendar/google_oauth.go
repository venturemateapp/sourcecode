package crmcalendar

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// GoogleCalendarOAuth handles OAuth for Google Calendar using the same
// google-credentials.json that the signup flow uses (no extra env vars needed).
type GoogleCalendarOAuth struct {
	config   *oauth2.Config
	tokenDB  *pgxpool.Pool
	frontend string
}

func NewGoogleCalendarOAuth(db *pgxpool.Pool, frontendURL string) *GoogleCalendarOAuth {
	credsPath := os.Getenv("GOOGLE_CREDENTIALS_PATH")
	if credsPath == "" {
		credsPath = "config/google-credentials.json"
	}
	b, err := os.ReadFile(credsPath)
	if err != nil {
		log.Printf("Cannot read google credentials for calendar OAuth: %v", err)
		return &GoogleCalendarOAuth{}
	}
	var creds struct {
		Web struct {
			ClientID     string   `json:"client_id"`
			ClientSecret string   `json:"client_secret"`
			RedirectURIs []string `json:"redirect_uris"`
		} `json:"web"`
	}
	if err := json.Unmarshal(b, &creds); err != nil {
		log.Printf("Cannot parse google credentials: %v", err)
		return &GoogleCalendarOAuth{}
	}
	// Use the SAME redirect URI as the signup flow (must match Google Cloud Console)
	redirectURL := "https://venturemate.net/auth/google/callback"
	config := &oauth2.Config{
		ClientID:     creds.Web.ClientID,
		ClientSecret: creds.Web.ClientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"https://www.googleapis.com/auth/calendar"},
		Endpoint:     google.Endpoint,
	}
	return &GoogleCalendarOAuth{config: config, tokenDB: db, frontend: frontendURL}
}

func (g *GoogleCalendarOAuth) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if g.config == nil {
		http.Error(w, "Google Calendar OAuth not configured — check google-credentials.json", http.StatusInternalServerError)
		return
	}
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId required", http.StatusBadRequest)
		return
	}
	// State encodes the flow type + userID so the callback can distinguish flows
	state := "calendar:" + userID
	url := g.config.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// HandleCallback is called from the shared /auth/google/callback endpoint
// when the state starts with "calendar:".
func (g *GoogleCalendarOAuth) HandleCallback(w http.ResponseWriter, r *http.Request, code, state string) {
	if g.config == nil {
		http.Error(w, "Calendar OAuth not configured", http.StatusInternalServerError)
		return
	}
	userID := state
	if len(userID) > 9 && userID[:9] == "calendar:" {
		userID = userID[9:]
	}
	if code == "" || userID == "" {
		http.Error(w, "Missing code or state", http.StatusBadRequest)
		return
	}
	tok, err := g.config.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, "Token exchange failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// Get user email
	email := ""
	client := g.config.Client(context.Background(), tok)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err == nil {
		defer resp.Body.Close()
		var info struct{ Email string `json:"email"` }
		json.NewDecoder(resp.Body).Decode(&info)
		email = info.Email
	}
	// Save token
	query := `INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, token_type, scope, provider_email, created_at, updated_at)
	          VALUES ($1, $2, 'google-calendar', $3, $4, 'Bearer', 'https://www.googleapis.com/auth/calendar', $5, NOW(), NOW())
	          ON CONFLICT (user_id, provider) DO UPDATE SET
	            access_token = $3, refresh_token = $4, provider_email = $5, updated_at = NOW()`
	if _, err := g.tokenDB.Exec(context.Background(), query, uuid.New().String(), userID, tok.AccessToken, tok.RefreshToken, email); err != nil {
		log.Printf("Failed to save calendar token: %v", err)
	}
	// Redirect to calendar page
	http.Redirect(w, r, g.frontend+"/vm/calendar?google=connected", http.StatusTemporaryRedirect)
}
