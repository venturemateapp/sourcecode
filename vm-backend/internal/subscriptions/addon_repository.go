package subscriptions

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AddonRepository struct {
	db *pgxpool.Pool
}

func NewAddonRepository(db *pgxpool.Pool) *AddonRepository {
	return &AddonRepository{db: db}
}

func (r *AddonRepository) Purchase(ctx context.Context, userID, addonType, label string, price float64, quantity int, metadata string, expiresAt *time.Time) (*AddonPurchase, error) {
	id := uuid.New().String()
	_, err := r.db.Exec(ctx,
		`INSERT INTO addon_purchases (id, user_id, addon_type, label, price, quantity, metadata, purchased_at, expires_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())`,
		id, userID, addonType, label, price, quantity, metadata, expiresAt)
	if err != nil {
		return nil, err
	}
	var a AddonPurchase
	err = r.db.QueryRow(ctx,
		`SELECT id, user_id, addon_type, label, price, quantity, metadata::text, purchased_at, expires_at, created_at
		 FROM addon_purchases WHERE id = $1`, id).Scan(
		&a.ID, &a.UserID, &a.AddonType, &a.Label, &a.Price, &a.Quantity, &a.Metadata, &a.PurchasedAt, &a.ExpiresAt, &a.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AddonRepository) ListByUser(ctx context.Context, userID string) ([]AddonPurchase, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, addon_type, label, price, quantity, metadata::text, purchased_at, expires_at, created_at
		 FROM addon_purchases WHERE user_id = $1 ORDER BY purchased_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []AddonPurchase
	for rows.Next() {
		var a AddonPurchase
		if err := rows.Scan(&a.ID, &a.UserID, &a.AddonType, &a.Label, &a.Price, &a.Quantity, &a.Metadata, &a.PurchasedAt, &a.ExpiresAt, &a.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, nil
}
