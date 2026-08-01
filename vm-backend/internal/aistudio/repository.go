package aistudio

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/venturemate/vmbackend/internal/deckstudio"
	"github.com/venturemate/vmbackend/internal/planstudio"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CountProjects(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM ai_projects WHERE user_id=$1 AND archived_at IS NULL`, userID).Scan(&count)
	return count, err
}

// UserProjectBytes returns the durable database and object-storage footprint tracked for active AI Studio projects.
// Build artifacts are intentionally excluded because their size is enforced separately by the build runner.
func (r *Repository) UserProjectBytes(ctx context.Context, userID string) (int64, error) {
	const query = `SELECT
		COALESCE((SELECT SUM(f.size_bytes) FROM ai_project_files f JOIN ai_projects p ON p.id=f.project_id WHERE p.user_id=$1 AND p.archived_at IS NULL),0) +
		COALESCE((SELECT SUM(v.size_bytes) FROM ai_project_file_versions v JOIN ai_project_revisions r ON r.id=v.revision_id JOIN ai_projects p ON p.id=r.project_id WHERE p.user_id=$1 AND p.archived_at IS NULL),0) +
		COALESCE((SELECT SUM(octet_length(r.document::text) + octet_length(r.manifest::text) + octet_length(r.diagnostics::text)) FROM ai_project_revisions r JOIN ai_projects p ON p.id=r.project_id WHERE p.user_id=$1 AND p.archived_at IS NULL),0) +
		COALESCE((SELECT SUM(a.size_bytes) FROM ai_assets a WHERE a.user_id=$1),0)`
	var total int64
	err := r.db.QueryRow(ctx, query, userID).Scan(&total)
	return total, err
}

func (r *Repository) Pool() *pgxpool.Pool { return r.db }

type scanner interface {
	Scan(dest ...any) error
}

const projectSelect = `id::text, user_id::text, COALESCE(business_id::text,''), project_type, name, slug, status,
	COALESCE(framework,''), COALESCE(template_version,''), COALESCE(current_revision_id::text,''),
	COALESCE(approved_revision_id::text,''), settings::text, metadata::text, created_at, updated_at, archived_at`

func scanProject(row scanner) (*Project, error) {
	var p Project
	if err := row.Scan(&p.ID, &p.UserID, &p.BusinessID, &p.ProjectType, &p.Name, &p.Slug, &p.Status,
		&p.Framework, &p.TemplateVersion, &p.CurrentRevisionID, &p.ApprovedRevisionID,
		&p.Settings, &p.Metadata, &p.CreatedAt, &p.UpdatedAt, &p.ArchivedAt); err != nil {
		return nil, err
	}
	return &p, nil
}

const revisionSelect = `id::text, project_id::text, COALESCE(parent_revision_id::text,''), created_by_user_id::text,
	source, prompt, summary, status, schema_version, document::text, manifest::text, diagnostics::text,
	token_usage::text, content_hash, created_at, updated_at`

func scanRevision(row scanner) (*Revision, error) {
	var rev Revision
	if err := row.Scan(&rev.ID, &rev.ProjectID, &rev.ParentRevisionID, &rev.CreatedByUserID,
		&rev.Source, &rev.Prompt, &rev.Summary, &rev.Status, &rev.SchemaVersion, &rev.Document,
		&rev.Manifest, &rev.Diagnostics, &rev.TokenUsage, &rev.ContentHash, &rev.CreatedAt, &rev.UpdatedAt); err != nil {
		return nil, err
	}
	return &rev, nil
}

const fileSelect = `id::text, project_id::text, path, language, is_binary, COALESCE(asset_id::text,''),
	current_content, content_hash, size_bytes, created_at, updated_at`

func scanProjectFile(row scanner) (*ProjectFile, error) {
	var f ProjectFile
	if err := row.Scan(&f.ID, &f.ProjectID, &f.Path, &f.Language, &f.IsBinary, &f.AssetID,
		&f.CurrentContent, &f.ContentHash, &f.SizeBytes, &f.CreatedAt, &f.UpdatedAt); err != nil {
		return nil, err
	}
	return &f, nil
}

var slugCleaner = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.Trim(slugCleaner.ReplaceAllString(value, "-"), "-")
	if value == "" {
		value = "ai-project"
	}
	if len(value) > 100 {
		value = strings.Trim(value[:100], "-")
	}
	return value
}

func (r *Repository) CreateProject(ctx context.Context, userID, businessID, projectType, name, framework, templateVersion, settings, metadata string) (*Project, error) {
	if err := ValidateProjectType(projectType); err != nil {
		return nil, err
	}
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("authenticated user is required")
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("project name is required")
	}
	if len(name) > 255 {
		return nil, errors.New("project name is too long")
	}
	var err error
	settings, err = NormalizeJSON(settings, "{}")
	if err != nil {
		return nil, fmt.Errorf("settings: %w", err)
	}
	metadata, err = NormalizeJSON(metadata, "{}")
	if err != nil {
		return nil, fmt.Errorf("metadata: %w", err)
	}
	if businessID != "" {
		var owned bool
		if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM businesses WHERE id=$1 AND user_id=$2)`, businessID, userID).Scan(&owned); err != nil {
			return nil, err
		}
		if !owned {
			return nil, errors.New("business not found or access denied")
		}
	}

	baseSlug := slugify(name)
	for suffix := 0; suffix < 100; suffix++ {
		slug := baseSlug
		if suffix > 0 {
			slug = fmt.Sprintf("%s-%d", baseSlug, suffix+1)
		}
		row := r.db.QueryRow(ctx, `INSERT INTO ai_projects (
			user_id,business_id,project_type,name,slug,status,framework,template_version,settings,metadata
		) VALUES ($1,NULLIF($2,'')::uuid,$3,$4,$5,'draft',NULLIF($6,''),NULLIF($7,''),$8::jsonb,$9::jsonb)
		ON CONFLICT DO NOTHING RETURNING `+projectSelect,
			userID, businessID, projectType, name, slug, framework, templateVersion, settings, metadata)
		project, scanErr := scanProject(row)
		if scanErr == nil {
			return project, nil
		}
		if !errors.Is(scanErr, pgx.ErrNoRows) {
			return nil, scanErr
		}
	}
	return nil, errors.New("could not allocate a unique project slug")
}

