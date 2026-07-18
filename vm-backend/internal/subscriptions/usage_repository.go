package subscriptions

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UsageRepository struct {
	db *pgxpool.Pool
}

func NewUsageRepository(db *pgxpool.Pool) *UsageRepository {
	return &UsageRepository{db: db}
}

func (r *UsageRepository) GetUsage(ctx context.Context, userID string, period string) (*UsageLog, error) {
	query := `SELECT id, user_id, billing_period, ai_tokens_used, storage_bytes, created_at, updated_at
	          FROM usage_log WHERE user_id = $1 AND billing_period = $2 LIMIT 1`
	var u UsageLog
	err := r.db.QueryRow(ctx, query, userID, period).Scan(
		&u.ID, &u.UserID, &u.BillingPeriod, &u.AITokensUsed, &u.StorageBytes, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UsageRepository) IncrementAITokens(ctx context.Context, userID string, period string, tokens int64) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO usage_log (id, user_id, billing_period, ai_tokens_used, storage_bytes, created_at, updated_at)
		 VALUES (gen_random_uuid(), $1, $2, $3, 0, NOW(), NOW())
		 ON CONFLICT (user_id, billing_period) DO UPDATE SET
		   ai_tokens_used = usage_log.ai_tokens_used + $3,
		   updated_at = NOW()`,
		userID, period, tokens)
	return err
}

func (r *UsageRepository) UpdateStorage(ctx context.Context, userID string, period string, bytes int64) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO usage_log (id, user_id, billing_period, ai_tokens_used, storage_bytes, created_at, updated_at)
		 VALUES (gen_random_uuid(), $1, $2, 0, $3, NOW(), NOW())
		 ON CONFLICT (user_id, billing_period) DO UPDATE SET
		   storage_bytes = $3,
		   updated_at = NOW()`,
		userID, period, bytes)
	return err
}

func BillingPeriod(t time.Time) string {
	return t.Format("2006-01")
}
