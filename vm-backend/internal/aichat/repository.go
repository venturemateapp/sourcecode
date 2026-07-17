package aichat

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
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
	ID        string    `json:"id"`
	SessionID string    `json:"sessionId"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
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

func (r *Repository) AddMessage(ctx context.Context, sessionID, role, content string) (*Message, error) {
	var m Message
	err := r.db.QueryRow(ctx,
		`INSERT INTO ai_chat_messages (session_id, role, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, session_id, role, content, created_at`,
		sessionID, role, content,
	).Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	r.db.Exec(ctx, `UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = $1`, sessionID)
	return &m, nil
}

func (r *Repository) GetMessages(ctx context.Context, sessionID string, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, session_id, role, content, created_at
		 FROM ai_chat_messages WHERE session_id = $1
		 ORDER BY created_at DESC LIMIT $2`, sessionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
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
