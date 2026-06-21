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
	ID                            string     `json:"id"`
	BusinessID                    string     `json:"businessId"`
	TemplateID                    string     `json:"templateId"`
	Subdomain                     string     `json:"subdomain"`
	CustomDomain                  string     `json:"customDomain"`
	Pages                         string     `json:"pages"`
	GlobalStyles                  string     `json:"globalStyles"`
	Navigation                    string     `json:"navigation"`
	Footer                        string     `json:"footer"`
	Status                        string     `json:"status"`
	PublishedAt                   *time.Time `json:"publishedAt"`
	LastModified                  time.Time  `json:"lastModified"`
	PublishedSubdomain            string     `json:"publishedSubdomain"`
	PublishedCustomDomain         string     `json:"publishedCustomDomain"`
	PublishedPages                string     `json:"publishedPages"`
	PublishedGlobalStyles         string     `json:"publishedGlobalStyles"`
	PublishedNavigation           string     `json:"publishedNavigation"`
	PublishedFooter               string     `json:"publishedFooter"`
	PublishedBusinessSnapshot     string     `json:"publishedBusinessSnapshot"`
	DraftRevision                 int        `json:"draftRevision"`
	PublishedRevision             int        `json:"publishedRevision"`
	CustomDomainStatus            string     `json:"customDomainStatus"`
	CustomDomainVerificationToken string     `json:"customDomainVerificationToken"`
	CustomDomainVerifiedAt        *time.Time `json:"customDomainVerifiedAt"`
	CreatedAt                     time.Time  `json:"createdAt"`
	UpdatedAt                     time.Time  `json:"updatedAt"`
}

func (w *UserWebsite) HasUnpublishedChanges() bool {
	return w == nil || w.Status != StatusPublished || w.DraftRevision > w.PublishedRevision
}

type PublicWebsite struct {
	Website             UserWebsite `json:"website"`
	BusinessName        string      `json:"businessName"`
	BusinessTagline     string      `json:"businessTagline"`
	BusinessDescription string      `json:"businessDescription"`
	BusinessIndustry    string      `json:"businessIndustry"`
	BusinessLocation    string      `json:"businessLocation"`
	BusinessBrandKit    string      `json:"businessBrandKit"`
}

type ContactSubmission struct {
	WebsiteID  string            `json:"websiteId"`
	BusinessID string            `json:"businessId"`
	Name       string            `json:"name"`
	Email      string            `json:"email"`
	Phone      string            `json:"phone"`
	Company    string            `json:"company"`
	Message    string            `json:"message"`
	Metadata   map[string]string `json:"metadata"`
}

const (
	StatusDraft       = "draft"
	StatusPublished   = "published"
	StatusUnpublished = "unpublished"

	CustomDomainNone    = "none"
	CustomDomainPending = "pending"
	CustomDomainActive  = "active"
	CustomDomainFailed  = "failed"
)
