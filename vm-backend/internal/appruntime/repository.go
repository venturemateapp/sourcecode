package appruntime

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/venturemate/vmbackend/internal/appbuilder"
)

const maxRecordBytes = 256 << 10

var slugPattern = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,119}$`)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

type Record struct {
	ID        string         `json:"id"`
	Data      map[string]any `json:"data"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

type EntitySchema struct {
	ID          string                   `json:"id"`
	ProjectID   string                   `json:"projectId"`
	Name        string                   `json:"name"`
	Slug        string                   `json:"slug"`
	Fields      []appbuilder.EntityField `json:"fields"`
	Permissions map[string]any           `json:"permissions"`
}

func HashAccessKey(value string) string {
	hash := sha256.Sum256([]byte(value))
	return "sha256:" + hex.EncodeToString(hash[:])
}

func (r *Repository) SetAccessKey(ctx context.Context, userID, projectID, rawKey string) error {
	if strings.TrimSpace(rawKey) == "" {
		return errors.New("runtime access key is required")
	}
	result, err := r.db.Exec(ctx, `UPDATE ai_projects SET runtime_access_key_hash=$3,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND archived_at IS NULL`, projectID, userID, HashAccessKey(rawKey))
	if err != nil {
		return err
	}
	if result.RowsAffected() != 1 {
		return errors.New("project not found or access denied")
	}
	return nil
}

func (r *Repository) Authorize(ctx context.Context, projectID, rawKey string) error {
	if strings.TrimSpace(projectID) == "" || strings.TrimSpace(rawKey) == "" {
		return errors.New("runtime authorization required")
	}
	var expected string
	if err := r.db.QueryRow(ctx, `SELECT runtime_access_key_hash FROM ai_projects WHERE id=$1 AND archived_at IS NULL`, projectID).Scan(&expected); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("project runtime not found")
		}
		return err
	}
	actual := HashAccessKey(rawKey)
	if len(expected) != len(actual) || subtle.ConstantTimeCompare([]byte(expected), []byte(actual)) != 1 {
		return errors.New("invalid runtime access key")
	}
	return nil
}

func (r *Repository) SyncFromAppSpec(ctx context.Context, userID, projectID string, spec appbuilder.AppSpec) error {
	if err := spec.Validate(); err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var owned bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ai_projects WHERE id=$1 AND user_id=$2 AND project_type='web_app' AND archived_at IS NULL)`, projectID, userID).Scan(&owned); err != nil {
		return err
	}
	if !owned {
		return errors.New("project not found or access denied")
	}
	keep := make([]string, 0, len(spec.Entities))
	for _, entity := range spec.Entities {
		slug := strings.ToLower(strings.TrimSpace(entity.Slug))
		if !slugPattern.MatchString(slug) {
			return fmt.Errorf("invalid entity slug %q", slug)
		}
		if len(entity.Fields) > 100 {
			return fmt.Errorf("entity %s has too many fields", slug)
		}
		schema, _ := json.Marshal(map[string]any{"id": entity.ID, "fields": entity.Fields})
		permissions := map[string]bool{"publicRead": true, "publicCreate": false, "publicUpdate": false, "publicDelete": false}
		for permission, allowed := range entity.Permissions {
			permissions[permission] = allowed
		}
		permissionsJSON, _ := json.Marshal(permissions)
		_, err = tx.Exec(ctx, `INSERT INTO ai_app_entity_schemas(project_id,name,slug,schema,permissions) VALUES($1,$2,$3,$4::jsonb,$5::jsonb)
			ON CONFLICT(project_id,slug) DO UPDATE SET name=EXCLUDED.name,schema=EXCLUDED.schema,permissions=EXCLUDED.permissions,updated_at=NOW()`, projectID, entity.Name, slug, string(schema), string(permissionsJSON))
		if err != nil {
			return err
		}
		keep = append(keep, slug)
	}
	if len(keep) == 0 {
		_, err = tx.Exec(ctx, `DELETE FROM ai_app_entity_schemas WHERE project_id=$1`, projectID)
	} else {
		_, err = tx.Exec(ctx, `DELETE FROM ai_app_entity_schemas WHERE project_id=$1 AND slug <> ALL($2::text[])`, projectID, keep)
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repository) entity(ctx context.Context, projectID, slug string) (*EntitySchema, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	if !slugPattern.MatchString(slug) {
		return nil, errors.New("invalid entity")
	}
	var out EntitySchema
	var schemaJSON, permissionsJSON string
	err := r.db.QueryRow(ctx, `SELECT id::text,project_id::text,name,slug,schema::text,permissions::text FROM ai_app_entity_schemas WHERE project_id=$1 AND slug=$2`, projectID, slug).
		Scan(&out.ID, &out.ProjectID, &out.Name, &out.Slug, &schemaJSON, &permissionsJSON)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("entity not found")
	}
	if err != nil {
		return nil, err
	}
	var schema struct {
		Fields []appbuilder.EntityField `json:"fields"`
	}
	if err := json.Unmarshal([]byte(schemaJSON), &schema); err != nil {
		return nil, err
	}
	out.Fields = schema.Fields
	_ = json.Unmarshal([]byte(permissionsJSON), &out.Permissions)
	return &out, nil
}

func allow(entity *EntitySchema, permission string) bool {
	if entity == nil || entity.Permissions == nil {
		return false
	}
	value, _ := entity.Permissions[permission].(bool)
	return value
}

func (r *Repository) List(ctx context.Context, projectID, slug string, limit, offset int) ([]Record, int, error) {
	entity, err := r.entity(ctx, projectID, slug)
	if err != nil {
		return nil, 0, err
	}
	if !allow(entity, "publicRead") {
		return nil, 0, errors.New("public read is not allowed for this entity")
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM ai_app_records WHERE project_id=$1 AND entity_schema_id=$2`, projectID, entity.ID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.Query(ctx, `SELECT id::text,data::text,created_at,updated_at FROM ai_app_records WHERE project_id=$1 AND entity_schema_id=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`, projectID, entity.ID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Record, 0)
	for rows.Next() {
		var item Record
		var raw string
		if err := rows.Scan(&item.ID, &raw, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, 0, err
		}
		if err := json.Unmarshal([]byte(raw), &item.Data); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *Repository) Create(ctx context.Context, projectID, slug string, data map[string]any) (*Record, error) {
	entity, err := r.entity(ctx, projectID, slug)
	if err != nil {
		return nil, err
	}
	if !allow(entity, "publicCreate") {
		return nil, errors.New("public create is not allowed for this entity")
	}
	if err := validateData(entity.Fields, data, true); err != nil {
		return nil, err
	}
	raw, _ := json.Marshal(data)
	var item Record
	var stored string
	err = r.db.QueryRow(ctx, `INSERT INTO ai_app_records(id,project_id,entity_schema_id,data) VALUES($1,$2,$3,$4::jsonb) RETURNING id::text,data::text,created_at,updated_at`, uuid.NewString(), projectID, entity.ID, string(raw)).Scan(&item.ID, &stored, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(stored), &item.Data)
	return &item, nil
}

