package auth

import (
	"log"
	"github.com/venturemate/vmbackend/internal/email"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/venturemate/vmbackend/internal/s3"
	"github.com/venturemate/vmbackend/internal/users"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleOAuth struct {
	config    *oauth2.Config
	userRepo  *users.Repository
	s3Svc     *s3.Service
	jwtSecret string
}

var googleAuth *GoogleOAuth

func InitGoogleOAuth(credsPath string, userRepo *users.Repository, s3Svc *s3.Service, jwtSecret string) error {
	b, err := os.ReadFile(credsPath)
	if err != nil {
		return fmt.Errorf("failed to read google credentials: %w", err)
	}

	var creds struct {
		Web struct {
			ClientID     string   `json:"client_id"`
			ClientSecret string   `json:"client_secret"`
			RedirectURIs []string `json:"redirect_uris"`
		} `json:"web"`
	}
	if err := json.Unmarshal(b, &creds); err != nil {
		return fmt.Errorf("invalid credentials json: %w", err)
	}

	redirectURL := "https://test-secure.venturemate.net/auth/google/callback"
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
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
			"openid",
		},
		Endpoint: google.Endpoint,
	}

	googleAuth = &GoogleOAuth{
		config:    config,
		userRepo:  userRepo,
		s3Svc:     s3Svc,
		jwtSecret: jwtSecret,
	}
	return nil
}

func GetGoogleLoginURL(state string) string {
	if googleAuth == nil {
		panic("Google OAuth not initialized")
	}
	return googleAuth.config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func GoogleLoginHandler(w http.ResponseWriter, r *http.Request) {
	if googleAuth == nil {
		http.Error(w, "Google OAuth not configured", http.StatusInternalServerError)
		return
	}
	url := GetGoogleLoginURL("venturemate-secure-state")
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func GoogleCallbackHandler(w http.ResponseWriter, r *http.Request) {
	if googleAuth == nil {
		http.Error(w, "Google OAuth not configured", http.StatusInternalServerError)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}

	token, err := googleAuth.config.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get user info from Google
	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var gUser struct {
		Email      string `json:"email"`
		GivenName  string `json:"given_name"`
		FamilyName string `json:"family_name"`
		Picture    string `json:"picture"`
	}
	json.Unmarshal(body, &gUser)

	// Check if user exists
	existingUser, _ := googleAuth.userRepo.FindByEmail(context.Background(), gUser.Email)

	var user *users.User
	if existingUser != nil {
		user = existingUser
	} else {
		user = &users.User{
			FirstName: gUser.GivenName,
			Surname:   gUser.FamilyName,
			Email:     gUser.Email,
			Status:    "active",
			Onboarded: false,
		}

		// Upload Google profile picture to S3
		if gUser.Picture != "" {
			key := s3.GenerateKey("profile-pictures", gUser.Email+".jpg")
			publicURL, err := googleAuth.s3Svc.UploadFromURL(context.Background(), gUser.Picture, key, "image/jpeg")
			if err == nil {
				user.Picture = publicURL
			}
		}

		if err := googleAuth.userRepo.Create(context.Background(), user); err != nil {
 		go sendWelcomeEmail(user)
			http.Error(w, "Failed to create user: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Send welcome email for new Google users
		go sendWelcomeEmail(user)
	}

	// Generate JWT
	jwtToken, err := generateJWT(user.Email, user.ID, googleAuth.jwtSecret)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Redirect to frontend with token
	redirectURL := fmt.Sprintf("https://test.venturemate.net/auth/callback?token=%s", jwtToken)
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}

func generateJWT(email, userID, secret string) (string, error) {
	claims := jwt.MapClaims{
		"email":     email,
		"user_id":   userID,
		"exp":       time.Now().Add(24 * time.Hour).Unix(),
		"iat":       time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func sendWelcomeEmail(user *users.User) {
	svc, err := email.New()
	if err != nil {
		log.Printf("Failed to init email for welcome: %v", err)
		return
	}
	subject := "Welcome to VentureMate!"
	body := fmt.Sprintf(`<h2>Welcome, %s!</h2><p>Thank you for signing up with Google. Your account is ready.</p>`, user.FirstName)
	svc.SendTemplatedEmail([]string{user.Email}, subject, body)
}
