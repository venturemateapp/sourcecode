package aijobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

type scanner interface{ Scan(dest ...any) error }

const jobColumns = `id::text,user_id::text,COALESCE(business_id::text,''),COALESCE(project_id::text,''),artifact_type,job_type,status,
	progress,step,message,request::text,result::text,error_code,error_message,logs,provider,model,input_tokens,output_tokens,
	attempt_count,max_attempts,cancel_requested,COALESCE(locked_by,''),locked_at,heartbeat_at,started_at,completed_at,created_at,updated_at`

func scanJob(row scanner) (*Job, error) {
	var job Job
	if err := row.Scan(&job.ID, &job.UserID, &job.BusinessID, &job.ProjectID, &job.ArtifactType, &job.JobType,
		&job.Status, &job.Progress, &job.Step, &job.Message, &job.Request, &job.Result, &job.ErrorCode,
		&job.ErrorMessage, &job.Logs, &job.Provider, &job.Model, &job.InputTokens, &job.OutputTokens,
		&job.AttemptCount, &job.MaxAttempts, &job.CancelRequested, &job.LockedBy, &job.LockedAt,
		&job.HeartbeatAt, &job.StartedAt, &job.CompletedAt, &job.CreatedAt, &job.UpdatedAt); err != nil {
		return nil, err
	}
	return &job, nil
}

func validateJobType(value string) error {
	switch value {
	case "plan", "generate", "revise", "asset", "build", "repair", "export", "deploy", "thumbnail":
		return nil
	default:
		return fmt.Errorf("unsupported AI job type %q", value)
	}
}

func (r *Repository) Create(ctx context.Context, input CreateInput) (*Job, error) {
	if strings.TrimSpace(input.UserID) == "" {
		return nil, errors.New("authenticated user is required")
	}
	if err := validateJobType(input.JobType); err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.Request) == "" {
		input.Request = "{}"
	}
	if !json.Valid([]byte(input.Request)) {
		return nil, errors.New("job request must be valid JSON")
	}
	if input.MaxAttempts <= 0 || input.MaxAttempts > 10 {
		input.MaxAttempts = 3
	}
	if input.ProjectID != "" {
		var owned bool
		if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ai_projects WHERE id=$1 AND user_id=$2 AND archived_at IS NULL)`, input.ProjectID, input.UserID).Scan(&owned); err != nil {
			return nil, err
		}
		if !owned {
			return nil, errors.New("project not found or access denied")
		}
	}
	job, err := scanJob(r.db.QueryRow(ctx, `INSERT INTO ai_generation_jobs(user_id,business_id,project_id,artifact_type,job_type,request,max_attempts,message)
		VALUES($1,NULLIF($2,'')::uuid,NULLIF($3,'')::uuid,$4,$5,$6::jsonb,$7,'Queued') RETURNING `+jobColumns,
		input.UserID, input.BusinessID, input.ProjectID, input.ArtifactType, input.JobType, input.Request, input.MaxAttempts))
	return job, err
}

func (r *Repository) Get(ctx context.Context, userID, jobID string) (*Job, error) {
	job, err := scanJob(r.db.QueryRow(ctx, `SELECT `+jobColumns+` FROM ai_generation_jobs WHERE id=$1 AND user_id=$2`, jobID, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return job, err
}

func (r *Repository) GetInternal(ctx context.Context, jobID string) (*Job, error) {
	job, err := scanJob(r.db.QueryRow(ctx, `SELECT `+jobColumns+` FROM ai_generation_jobs WHERE id=$1`, jobID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return job, err
}

func (r *Repository) List(ctx context.Context, userID, projectID, status string, limit, offset int) ([]Job, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.Query(ctx, `SELECT `+jobColumns+` FROM ai_generation_jobs
		WHERE user_id=$1 AND ($2='' OR project_id::text=$2) AND ($3='' OR status=$3)
		ORDER BY created_at DESC LIMIT $4 OFFSET $5`, userID, projectID, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var jobs []Job
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, *job)
	}
	return jobs, rows.Err()
}

func (r *Repository) ClaimNext(ctx context.Context, workerID string) (*Job, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var jobID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM ai_generation_jobs
		WHERE status='queued' AND cancel_requested=FALSE AND attempt_count < max_attempts
		ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`).Scan(&jobID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	job, err := scanJob(tx.QueryRow(ctx, `UPDATE ai_generation_jobs SET status='running',step='starting',message='Worker claimed job',
		attempt_count=attempt_count+1,locked_by=$2,locked_at=NOW(),heartbeat_at=NOW(),started_at=COALESCE(started_at,NOW()),updated_at=NOW()
		WHERE id=$1 RETURNING `+jobColumns, jobID, workerID))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return job, nil
}

