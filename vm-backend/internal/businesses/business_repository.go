package businesses

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func jsonOrObj(s string) string {
	if s == "" {
		return "{}"
	}
	return s
}

func jsonOrArr(s string) string {
	if s == "" {
		return "[]"
	}
	return s
}

func dateOrEmpty(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02")
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const listQuery = `SELECT id, user_id, name, tagline, description, industry, stage, founded_date::text, location, website,
	status, brand_kit::text, pitch_deck::text, business_plan::text, milestones::text, team::text,
	documents::text, website_config::text, financials::text, metrics::text, ai_generated::text,
	created_at, updated_at FROM businesses`

func scanBusiness(row pgx.Row) (*Business, error) {
	var b Business
	var foundedDate string
	err := row.Scan(&b.ID, &b.UserID, &b.Name, &b.Tagline, &b.Description, &b.Industry, &b.Stage,
		&foundedDate, &b.Location, &b.Website, &b.Status,
		&b.BrandKit, &b.PitchDeck, &b.BusinessPlan, &b.Milestones, &b.Team,
		&b.Documents, &b.WebsiteConfig, &b.Financials, &b.Metrics, &b.AIGenerated,
		&b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if foundedDate != "" {
		if t, err := time.Parse("2006-01-02", foundedDate); err == nil {
			b.FoundedDate = &t
		}
	}
	return &b, nil
}

func scanBusinesses(rows pgx.Rows) ([]Business, error) {
	defer rows.Close()
	var list []Business
	for rows.Next() {
		b, err := scanBusiness(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *b)
	}
	return list, nil
}

func (r *Repository) ListByUser(ctx context.Context, userID string) ([]Business, error) {
	rows, err := r.db.Query(ctx, listQuery+" WHERE user_id = $1 ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	return scanBusinesses(rows)
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Business, error) {
	return scanBusiness(r.db.QueryRow(ctx, listQuery+" WHERE id = $1", id))
}

func (r *Repository) Create(ctx context.Context, b *Business) error {
	b.ID = uuid.New().String()
	b.CreatedAt = time.Now()
	b.UpdatedAt = time.Now()
	if b.Status == "" {
		b.Status = "active"
	}
	query := `INSERT INTO businesses (id, user_id, name, tagline, description, industry, stage, founded_date, location, website,
		status, brand_kit, pitch_deck, business_plan, milestones, team, documents, website_config, financials, metrics, ai_generated,
		created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22,$23)`
	_, err := r.db.Exec(ctx, query, b.ID, b.UserID, b.Name, b.Tagline, b.Description, b.Industry, b.Stage,
		dateOrEmpty(b.FoundedDate), b.Location, b.Website, b.Status,
		jsonOrObj(b.BrandKit), jsonOrObj(b.PitchDeck), jsonOrObj(b.BusinessPlan), jsonOrArr(b.Milestones), jsonOrArr(b.Team),
		jsonOrArr(b.Documents), jsonOrObj(b.WebsiteConfig), jsonOrObj(b.Financials), jsonOrObj(b.Metrics), jsonOrObj(b.AIGenerated),
		b.CreatedAt, b.UpdatedAt)
	return err
}

func (r *Repository) Update(ctx context.Context, b *Business) error {
	b.UpdatedAt = time.Now()
	query := `UPDATE businesses SET name=$3, tagline=$4, description=$5, industry=$6, stage=$7,
		founded_date=$8, location=$9, website=$10, status=$11,
		brand_kit=$12::jsonb, pitch_deck=$13::jsonb, business_plan=$14::jsonb,
		milestones=$15::jsonb, team=$16::jsonb, documents=$17::jsonb,
		website_config=$18::jsonb, financials=$19::jsonb, metrics=$20::jsonb, ai_generated=$21::jsonb,
		updated_at=$22 WHERE id=$1 AND user_id=$2`
	_, err := r.db.Exec(ctx, query, b.ID, b.UserID, b.Name, b.Tagline, b.Description, b.Industry, b.Stage,
		dateOrEmpty(b.FoundedDate), b.Location, b.Website, b.Status,
		jsonOrObj(b.BrandKit), jsonOrObj(b.PitchDeck), jsonOrObj(b.BusinessPlan), jsonOrArr(b.Milestones), jsonOrArr(b.Team),
		jsonOrArr(b.Documents), jsonOrObj(b.WebsiteConfig), jsonOrObj(b.Financials), jsonOrObj(b.Metrics), jsonOrObj(b.AIGenerated),
		b.UpdatedAt)
	return err
}

func (r *Repository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM businesses WHERE id=$1 AND user_id=$2", id, userID)
	return err
}

func (r *Repository) GetByIDAndUser(ctx context.Context, id, userID string) (*Business, error) {
	return scanBusiness(r.db.QueryRow(ctx, listQuery+" WHERE id=$1 AND user_id=$2", id, userID))
}
