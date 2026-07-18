package support

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/venturemate/vmbackend/internal/ai"
)

type Session struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	Subject        string    `json:"subject"`
	Status         string    `json:"status"`
	CreatedByName  string    `json:"createdByName"`
	CreatedByEmail string    `json:"createdByEmail"`
	Summary        string    `json:"summary"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type Message struct {
	ID          string    `json:"id"`
	SessionID   string    `json:"sessionId"`
	Role        string    `json:"role"`
	Content     string    `json:"content"`
	CreatedAt   time.Time `json:"createdAt"`
	InputTokens int      `json:"inputTokens"`
	OutputTokens int     `json:"outputTokens"`
	TotalTokens int      `json:"totalTokens"`
	Model      string    `json:"model"`
	Provider   string    `json:"provider"`
	DurationMs int64     `json:"durationMs"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateSession(ctx context.Context, userID, subject, name, email string) (*Session, error) {
	var s Session
	err := r.db.QueryRow(ctx,
		`INSERT INTO support_sessions (user_id, subject, created_by_name, created_by_email)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, subject, status, created_by_name, created_by_email, summary, created_at, updated_at`,
		userID, subject, name, email,
	).Scan(&s.ID, &s.UserID, &s.Subject, &s.Status, &s.CreatedByName, &s.CreatedByEmail, &s.Summary, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

type addMessageConfig struct {
	inputTokens  int
	outputTokens int
	model        string
	provider     string
	durationMs   int64
}

type AddMessageOption func(*addMessageConfig)

func WithTokenUsage(inputTokens, outputTokens int, model, provider string, durationMs int64) AddMessageOption {
	return func(c *addMessageConfig) {
		c.inputTokens = inputTokens
		c.outputTokens = outputTokens
		c.model = model
		c.provider = provider
		c.durationMs = durationMs
	}
}

func WithProviderResponse(resp *ai.ProviderResponse) AddMessageOption {
	return func(c *addMessageConfig) {
		if resp == nil {
			return
		}
		if resp.TokenUsage != nil {
			c.inputTokens = resp.TokenUsage.InputTokens
			c.outputTokens = resp.TokenUsage.OutputTokens
		}
		c.model = resp.Model
		c.provider = resp.Provider
		c.durationMs = resp.DurationMs
	}
}

func (r *Repository) AddMessage(ctx context.Context, sessionID, role, content string, opts ...AddMessageOption) (*Message, error) {
	cfg := addMessageConfig{}
	for _, opt := range opts {
		opt(&cfg)
	}
	totalTokens := cfg.inputTokens + cfg.outputTokens
	var m Message
	err := r.db.QueryRow(ctx,
		`INSERT INTO support_messages (session_id, role, content, input_tokens, output_tokens, total_tokens, model, provider, duration_ms)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, session_id, role, content, input_tokens, output_tokens, total_tokens, model, provider, duration_ms, created_at`,
		sessionID, role, content, cfg.inputTokens, cfg.outputTokens, totalTokens, cfg.model, cfg.provider, cfg.durationMs,
	).Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.InputTokens, &m.OutputTokens, &m.TotalTokens, &m.Model, &m.Provider, &m.DurationMs, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	_, _ = r.db.Exec(ctx,
		`UPDATE support_sessions SET updated_at = NOW() WHERE id = $1`, sessionID)
	return &m, nil
}

func (r *Repository) GetSession(ctx context.Context, sessionID string) (*Session, error) {
	var s Session
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, subject, status, created_by_name, created_by_email, summary, created_at, updated_at
		 FROM support_sessions WHERE id = $1`, sessionID,
	).Scan(&s.ID, &s.UserID, &s.Subject, &s.Status, &s.CreatedByName, &s.CreatedByEmail, &s.Summary, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) GetSessionMessages(ctx context.Context, sessionID string) ([]Message, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, session_id, role, content, input_tokens, output_tokens, total_tokens, model, provider, duration_ms, created_at
		 FROM support_messages WHERE session_id = $1 ORDER BY created_at ASC`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.InputTokens, &m.OutputTokens, &m.TotalTokens, &m.Model, &m.Provider, &m.DurationMs, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, nil
}

func (r *Repository) GetUserSessions(ctx context.Context, userID string) ([]Session, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, subject, status, created_by_name, created_by_email, summary, created_at, updated_at
		 FROM support_sessions WHERE user_id = $1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var sessions []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.UserID, &s.Subject, &s.Status, &s.CreatedByName, &s.CreatedByEmail, &s.Summary, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *Repository) GetAllSessions(ctx context.Context) ([]Session, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, subject, status, created_by_name, created_by_email, summary, created_at, updated_at
		 FROM support_sessions ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var sessions []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.UserID, &s.Subject, &s.Status, &s.CreatedByName, &s.CreatedByEmail, &s.Summary, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *Repository) UpdateSessionStatus(ctx context.Context, sessionID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE support_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, sessionID)
	return err
}

func (r *Repository) UpdateSessionSummary(ctx context.Context, sessionID, summary string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE support_sessions SET summary = $1, updated_at = NOW() WHERE id = $2`,
		summary, sessionID)
	return err
}
