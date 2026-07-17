package expenditure

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

const expCols = `id, business_id, category, description, amount, currency, expense_date, vendor, receipt_url, notes, created_at, updated_at`

func scanExp(row pgx.Row) (*Expenditure, error) {
	var e Expenditure
	var expDate time.Time
	err := row.Scan(&e.ID, &e.BusinessID, &e.Category, &e.Description, &e.Amount, &e.Currency, &expDate, &e.Vendor, &e.ReceiptURL, &e.Notes, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	e.ExpenseDate = expDate.Format("2006-01-02")
	return &e, nil
}

func (r *Repository) ListByBusiness(ctx context.Context, businessID string) ([]Expenditure, error) {
	rows, err := r.db.Query(ctx, `SELECT `+expCols+` FROM expenditures WHERE business_id = $1 ORDER BY expense_date DESC`, businessID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Expenditure
	for rows.Next() {
		e, err := scanExp(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *e)
	}
	return list, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Expenditure, error) {
	return scanExp(r.db.QueryRow(ctx, `SELECT `+expCols+` FROM expenditures WHERE id = $1`, id))
}

func (r *Repository) Create(ctx context.Context, e *Expenditure) error {
	e.ID = uuid.New().String()
	e.CreatedAt = time.Now()
	e.UpdatedAt = time.Now()
	expDate, _ := time.Parse("2006-01-02", e.ExpenseDate)
	_, err := r.db.Exec(ctx,
		`INSERT INTO expenditures (id, business_id, category, description, amount, currency, expense_date, vendor, receipt_url, notes, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		e.ID, e.BusinessID, e.Category, e.Description, e.Amount, e.Currency, expDate, e.Vendor, e.ReceiptURL, e.Notes, e.CreatedAt, e.UpdatedAt)
	return err
}

func (r *Repository) Update(ctx context.Context, e *Expenditure) error {
	e.UpdatedAt = time.Now()
	expDate, _ := time.Parse("2006-01-02", e.ExpenseDate)
	_, err := r.db.Exec(ctx,
		`UPDATE expenditures SET category=$3, description=$4, amount=$5, currency=$6, expense_date=$7, vendor=$8, receipt_url=$9, notes=$10, updated_at=$11
		 WHERE id=$1 AND business_id=$2`,
		e.ID, e.BusinessID, e.Category, e.Description, e.Amount, e.Currency, expDate, e.Vendor, e.ReceiptURL, e.Notes, e.UpdatedAt)
	return err
}

func (r *Repository) Delete(ctx context.Context, id, businessID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM expenditures WHERE id=$1 AND business_id=$2`, id, businessID)
	return err
}
