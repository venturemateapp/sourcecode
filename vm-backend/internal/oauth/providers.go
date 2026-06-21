package oauth

import (
	"os"

	"golang.org/x/oauth2"
)

var ProviderConfigs map[string]ProviderConfig

func InitProviders(redirectBase, frontendURL string) {
	_ = redirectBase
	_ = frontendURL

	ProviderConfigs = map[string]ProviderConfig{
		"google-calendar": {
			Name:         "google-calendar",
			DisplayName:  "Google Calendar",
			ClientID:     envOrDefault("OAUTH_GOOGLE_CALENDAR_CLIENT_ID", ""),
			ClientSecret: envOrDefault("OAUTH_GOOGLE_CALENDAR_CLIENT_SECRET", ""),
			Scopes:       []string{"https://www.googleapis.com/auth/calendar"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://accounts.google.com/o/oauth2/v2/auth",
				TokenURL: "https://oauth2.googleapis.com/token",
			},
		},
		"slack": {
			Name:         "slack",
			DisplayName:  "Slack",
			ClientID:     envOrDefault("OAUTH_SLACK_CLIENT_ID", ""),
			ClientSecret: envOrDefault("OAUTH_SLACK_CLIENT_SECRET", ""),
			Scopes:       []string{"channels:read", "chat:write", "users:read"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://slack.com/oauth/v2/authorize",
				TokenURL: "https://slack.com/api/oauth.v2.access",
			},
		},
		"github": {
			Name:         "github",
			DisplayName:  "GitHub",
			ClientID:     envOrDefault("OAUTH_GITHUB_CLIENT_ID", ""),
			ClientSecret: envOrDefault("OAUTH_GITHUB_CLIENT_SECRET", ""),
			Scopes:       []string{"read:user", "repo"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://github.com/login/oauth/authorize",
				TokenURL: "https://github.com/login/oauth/access_token",
			},
		},
		"linkedin": {
			Name:         "linkedin",
			DisplayName:  "LinkedIn",
			ClientID:     envOrDefault("OAUTH_LINKEDIN_CLIENT_ID", ""),
			ClientSecret: envOrDefault("OAUTH_LINKEDIN_CLIENT_SECRET", ""),
			Scopes:       []string{"openid", "profile", "email"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://www.linkedin.com/oauth/v2/authorization",
				TokenURL: "https://www.linkedin.com/oauth/v2/accessToken",
			},
		},
		"stripe": {
			Name:         "stripe",
			DisplayName:  "Stripe",
			ClientID:     envOrDefault("OAUTH_STRIPE_CLIENT_ID", ""),
			ClientSecret: envOrDefault("OAUTH_STRIPE_CLIENT_SECRET", ""),
			Scopes:       []string{"read_write"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://connect.stripe.com/oauth/authorize",
				TokenURL: "https://connect.stripe.com/oauth/token",
			},
		},
	}
}

func providerNameToID(name string) string {
	switch name {
	case "google-calendar":
		return "1"
	case "slack":
		return "2"
	case "github":
		return "3"
	case "linkedin":
		return "4"
	case "stripe":
		return "5"
	default:
		return ""
	}
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
