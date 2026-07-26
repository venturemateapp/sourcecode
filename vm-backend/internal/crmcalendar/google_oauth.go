package crmcalendar

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleCalendarOAuth struct {
	config   *oauth2.Config
	tokenRepo *TokenRepository
	frontendURL string
}

// TokenRepository allows storing OAuth tokens without importing the oauth package.
type TokenRepository struct {
	db *pgxpool.Pool
}

func NewTokenRepository(db *pgxpool.Pool) *TokenRepository {
	return &TokenRepository{db: db}
}

func (r *TokenRepository) SaveCalendarToken(ctx context.Context, userID, accessToken, refreshToken, email string) error {
	query := `INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, token_type, scope, provider_email, created_at, updated_at)
	          VALUES ($1, $2, 'google-calendar', $3, $4, 'Bearer', 'https://www.googleapis.com/auth/calendar', $5, NOW(), NOW())
	          ON CONFLICT (user_id, provider) DO UPDATE SET
	            access_token = $3, refresh_token = $4, provider_email = $5, updated_at = NOW()`
	_, err := r.db.Exec(ctx, query, uuid.New().String(), userID, accessToken, refreshToken, email)
	return err
}

func NewGoogleCalendarOAuth(db *pgxpool.Pool, frontendURL string) *GoogleCalendarOAuth {
	credsPath := os.Getenv("GOOGLE_CREDENTIALS_PATH")
	if credsPath == "" {
		credsPath = "config/google-credentials.json"
	}
	b, err := os.ReadFile(credsPath)
	if err != nil {
		log.Printf("Failed to read google credentials for calendar OAuth: %v", err)
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
		log.Printf("Failed to parse google credentials: %v", err)
		return &GoogleCalendarOAuth{}
	}
	redirectURL := "https://venturemate.net/auth/google/calendar/callback"
	for _, u := range creds.Web.RedirectURIs {
		if u == redirectURL {
			redirectURL = u
			break
		}
	}
	config := &oauth2.Config{
		ClientID:     creds.Web.ClientID,
		ClientSecret: creds.Web.ClientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"https://www.googleapis.com/auth/calendar"},
		Endpoint:     google.Endpoint,
	}
	return &GoogleCalendarOAuth{
		config:      config,
		tokenRepo:   NewTokenRepository(db),
		frontendURL: frontendURL,
	}
}

func (g *GoogleCalendarOAuth) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if g.config == nil {
		http.Error(w, "Google Calendar OAuth not configured", http.StatusInternalServerError)
		return
	}
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId required", http.StatusBadRequest)
		return
	}
	state := userID // encode userID in state for callback
	url := g.config.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (g *GoogleCalendarOAuth) CallbackHandler(w http.ResponseWriter, r *http.Request) {
	if g.config == nil {
		http.Error(w, "Calendar OAuth not configured", http.StatusInternalServerError)
		return
	}
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		http.Error(w, "Missing code or state", http.StatusBadRequest)
		return
	}
	userID := state
	tok, err := g.config.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, "Token exchange failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// Get user email from Google
	email := ""
	client := g.config.Client(context.Background(), tok)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err == nil {
		defer resp.Body.Close()
		var info struct {
			Email string `json:"email"`
		}
		json.NewDecoder(resp.Body).Decode(&info)
		email = info.Email
	}
	// Save token
	refreshToken := tok.RefreshToken
	if refreshToken == "" {
		// If no refresh token was returned, we can still use the access token (short-lived)
		refreshToken = ""
	}
	if err := g.tokenRepo.SaveCalendarToken(context.Background(), userID, tok.AccessToken, refreshToken, email); err != nil {
		log.Printf("Failed to save calendar token: %v", err)
		http.Error(w, "Failed to save token", http.StatusInternalServerError)
		return
	}
	// Redirect to frontend with success
	redirectURL := fmt.Sprintf("%s/vm/auth/oauth/callback?provider=google-calendar&success=true", g.frontendURL)
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}
