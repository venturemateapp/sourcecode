package users

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

type AdminDashboard struct {
	TotalUsers       int              `json:"totalUsers"`
	ActiveUsers      int              `json:"activeUsers"`
	TotalBusinesses  int              `json:"totalBusinesses"`
	PlansBreakdown   []PlanCount      `json:"plansBreakdown"`
	RecentSignups    []User           `json:"recentSignups"`
}

type PlanCount struct {
	PlanName string `json:"planName"`
	Count    int    `json:"count"`
}

func (r *Repository) GetAdminDashboard(ctx context.Context) (*AdminDashboard, error) {
	dash := &AdminDashboard{}

	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&dash.TotalUsers)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE status = 'active'`).Scan(&dash.ActiveUsers)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM businesses`).Scan(&dash.TotalBusinesses)
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `SELECT sp.name, COUNT(us.id) as cnt FROM user_subscriptions us
		JOIN subscription_plans sp ON sp.id = us.plan_id
		GROUP BY sp.name ORDER BY cnt DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var pc PlanCount
		if err := rows.Scan(&pc.PlanName, &pc.Count); err != nil {
			return nil, err
		}
		dash.PlansBreakdown = append(dash.PlansBreakdown, pc)
	}

	rows2, err := r.db.Query(ctx, `SELECT id, first_name, surname, email, status, is_admin, created_at
		FROM users ORDER BY created_at DESC LIMIT 10`)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()
	for rows2.Next() {
		var u User
		if err := rows2.Scan(&u.ID, &u.FirstName, &u.Surname, &u.Email, &u.Status, &u.IsAdmin, &u.CreatedAt); err != nil {
			return nil, err
		}
		dash.RecentSignups = append(dash.RecentSignups, u)
	}

	return dash, nil
}

func (r *Repository) ListAllUsers(ctx context.Context) ([]User, error) {
	rows, err := r.db.Query(ctx, `SELECT id, first_name, surname, email, status, is_admin, created_at, updated_at
		FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.FirstName, &u.Surname, &u.Email, &u.Status, &u.IsAdmin, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT id, first_name, surname, COALESCE(other_names,''), COALESCE(dob::text,''), email, password, 
	                 COALESCE(primary_phone,''), COALESCE(secondary_phone,''), COALESCE(picture,''), COALESCE(bio,''), COALESCE(country,''), COALESCE(city,''), COALESCE(language,''), COALESCE(linked_in,''), COALESCE(twitter,''), COALESCE(website,''),
	                 onboarded, status, is_admin, created_at, updated_at 
	          FROM users WHERE email = $1`

	var u User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.FirstName, &u.Surname, &u.OtherNames, &u.DOB, &u.Email, &u.Password,
		&u.PrimaryPhone, &u.SecondaryPhone, &u.Picture, &u.Bio, &u.Country, &u.City, &u.Language,
		&u.LinkedIn, &u.Twitter, &u.Website,
		&u.Onboarded, &u.Status, &u.IsAdmin, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) Create(ctx context.Context, u *User) error {
	u.ID = uuid.New().String()
	u.CreatedAt = time.Now()
	u.UpdatedAt = time.Now()
	if u.Status == "" {
		u.Status = "active"
	}

	dob := interface{}(nil)
	if u.DOB != "" {
		dob = u.DOB
	}
	otherNames := interface{}(nil)
	if u.OtherNames != "" {
		otherNames = u.OtherNames
	}
	primaryPhone := interface{}(nil)
	if u.PrimaryPhone != "" {
		primaryPhone = u.PrimaryPhone
	}
	secondaryPhone := interface{}(nil)
	if u.SecondaryPhone != "" {
		secondaryPhone = u.SecondaryPhone
	}
	picture := interface{}(nil)
	if u.Picture != "" {
		picture = u.Picture
	}
	bio := interface{}(nil)
	if u.Bio != "" {
		bio = u.Bio
	}
	country := interface{}(nil)
	if u.Country != "" {
		country = u.Country
	}
	city := interface{}(nil)
	if u.City != "" {
		city = u.City
	}
	language := interface{}(nil)
	if u.Language != "" {
		language = u.Language
	}
	linkedIn := interface{}(nil)
	if u.LinkedIn != "" {
		linkedIn = u.LinkedIn
	}
	twitter := interface{}(nil)
	if u.Twitter != "" {
		twitter = u.Twitter
	}
	website := interface{}(nil)
	if u.Website != "" {
		website = u.Website
	}

	query := `INSERT INTO users (id, first_name, surname, other_names, dob, email, password, 
	                             primary_phone, secondary_phone, picture, bio, country, city, language, linked_in, twitter, website,
	                             onboarded, status, is_admin, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`

	_, err := r.db.Exec(ctx, query,
		u.ID, u.FirstName, u.Surname, otherNames, dob, u.Email, u.Password,
		primaryPhone, secondaryPhone, picture, bio, country, city, language, linkedIn, twitter, website,
		u.Onboarded, u.Status, u.IsAdmin, u.CreatedAt, u.UpdatedAt,
	)
	return err
}

func (r *Repository) FindByID(ctx context.Context, id string) (*User, error) {
	query := `SELECT id, first_name, surname, COALESCE(other_names,''), COALESCE(dob::text,''), email, password, 
	                 COALESCE(primary_phone,''), COALESCE(secondary_phone,''), COALESCE(picture,''), COALESCE(bio,''), COALESCE(country,''), COALESCE(city,''), COALESCE(language,''), COALESCE(linked_in,''), COALESCE(twitter,''), COALESCE(website,''),
	                 onboarded, status, is_admin, created_at, updated_at 
	          FROM users WHERE id = $1`

	var u User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.FirstName, &u.Surname, &u.OtherNames, &u.DOB, &u.Email, &u.Password,
		&u.PrimaryPhone, &u.SecondaryPhone, &u.Picture, &u.Bio, &u.Country, &u.City, &u.Language,
		&u.LinkedIn, &u.Twitter, &u.Website,
		&u.Onboarded, &u.Status, &u.IsAdmin, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id, firstName, surname, otherNames, dob, primaryPhone, secondaryPhone, picture, bio, country, city, language, linkedIn, twitter, website, preferredCurrency string) error {
	query := `UPDATE users SET first_name = $1, surname = $2, other_names = $3, dob = $4,
	          primary_phone = $5, secondary_phone = $6, picture = $7, bio = $8, country = $9, city = $10, language = $11,
	          linked_in = $12, twitter = $13, website = $14, preferred_currency = $15,
	          updated_at = $16 WHERE id = $17`

	nilIfEmpty := func(s string) interface{} {
		if s == "" {
			return nil
		}
		return s
	}

	_, err := r.db.Exec(ctx, query,
		firstName, surname,
		nilIfEmpty(otherNames), nilIfEmpty(dob),
		nilIfEmpty(primaryPhone), nilIfEmpty(secondaryPhone),
		nilIfEmpty(picture), nilIfEmpty(bio),
		nilIfEmpty(country), nilIfEmpty(city), nilIfEmpty(language),
		nilIfEmpty(linkedIn), nilIfEmpty(twitter), nilIfEmpty(website),
		nilIfEmpty(preferredCurrency),
		time.Now(), id,
	)
	return err
}

func (r *Repository) UpdatePicture(ctx context.Context, userID, pictureURL string) error {
	query := `UPDATE users SET picture = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, pictureURL, time.Now(), userID)
	return err
}

func (r *Repository) GetSettings(ctx context.Context, userID string) (string, error) {
	query := `SELECT COALESCE(settings::text, '{}') FROM users WHERE id = $1`
	var settings string
	err := r.db.QueryRow(ctx, query, userID).Scan(&settings)
	if err != nil {
		return "{}", err
	}
	return settings, nil
}

func (r *Repository) UpdateSettings(ctx context.Context, userID, settingsJSON string) error {
	query := `UPDATE users SET settings = $1::jsonb, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, settingsJSON, time.Now(), userID)
	return err
}

func (r *Repository) ChangePassword(ctx context.Context, userID, newPasswordHash string) error {
	query := `UPDATE users SET password = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, newPasswordHash, time.Now(), userID)
	return err
}

func (r *Repository) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET status = $1, updated_at = $2 WHERE id = $3`, status, time.Now(), id)
	return err
}

func (r *Repository) UpdateIsAdmin(ctx context.Context, id string, isAdmin bool) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET is_admin = $1, updated_at = $2 WHERE id = $3`, isAdmin, time.Now(), id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}