func (r *Repository) GetProject(ctx context.Context, userID, projectID string) (*Project, error) {
	p, err := scanProject(r.db.QueryRow(ctx, `SELECT `+projectSelect+` FROM ai_projects WHERE id=$1 AND user_id=$2 AND archived_at IS NULL`, projectID, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return p, err
}

func (r *Repository) ListProjects(ctx context.Context, userID, businessID, projectType string, limit, offset int) ([]Project, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.Query(ctx, `SELECT `+projectSelect+` FROM ai_projects
		WHERE user_id=$1 AND archived_at IS NULL
		AND ($2='' OR business_id::text=$2)
		AND ($3='' OR project_type=$3)
		ORDER BY updated_at DESC LIMIT $4 OFFSET $5`, userID, businessID, projectType, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []Project
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *p)
	}
	return result, rows.Err()
}

func (r *Repository) RenameProject(ctx context.Context, userID, projectID, name string) (*Project, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 255 {
		return nil, errors.New("valid project name is required")
	}
	p, err := scanProject(r.db.QueryRow(ctx, `UPDATE ai_projects SET name=$3, updated_at=NOW()
		WHERE id=$1 AND user_id=$2 AND archived_at IS NULL RETURNING `+projectSelect, projectID, userID, name))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("project not found or access denied")
	}
	return p, err
}

func (r *Repository) ArchiveProject(ctx context.Context, userID, projectID string) error {
	result, err := r.db.Exec(ctx, `UPDATE ai_projects SET status='archived', archived_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND user_id=$2 AND archived_at IS NULL`, projectID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("project not found or access denied")
	}
	return nil
}

