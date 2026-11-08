package investors

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type ConnectionStatus struct {
	InvestorID string    `json:"investorId"`
	Status     string    `json:"status"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type ConnectionRequest struct {
	ID                  string    `json:"id"`
	InvestorID          string    `json:"investorId"`
	InvestorName        string    `json:"investorName"`
	InvestorLogo        string    `json:"investorLogo"`
	InvestorEmail       string    `json:"investorEmail"`
	InvestorPhone       string    `json:"investorPhone"`
	BusinessID          string    `json:"businessId"`
	BusinessName        string    `json:"businessName"`
	BusinessDescription string    `json:"businessDescription"`
	BusinessIndustry    string    `json:"businessIndustry"`
	UserID              string    `json:"userId"`
	UserName            string    `json:"userName"`
	UserEmail           string    `json:"userEmail"`
	UserPhone           string    `json:"userPhone"`
	Status              string    `json:"status"`
	AdminNotes          string    `json:"adminNotes"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

func scanConnectionRequest(row pgx.Row) (*ConnectionRequest, error) {
	var request ConnectionRequest
	err := row.Scan(
		&request.ID, &request.InvestorID, &request.InvestorName, &request.InvestorLogo,
		&request.InvestorEmail, &request.InvestorPhone,
		&request.BusinessID, &request.BusinessName, &request.BusinessDescription, &request.BusinessIndustry,
		&request.UserID, &request.UserName, &request.UserEmail, &request.UserPhone,
		&request.Status, &request.AdminNotes, &request.CreatedAt, &request.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &request, nil
}

const connectionRequestDetailsQuery = `
	SELECT r.id, r.investor_id, i.name, COALESCE(i.logo,''), COALESCE(i.email,''), COALESCE(i.phone,''),
		r.business_id, b.name, COALESCE(b.description,''), COALESCE(b.industry,''),
		r.user_id, COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.surname),''), u.email),
		COALESCE(u.email,''), COALESCE(u.primary_phone,''), r.status, COALESCE(r.admin_notes,''),
		r.created_at, r.updated_at
	FROM investor_connection_requests r
	JOIN investors i ON i.id = r.investor_id
	JOIN businesses b ON b.id = r.business_id
	JOIN users u ON u.id = r.user_id`

// RequestConnection creates a pending request. A previously declined request can
// be resubmitted; existing pending, approved, or connected requests are returned unchanged.
func (r *Repository) RequestConnection(ctx context.Context, investorID, businessID, userID string) (*ConnectionRequest, bool, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	id := uuid.New().String()
	var requestID string
	err = tx.QueryRow(ctx, `
		INSERT INTO investor_connection_requests (id, investor_id, business_id, user_id)
		SELECT $1, i.id, b.id, b.user_id
		FROM investors i
		JOIN businesses b ON b.id = $3 AND b.user_id = $4
		WHERE i.id = $2 AND i.is_active = TRUE
		ON CONFLICT (investor_id, business_id) DO NOTHING
		RETURNING id`, id, investorID, businessID, userID).Scan(&requestID)

	created := err == nil
	if err != nil && err != pgx.ErrNoRows {
		return nil, false, err
	}
	if !created {
		err = tx.QueryRow(ctx, `
			UPDATE investor_connection_requests
			SET status = 'pending', admin_notes = '', updated_at = NOW()
			WHERE investor_id = $1 AND business_id = $2 AND user_id = $3 AND status = 'declined'
			RETURNING id`, investorID, businessID, userID).Scan(&requestID)
		if err == nil {
			created = true
		} else if err != pgx.ErrNoRows {
			return nil, false, err
		} else {
			err = tx.QueryRow(ctx, `SELECT id FROM investor_connection_requests WHERE investor_id = $1 AND business_id = $2`, investorID, businessID).Scan(&requestID)
			if err != nil {
				return nil, false, err
			}
		}
	}

	request, err := scanConnectionRequest(tx.QueryRow(ctx, connectionRequestDetailsQuery+` WHERE r.id = $1`, requestID))
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, false, err
	}
	return request, created, nil
}

func (r *Repository) ListConnectionStatuses(ctx context.Context, userID, businessID string) ([]ConnectionStatus, error) {
	rows, err := r.db.Query(ctx, `
		SELECT r.investor_id, r.status, r.updated_at
		FROM investor_connection_requests r
		JOIN investors i ON i.id = r.investor_id
		WHERE r.user_id = $1 AND r.business_id = $2 AND i.is_active = TRUE
		ORDER BY r.updated_at DESC`, userID, businessID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []ConnectionStatus
	for rows.Next() {
		var request ConnectionStatus
		if err := rows.Scan(&request.InvestorID, &request.Status, &request.UpdatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, request)
	}
	return requests, rows.Err()
}

func (r *Repository) ListConnectionRequests(ctx context.Context) ([]ConnectionRequest, error) {
	rows, err := r.db.Query(ctx, connectionRequestDetailsQuery+` ORDER BY r.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []ConnectionRequest
	for rows.Next() {
		request, err := scanConnectionRequest(rows)
		if err != nil {
			return nil, err
		}
		requests = append(requests, *request)
	}
	return requests, rows.Err()
}

func (r *Repository) GetConnectionRequest(ctx context.Context, id string) (*ConnectionRequest, error) {
	return scanConnectionRequest(r.db.QueryRow(ctx, connectionRequestDetailsQuery+` WHERE r.id = $1`, id))
}

func (r *Repository) UpdateConnectionStatus(ctx context.Context, id, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE investor_connection_requests SET status = $1, updated_at = NOW() WHERE id = $2`, status, id)
	return err
}
