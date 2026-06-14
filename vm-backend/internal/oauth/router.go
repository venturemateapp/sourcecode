package oauth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/venturemate/vmbackend/internal/users"
	"golang.org/x/oauth2"
)

type OAuthManager struct {
	repo         *Repository
	userRepo     *users.Repository
	jwtSecret    string
	frontendURL  string
	redirectBase string
}

func NewOAuthManager(repo *Repository, userRepo *users.Repository, jwtSecret, frontendURL, redirectBase string) *OAuthManager {
	return &OAuthManager{
		repo:         repo,
		userRepo:     userRepo,
		jwtSecret:    jwtSecret,
		frontendURL:  frontendURL,
		redirectBase: redirectBase,
	}
}

func (m *OAuthManager) getOAuthConfig(providerName string) (*oauth2.Config, error) {
	cfg, ok := ProviderConfigs[providerName]
	if !ok {
		return nil, fmt.Errorf("unknown provider: %s", providerName)
	}

	redirectURL := m.redirectBase + "/auth/oauth/" + providerName + "/callback"

	return &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  redirectURL,
		Scopes:       cfg.Scopes,
		Endpoint:     cfg.Endpoint,
	}, nil
}

func generateNonce() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (m *OAuthManager) generateState(userID, provider string) string {
	nonce := generateNonce()
	data := userID + ":" + provider + ":" + nonce
	mac := hmac.New(sha256.New, []byte(m.jwtSecret))
	mac.Write([]byte(data))
	sig := hex.EncodeToString(mac.Sum(nil))
	return base64.URLEncoding.EncodeToString([]byte(data + ":" + sig))
}

func (m *OAuthManager) verifyState(state string) (userID, provider string, ok bool) {
	decoded, err := base64.URLEncoding.DecodeString(state)
	if err != nil || len(decoded) < 1 {
		return "", "", false
	}

	parts := strings.Split(string(decoded), ":")
	if len(parts) < 4 {
		return "", "", false
	}

	userID = parts[0]
	provider = parts[1]
	expectedSig := parts[len(parts)-1]
	data := strings.Join(parts[:len(parts)-1], ":")

	mac := hmac.New(sha256.New, []byte(m.jwtSecret))
	mac.Write([]byte(data))
	actualSig := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expectedSig), []byte(actualSig)) {
		return "", "", false
	}

	return userID, provider, true
}

func (m *OAuthManager) LoginHandler(w http.ResponseWriter, r *http.Request) {
	providerName := strings.TrimPrefix(r.URL.Path, "/auth/oauth/")
	providerName = strings.TrimSuffix(providerName, "/login")

	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "missing userId query param", http.StatusBadRequest)
		return
	}

	cfg, err := m.getOAuthConfig(providerName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if cfg.ClientID == "" {
		http.Error(w, providerName+" OAuth not configured — set OAUTH_* env vars", http.StatusInternalServerError)
		return
	}

	state := m.generateState(userID, providerName)
	url := cfg.AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (m *OAuthManager) CallbackHandler(w http.ResponseWriter, r *http.Request) {
	providerName := strings.TrimPrefix(r.URL.Path, "/auth/oauth/")
	providerName = strings.TrimSuffix(providerName, "/callback")

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" {
		m.redirectError(w, r, providerName, "missing authorization code")
		return
	}

	userID, stateProvider, ok := m.verifyState(state)
	if !ok || stateProvider != providerName {
		m.redirectError(w, r, providerName, "invalid state parameter")
		return
	}

	cfg, err := m.getOAuthConfig(providerName)
	if err != nil {
		m.redirectError(w, r, providerName, err.Error())
		return
	}

	token, err := cfg.Exchange(context.Background(), code)
	if err != nil {
		m.redirectError(w, r, providerName, "token exchange failed: "+err.Error())
		return
	}

	oauthToken := &OAuthToken{
		UserID:       userID,
		Provider:     providerName,
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenType:    token.TokenType,
		Scope:        strings.Join(cfg.Scopes, ","),
	}

	if !token.Expiry.IsZero() {
		oauthToken.ExpiresAt = token.Expiry.Format(time.RFC3339)
	}

	oauthToken.ProviderEmail = m.fetchProviderEmail(providerName, token.AccessToken)

	if err := m.repo.SaveToken(context.Background(), oauthToken); err != nil {
		log.Printf("failed to save oauth token: %v", err)
		m.redirectError(w, r, providerName, "failed to save token")
		return
	}

	if err := m.SyncConnectedAppsSetting(userID, providerName, true); err != nil {
		log.Printf("failed to sync connectedApps setting: %v", err)
	}

	redirectURL := m.frontendURL + "/vm/auth/oauth/callback?provider=" + providerName + "&success=true"
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}

func (m *OAuthManager) fetchProviderEmail(provider, accessToken string) string {
	switch provider {
	case "google-calendar":
		resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + accessToken)
		if err != nil {
			return ""
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var info struct {
			Email string `json:"email"`
		}
		json.Unmarshal(body, &info)
		return info.Email
	case "github":
		req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return ""
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var info struct {
			Email string `json:"email"`
		}
		json.Unmarshal(body, &info)
		return info.Email
	case "linkedin":
		req, _ := http.NewRequest("GET", "https://api.linkedin.com/v2/userinfo", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return ""
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var info struct {
			Email string `json:"email"`
		}
		json.Unmarshal(body, &info)
		return info.Email
	default:
		return ""
	}
}

func (m *OAuthManager) SyncConnectedAppsSetting(userID, provider string, connected bool) error {
	settingsJSON, err := m.userRepo.GetSettings(context.Background(), userID)
	if err != nil {
		return err
	}

	var settings map[string]interface{}
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		settings = make(map[string]interface{})
	}

	var apps []map[string]interface{}
	if a, ok := settings["connectedApps"]; ok {
		if arr, ok := a.([]interface{}); ok {
			for _, item := range arr {
				if m, ok := item.(map[string]interface{}); ok {
					apps = append(apps, m)
				}
			}
		}
	}

	providerID := providerNameToID(provider)
	found := false
	for i, app := range apps {
		if id, ok := app["id"]; ok && id == providerID {
			apps[i]["connected"] = connected
			apps[i]["lastSync"] = time.Now().Format("Jan 2, 2006")
			found = true
			break
		}
	}

	if !found {
		displayNames := map[string]string{
			"google-calendar": "Google Calendar",
			"slack":           "Slack",
			"github":          "GitHub",
			"linkedin":        "LinkedIn",
			"stripe":          "Stripe",
		}
		iconMap := map[string]string{
			"google-calendar": "calendar",
			"slack":           "slack",
			"github":          "github",
			"linkedin":        "linkedin",
			"stripe":          "stripe",
		}
		apps = append(apps, map[string]interface{}{
			"id":        providerID,
			"name":      displayNames[provider],
			"icon":      iconMap[provider],
			"connected": connected,
			"lastSync":  time.Now().Format("Jan 2, 2006"),
		})
	}

	settings["connectedApps"] = apps
	updatedJSON, _ := json.Marshal(settings)
	return m.userRepo.UpdateSettings(context.Background(), userID, string(updatedJSON))
}

func (m *OAuthManager) redirectError(w http.ResponseWriter, r *http.Request, provider, msg string) {
	redirectURL := m.frontendURL + "/vm/auth/oauth/callback?provider=" + provider + "&success=false&error=" + msg
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}