func (r *Repository) ListFiles(ctx context.Context, userID, projectID string) ([]ProjectFile, error) {
	rows, err := r.db.Query(ctx, `SELECT `+fileSelect+` FROM ai_project_files f
		JOIN ai_projects p ON p.id=f.project_id
		WHERE f.project_id=$1 AND p.user_id=$2 AND p.archived_at IS NULL ORDER BY f.path`, projectID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var files []ProjectFile
	for rows.Next() {
		f, err := scanProjectFile(rows)
		if err != nil {
			return nil, err
		}
		files = append(files, *f)
	}
	return files, rows.Err()
}

func (r *Repository) ListRevisions(ctx context.Context, userID, projectID string, limit, offset int) ([]Revision, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.Query(ctx, `SELECT `+revisionSelect+` FROM ai_project_revisions r
		JOIN ai_projects p ON p.id=r.project_id
		WHERE r.project_id=$1 AND p.user_id=$2 AND p.archived_at IS NULL
		ORDER BY r.created_at DESC LIMIT $3 OFFSET $4`, projectID, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var revisions []Revision
	for rows.Next() {
		rev, err := scanRevision(rows)
		if err != nil {
			return nil, err
		}
		revisions = append(revisions, *rev)
	}
	return revisions, rows.Err()
}

func (r *Repository) GetRevision(ctx context.Context, userID, revisionID string) (*Revision, error) {
	rev, err := scanRevision(r.db.QueryRow(ctx, `SELECT `+revisionSelect+` FROM ai_project_revisions r
		JOIN ai_projects p ON p.id=r.project_id WHERE r.id=$1 AND p.user_id=$2 AND p.archived_at IS NULL`, revisionID, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return rev, err
}

func revisionContentHash(document, manifest string, changes []FileChange) string {
	h := sha256.New()
	_, _ = h.Write([]byte(document))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(manifest))
	ordered := append([]FileChange(nil), changes...)
	sort.Slice(ordered, func(i, j int) bool { return ordered[i].Path < ordered[j].Path })
	for _, change := range ordered {
		_, _ = h.Write([]byte(change.Operation + "\x00" + change.Path + "\x00" + change.PreviousPath + "\x00" + change.ContentHash))
	}
	return "sha256:" + hex.EncodeToString(h.Sum(nil))
}

func (r *Repository) CreateRevision(ctx context.Context, input RevisionInput) (*Revision, error) {
	if strings.TrimSpace(input.UserID) == "" || strings.TrimSpace(input.ProjectID) == "" {
		return nil, errors.New("project and authenticated user are required")
	}
	if input.Source == "" {
		input.Source = "ai"
	}
	switch input.Source {
	case "ai", "manual", "import", "rollback", "migration", "repair":
	default:
		return nil, fmt.Errorf("invalid revision source %q", input.Source)
	}
	if input.SchemaVersion == "" {
		input.SchemaVersion = "1.0"
	}
	var err error
	input.Document, err = NormalizeJSON(input.Document, "{}")
	if err != nil {
		return nil, fmt.Errorf("document: %w", err)
	}
	input.Manifest, err = NormalizeJSON(input.Manifest, "{}")
	if err != nil {
		return nil, fmt.Errorf("manifest: %w", err)
	}
	input.Diagnostics, err = NormalizeJSON(input.Diagnostics, "{}")
	if err != nil {
		return nil, fmt.Errorf("diagnostics: %w", err)
	}
	input.TokenUsage, err = NormalizeJSON(input.TokenUsage, "{}")
	if err != nil {
		return nil, fmt.Errorf("token usage: %w", err)
	}
	if len(input.Files) > MaxProjectFiles {
		return nil, fmt.Errorf("revision exceeds the %d file-change limit", MaxProjectFiles)
	}
	var totalBytes int64
	for i := range input.Files {
		if err := ValidateFileChange(&input.Files[i]); err != nil {
			return nil, fmt.Errorf("file change %d: %w", i+1, err)
		}
		totalBytes += int64(len([]byte(input.Files[i].Content)))
	}
	if totalBytes > MaxProjectBytes {
		return nil, fmt.Errorf("revision exceeds the %d byte project limit", MaxProjectBytes)
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var parentRevisionID string
	var projectType string
	if err := tx.QueryRow(ctx, `SELECT COALESCE(current_revision_id::text,''), project_type FROM ai_projects
		WHERE id=$1 AND user_id=$2 AND archived_at IS NULL FOR UPDATE`, input.ProjectID, input.UserID).Scan(&parentRevisionID, &projectType); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("project not found or access denied")
		}
		return nil, err
	}

	for i := range input.Files {
		change := &input.Files[i]
		lookupPath := change.Path
		if change.Operation == "move" {
			lookupPath = change.PreviousPath
		}
		var currentHash string
		err := tx.QueryRow(ctx, `SELECT content_hash FROM ai_project_files WHERE project_id=$1 AND path=$2`, input.ProjectID, lookupPath).Scan(&currentHash)
		exists := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		switch change.Operation {
		case "create":
			if exists {
				return nil, fmt.Errorf("file %s already exists", change.Path)
			}
		case "update", "delete", "move":
			if !exists {
				return nil, fmt.Errorf("file %s does not exist", lookupPath)
			}
			if change.BaseHash == "" {
				return nil, fmt.Errorf("baseHash is required for %s", lookupPath)
			}
			if change.BaseHash != currentHash {
				return nil, fmt.Errorf("file %s changed since this revision was prepared", lookupPath)
			}
		}
		if change.Operation == "move" {
			var destinationExists bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ai_project_files WHERE project_id=$1 AND path=$2)`, input.ProjectID, change.Path).Scan(&destinationExists); err != nil {
				return nil, err
			}
			if destinationExists {
				return nil, fmt.Errorf("destination file %s already exists", change.Path)
			}
		}
	}

	revisionID := uuid.NewString()
	contentHash := revisionContentHash(input.Document, input.Manifest, input.Files)
	_, err = tx.Exec(ctx, `INSERT INTO ai_project_revisions (
		id,project_id,parent_revision_id,created_by_user_id,source,prompt,summary,status,schema_version,
		document,manifest,diagnostics,token_usage,content_hash
	) VALUES ($1,$2,NULLIF($3,'')::uuid,$4,$5,$6,$7,'ready',$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13)`,
		revisionID, input.ProjectID, parentRevisionID, input.UserID, input.Source, input.Prompt, input.Summary,
		input.SchemaVersion, input.Document, input.Manifest, input.Diagnostics, input.TokenUsage, contentHash)
	if err != nil {
		return nil, err
	}
	for _, change := range input.Files {
		_, err = tx.Exec(ctx, `INSERT INTO ai_project_file_versions (
			revision_id,path,operation,previous_path,content,content_hash,base_hash,size_bytes
		) VALUES ($1,$2,$3,NULLIF($4,''),$5,$6,$7,$8)`, revisionID, change.Path, change.Operation,
			change.PreviousPath, change.Content, change.ContentHash, change.BaseHash, len([]byte(change.Content)))
		if err != nil {
			return nil, err
		}
	}
	_, err = tx.Exec(ctx, `UPDATE ai_projects SET current_revision_id=$1, status='ready', updated_at=NOW() WHERE id=$2`, revisionID, input.ProjectID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetRevision(ctx, input.UserID, revisionID)
}

func (r *Repository) ApproveRevision(ctx context.Context, userID, revisionID string) (*Project, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var projectID, projectType, businessID, status, document string
	if err := tx.QueryRow(ctx, `SELECT p.id::text,p.project_type,COALESCE(p.business_id::text,''),r.status,r.document::text
		FROM ai_project_revisions r JOIN ai_projects p ON p.id=r.project_id
		WHERE r.id=$1 AND p.user_id=$2 AND p.archived_at IS NULL FOR UPDATE OF p,r`, revisionID, userID).
		Scan(&projectID, &projectType, &businessID, &status, &document); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("revision not found or access denied")
		}
		return nil, err
	}
	if status != "ready" && status != "validating" {
		return nil, fmt.Errorf("revision cannot be approved from status %s", status)
	}

	rows, err := tx.Query(ctx, `SELECT path,operation,COALESCE(previous_path,''),content,content_hash,base_hash
		FROM ai_project_file_versions WHERE revision_id=$1 ORDER BY created_at,id`, revisionID)
	if err != nil {
		return nil, err
	}
	type version struct{ path, operation, previousPath, content, contentHash, baseHash string }
	var versions []version
	for rows.Next() {
		var v version
		if err := rows.Scan(&v.path, &v.operation, &v.previousPath, &v.content, &v.contentHash, &v.baseHash); err != nil {
			rows.Close()
			return nil, err
		}
		versions = append(versions, v)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	for _, v := range versions {
		switch v.operation {
		case "create":
			_, err = tx.Exec(ctx, `INSERT INTO ai_project_files(project_id,path,language,is_binary,current_content,content_hash,size_bytes)
				VALUES($1,$2,$3,FALSE,$4,$5,$6)`, projectID, v.path, LanguageForPath(v.path), v.content, v.contentHash, len([]byte(v.content)))
		case "update":
			tag, err := tx.Exec(ctx, `UPDATE ai_project_files SET current_content=$1,content_hash=$2,size_bytes=$3,language=$4,updated_at=NOW()
				WHERE project_id=$5 AND path=$6 AND content_hash=$7`, v.content, v.contentHash, len([]byte(v.content)), LanguageForPath(v.path), projectID, v.path, v.baseHash)
			if err == nil && tag.RowsAffected() != 1 {
				err = fmt.Errorf("file %s changed before approval", v.path)
			}
		case "delete":
			tag, err := tx.Exec(ctx, `DELETE FROM ai_project_files WHERE project_id=$1 AND path=$2 AND content_hash=$3`, projectID, v.path, v.baseHash)
			if err == nil && tag.RowsAffected() != 1 {
				err = fmt.Errorf("file %s changed before approval", v.path)
			}
		case "move":
			var sourceContent, sourceHash string
			if err = tx.QueryRow(ctx, `DELETE FROM ai_project_files WHERE project_id=$1 AND path=$2 AND content_hash=$3
				RETURNING current_content,content_hash`, projectID, v.previousPath, v.baseHash).Scan(&sourceContent, &sourceHash); err == nil {
				content := v.content
				hash := v.contentHash
				if content == "" {
					content, hash = sourceContent, sourceHash
				}
				_, err = tx.Exec(ctx, `INSERT INTO ai_project_files(project_id,path,language,is_binary,current_content,content_hash,size_bytes)
					VALUES($1,$2,$3,FALSE,$4,$5,$6)`, projectID, v.path, LanguageForPath(v.path), content, hash, len([]byte(content)))
			}
		default:
			err = fmt.Errorf("unsupported revision operation %s", v.operation)
		}
		if err != nil {
			return nil, err
		}
	}

	_, err = tx.Exec(ctx, `UPDATE ai_project_revisions SET status='superseded',updated_at=NOW()
		WHERE project_id=$1 AND status='approved' AND id<>$2`, projectID, revisionID)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE ai_project_revisions SET status='approved',updated_at=NOW() WHERE id=$1`, revisionID)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE ai_projects SET current_revision_id=$1,approved_revision_id=$1,status='ready',updated_at=NOW() WHERE id=$2`, revisionID, projectID)
	if err != nil {
		return nil, err
	}

	if businessID != "" && json.Valid([]byte(document)) {
		compatibilityDocument := document
		switch projectType {
		case ProjectTypePitchDeck:
			compatibilityDocument, err = deckstudio.LegacySummaryJSON(document)
			if err == nil {
				_, err = tx.Exec(ctx, `UPDATE businesses SET pitch_deck=$1::jsonb,updated_at=NOW() WHERE id=$2 AND user_id=$3`, compatibilityDocument, businessID, userID)
			}
		case ProjectTypeBusinessPlan:
			compatibilityDocument, err = planstudio.LegacySummaryJSON(document)
			if err == nil {
				_, err = tx.Exec(ctx, `UPDATE businesses SET business_plan=$1::jsonb,updated_at=NOW() WHERE id=$2 AND user_id=$3`, compatibilityDocument, businessID, userID)
			}
		}
		if err != nil {
			return nil, fmt.Errorf("synchronize approved %s compatibility document: %w", projectType, err)
		}
	}
	_, err = tx.Exec(ctx, `INSERT INTO ai_audit_events(user_id,business_id,project_id,revision_id,action,target_type,target_id)
		VALUES($1,NULLIF($2,'')::uuid,$3,$4,'generation_approved','revision',$4)`, userID, businessID, projectID, revisionID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetProject(ctx, userID, projectID)
}

func (r *Repository) UpdateProjectFile(ctx context.Context, userID, projectID, filePath, content, baseHash, summary string) (*Revision, error) {
	clean, err := ValidateProjectPath(filePath)
	if err != nil {
		return nil, err
	}

	// A source-file edit must keep the structured AppSpec/deck/plan document from
	// the latest approved revision. Replacing it with {} would make a web app
	// impossible to approve, rebuild, or restore after a normal code edit.
	var currentDocument, currentSchemaVersion string
	err = r.db.QueryRow(ctx, `SELECT r.document::text,r.schema_version
		FROM ai_projects p JOIN ai_project_revisions r ON r.id=COALESCE(p.approved_revision_id,p.current_revision_id)
		WHERE p.id=$1 AND p.user_id=$2 AND p.archived_at IS NULL`, projectID, userID).
		Scan(&currentDocument, &currentSchemaVersion)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("project has no editable revision or access was denied")
	}
	if err != nil {
		return nil, err
	}

	var exists bool
	var currentHash string
	err = r.db.QueryRow(ctx, `SELECT content_hash FROM ai_project_files f JOIN ai_projects p ON p.id=f.project_id
		WHERE f.project_id=$1 AND f.path=$2 AND p.user_id=$3 AND p.archived_at IS NULL`, projectID, clean, userID).Scan(&currentHash)
	if err == nil {
		exists = true
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	op := "create"
	if exists {
		op = "update"
		if baseHash == "" {
			baseHash = currentHash
		}
	}
	if summary == "" {
		summary = "Manual edit to " + clean
	}
	manifest, _ := json.Marshal(map[string]any{"manualEdit": clean})
	rev, err := r.CreateRevision(ctx, RevisionInput{
		ProjectID: projectID, UserID: userID, Source: "manual", Summary: summary,
		SchemaVersion: currentSchemaVersion, Document: currentDocument, Manifest: string(manifest),
		Files: []FileChange{{Path: clean, Operation: op, Content: content, BaseHash: baseHash}},
	})
	if err != nil {
		return nil, err
	}
	if _, err := r.ApproveRevision(ctx, userID, rev.ID); err != nil {
		return nil, err
	}
	return r.GetRevision(ctx, userID, rev.ID)
}

func (r *Repository) ResolveFilesAtRevision(ctx context.Context, userID, projectID, revisionID string) ([]ProjectFile, error) {
	var owned bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ai_projects WHERE id=$1 AND user_id=$2 AND archived_at IS NULL)`, projectID, userID).Scan(&owned); err != nil {
		return nil, err
	}
	if !owned {
		return nil, errors.New("project not found or access denied")
	}
	if revisionID == "" {
		files, err := r.ListFiles(ctx, userID, projectID)
		return files, err
	}
	rows, err := r.db.Query(ctx, `WITH RECURSIVE chain AS (
		SELECT id,parent_revision_id,0 AS depth FROM ai_project_revisions WHERE id=$1 AND project_id=$2
		UNION ALL
		SELECT r.id,r.parent_revision_id,c.depth+1 FROM ai_project_revisions r JOIN chain c ON c.parent_revision_id=r.id
	)
	SELECT v.path,v.operation,COALESCE(v.previous_path,''),v.content,v.content_hash,v.created_at,c.depth
	FROM chain c JOIN ai_project_file_versions v ON v.revision_id=c.id
	ORDER BY c.depth DESC,v.created_at,v.id`, revisionID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type snapshot struct {
		content, hash, language string
		createdAt               time.Time
	}
	state := map[string]snapshot{}
	for rows.Next() {
		var filePath, op, previousPath, content, hash string
		var createdAt time.Time
		var depth int
		if err := rows.Scan(&filePath, &op, &previousPath, &content, &hash, &createdAt, &depth); err != nil {
			return nil, err
		}
		switch op {
		case "create", "update":
			state[filePath] = snapshot{content: content, hash: hash, language: LanguageForPath(filePath), createdAt: createdAt}
		case "delete":
			delete(state, filePath)
		case "move":
			old := state[previousPath]
			delete(state, previousPath)
			if content != "" {
				old.content, old.hash = content, hash
			}
			old.language = LanguageForPath(filePath)
			state[filePath] = old
		}
	}
	paths := make([]string, 0, len(state))
	for p := range state {
		paths = append(paths, p)
	}
	sort.Strings(paths)
	files := make([]ProjectFile, 0, len(paths))
	for _, p := range paths {
		s := state[p]
		files = append(files, ProjectFile{ProjectID: projectID, Path: p, Language: s.language,
			CurrentContent: s.content, ContentHash: s.hash, SizeBytes: int64(len([]byte(s.content))), CreatedAt: s.createdAt, UpdatedAt: s.createdAt})
	}
	return files, rows.Err()
}

func (r *Repository) RollbackProject(ctx context.Context, userID, projectID, targetRevisionID string) (*Revision, error) {
	target, err := r.GetRevision(ctx, userID, targetRevisionID)
	if err != nil || target == nil || target.ProjectID != projectID {
		return nil, errors.New("target revision not found or access denied")
	}
	targetFiles, err := r.ResolveFilesAtRevision(ctx, userID, projectID, targetRevisionID)
	if err != nil {
		return nil, err
	}
	currentFiles, err := r.ListFiles(ctx, userID, projectID)
	if err != nil {
		return nil, err
	}
	current := make(map[string]ProjectFile, len(currentFiles))
	for _, f := range currentFiles {
		current[f.Path] = f
	}
	targetMap := make(map[string]ProjectFile, len(targetFiles))
	for _, f := range targetFiles {
		targetMap[f.Path] = f
	}
	var changes []FileChange
	for p, old := range current {
		if _, ok := targetMap[p]; !ok {
			changes = append(changes, FileChange{Path: p, Operation: "delete", BaseHash: old.ContentHash})
		}
	}
	for p, desired := range targetMap {
		if old, ok := current[p]; ok {
			if old.ContentHash != desired.ContentHash {
				changes = append(changes, FileChange{Path: p, Operation: "update", Content: desired.CurrentContent, BaseHash: old.ContentHash})
			}
		} else {
			changes = append(changes, FileChange{Path: p, Operation: "create", Content: desired.CurrentContent})
		}
	}
	rev, err := r.CreateRevision(ctx, RevisionInput{
		ProjectID: projectID, UserID: userID, Source: "rollback", Summary: "Restore revision " + targetRevisionID,
		Document: target.Document, Manifest: target.Manifest, SchemaVersion: target.SchemaVersion, Files: changes,
	})
	if err != nil {
		return nil, err
	}
	if _, err := r.ApproveRevision(ctx, userID, rev.ID); err != nil {
		return nil, err
	}
	return r.GetRevision(ctx, userID, rev.ID)
}

func (r *Repository) CreateProposalBatch(ctx context.Context, batch ProposalBatch) (*ProposalBatch, error) {
	var err error
	batch.Changes, err = NormalizeJSON(batch.Changes, "[]")
	if err != nil {
		return nil, fmt.Errorf("changes: %w", err)
	}
	batch.TokenUsage, err = NormalizeJSON(batch.TokenUsage, "{}")
	if err != nil {
		return nil, err
	}
	row := r.db.QueryRow(ctx, `INSERT INTO ai_proposal_batches(user_id,business_id,project_id,revision_id,domain,message,changes,provider,model,token_usage)
		VALUES($1,NULLIF($2,'')::uuid,NULLIF($3,'')::uuid,NULLIF($4,'')::uuid,$5,$6,$7::jsonb,$8,$9,$10::jsonb)
		RETURNING id::text,user_id::text,COALESCE(business_id::text,''),COALESCE(project_id::text,''),COALESCE(revision_id::text,''),
		domain,message,changes::text,provider,model,token_usage::text,status,created_at,updated_at`,
		batch.UserID, batch.BusinessID, batch.ProjectID, batch.RevisionID, batch.Domain, batch.Message, batch.Changes, batch.Provider, batch.Model, batch.TokenUsage)
	var out ProposalBatch
	if err := row.Scan(&out.ID, &out.UserID, &out.BusinessID, &out.ProjectID, &out.RevisionID, &out.Domain, &out.Message,
		&out.Changes, &out.Provider, &out.Model, &out.TokenUsage, &out.Status, &out.CreatedAt, &out.UpdatedAt); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *Repository) MarkProposalBatch(ctx context.Context, userID, batchID, status string) error {
	if status != "applied" && status != "discarded" && status != "superseded" && status != "failed" {
		return errors.New("invalid proposal batch status")
	}
	result, err := r.db.Exec(ctx, `UPDATE ai_proposal_batches SET status=$3,updated_at=NOW(),applied_at=CASE WHEN $3='applied' THEN NOW() ELSE applied_at END
		WHERE id=$1 AND user_id=$2 AND status='pending'`, batchID, userID, status)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("proposal batch not found or no longer pending")
	}
	return nil
}

func (r *Repository) CreateAsset(ctx context.Context, asset Asset) (*Asset, error) {
	asset.Metadata, _ = NormalizeJSON(asset.Metadata, "{}")
	row := r.db.QueryRow(ctx, `INSERT INTO ai_assets(user_id,business_id,project_id,source,kind,prompt,model,style,mime_type,width,height,size_bytes,storage_key,url,thumbnail_url,metadata)
		VALUES($1,NULLIF($2,'')::uuid,NULLIF($3,'')::uuid,$4,$5,$6,$7,$8,$9,NULLIF($10,0),NULLIF($11,0),$12,$13,$14,$15,$16::jsonb)
		RETURNING id::text,user_id::text,COALESCE(business_id::text,''),COALESCE(project_id::text,''),source,kind,prompt,model,style,mime_type,
		COALESCE(width,0),COALESCE(height,0),size_bytes,storage_key,url,thumbnail_url,metadata::text,created_at,updated_at`,
		asset.UserID, asset.BusinessID, asset.ProjectID, asset.Source, asset.Kind, asset.Prompt, asset.Model, asset.Style,
		asset.MimeType, asset.Width, asset.Height, asset.SizeBytes, asset.StorageKey, asset.URL, asset.ThumbnailURL, asset.Metadata)
	var out Asset
	if err := row.Scan(&out.ID, &out.UserID, &out.BusinessID, &out.ProjectID, &out.Source, &out.Kind, &out.Prompt, &out.Model,
		&out.Style, &out.MimeType, &out.Width, &out.Height, &out.SizeBytes, &out.StorageKey, &out.URL, &out.ThumbnailURL,
		&out.Metadata, &out.CreatedAt, &out.UpdatedAt); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *Repository) ListAssets(ctx context.Context, userID, businessID, projectID, kind string, limit int) ([]Asset, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := r.db.Query(ctx, `SELECT id::text,user_id::text,COALESCE(business_id::text,''),COALESCE(project_id::text,''),source,kind,prompt,model,style,mime_type,
		COALESCE(width,0),COALESCE(height,0),size_bytes,storage_key,url,thumbnail_url,metadata::text,created_at,updated_at
		FROM ai_assets WHERE user_id=$1 AND ($2='' OR business_id::text=$2) AND ($3='' OR project_id::text=$3) AND ($4='' OR kind=$4)
		ORDER BY created_at DESC LIMIT $5`, userID, businessID, projectID, kind, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var assets []Asset
	for rows.Next() {
		var out Asset
		if err := rows.Scan(&out.ID, &out.UserID, &out.BusinessID, &out.ProjectID, &out.Source, &out.Kind, &out.Prompt, &out.Model,
			&out.Style, &out.MimeType, &out.Width, &out.Height, &out.SizeBytes, &out.StorageKey, &out.URL, &out.ThumbnailURL,
			&out.Metadata, &out.CreatedAt, &out.UpdatedAt); err != nil {
			return nil, err
		}
		assets = append(assets, out)
	}
	return assets, rows.Err()
}

func (r *Repository) DeleteAsset(ctx context.Context, userID, assetID string) (string, error) {
	var key string
	if err := r.db.QueryRow(ctx, `DELETE FROM ai_assets WHERE id=$1 AND user_id=$2 RETURNING storage_key`, assetID, userID).Scan(&key); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", errors.New("asset not found or access denied")
		}
		return "", err
	}
	return key, nil
}

