package support

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
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

func (r *Repository) AddMessage(ctx context.Context, sessionID, role, content string) (*Message, error) {
	var m Message
	err := r.db.QueryRow(ctx,
		`INSERT INTO support_messages (session_id, role, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, session_id, role, content, created_at`,
		sessionID, role, content,
	).Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.CreatedAt)
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
		`SELECT id, session_id, role, content, created_at
		 FROM support_messages WHERE session_id = $1 ORDER BY created_at ASC`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
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