func (r *Repository) Heartbeat(ctx context.Context, jobID, workerID string) error {
	result, err := r.db.Exec(ctx, `UPDATE ai_generation_jobs SET heartbeat_at=NOW(),updated_at=NOW()
		WHERE id=$1 AND locked_by=$2 AND status='running'`, jobID, workerID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("job lock is no longer owned by this worker")
	}
	return nil
}

func (r *Repository) UpdateProgress(ctx context.Context, jobID, workerID, step, message string, progress int, logLine string) error {
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}
	result, err := r.db.Exec(ctx, `UPDATE ai_generation_jobs SET step=$3,message=$4,progress=$5,heartbeat_at=NOW(),updated_at=NOW(),
		logs=CASE WHEN $6='' THEN logs ELSE RIGHT(logs || CASE WHEN logs='' THEN '' ELSE E'\n' END || $6, 262144) END
		WHERE id=$1 AND locked_by=$2 AND status='running'`, jobID, workerID, step, message, progress, sanitizeLog(logLine))
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("job lock is no longer owned by this worker")
	}
	return nil
}

func sanitizeLog(value string) string {
	value = strings.ReplaceAll(value, "\x00", "")
	if len(value) > 8192 {
		value = value[:8192] + "…"
	}
	return value
}

func (r *Repository) Complete(ctx context.Context, jobID, workerID, status, result, provider, model string, inputTokens, outputTokens int64, logLine string) error {
	if status == "" {
		status = "completed"
	}
	if status != "completed" && status != "awaiting_review" {
		return errors.New("invalid completion status")
	}
	if strings.TrimSpace(result) == "" {
		result = "{}"
	}
	if !json.Valid([]byte(result)) {
		return errors.New("job result must be valid JSON")
	}
	progress := 100
	if status == "awaiting_review" {
		progress = 95
	}
	command, err := r.db.Exec(ctx, `UPDATE ai_generation_jobs SET status=$3,progress=$4,step=$3,message=$5,result=$6::jsonb,
		provider=$7,model=$8,input_tokens=$9,output_tokens=$10,error_code='',error_message='',
		completed_at=CASE WHEN $3='completed' THEN NOW() ELSE NULL END,
		heartbeat_at=NOW(),updated_at=NOW(),logs=CASE WHEN $11='' THEN logs ELSE RIGHT(logs || CASE WHEN logs='' THEN '' ELSE E'\n' END || $11,262144) END
		WHERE id=$1 AND locked_by=$2 AND status='running'`, jobID, workerID, status, progress,
		map[bool]string{true: "Ready for review", false: "Completed"}[status == "awaiting_review"], result,
		provider, model, inputTokens, outputTokens, sanitizeLog(logLine))
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return errors.New("job lock is no longer owned by this worker")
	}
	return nil
}

