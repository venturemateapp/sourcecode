package banking

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

const listQuery = `SELECT id, user_id, business_id, bank_name, account_type, account_number, account_name, currency, status, created_at, updated_at FROM bank_accounts`

func scanAccount(row pgx.Row) (*BankAccount, error) {
	var a BankAccount
	err := row.Scan(&a.ID, &a.UserID, &a.BusinessID, &a.BankName, &a.AccountType, &a.AccountNumber, &a.AccountName, &a.Currency, &a.Status, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func scanAccounts(rows pgx.Rows) ([]BankAccount, error) {
	defer rows.Close()
	var list []BankAccount
	for rows.Next() {
		a, err := scanAccount(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *a)
	}
	return list, nil
}

func (r *Repository) ListByUser(ctx context.Context, userID string) ([]BankAccount, error) {
	rows, err := r.db.Query(ctx, listQuery+" WHERE user_id = $1 ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	return scanAccounts(rows)
}

func (r *Repository) GetByID(ctx context.Context, id string) (*BankAccount, error) {
	return scanAccount(r.db.QueryRow(ctx, listQuery+" WHERE id = $1", id))
}

func (r *Repository) Create(ctx context.Context, a *BankAccount) error {
	a.ID = uuid.New().String()
	a.CreatedAt = time.Now()
	a.UpdatedAt = time.Now()
	if a.Status == "" {
		a.Status = "pending"
	}
	query := `INSERT INTO bank_accounts (id, user_id, business_id, bank_name, account_type, account_number, account_name, currency, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`
	_, err := r.db.Exec(ctx, query, a.ID, a.UserID, a.BusinessID, a.BankName, a.AccountType, a.AccountNumber, a.AccountName, a.Currency, a.Status, a.CreatedAt, a.UpdatedAt)
	return err
}

func (r *Repository) Update(ctx context.Context, a *BankAccount) error {
	a.UpdatedAt = time.Now()
	query := `UPDATE bank_accounts SET bank_name=$3, account_type=$4, account_number=$5, account_name=$6, currency=$7, status=$8, updated_at=$9 WHERE id=$1 AND user_id=$2`
	_, err := r.db.Exec(ctx, query, a.ID, a.UserID, a.BankName, a.AccountType, a.AccountNumber, a.AccountName, a.Currency, a.Status, a.UpdatedAt)
	return err
}

func (r *Repository) UpdateStatus(ctx context.Context, id string, status string) error {
	_, err := r.db.Exec(ctx, "UPDATE bank_accounts SET status=$2, updated_at=NOW() WHERE id=$1", id, status)
	return err
}

func (r *Repository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM bank_accounts WHERE id=$1 AND user_id=$2", id, userID)
	return err
}

func (r *Repository) ListAll(ctx context.Context) ([]BankAccount, error) {
	rows, err := r.db.Query(ctx, listQuery+" ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	return scanAccounts(rows)
}
