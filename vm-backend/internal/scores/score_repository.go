package scores

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

func scanScore(row pgx.Row) (*BusinessScore, error) {
	var s BusinessScore
	err := row.Scan(&s.ID, &s.BusinessID, &s.ScoreType, &s.ScoreData, &s.CalculatedAt, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) GetByBusinessAndType(ctx context.Context, businessID, scoreType string) (*BusinessScore, error) {
	s, err := scanScore(r.db.QueryRow(ctx,
		`SELECT id, business_id, score_type, score_data::text, calculated_at, created_at, updated_at
		 FROM business_scores WHERE business_id = $1 AND score_type = $2`, businessID, scoreType))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return s, nil
}

func (r *Repository) Upsert(ctx context.Context, s *BusinessScore) error {
	now := time.Now()
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	s.CalculatedAt = now
	s.UpdatedAt = now
	_, err := r.db.Exec(ctx, `
		INSERT INTO business_scores (id, business_id, score_type, score_data, calculated_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
		ON CONFLICT (business_id, score_type)
		DO UPDATE SET score_data = $4::jsonb, calculated_at = $5, updated_at = $7`,
		s.ID, s.BusinessID, s.ScoreType, s.ScoreData, s.CalculatedAt, now, s.UpdatedAt)
	return err
}

func (r *Repository) ListHistory(ctx context.Context, businessID string, limit int) ([]BusinessScore, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, business_id, score_type, score_data::text, calculated_at, created_at, updated_at
		FROM business_scores
		WHERE business_id = $1 AND score_type = 'credit'
		ORDER BY calculated_at DESC LIMIT $2`, businessID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []BusinessScore
	for rows.Next() {
		var s BusinessScore
		if err := rows.Scan(&s.ID, &s.BusinessID, &s.ScoreType, &s.ScoreData, &s.CalculatedAt, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, nil
}
