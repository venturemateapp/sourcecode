package marketplace

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListProviders(ctx context.Context, activeOnly bool) ([]ServiceProvider, error) {
	where := ""
	if activeOnly {
		where = " WHERE is_active = true"
	}
	rows, err := r.db.Query(ctx, `SELECT id, name, title, category, COALESCE(bio,''), COALESCE(picture,''),
		COALESCE(rate_hourly,0), COALESCE(years_experience,0), COALESCE(skills::text,'[]'), COALESCE(portfolio::text,'[]'),
		is_active, created_at, updated_at FROM service_providers`+where+` ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ServiceProvider
	for rows.Next() {
		var p ServiceProvider
		if err := rows.Scan(&p.ID, &p.Name, &p.Title, &p.Category, &p.Bio, &p.Picture,
			&p.RateHourly, &p.YearsExp, &p.Skills, &p.Portfolio,
			&p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, nil
}

func (r *Repository) UpsertProvider(ctx context.Context, p *ServiceProvider) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	p.UpdatedAt = time.Now()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = p.UpdatedAt
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO service_providers (id, name, title, category, bio, picture, rate_hourly, years_experience, skills, portfolio, is_active, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13)
		ON CONFLICT (id) DO UPDATE SET name=$2, title=$3, category=$4, bio=$5, picture=$6, rate_hourly=$7, years_experience=$8,
		skills=$9::jsonb, portfolio=$10::jsonb, is_active=$11, updated_at=$13`,
		p.ID, p.Name, p.Title, p.Category, p.Bio, p.Picture, p.RateHourly, p.YearsExp, p.Skills, p.Portfolio, p.IsActive, p.CreatedAt, p.UpdatedAt)
	return err
}

func (r *Repository) DeleteProvider(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM service_providers WHERE id = $1`, id)
	return err
}

func (r *Repository) CreateBooking(ctx context.Context, b *Booking) error {
	b.ID = uuid.New().String()
	b.Status = "pending"
	b.CreatedAt = time.Now()
	b.UpdatedAt = b.CreatedAt
	_, err := r.db.Exec(ctx, `
		INSERT INTO bookings (id, provider_id, user_id, business_id, project_title, description, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		b.ID, b.ProviderID, b.UserID, b.BusinessID, b.ProjectTitle, b.Description, b.Status, b.CreatedAt, b.UpdatedAt)
	return err
}

func (r *Repository) ListBookings(ctx context.Context, userID string, admin bool) ([]Booking, error) {
	var query string
	if admin {
		query = `SELECT b.id, b.provider_id, b.user_id, COALESCE(b.business_id,''), b.project_title, COALESCE(b.description,''),
			b.status, COALESCE(b.admin_notes,''), b.created_at, b.updated_at,
			COALESCE(p.name,''), COALESCE(u.first_name || ' ' || u.surname,'')
			FROM bookings b
			LEFT JOIN service_providers p ON p.id = b.provider_id
			LEFT JOIN users u ON u.id = b.user_id
			ORDER BY b.created_at DESC`
	} else {
		query = `SELECT b.id, b.provider_id, b.user_id, COALESCE(b.business_id,''), b.project_title, COALESCE(b.description,''),
			b.status, COALESCE(b.admin_notes,''), b.created_at, b.updated_at,
			COALESCE(p.name,''), ''
			FROM bookings b
			LEFT JOIN service_providers p ON p.id = b.provider_id
			WHERE b.user_id = $1 OR b.provider_id IN (SELECT id FROM service_providers WHERE created_by = $1)
			ORDER BY b.created_at DESC`
	}
	rows, err := r.db.Query(ctx, query)
	if !admin {
		if err != nil {
			return nil, err
		}
		rows, err = r.db.Query(ctx, query, userID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Booking
	for rows.Next() {
		var b Booking
		if err := rows.Scan(&b.ID, &b.ProviderID, &b.UserID, &b.BusinessID, &b.ProjectTitle, &b.Description,
			&b.Status, &b.AdminNotes, &b.CreatedAt, &b.UpdatedAt, &b.ProviderName, &b.UserName); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, nil
}

func (r *Repository) UpdateBookingStatus(ctx context.Context, id, status, adminNotes string) error {
	_, err := r.db.Exec(ctx, `UPDATE bookings SET status = $1, admin_notes = $2, updated_at = $3 WHERE id = $4`,
		status, adminNotes, time.Now(), id)
	return err
}
