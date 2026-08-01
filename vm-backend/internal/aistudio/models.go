package aistudio

import "time"

const (
	ProjectTypeWebApp       = "web_app"
	ProjectTypePitchDeck    = "pitch_deck"
	ProjectTypeBusinessPlan = "business_plan"
)

type Project struct {
	ID                 string     `json:"id"`
	UserID             string     `json:"userId"`
	BusinessID         string     `json:"businessId,omitempty"`
	ProjectType        string     `json:"projectType"`
	Name               string     `json:"name"`
	Slug               string     `json:"slug"`
	Status             string     `json:"status"`
	Framework          string     `json:"framework,omitempty"`
	TemplateVersion    string     `json:"templateVersion,omitempty"`
	CurrentRevisionID  string     `json:"currentRevisionId,omitempty"`
	ApprovedRevisionID string     `json:"approvedRevisionId,omitempty"`
	Settings           string     `json:"settings"`
	Metadata           string     `json:"metadata"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
	ArchivedAt         *time.Time `json:"archivedAt,omitempty"`
}

type Revision struct {
	ID               string    `json:"id"`
	ProjectID        string    `json:"projectId"`
	ParentRevisionID string    `json:"parentRevisionId,omitempty"`
	CreatedByUserID  string    `json:"createdByUserId"`
	Source           string    `json:"source"`
	Prompt           string    `json:"prompt"`
	Summary          string    `json:"summary"`
	Status           string    `json:"status"`
	SchemaVersion    string    `json:"schemaVersion"`
	Document         string    `json:"document"`
	Manifest         string    `json:"manifest"`
	Diagnostics      string    `json:"diagnostics"`
	TokenUsage       string    `json:"tokenUsage"`
	ContentHash      string    `json:"contentHash"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type ProjectFile struct {
	ID             string    `json:"id"`
	ProjectID      string    `json:"projectId"`
	Path           string    `json:"path"`
	Language       string    `json:"language"`
	IsBinary       bool      `json:"isBinary"`
	AssetID        string    `json:"assetId,omitempty"`
	CurrentContent string    `json:"currentContent"`
	ContentHash    string    `json:"contentHash"`
	SizeBytes      int64     `json:"sizeBytes"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type FileChange struct {
	Path         string `json:"path"`
	Operation    string `json:"operation"`
	PreviousPath string `json:"previousPath,omitempty"`
	Content      string `json:"content,omitempty"`
	ContentHash  string `json:"contentHash,omitempty"`
	BaseHash     string `json:"baseHash,omitempty"`
	Language     string `json:"language,omitempty"`
}

type RevisionInput struct {
	ProjectID     string
	UserID        string
	Source        string
	Prompt        string
	Summary       string
	SchemaVersion string
	Document      string
	Manifest      string
	Diagnostics   string
	TokenUsage    string
	Files         []FileChange
}

type ProposalBatch struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	BusinessID string    `json:"businessId,omitempty"`
	ProjectID  string    `json:"projectId,omitempty"`
	RevisionID string    `json:"revisionId,omitempty"`
	Domain     string    `json:"domain"`
	Message    string    `json:"message"`
	Changes    string    `json:"changes"`
	Provider   string    `json:"provider"`
	Model      string    `json:"model"`
	TokenUsage string    `json:"tokenUsage"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Asset struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	BusinessID   string    `json:"businessId,omitempty"`
	ProjectID    string    `json:"projectId,omitempty"`
	Source       string    `json:"source"`
	Kind         string    `json:"kind"`
	Prompt       string    `json:"prompt"`
	Model        string    `json:"model"`
	Style        string    `json:"style"`
	MimeType     string    `json:"mimeType"`
	Width        int       `json:"width,omitempty"`
	Height       int       `json:"height,omitempty"`
	SizeBytes    int64     `json:"sizeBytes"`
	StorageKey   string    `json:"storageKey"`
	URL          string    `json:"url"`
	ThumbnailURL string    `json:"thumbnailUrl"`
	Metadata     string    `json:"metadata"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Build struct {
	ID                 string    `json:"id"`
	ProjectID          string    `json:"projectId"`
	RevisionID         string    `json:"revisionId,omitempty"`
	JobID              string    `json:"jobId,omitempty"`
	Status             string    `json:"status"`
	RuntimeVersion     string    `json:"runtimeVersion"`
	ArtifactStorageKey string    `json:"artifactStorageKey"`
	PreviewURL         string    `json:"previewUrl"`
	Diagnostics        string    `json:"diagnostics"`
	Logs               string    `json:"logs"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type Deployment struct {
	ID         string    `json:"id"`
	ProjectID  string    `json:"projectId"`
	RevisionID string    `json:"revisionId,omitempty"`
	BuildID    string    `json:"buildId,omitempty"`
	JobID      string    `json:"jobId,omitempty"`
	Provider   string    `json:"provider"`
	Status     string    `json:"status"`
	ExternalID string    `json:"externalId"`
	URL        string    `json:"url"`
	Metadata   string    `json:"metadata"`
	Logs       string    `json:"logs"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
