package websites

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

func (r *Repository) ListTemplates(ctx context.Context) ([]WebsiteTemplate, error) {
	rows, err := r.db.Query(ctx, `SELECT id, name, description, thumbnail, category, template_data::text, is_active, created_at, updated_at FROM website_templates WHERE is_active = true ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []WebsiteTemplate
	for rows.Next() {
		var t WebsiteTemplate
		if err := rows.Scan(&t.ID, &t.Name, &t.Description, &t.Thumbnail, &t.Category, &t.TemplateData, &t.IsActive, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, nil
}

func (r *Repository) GetTemplateByID(ctx context.Context, id string) (*WebsiteTemplate, error) {
	row := r.db.QueryRow(ctx, `SELECT id, name, description, thumbnail, category, template_data::text, is_active, created_at, updated_at FROM website_templates WHERE id = $1`, id)
	var t WebsiteTemplate
	if err := row.Scan(&t.ID, &t.Name, &t.Description, &t.Thumbnail, &t.Category, &t.TemplateData, &t.IsActive, &t.CreatedAt, &t.UpdatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *Repository) GetWebsiteByBusiness(ctx context.Context, businessID string) (*UserWebsite, error) {
	row := r.db.QueryRow(ctx, `SELECT id, business_id, template_id, subdomain, custom_domain, pages::text, global_styles::text, navigation::text, footer::text, status, published_at, last_modified, created_at, updated_at FROM user_websites WHERE business_id = $1`, businessID)
	var w UserWebsite
	if err := row.Scan(&w.ID, &w.BusinessID, &w.TemplateID, &w.Subdomain, &w.CustomDomain, &w.Pages, &w.GlobalStyles, &w.Navigation, &w.Footer, &w.Status, &w.PublishedAt, &w.LastModified, &w.CreatedAt, &w.UpdatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &w, nil
}

func (r *Repository) CreateWebsite(ctx context.Context, w *UserWebsite) error {
	w.ID = uuid.New().String()
	now := time.Now()
	w.CreatedAt = now
	w.UpdatedAt = now
	w.LastModified = now
	if w.Status == "" {
		w.Status = StatusDraft
	}
	if w.Pages == "" {
		w.Pages = "[]"
	}
	if w.GlobalStyles == "" {
		w.GlobalStyles = "{}"
	}
	if w.Navigation == "" {
		w.Navigation = "{}"
	}
	if w.Footer == "" {
		w.Footer = "{}"
	}
	_, err := r.db.Exec(ctx, `INSERT INTO user_websites (id, business_id, template_id, subdomain, custom_domain, pages, global_styles, navigation, footer, status, published_at, last_modified, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14)`,
		w.ID, w.BusinessID, w.TemplateID, w.Subdomain, w.CustomDomain, w.Pages, w.GlobalStyles, w.Navigation, w.Footer, w.Status, w.PublishedAt, w.LastModified, w.CreatedAt, w.UpdatedAt)
	return err
}

func (r *Repository) UpdateWebsite(ctx context.Context, w *UserWebsite) error {
	w.UpdatedAt = time.Now()
	w.LastModified = time.Now()
	_, err := r.db.Exec(ctx, `UPDATE user_websites SET template_id=$3, subdomain=$4, custom_domain=$5, pages=$6::jsonb, global_styles=$7::jsonb, navigation=$8::jsonb, footer=$9::jsonb, status=$10, published_at=$11, last_modified=$12, updated_at=$13 WHERE id=$1 AND business_id=$2`,
		w.ID, w.BusinessID, w.TemplateID, w.Subdomain, w.CustomDomain, w.Pages, w.GlobalStyles, w.Navigation, w.Footer, w.Status, w.PublishedAt, w.LastModified, w.UpdatedAt)
	return err
}

func (r *Repository) DeleteWebsite(ctx context.Context, id, businessID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM user_websites WHERE id=$1 AND business_id=$2`, id, businessID)
	return err
}

func (r *Repository) PublishWebsite(ctx context.Context, id, businessID string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx, `UPDATE user_websites SET status='published', published_at=$3, last_modified=$3, updated_at=$3 WHERE id=$1 AND business_id=$2`, id, businessID, now)
	return err
}