func (r *Repository) Update(ctx context.Context, projectID, slug, recordID string, patch map[string]any) (*Record, error) {
	entity, err := r.entity(ctx, projectID, slug)
	if err != nil {
		return nil, err
	}
	if !allow(entity, "publicUpdate") {
		return nil, errors.New("public update is not allowed for this entity")
	}
	var currentRaw string
	if err := r.db.QueryRow(ctx, `SELECT data::text FROM ai_app_records WHERE id=$1 AND project_id=$2 AND entity_schema_id=$3`, recordID, projectID, entity.ID).Scan(&currentRaw); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("record not found")
		}
		return nil, err
	}
	current := map[string]any{}
	_ = json.Unmarshal([]byte(currentRaw), &current)
	for k, v := range patch {
		current[k] = v
	}
	if err := validateData(entity.Fields, current, true); err != nil {
		return nil, err
	}
	raw, _ := json.Marshal(current)
	var item Record
	var stored string
	err = r.db.QueryRow(ctx, `UPDATE ai_app_records SET data=$4::jsonb,updated_at=NOW() WHERE id=$1 AND project_id=$2 AND entity_schema_id=$3 RETURNING id::text,data::text,created_at,updated_at`, recordID, projectID, entity.ID, string(raw)).Scan(&item.ID, &stored, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(stored), &item.Data)
	return &item, nil
}

func (r *Repository) Delete(ctx context.Context, projectID, slug, recordID string) error {
	entity, err := r.entity(ctx, projectID, slug)
	if err != nil {
		return err
	}
	if !allow(entity, "publicDelete") {
		return errors.New("public delete is not allowed for this entity")
	}
	result, err := r.db.Exec(ctx, `DELETE FROM ai_app_records WHERE id=$1 AND project_id=$2 AND entity_schema_id=$3`, recordID, projectID, entity.ID)
	if err != nil {
		return err
	}
	if result.RowsAffected() != 1 {
		return errors.New("record not found")
	}
	return nil
}

func validateData(fields []appbuilder.EntityField, data map[string]any, requireRequired bool) error {
	raw, _ := json.Marshal(data)
	if len(raw) > maxRecordBytes {
		return errors.New("record is too large")
	}
	definitions := map[string]appbuilder.EntityField{}
	for _, field := range fields {
		key := strings.TrimSpace(field.Name)
		if key == "" {
			key = field.ID
		}
		definitions[key] = field
	}
	for key := range data {
		if _, ok := definitions[key]; !ok {
			return fmt.Errorf("unknown field %s", key)
		}
	}
	for key, field := range definitions {
		value, exists := data[key]
		if field.Required && requireRequired && (!exists || value == nil || strings.TrimSpace(fmt.Sprint(value)) == "") {
			return fmt.Errorf("field %s is required", key)
		}
		if !exists || value == nil {
			continue
		}
		switch strings.ToLower(field.Type) {
		case "string", "text", "email", "date", "datetime":
			if _, ok := value.(string); !ok {
				return fmt.Errorf("field %s must be text", key)
			}
		case "number", "currency", "integer":
			if _, ok := value.(float64); !ok {
				return fmt.Errorf("field %s must be a number", key)
			}
		case "boolean":
			if _, ok := value.(bool); !ok {
				return fmt.Errorf("field %s must be true or false", key)
			}
		case "json", "object", "array":
		default:
			return fmt.Errorf("field %s has unsupported type %s", key, field.Type)
		}
	}
	return nil
}
