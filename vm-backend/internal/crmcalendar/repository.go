package crmcalendar

import (
	"context"
	"fmt"
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

const calAcctCols = `id, user_id, business_id, email, provider, caldav_url, sync_enabled, last_synced_at, created_at, updated_at`

func scanCalAccount(row pgx.Row) (*CalendarAccount, error) {
	var a CalendarAccount
	err := row.Scan(&a.ID, &a.UserID, &a.BusinessID, &a.Email, &a.Provider, &a.CalDAVURL, &a.SyncEnabled, &a.LastSyncedAt, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Repository) ListAccounts(ctx context.Context, businessID string) ([]CalendarAccount, error) {
	rows, err := r.db.Query(ctx, `SELECT `+calAcctCols+` FROM crm_calendar_accounts WHERE business_id = $1 ORDER BY email`, businessID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []CalendarAccount
	for rows.Next() {
		a, err := scanCalAccount(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *a)
	}
	return list, nil
}

// ListAllEnabled returns every calendar account with sync_enabled = true,
// including credentials, so the background scheduler can sync them.
func (r *Repository) ListAllEnabled(ctx context.Context) ([]CalendarAccount, error) {
	rows, err := r.db.Query(ctx, `SELECT `+calAcctCols+` FROM crm_calendar_accounts WHERE sync_enabled = true ORDER BY email`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []CalendarAccount
	for rows.Next() {
		a, err := scanCalAccount(rows)
		if err != nil {
			return nil, err
		}
		if err := r.db.QueryRow(ctx, `SELECT caldav_username, caldav_password FROM crm_calendar_accounts WHERE id = $1`, a.ID).Scan(&a.CalDAVUsername, &a.CalDAVPassword); err != nil {
			return nil, fmt.Errorf("fetch caldav credentials: %w", err)
		}
		list = append(list, *a)
	}
	return list, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*CalendarAccount, error) {
	var a CalendarAccount
	err := r.db.QueryRow(ctx, `SELECT `+calAcctCols+` FROM crm_calendar_accounts WHERE id = $1`, id).Scan(
		&a.ID, &a.UserID, &a.BusinessID, &a.Email, &a.Provider, &a.CalDAVURL, &a.SyncEnabled, &a.LastSyncedAt, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if err := r.db.QueryRow(ctx, `SELECT caldav_username, caldav_password FROM crm_calendar_accounts WHERE id = $1`, id).Scan(&a.CalDAVUsername, &a.CalDAVPassword); err != nil {
		return nil, fmt.Errorf("fetch caldav credentials: %w", err)
	}
	return &a, nil
}

func (r *Repository) CreateAccount(ctx context.Context, a *CalendarAccount) error {
	a.ID = uuid.New().String()
	a.CreatedAt = time.Now()
	a.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx,
		`INSERT INTO crm_calendar_accounts (id, user_id, business_id, email, provider, caldav_url, caldav_username, caldav_password, sync_enabled, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		a.ID, a.UserID, a.BusinessID, a.Email, a.Provider, a.CalDAVURL, a.CalDAVUsername, a.CalDAVPassword, a.SyncEnabled, a.CreatedAt, a.UpdatedAt)
	return err
}

func (r *Repository) DeleteAccount(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM crm_calendar_accounts WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

func (r *Repository) UpdateLastSync(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE crm_calendar_accounts SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1`, id)
	return err
}

const evCols = `id, account_id, business_id, uid, title, description, location, start_time, end_time, is_all_day, status, contact_id, company_id, created_at, updated_at`

func scanEvent(row pgx.Row) (*CalendarEvent, error) {
	var e CalendarEvent
	err := row.Scan(&e.ID, &e.AccountID, &e.BusinessID, &e.UID, &e.Title, &e.Description, &e.Location,
		&e.StartTime, &e.EndTime, &e.IsAllDay, &e.Status, &e.ContactID, &e.CompanyID, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *Repository) ListEvents(ctx context.Context, businessID string, from, to time.Time) ([]CalendarEvent, error) {
	rows, err := r.db.Query(ctx, `SELECT `+evCols+` FROM crm_events WHERE business_id = $1 AND start_time >= $2 AND end_time <= $3 ORDER BY start_time ASC`, businessID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []CalendarEvent
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *e)
	}
	return list, nil
}

func (r *Repository) UpsertEvent(ctx context.Context, e *CalendarEvent) error {
	var existingID string
	err := r.db.QueryRow(ctx, `SELECT id FROM crm_events WHERE uid = $1 AND account_id = $2`, e.UID, e.AccountID).Scan(&existingID)
	if err == nil {
		_, err = r.db.Exec(ctx,
			`UPDATE crm_events SET title=$3, description=$4, location=$5, start_time=$6, end_time=$7, is_all_day=$8, status=$9, contact_id=$10, company_id=$11, updated_at=NOW() WHERE id=$1`,
			existingID, e.AccountID, e.Title, e.Description, e.Location, e.StartTime, e.EndTime, e.IsAllDay, e.Status, e.ContactID, e.CompanyID)
		return err
	}
	e.ID = uuid.New().String()
	e.CreatedAt = time.Now()
	e.UpdatedAt = time.Now()
	_, err = r.db.Exec(ctx,
		`INSERT INTO crm_events (id, account_id, business_id, uid, title, description, location, start_time, end_time, is_all_day, status, contact_id, company_id, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		e.ID, e.AccountID, e.BusinessID, e.UID, e.Title, e.Description, e.Location, e.StartTime, e.EndTime, e.IsAllDay, e.Status, e.ContactID, e.CompanyID, e.CreatedAt, e.UpdatedAt)
	return err
}
