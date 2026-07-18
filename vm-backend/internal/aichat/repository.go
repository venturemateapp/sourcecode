package aichat

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/venturemate/vmbackend/internal/ai"
)

type Session struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	BusinessID string    `json:"businessId"`
	Domain     string    `json:"domain"`
	Title      string    `json:"title"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
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

func (r *Repository) CreateSession(ctx context.Context, userID, businessID, domain, title string) (*Session, error) {
	var s Session
	err := r.db.QueryRow(ctx,
		`INSERT INTO ai_chat_sessions (user_id, business_id, domain, title)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, business_id, domain, title, created_at, updated_at`,
		userID, businessID, domain, title,
	).Scan(&s.ID, &s.UserID, &s.BusinessID, &s.Domain, &s.Title, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) GetSession(ctx context.Context, id string) (*Session, error) {
	var s Session
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, business_id, domain, title, created_at, updated_at FROM ai_chat_sessions WHERE id = $1`, id,
	).Scan(&s.ID, &s.UserID, &s.BusinessID, &s.Domain, &s.Title, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) ListSessions(ctx context.Context, userID, businessID, domain string, limit int) ([]Session, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, business_id, domain, title, created_at, updated_at
		 FROM ai_chat_sessions WHERE user_id = $1 AND business_id = $2 AND domain = $3
		 ORDER BY updated_at DESC LIMIT $4`, userID, businessID, domain, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.UserID, &s.BusinessID, &s.Domain, &s.Title, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, nil
}

func (r *Repository) AddMessage(ctx context.Context, sessionID, role, content string, opts ...AddMessageOption) (*Message, error) {
	cfg := addMessageConfig{
		inputTokens:  0,
		outputTokens: 0,
		model:        "",
		provider:     "",
		durationMs:   0,
	}
	for _, opt := range opts {
		opt(&cfg)
	}
	totalTokens := cfg.inputTokens + cfg.outputTokens
	var m Message
	err := r.db.QueryRow(ctx,
		`INSERT INTO ai_chat_messages (session_id, role, content, input_tokens, output_tokens, total_tokens, model, provider, duration_ms)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, session_id, role, content, input_tokens, output_tokens, total_tokens, model, provider, duration_ms, created_at`,
		sessionID, role, content, cfg.inputTokens, cfg.outputTokens, totalTokens, cfg.model, cfg.provider, cfg.durationMs,
	).Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.InputTokens, &m.OutputTokens, &m.TotalTokens, &m.Model, &m.Provider, &m.DurationMs, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	r.db.Exec(ctx, `UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = $1`, sessionID)
	return &m, nil
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

func (r *Repository) GetMessages(ctx context.Context, sessionID string, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, session_id, role, content, input_tokens, output_tokens, total_tokens, model, provider, duration_ms, created_at
		 FROM ai_chat_messages WHERE session_id = $1
		 ORDER BY created_at DESC LIMIT $2`, sessionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.InputTokens, &m.OutputTokens, &m.TotalTokens, &m.Model, &m.Provider, &m.DurationMs, &m.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	// Reverse to chronological order
	for i, j := 0, len(list)-1; i < j; i, j = i+1, j-1 {
		list[i], list[j] = list[j], list[i]
	}
	return list, nil
}

func (r *Repository) UpdateSessionTitle(ctx context.Context, id, title string) error {
	_, err := r.db.Exec(ctx, `UPDATE ai_chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2`, title, id)
	return err
}
