package aijobs

import "time"

type Job struct {
	ID              string     `json:"id"`
	UserID          string     `json:"userId"`
	BusinessID      string     `json:"businessId,omitempty"`
	ProjectID       string     `json:"projectId,omitempty"`
	ArtifactType    string     `json:"artifactType"`
	JobType         string     `json:"jobType"`
	Status          string     `json:"status"`
	Progress        int        `json:"progress"`
	Step            string     `json:"step"`
	Message         string     `json:"message"`
	Request         string     `json:"request"`
	Result          string     `json:"result"`
	ErrorCode       string     `json:"errorCode"`
	ErrorMessage    string     `json:"errorMessage"`
	Logs            string     `json:"logs"`
	Provider        string     `json:"provider"`
	Model           string     `json:"model"`
	InputTokens     int64      `json:"inputTokens"`
	OutputTokens    int64      `json:"outputTokens"`
	AttemptCount    int        `json:"attemptCount"`
	MaxAttempts     int        `json:"maxAttempts"`
	CancelRequested bool       `json:"cancelRequested"`
	LockedBy        string     `json:"lockedBy,omitempty"`
	LockedAt        *time.Time `json:"lockedAt,omitempty"`
	HeartbeatAt     *time.Time `json:"heartbeatAt,omitempty"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
	CompletedAt     *time.Time `json:"completedAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type CreateInput struct {
	UserID       string
	BusinessID   string
	ProjectID    string
	ArtifactType string
	JobType      string
	Request      string
	MaxAttempts  int
}
