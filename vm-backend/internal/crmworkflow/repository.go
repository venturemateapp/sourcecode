package crmworkflow

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Workflow struct {
	ID          string    `json:"id"`
	BusinessID  string    `json:"businessId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) List(ctx context.Context, businessID string) ([]Workflow, error) {
	rows, _ := r.db.Query(ctx, `SELECT id, business_id, name, description, is_active, created_at, updated_at FROM crm_workflows WHERE business_id = $1 ORDER BY name`, businessID)
	defer rows.Close()
	var list []Workflow
	for rows.Next() {
		var w Workflow
		rows.Scan(&w.ID, &w.BusinessID, &w.Name, &w.Description, &w.IsActive, &w.CreatedAt, &w.UpdatedAt)
		list = append(list, w)
	}
	return list, nil
}

func (r *Repository) Create(ctx context.Context, w *Workflow) error {
	w.ID = uuid.New().String()
	w.CreatedAt = time.Now()
	w.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx, `INSERT INTO crm_workflows (id, business_id, name, description, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`, w.ID, w.BusinessID, w.Name, w.Description, w.IsActive, w.CreatedAt, w.UpdatedAt)
	return err
}

func (r *Repository) ToggleActive(ctx context.Context, id string, active bool) error {
	_, err := r.db.Exec(ctx, `UPDATE crm_workflows SET is_active = $1, updated_at = NOW() WHERE id = $2`, active, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM crm_workflows WHERE id = $1`, id)
	return err
}