func (r *Repository) CreateBuild(ctx context.Context, userID string, build Build) (*Build, error) {
	var owned bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ai_projects WHERE id=$1 AND user_id=$2 AND archived_at IS NULL)`, build.ProjectID, userID).Scan(&owned); err != nil {
		return nil, err
	}
	if !owned {
		return nil, errors.New("project not found or access denied")
	}
	build.Diagnostics, _ = NormalizeJSON(build.Diagnostics, "{}")
	if build.Status == "" {
		build.Status = "queued"
	}
	row := r.db.QueryRow(ctx, `INSERT INTO ai_project_builds(project_id,revision_id,job_id,status,runtime_version,artifact_storage_key,preview_url,diagnostics,logs)
		VALUES($1,NULLIF($2,'')::uuid,NULLIF($3,'')::uuid,$4,$5,$6,$7,$8::jsonb,$9)
		RETURNING id::text,project_id::text,COALESCE(revision_id::text,''),COALESCE(job_id::text,''),status,runtime_version,artifact_storage_key,preview_url,diagnostics::text,logs,created_at,updated_at`,
		build.ProjectID, build.RevisionID, build.JobID, build.Status, build.RuntimeVersion, build.ArtifactStorageKey, build.PreviewURL, build.Diagnostics, build.Logs)
	var out Build
	if err := row.Scan(&out.ID, &out.ProjectID, &out.RevisionID, &out.JobID, &out.Status, &out.RuntimeVersion,
		&out.ArtifactStorageKey, &out.PreviewURL, &out.Diagnostics, &out.Logs, &out.CreatedAt, &out.UpdatedAt); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *Repository) UpdateBuild(ctx context.Context, buildID, status, artifactKey, previewURL, diagnostics, logs string) (*Build, error) {
	diagnostics, _ = NormalizeJSON(diagnostics, "{}")
	row := r.db.QueryRow(ctx, `UPDATE ai_project_builds SET status=$2,artifact_storage_key=$3,preview_url=$4,diagnostics=$5::jsonb,logs=$6,updated_at=NOW(),
		completed_at=CASE WHEN $2 IN ('completed','failed','cancelled') THEN NOW() ELSE completed_at END
		WHERE id=$1 RETURNING id::text,project_id::text,COALESCE(revision_id::text,''),COALESCE(job_id::text,''),status,runtime_version,artifact_storage_key,preview_url,diagnostics::text,logs,created_at,updated_at`,
		buildID, status, artifactKey, previewURL, diagnostics, logs)
	var out Build
	if err := row.Scan(&out.ID, &out.ProjectID, &out.RevisionID, &out.JobID, &out.Status, &out.RuntimeVersion,
		&out.ArtifactStorageKey, &out.PreviewURL, &out.Diagnostics, &out.Logs, &out.CreatedAt, &out.UpdatedAt); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *Repository) ListBuilds(ctx context.Context, userID, projectID string, limit int) ([]Build, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	rows, err := r.db.Query(ctx, `SELECT b.id::text,b.project_id::text,COALESCE(b.revision_id::text,''),COALESCE(b.job_id::text,''),b.status,b.runtime_version,
		b.artifact_storage_key,b.preview_url,b.diagnostics::text,b.logs,b.created_at,b.updated_at
		FROM ai_project_builds b JOIN ai_projects p ON p.id=b.project_id
		WHERE b.project_id=$1 AND p.user_id=$2 AND p.archived_at IS NULL ORDER BY b.created_at DESC LIMIT $3`, projectID, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var builds []Build
	for rows.Next() {
		var out Build
		if err := rows.Scan(&out.ID, &out.ProjectID, &out.RevisionID, &out.JobID, &out.Status, &out.RuntimeVersion,
			&out.ArtifactStorageKey, &out.PreviewURL, &out.Diagnostics, &out.Logs, &out.CreatedAt, &out.UpdatedAt); err != nil {
			return nil, err
		}
		builds = append(builds, out)
	}
	return builds, rows.Err()
}

func (r *Repository) CreateDeployment(ctx context.Context, userID string, deployment Deployment) (*Deployment, error) {
	var owned bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ai_projects WHERE id=$1 AND user_id=$2 AND archived_at IS NULL)`, deployment.ProjectID, userID).Scan(&owned); err != nil {
		return nil, err
	}
	if !owned {
		return nil, errors.New("project not found or access denied")
	}
	deployment.Metadata, _ = NormalizeJSON(deployment.Metadata, "{}")
	if deployment.Status == "" {
		deployment.Status = "queued"
	}
	row := r.db.QueryRow(ctx, `INSERT INTO ai_project_deployments(project_id,revision_id,build_id,job_id,provider,status,external_id,url,metadata,logs)
		VALUES($1,NULLIF($2,'')::uuid,NULLIF($3,'')::uuid,NULLIF($4,'')::uuid,$5,$6,$7,$8,$9::jsonb,$10)
		RETURNING id::text,project_id::text,COALESCE(revision_id::text,''),COALESCE(build_id::text,''),COALESCE(job_id::text,''),provider,status,external_id,url,metadata::text,logs,created_at,updated_at`,
		deployment.ProjectID, deployment.RevisionID, deployment.BuildID, deployment.JobID, deployment.Provider, deployment.Status,
		deployment.ExternalID, deployment.URL, deployment.Metadata, deployment.Logs)
	var out Deployment
	if err := row.Scan(&out.ID, &out.ProjectID, &out.RevisionID, &out.BuildID, &out.JobID, &out.Provider, &out.Status,
		&out.ExternalID, &out.URL, &out.Metadata, &out.Logs, &out.CreatedAt, &out.UpdatedAt); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *Repository) ListDeployments(ctx context.Context, userID, projectID string, limit int) ([]Deployment, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	rows, err := r.db.Query(ctx, `SELECT d.id::text,d.project_id::text,COALESCE(d.revision_id::text,''),COALESCE(d.build_id::text,''),COALESCE(d.job_id::text,''),
		d.provider,d.status,d.external_id,d.url,d.metadata::text,d.logs,d.created_at,d.updated_at
		FROM ai_project_deployments d JOIN ai_projects p ON p.id=d.project_id
		WHERE d.project_id=$1 AND p.user_id=$2 AND p.archived_at IS NULL ORDER BY d.created_at DESC LIMIT $3`, projectID, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var deployments []Deployment
	for rows.Next() {
		var out Deployment
		if err := rows.Scan(&out.ID, &out.ProjectID, &out.RevisionID, &out.BuildID, &out.JobID, &out.Provider, &out.Status,
			&out.ExternalID, &out.URL, &out.Metadata, &out.Logs, &out.CreatedAt, &out.UpdatedAt); err != nil {
			return nil, err
		}
		deployments = append(deployments, out)
	}
	return deployments, rows.Err()
}

func (r *Repository) GetProposalBatch(ctx context.Context, userID, batchID string) (*ProposalBatch, error) {
	row := r.db.QueryRow(ctx, `SELECT id::text,user_id::text,COALESCE(business_id::text,''),COALESCE(project_id::text,''),COALESCE(revision_id::text,''),
		domain,message,changes::text,provider,model,token_usage::text,status,created_at,updated_at
		FROM ai_proposal_batches WHERE id=$1 AND user_id=$2`, batchID, userID)
	var out ProposalBatch
	if err := row.Scan(&out.ID, &out.UserID, &out.BusinessID, &out.ProjectID, &out.RevisionID, &out.Domain, &out.Message,
		&out.Changes, &out.Provider, &out.Model, &out.TokenUsage, &out.Status, &out.CreatedAt, &out.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &out, nil
}

func (r *Repository) SetProjectPublished(ctx context.Context, userID, projectID string, published bool) (*Project, error) {
	status := "ready"
	if published {
		status = "published"
	}
	project, err := scanProject(r.db.QueryRow(ctx, `UPDATE ai_projects SET status=$3,updated_at=NOW()
		WHERE id=$1 AND user_id=$2 AND archived_at IS NULL AND approved_revision_id IS NOT NULL RETURNING `+projectSelect,
		projectID, userID, status))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("project not found, unapproved, or access denied")
	}
	return project, err
}

func (r *Repository) GetBuild(ctx context.Context, userID, buildID string) (*Build, error) {
	row := r.db.QueryRow(ctx, `SELECT b.id::text,b.project_id::text,COALESCE(b.revision_id::text,''),COALESCE(b.job_id::text,''),b.status,b.runtime_version,
		b.artifact_storage_key,b.preview_url,b.diagnostics::text,b.logs,b.created_at,b.updated_at
		FROM ai_project_builds b JOIN ai_projects p ON p.id=b.project_id WHERE b.id=$1 AND p.user_id=$2`, buildID, userID)
	var out Build
	if err := row.Scan(&out.ID, &out.ProjectID, &out.RevisionID, &out.JobID, &out.Status, &out.RuntimeVersion,
		&out.ArtifactStorageKey, &out.PreviewURL, &out.Diagnostics, &out.Logs, &out.CreatedAt, &out.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &out, nil
}
