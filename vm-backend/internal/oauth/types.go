package oauth

import (
	"golang.org/x/oauth2"
)

type OAuthToken struct {
	ID            string `json:"id"`
	UserID        string `json:"userId"`
	Provider      string `json:"provider"`
	AccessToken   string `json:"-"`
	RefreshToken  string `json:"-"`
	TokenType     string `json:"tokenType"`
	Scope         string `json:"scope"`
	ExpiresAt     string `json:"expiresAt,omitempty"`
	ProviderUserID   string `json:"providerUserId,omitempty"`
	ProviderEmail    string `json:"providerEmail,omitempty"`
}

type ProviderConfig struct {
	Name         string
	DisplayName  string
	ClientID     string
	ClientSecret string
	AuthURL      string
	TokenURL     string
	Scopes       []string
	AuthStyle    oauth2.AuthStyle
	Endpoint     oauth2.Endpoint
}
