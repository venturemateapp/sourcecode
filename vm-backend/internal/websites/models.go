package websites

import "time"

type WebsiteTemplate struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Thumbnail    string    `json:"thumbnail"`
	Category     string    `json:"category"`
	TemplateData string    `json:"templateData"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type UserWebsite struct {
	ID           string     `json:"id"`
	BusinessID   string     `json:"businessId"`
	TemplateID   string     `json:"templateId"`
	Subdomain    string     `json:"subdomain"`
	CustomDomain string     `json:"customDomain"`
	Pages        string     `json:"pages"`
	GlobalStyles string     `json:"globalStyles"`
	Navigation   string     `json:"navigation"`
	Footer       string     `json:"footer"`
	Status       string     `json:"status"`
	PublishedAt  *time.Time `json:"publishedAt"`
	LastModified time.Time  `json:"lastModified"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

const (
	StatusDraft     = "draft"
	StatusPublished = "published"
)
