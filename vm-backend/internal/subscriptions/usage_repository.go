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
	query := `SELECT id,user_id,billing_period,ai_tokens_used,storage_bytes,recraft_images_used,ai_builds_used,ai_exports_used,ai_deployments_used,ai_project_bytes,created_at,updated_at
	          FROM usage_log WHERE user_id = $1 AND billing_period = $2 LIMIT 1`
	var u UsageLog
	err := r.db.QueryRow(ctx, query, userID, period).Scan(
		&u.ID, &u.UserID, &u.BillingPeriod, &u.AITokensUsed, &u.StorageBytes, &u.RecraftImagesUsed, &u.AIBuildsUsed, &u.AIExportsUsed, &u.AIDeploymentsUsed, &u.AIProjectBytes, &u.CreatedAt, &u.UpdatedAt,
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
	return t.UTC().Format("2006-01") + "-01"
}

func (r *UsageRepository) IncrementAIStudioMetric(ctx context.Context, userID, period, metric string, amount int64) error {
	if amount <= 0 {
		return nil
	}
	var query string
	switch metric {
	case "recraft_images":
		query = `INSERT INTO usage_log(id,user_id,billing_period,recraft_images_used) VALUES(gen_random_uuid(),$1,$2,$3)
			ON CONFLICT(user_id,billing_period) DO UPDATE SET recraft_images_used=usage_log.recraft_images_used+$3,updated_at=NOW()`
	case "ai_builds":
		query = `INSERT INTO usage_log(id,user_id,billing_period,ai_builds_used) VALUES(gen_random_uuid(),$1,$2,$3)
			ON CONFLICT(user_id,billing_period) DO UPDATE SET ai_builds_used=usage_log.ai_builds_used+$3,updated_at=NOW()`
	case "ai_exports":
		query = `INSERT INTO usage_log(id,user_id,billing_period,ai_exports_used) VALUES(gen_random_uuid(),$1,$2,$3)
			ON CONFLICT(user_id,billing_period) DO UPDATE SET ai_exports_used=usage_log.ai_exports_used+$3,updated_at=NOW()`
	case "ai_deployments":
		query = `INSERT INTO usage_log(id,user_id,billing_period,ai_deployments_used) VALUES(gen_random_uuid(),$1,$2,$3)
			ON CONFLICT(user_id,billing_period) DO UPDATE SET ai_deployments_used=usage_log.ai_deployments_used+$3,updated_at=NOW()`
	default:
		return nil
	}
	_, err := r.db.Exec(ctx, query, userID, period, amount)
	return err
}

func (r *UsageRepository) UpdateAIProjectBytes(ctx context.Context, userID, period string, bytes int64) error {
	if bytes < 0 {
		bytes = 0
	}
	_, err := r.db.Exec(ctx, `INSERT INTO usage_log(id,user_id,billing_period,ai_project_bytes) VALUES(gen_random_uuid(),$1,$2,$3)
		ON CONFLICT(user_id,billing_period) DO UPDATE SET ai_project_bytes=$3,updated_at=NOW()`, userID, period, bytes)
	return err
}
