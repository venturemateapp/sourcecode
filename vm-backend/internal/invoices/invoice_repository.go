package invoices

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

const listQuery = `SELECT id, user_id, business_id, invoice_number, customer_name, customer_email,
	amount, currency, status, due_date, issue_date, paid_date, items::text, notes,
	created_at, updated_at FROM invoices`

func scanInvoice(row pgx.Row) (*Invoice, error) {
	var i Invoice
	err := row.Scan(&i.ID, &i.UserID, &i.BusinessID, &i.InvoiceNumber, &i.CustomerName, &i.CustomerEmail,
		&i.Amount, &i.Currency, &i.Status, &i.DueDate, &i.IssueDate, &i.PaidDate, &i.Items, &i.Notes,
		&i.CreatedAt, &i.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func scanInvoices(rows pgx.Rows) ([]Invoice, error) {
	defer rows.Close()
	var list []Invoice
	for rows.Next() {
		i, err := scanInvoice(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *i)
	}
	return list, nil
}

func (r *Repository) ListAll(ctx context.Context) ([]Invoice, error) {
	rows, err := r.db.Query(ctx, listQuery+" ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	return scanInvoices(rows)
}

func (r *Repository) ListByBusiness(ctx context.Context, businessID string) ([]Invoice, error) {
	rows, err := r.db.Query(ctx, listQuery+" WHERE business_id = $1 ORDER BY created_at DESC", businessID)
	if err != nil {
		return nil, err
	}
	return scanInvoices(rows)
}

func (r *Repository) ListByUser(ctx context.Context, userID string) ([]Invoice, error) {
	rows, err := r.db.Query(ctx, listQuery+" WHERE user_id = $1 ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	return scanInvoices(rows)
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Invoice, error) {
	return scanInvoice(r.db.QueryRow(ctx, listQuery+" WHERE id = $1", id))
}

func (r *Repository) Create(ctx context.Context, inv *Invoice) error {
	inv.ID = uuid.New().String()
	inv.CreatedAt = time.Now()
	inv.UpdatedAt = time.Now()
	if inv.Status == "" {
		inv.Status = "draft"
	}
	query := `INSERT INTO invoices (id, user_id, business_id, invoice_number, customer_name, customer_email,
		amount, currency, status, due_date, issue_date, paid_date, items, notes, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16)`
	_, err := r.db.Exec(ctx, query, inv.ID, inv.UserID, inv.BusinessID, inv.InvoiceNumber, inv.CustomerName, inv.CustomerEmail,
		inv.Amount, inv.Currency, inv.Status, inv.DueDate, inv.IssueDate, inv.PaidDate, jsonOrArr(inv.Items), inv.Notes,
		inv.CreatedAt, inv.UpdatedAt)
	return err
}

func (r *Repository) Update(ctx context.Context, inv *Invoice) error {
	inv.UpdatedAt = time.Now()
	query := `UPDATE invoices SET invoice_number=$3, customer_name=$4, customer_email=$5,
		amount=$6, currency=$7, status=$8, due_date=$9, issue_date=$10, paid_date=$11,
		items=$12::jsonb, notes=$13, updated_at=$14 WHERE id=$1 AND user_id=$2`
	_, err := r.db.Exec(ctx, query, inv.ID, inv.UserID, inv.InvoiceNumber, inv.CustomerName, inv.CustomerEmail,
		inv.Amount, inv.Currency, inv.Status, inv.DueDate, inv.IssueDate, inv.PaidDate, jsonOrArr(inv.Items), inv.Notes, inv.UpdatedAt)
	return err
}

func (r *Repository) UpdateStatus(ctx context.Context, id, status string) error {
	paidDate := interface{}(nil)
	if status == "paid" {
		paidDate = time.Now()
	}
	_, err := r.db.Exec(ctx, "UPDATE invoices SET status=$2, paid_date=$3, updated_at=NOW() WHERE id=$1", id, status, paidDate)
	return err
}

func (r *Repository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM invoices WHERE id=$1 AND user_id=$2", id, userID)
	return err
}

func jsonOrArr(s string) string {
	if s == "" {
		return "[]"
	}
	return s
}
