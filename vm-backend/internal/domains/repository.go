package domains

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

func (r *Repository) Get(ctx context.Context, businessID, domain string) (*DomainData, error) {
	row := r.db.QueryRow(ctx, `SELECT id, business_id, domain, COALESCE(data::text, '{}'), created_at, updated_at FROM domain_data WHERE business_id = $1 AND domain = $2`, businessID, domain)
	var d DomainData
	if err := row.Scan(&d.ID, &d.BusinessID, &d.Domain, &d.Data, &d.CreatedAt, &d.UpdatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

func (r *Repository) Upsert(ctx context.Context, businessID, domain, data string) (*DomainData, error) {
	now := time.Now()
	id := uuid.New().String()

	row := r.db.QueryRow(ctx, `
		INSERT INTO domain_data (id, business_id, domain, data, created_at, updated_at)
		VALUES ($1, $2, $3, $4::jsonb, $5, $5)
		ON CONFLICT (business_id, domain) DO UPDATE SET data = $4::jsonb, updated_at = $5
		RETURNING id, business_id, domain, data::text, created_at, updated_at
	`, id, businessID, domain, data, now)

	var d DomainData
	if err := row.Scan(&d.ID, &d.BusinessID, &d.Domain, &d.Data, &d.CreatedAt, &d.UpdatedAt); err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *Repository) Delete(ctx context.Context, businessID, domain string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM domain_data WHERE business_id = $1 AND domain = $2`, businessID, domain)
	return err
}
