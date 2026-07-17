package financing

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Offer struct {
	ID           string    `json:"id"`
	LenderName   string    `json:"lenderName"`
	ProductType  string    `json:"productType"`
	MinAmount    float64   `json:"minAmount"`
	MaxAmount    float64   `json:"maxAmount"`
	MinRate      float64   `json:"minRate"`
	MaxRate      float64   `json:"maxRate"`
	TermMonths   int       `json:"termMonths"`
	Requirements string    `json:"requirements"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) ListActive(ctx context.Context) ([]Offer, error) {
	rows, err := r.db.Query(ctx, `SELECT id, lender_name, product_type, min_amount, max_amount, min_rate, max_rate, term_months, requirements::text, is_active, created_at, updated_at FROM financing_offers WHERE is_active = true ORDER BY lender_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Offer
	for rows.Next() {
		var o Offer
		if err := rows.Scan(&o.ID, &o.LenderName, &o.ProductType, &o.MinAmount, &o.MaxAmount, &o.MinRate, &o.MaxRate, &o.TermMonths, &o.Requirements, &o.IsActive, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	return list, nil
}

func (r *Repository) ListAll(ctx context.Context) ([]Offer, error) {
	rows, err := r.db.Query(ctx, `SELECT id, lender_name, product_type, min_amount, max_amount, min_rate, max_rate, term_months, requirements::text, is_active, created_at, updated_at FROM financing_offers ORDER BY lender_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Offer
	for rows.Next() {
		var o Offer
		if err := rows.Scan(&o.ID, &o.LenderName, &o.ProductType, &o.MinAmount, &o.MaxAmount, &o.MinRate, &o.MaxRate, &o.TermMonths, &o.Requirements, &o.IsActive, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	return list, nil
}

func (r *Repository) Create(ctx context.Context, o *Offer) error {
	o.ID = uuid.New().String()
	o.CreatedAt = time.Now()
	o.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx,
		`INSERT INTO financing_offers (id, lender_name, product_type, min_amount, max_amount, min_rate, max_rate, term_months, requirements, is_active, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)`,
		o.ID, o.LenderName, o.ProductType, o.MinAmount, o.MaxAmount, o.MinRate, o.MaxRate, o.TermMonths, o.Requirements, o.IsActive, o.CreatedAt, o.UpdatedAt)
	return err
}

func (r *Repository) Update(ctx context.Context, o *Offer) error {
	o.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE financing_offers SET lender_name=$2, product_type=$3, min_amount=$4, max_amount=$5, min_rate=$6, max_rate=$7, term_months=$8, requirements=$9::jsonb, is_active=$10, updated_at=$11 WHERE id=$1`,
		o.ID, o.LenderName, o.ProductType, o.MinAmount, o.MaxAmount, o.MinRate, o.MaxRate, o.TermMonths, o.Requirements, o.IsActive, o.UpdatedAt)
	return err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM financing_offers WHERE id = $1`, id)
	return err
}
