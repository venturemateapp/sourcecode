package crmemail

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

const acctCols = `id, user_id, business_id, email, provider, imap_host, imap_port,
	imap_username, smtp_host, smtp_port, smtp_username, sync_enabled, last_synced_at, created_at, updated_at`

func scanAccount(row pgx.Row) (*EmailAccount, error) {
	var a EmailAccount
	err := row.Scan(&a.ID, &a.UserID, &a.BusinessID, &a.Email, &a.Provider,
		&a.ImapHost, &a.ImapPort, &a.ImapUsername,
		&a.SmtpHost, &a.SmtpPort, &a.SmtpUsername,
		&a.SyncEnabled, &a.LastSyncedAt, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*EmailAccount, error) {
	var a EmailAccount
	err := r.db.QueryRow(ctx, `SELECT `+acctCols+` FROM crm_email_accounts WHERE id = $1`, id).Scan(
		&a.ID, &a.UserID, &a.BusinessID, &a.Email, &a.Provider,
		&a.ImapHost, &a.ImapPort, &a.ImapUsername,
		&a.SmtpHost, &a.SmtpPort, &a.SmtpUsername,
		&a.SyncEnabled, &a.LastSyncedAt, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Also fetch passwords separately for sync
	r.db.QueryRow(ctx, `SELECT imap_password, smtp_password FROM crm_email_accounts WHERE id = $1`, id).Scan(&a.ImapPassword, &a.SmtpPassword)
	return &a, nil
}

func (r *Repository) ListAccounts(ctx context.Context, businessID string) ([]EmailAccount, error) {
	rows, err := r.db.Query(ctx, `SELECT `+acctCols+` FROM crm_email_accounts WHERE business_id = $1 ORDER BY email`, businessID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []EmailAccount
	for rows.Next() {
		a, err := scanAccount(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *a)
	}
	return list, nil
}

func (r *Repository) CreateAccount(ctx context.Context, a *EmailAccount) error {
	a.ID = uuid.New().String()
	a.CreatedAt = time.Now()
	a.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx,
		`INSERT INTO crm_email_accounts (id, user_id, business_id, email, provider,
		 imap_host, imap_port, imap_username, imap_password,
		 smtp_host, smtp_port, smtp_username, smtp_password,
		 sync_enabled, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		a.ID, a.UserID, a.BusinessID, a.Email, a.Provider,
		a.ImapHost, a.ImapPort, a.ImapUsername, a.ImapPassword,
		a.SmtpHost, a.SmtpPort, a.SmtpUsername, a.SmtpPassword,
		a.SyncEnabled, a.CreatedAt, a.UpdatedAt)
	return err
}

func (r *Repository) DeleteAccount(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM crm_email_accounts WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

func (r *Repository) UpdateLastSync(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE crm_email_accounts SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1`, id)
	return err
}

const emailCols = `id, account_id, business_id, message_id, in_reply_to, subject,
	from_address, from_name, to_addresses, cc_addresses, body_text,
	sent_at, received_at, is_read, is_starred, folder, thread_id, contact_id, company_id, created_at`

func scanEmail(row pgx.Row) (*Email, error) {
	var e Email
	err := row.Scan(&e.ID, &e.AccountID, &e.BusinessID, &e.MessageID, &e.InReplyTo, &e.Subject,
		&e.FromAddress, &e.FromName, &e.ToAddresses, &e.CcAddresses, &e.BodyText,
		&e.SentAt, &e.ReceivedAt, &e.IsRead, &e.IsStarred, &e.Folder, &e.ThreadID,
		&e.ContactID, &e.CompanyID, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *Repository) ListEmails(ctx context.Context, businessID string, folder string, limit int) ([]Email, error) {
	if limit <= 0 {
		limit = 50
	}
	var rows pgx.Rows
	var err error
	if folder != "" {
		rows, err = r.db.Query(ctx, `SELECT `+emailCols+` FROM crm_emails WHERE business_id = $1 AND folder = $2 ORDER BY received_at DESC LIMIT $3`, businessID, folder, limit)
	} else {
		rows, err = r.db.Query(ctx, `SELECT `+emailCols+` FROM crm_emails WHERE business_id = $1 ORDER BY received_at DESC LIMIT $2`, businessID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Email
	for rows.Next() {
		e, err := scanEmail(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *e)
	}
	return list, nil
}

func (r *Repository) ListEmailsByContact(ctx context.Context, contactID string, limit int) ([]Email, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Query(ctx, `SELECT `+emailCols+` FROM crm_emails WHERE contact_id = $1 ORDER BY received_at DESC LIMIT $2`, contactID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Email
	for rows.Next() {
		e, err := scanEmail(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *e)
	}
	return list, nil
}

func (r *Repository) UpsertEmail(ctx context.Context, e *Email) error {
	existing := &Email{}
	err := r.db.QueryRow(ctx, `SELECT id FROM crm_emails WHERE message_id = $1 AND account_id = $2`, e.MessageID, e.AccountID).Scan(&existing.ID)
	if err == nil {
		// Update existing
		_, err = r.db.Exec(ctx,
			`UPDATE crm_emails SET subject=$3, body_text=$4, is_read=$5, is_starred=$6, folder=$7,
			 contact_id=$8, company_id=$9, received_at=NOW() WHERE id=$1`,
			existing.ID, e.AccountID, e.Subject, e.BodyText, e.IsRead, e.IsStarred, e.Folder, e.ContactID, e.CompanyID)
		return err
	}

	e.ID = uuid.New().String()
	e.CreatedAt = time.Now()
	_, err = r.db.Exec(ctx,
		`INSERT INTO crm_emails (id, account_id, business_id, message_id, in_reply_to, references_header,
		 subject, from_address, from_name, to_addresses, cc_addresses, body_text,
		 sent_at, received_at, is_read, is_starred, folder, thread_id, contact_id, company_id, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
		e.ID, e.AccountID, e.BusinessID, e.MessageID, e.InReplyTo, e.References,
		e.Subject, e.FromAddress, e.FromName, e.ToAddresses, e.CcAddresses, e.BodyText,
		e.SentAt, e.ReceivedAt, e.IsRead, e.IsStarred, e.Folder, e.ThreadID,
		e.ContactID, e.CompanyID, e.CreatedAt)
	return err
}

func (r *Repository) UpdateEmailRead(ctx context.Context, id string, isRead bool) error {
	_, err := r.db.Exec(ctx, `UPDATE crm_emails SET is_read = $1 WHERE id = $2`, isRead, id)
	return err
}

func (r *Repository) UpdateEmailContact(ctx context.Context, id string, contactID *string) error {
	_, err := r.db.Exec(ctx, `UPDATE crm_emails SET contact_id = $1 WHERE id = $2`, contactID, id)
	return err
}
