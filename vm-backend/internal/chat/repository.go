package chat

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateConversation(ctx context.Context, businessID, userID, subject string) (*Conversation, error) {
	var c Conversation
	err := r.db.QueryRow(ctx,
		`INSERT INTO conversations (business_id, user_id, subject)
		 VALUES ($1, $2, $3)
		 RETURNING id, business_id, user_id, subject, status, created_at, updated_at`,
		businessID, userID, subject,
	).Scan(&c.ID, &c.BusinessID, &c.UserID, &c.Subject, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) AddMessage(ctx context.Context, conversationID, senderID, content string) (*Message, error) {
	var m Message
	err := r.db.QueryRow(ctx,
		`INSERT INTO chat_messages (conversation_id, sender_id, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, conversation_id, sender_id, content, created_at`,
		conversationID, senderID, content,
	).Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	r.db.Exec(ctx, `UPDATE conversations SET updated_at = NOW() WHERE id = $1`, conversationID)
	return &m, nil
}

func (r *Repository) GetConversation(ctx context.Context, id string) (*Conversation, error) {
	var c Conversation
	err := r.db.QueryRow(ctx,
		`SELECT id, business_id, user_id, subject, status, created_at, updated_at FROM conversations WHERE id = $1`, id,
	).Scan(&c.ID, &c.BusinessID, &c.UserID, &c.Subject, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) GetConversations(ctx context.Context, userID string, isAdmin bool) ([]ConversationWithMeta, error) {
	var rows interface{ Close(); Next() bool; Scan(...interface{}) error }
	var err error
	if isAdmin {
		r2, e := r.db.Query(ctx, `
			SELECT c.id, c.business_id, c.user_id, c.subject, c.status, c.created_at, c.updated_at,
			       COALESCE(u.first_name || ' ' || u.surname, 'Unknown') AS sender_name,
			       COALESCE(u.email, '') AS sender_email,
			       COALESCE((SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1), '') AS last_message,
			       0 AS unread
			FROM conversations c
			JOIN users u ON u.id = c.user_id
			ORDER BY c.updated_at DESC`)
		rows = r2
		err = e
	} else {
		r2, e := r.db.Query(ctx, `
			SELECT c.id, c.business_id, c.user_id, c.subject, c.status, c.created_at, c.updated_at,
			       COALESCE(u.first_name || ' ' || u.surname, 'Unknown') AS sender_name,
			       COALESCE(u.email, '') AS sender_email,
			       COALESCE((SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1), '') AS last_message,
			       0 AS unread
			FROM conversations c
			JOIN users u ON u.id = c.user_id
			WHERE c.user_id = $1
			ORDER BY c.updated_at DESC`, userID)
		rows = r2
		err = e
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []ConversationWithMeta
	for rows.Next() {
		var cv ConversationWithMeta
		if err := rows.Scan(&cv.ID, &cv.BusinessID, &cv.UserID, &cv.Subject, &cv.Status, &cv.CreatedAt, &cv.UpdatedAt,
			&cv.SenderName, &cv.SenderEmail, &cv.LastMessage, &cv.Unread); err != nil {
			return nil, err
		}
		result = append(result, cv)
	}
	return result, nil
}

func (r *Repository) GetMessages(ctx context.Context, conversationID string) ([]Message, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, conversation_id, sender_id, content, created_at
		 FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, m)
	}
	return result, nil
}

func (r *Repository) CloseConversation(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE conversations SET status = 'closed', updated_at = NOW() WHERE id = $1`, id)
	return err
}