func (r *Repository) Fail(ctx context.Context, jobID, workerID, code, message, logLine string, retryable bool) error {
	status := "failed"
	step := "failed"
	if retryable {
		var attempts, maxAttempts int
		if err := r.db.QueryRow(ctx, `SELECT attempt_count,max_attempts FROM ai_generation_jobs WHERE id=$1 AND locked_by=$2`, jobID, workerID).Scan(&attempts, &maxAttempts); err == nil && attempts < maxAttempts {
			status, step = "queued", "retry_queued"
		}
	}
	command, err := r.db.Exec(ctx, `UPDATE ai_generation_jobs SET status=$3,step=$4,message=$5,error_code=$6,error_message=$5,
		completed_at=CASE WHEN $3='failed' THEN NOW() ELSE NULL END,locked_by=CASE WHEN $3='queued' THEN NULL ELSE locked_by END,
		locked_at=CASE WHEN $3='queued' THEN NULL ELSE locked_at END,heartbeat_at=NOW(),updated_at=NOW(),
		logs=CASE WHEN $7='' THEN logs ELSE RIGHT(logs || CASE WHEN logs='' THEN '' ELSE E'\n' END || $7,262144) END
		WHERE id=$1 AND locked_by=$2 AND status='running'`, jobID, workerID, status, step, message, code, sanitizeLog(logLine))
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return errors.New("job lock is no longer owned by this worker")
	}
	return nil
}

func (r *Repository) Cancel(ctx context.Context, userID, jobID string) (*Job, error) {
	job, err := scanJob(r.db.QueryRow(ctx, `UPDATE ai_generation_jobs SET cancel_requested=TRUE,
		status=CASE WHEN status='queued' THEN 'cancelled' ELSE status END,
		step=CASE WHEN status='queued' THEN 'cancelled' ELSE step END,
		message=CASE WHEN status='queued' THEN 'Cancelled' ELSE 'Cancellation requested' END,
		completed_at=CASE WHEN status='queued' THEN NOW() ELSE completed_at END,updated_at=NOW()
		WHERE id=$1 AND user_id=$2 AND status IN ('queued','running') RETURNING `+jobColumns, jobID, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("job not found or cannot be cancelled")
	}
	return job, err
}

func (r *Repository) IsCancelRequested(ctx context.Context, jobID, workerID string) (bool, error) {
	var cancel bool
	err := r.db.QueryRow(ctx, `SELECT cancel_requested FROM ai_generation_jobs WHERE id=$1 AND locked_by=$2`, jobID, workerID).Scan(&cancel)
	return cancel, err
}

func (r *Repository) MarkCancelled(ctx context.Context, jobID, workerID string) error {
	_, err := r.db.Exec(ctx, `UPDATE ai_generation_jobs SET status='cancelled',step='cancelled',message='Cancelled',progress=0,
		completed_at=NOW(),updated_at=NOW() WHERE id=$1 AND locked_by=$2 AND status='running'`, jobID, workerID)
	return err
}

func (r *Repository) RecoverStale(ctx context.Context, staleAfter time.Duration) (int64, error) {
	if staleAfter < time.Minute {
		staleAfter = 5 * time.Minute
	}
	result, err := r.db.Exec(ctx, `UPDATE ai_generation_jobs SET status=CASE WHEN attempt_count < max_attempts THEN 'queued' ELSE 'failed' END,
		step=CASE WHEN attempt_count < max_attempts THEN 'recovered' ELSE 'failed' END,
		message=CASE WHEN attempt_count < max_attempts THEN 'Recovered after worker interruption' ELSE 'Worker stopped before completion' END,
		error_code=CASE WHEN attempt_count < max_attempts THEN error_code ELSE 'WORKER_STALE' END,
		error_message=CASE WHEN attempt_count < max_attempts THEN error_message ELSE 'Worker heartbeat expired' END,
		locked_by=NULL,locked_at=NULL,updated_at=NOW(),completed_at=CASE WHEN attempt_count >= max_attempts THEN NOW() ELSE completed_at END
		WHERE status='running' AND COALESCE(heartbeat_at,locked_at,updated_at) < NOW()-$1::interval`, fmt.Sprintf("%f seconds", staleAfter.Seconds()))
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
