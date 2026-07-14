package notifications

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const listQuery = `SELECT id, user_id, type, title, description, read, action_url, action_label, created_at FROM notifications`

func scanNotification(row pgx.Row) (*Notification, error) {
	var n Notification
	err := row.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Description, &n.Read, &n.ActionURL, &n.ActionLabel, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func scanNotifications(rows pgx.Rows) ([]Notification, error) {
	defer rows.Close()
	var list []Notification
	for rows.Next() {
		n, err := scanNotification(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *n)
	}
	return list, nil
}

func (r *Repository) ListByUser(ctx context.Context, userID string, unreadOnly bool) ([]Notification, error) {
	query := listQuery + " WHERE user_id = $1"
	if unreadOnly {
		query += " AND read = FALSE"
	}
	query += " ORDER BY created_at DESC LIMIT 50"
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	return scanNotifications(rows)
}

func (r *Repository) UnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE", userID).Scan(&count)
	return count, err
}

func (r *Repository) Create(ctx context.Context, n *Notification) error {
	n.ID = uuid.New().String()
	n.CreatedAt = time.Now()
	_, err := r.db.Exec(ctx, `
		INSERT INTO notifications (id, user_id, type, title, description, read, action_url, action_label, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		n.ID, n.UserID, n.Type, n.Title, n.Description, n.Read, n.ActionURL, n.ActionLabel, n.CreatedAt)
	return err
}

func (r *Repository) MarkRead(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx, "UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2", id, userID)
	return err
}

func (r *Repository) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, "UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE", userID)
	return err
}

func (r *Repository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM notifications WHERE id = $1 AND user_id = $2", id, userID)
	return err
}

func (r *Repository) DeleteAllRead(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM notifications WHERE user_id = $1 AND read = TRUE", userID)
	return err
}

func (r *Repository) Broadcast(ctx context.Context, title, description, notifType, actionURL, actionLabel string) error {
	_, err := r.db.Exec(ctx, `INSERT INTO notifications (id, user_id, title, description, type, action_url, action_label, created_at)
		SELECT gen_random_uuid(), id, $1, $2, $3, $4, $5, NOW() FROM users`, title, description, notifType, actionURL, actionLabel)
	return err
}
