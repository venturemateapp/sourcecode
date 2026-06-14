package registrations

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

const regListQuery = `SELECT id, business_id, user_id, registration_type, status,
	legal_name, tax_id, owner_name, owner_dob, owner_ssn, owner_email, owner_phone,
	address_street, address_city, address_state, address_zip, address_country,
	documents::text, admin_notes, created_at, updated_at FROM business_registrations`

func scanRegistration(row pgx.Row) (*BusinessRegistration, error) {
	var r BusinessRegistration
	err := row.Scan(&r.ID, &r.BusinessID, &r.UserID, &r.RegistrationType, &r.Status,
		&r.LegalName, &r.TaxID, &r.OwnerName, &r.OwnerDOB, &r.OwnerSSN, &r.OwnerEmail, &r.OwnerPhone,
		&r.AddressStreet, &r.AddressCity, &r.AddressState, &r.AddressZip, &r.AddressCountry,
		&r.Documents, &r.AdminNotes, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func scanRegistrations(rows pgx.Rows) ([]BusinessRegistration, error) {
	defer rows.Close()
	var list []BusinessRegistration
	for rows.Next() {
		r, err := scanRegistration(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *r)
	}
	return list, nil
}

func (r *Repository) Create(ctx context.Context, reg *BusinessRegistration) error {
	reg.ID = uuid.New().String()
	reg.CreatedAt = time.Now()
	reg.UpdatedAt = time.Now()
	if reg.Status == "" {
		reg.Status = "pending"
	}
	query := `INSERT INTO business_registrations (id, business_id, user_id, registration_type, status,
		legal_name, tax_id, owner_name, owner_dob, owner_ssn, owner_email, owner_phone,
		address_street, address_city, address_state, address_zip, address_country,
		documents, admin_notes, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20,$21)`
	_, err := r.db.Exec(ctx, query,
		reg.ID, reg.BusinessID, reg.UserID, reg.RegistrationType, reg.Status,
		reg.LegalName, reg.TaxID, reg.OwnerName, reg.OwnerDOB, reg.OwnerSSN, reg.OwnerEmail, reg.OwnerPhone,
		reg.AddressStreet, reg.AddressCity, reg.AddressState, reg.AddressZip, reg.AddressCountry,
		jsonOrArr(reg.Documents), reg.AdminNotes, reg.CreatedAt, reg.UpdatedAt)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id string) (*BusinessRegistration, error) {
	return scanRegistration(r.db.QueryRow(ctx, regListQuery+" WHERE id = $1", id))
}

func (r *Repository) ListByBusiness(ctx context.Context, businessID string) ([]BusinessRegistration, error) {
	rows, err := r.db.Query(ctx, regListQuery+" WHERE business_id = $1 ORDER BY created_at DESC", businessID)
	if err != nil {
		return nil, err
	}
	return scanRegistrations(rows)
}

func (r *Repository) ListByUser(ctx context.Context, userID string) ([]BusinessRegistration, error) {
	rows, err := r.db.Query(ctx, regListQuery+" WHERE user_id = $1 ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	return scanRegistrations(rows)
}

func (r *Repository) ListAll(ctx context.Context) ([]BusinessRegistration, error) {
	rows, err := r.db.Query(ctx, regListQuery+" ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	return scanRegistrations(rows)
}

func (r *Repository) ListByStatus(ctx context.Context, status string) ([]BusinessRegistration, error) {
	rows, err := r.db.Query(ctx, regListQuery+" WHERE status = $1 ORDER BY created_at DESC", status)
	if err != nil {
		return nil, err
	}
	return scanRegistrations(rows)
}

func (r *Repository) UpdateStatus(ctx context.Context, id, status, adminNotes string) error {
	_, err := r.db.Exec(ctx,
		"UPDATE business_registrations SET status=$2, admin_notes=$3, updated_at=NOW() WHERE id=$1",
		id, status, adminNotes)
	return err
}

func jsonOrArr(s string) string {
	if s == "" {
		return "[]"
	}
	return s
}
