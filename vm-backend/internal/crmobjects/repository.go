package crmobjects

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ObjectDef struct {
	ID            string    `json:"id"`
	BusinessID    string    `json:"businessId"`
	NameSingular  string    `json:"nameSingular"`
	NamePlural    string    `json:"namePlural"`
	LabelSingular string    `json:"labelSingular"`
	LabelPlural   string    `json:"labelPlural"`
	Icon          string    `json:"icon"`
	Description   string    `json:"description"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type FieldDef struct {
	ID              string    `json:"id"`
	ObjectID        string    `json:"objectId"`
	Name            string    `json:"name"`
	Label           string    `json:"label"`
	FieldType       string    `json:"fieldType"`
	IsRequired      bool      `json:"isRequired"`
	IsUnique        bool      `json:"isUnique"`
	DefaultValue    string    `json:"defaultValue"`
	Options         string    `json:"options"`
	ValidationRules string    `json:"validationRules"`
	SortOrder       int       `json:"sortOrder"`
	IsActive        bool      `json:"isActive"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) ListObjects(ctx context.Context, businessID string) ([]ObjectDef, error) {
	rows, _ := r.db.Query(ctx, `SELECT id, business_id, name_singular, name_plural, label_singular, label_plural, icon, description, is_active, created_at, updated_at FROM crm_object_defs WHERE business_id = $1 AND is_active = true ORDER BY label_singular`, businessID)
	defer rows.Close()
	var list []ObjectDef
	for rows.Next() {
		var o ObjectDef
		rows.Scan(&o.ID, &o.BusinessID, &o.NameSingular, &o.NamePlural, &o.LabelSingular, &o.LabelPlural, &o.Icon, &o.Description, &o.IsActive, &o.CreatedAt, &o.UpdatedAt)
		list = append(list, o)
	}
	return list, nil
}

func (r *Repository) CreateObject(ctx context.Context, o *ObjectDef) error {
	o.ID = uuid.New().String()
	o.CreatedAt = time.Now()
	o.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx, `INSERT INTO crm_object_defs (id, business_id, name_singular, name_plural, label_singular, label_plural, icon, description, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, o.ID, o.BusinessID, o.NameSingular, o.NamePlural, o.LabelSingular, o.LabelPlural, o.Icon, o.Description, o.IsActive, o.CreatedAt, o.UpdatedAt)
	return err
}

func (r *Repository) ListFields(ctx context.Context, objectID string) ([]FieldDef, error) {
	rows, _ := r.db.Query(ctx, `SELECT id, object_id, name, label, field_type, is_required, is_unique, default_value, options::text, validation_rules::text, sort_order, is_active, created_at, updated_at FROM crm_field_defs WHERE object_id = $1 AND is_active = true ORDER BY sort_order`, objectID)
	defer rows.Close()
	var list []FieldDef
	for rows.Next() {
		var f FieldDef
		rows.Scan(&f.ID, &f.ObjectID, &f.Name, &f.Label, &f.FieldType, &f.IsRequired, &f.IsUnique, &f.DefaultValue, &f.Options, &f.ValidationRules, &f.SortOrder, &f.IsActive, &f.CreatedAt, &f.UpdatedAt)
		list = append(list, f)
	}
	return list, nil
}

func (r *Repository) CreateField(ctx context.Context, f *FieldDef) error {
	f.ID = uuid.New().String()
	f.CreatedAt = time.Now()
	f.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx, `INSERT INTO crm_field_defs (id, object_id, name, label, field_type, is_required, is_unique, default_value, options, validation_rules, sort_order, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14)`, f.ID, f.ObjectID, f.Name, f.Label, f.FieldType, f.IsRequired, f.IsUnique, f.DefaultValue, f.Options, f.ValidationRules, f.SortOrder, f.IsActive, f.CreatedAt, f.UpdatedAt)
	return err
}
