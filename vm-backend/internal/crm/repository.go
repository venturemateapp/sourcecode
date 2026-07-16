package crm

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

// Contact CRUD ----------------------------------------------------------------

const contactCols = `id, business_id, name, email, phone, company, job_title, contact_type, source, notes, avatar, created_at, updated_at`

func scanContact(row pgx.Row) (*Contact, error) {
	var c Contact
	err := row.Scan(&c.ID, &c.BusinessID, &c.Name, &c.Email, &c.Phone, &c.Company, &c.JobTitle, &c.ContactType, &c.Source, &c.Notes, &c.Avatar, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) ListContacts(ctx context.Context, businessID string) ([]Contact, error) {
	rows, err := r.db.Query(ctx, `SELECT `+contactCols+` FROM crm_contacts WHERE business_id = $1 ORDER BY created_at DESC`, businessID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Contact
	for rows.Next() {
		c, err := scanContact(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *c)
	}
	return list, nil
}

func (r *Repository) GetContact(ctx context.Context, id string) (*Contact, error) {
	return scanContact(r.db.QueryRow(ctx, `SELECT `+contactCols+` FROM crm_contacts WHERE id = $1`, id))
}

func (r *Repository) CreateContact(ctx context.Context, c *Contact) error {
	c.ID = uuid.New().String()
	c.CreatedAt = time.Now()
	c.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx,
		`INSERT INTO crm_contacts (id, business_id, name, email, phone, company, job_title, contact_type, source, notes, avatar, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		c.ID, c.BusinessID, c.Name, c.Email, c.Phone, c.Company, c.JobTitle, c.ContactType, c.Source, c.Notes, c.Avatar, c.CreatedAt, c.UpdatedAt)
	return err
}

func (r *Repository) UpdateContact(ctx context.Context, c *Contact) error {
	c.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE crm_contacts SET name=$3, email=$4, phone=$5, company=$6, job_title=$7, contact_type=$8, source=$9, notes=$10, avatar=$11, updated_at=$12
		 WHERE id=$1 AND business_id=$2`,
		c.ID, c.BusinessID, c.Name, c.Email, c.Phone, c.Company, c.JobTitle, c.ContactType, c.Source, c.Notes, c.Avatar, c.UpdatedAt)
	return err
}

func (r *Repository) DeleteContact(ctx context.Context, id, businessID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM crm_contacts WHERE id=$1 AND business_id=$2`, id, businessID)
	return err
}

// Deal CRUD -------------------------------------------------------------------

const dealCols = `id, business_id, contact_id, title, value, currency, stage, probability, expected_close_date, created_at, updated_at`

func scanDeal(row pgx.Row) (*Deal, error) {
	var d Deal
	var expectedCloseDate *time.Time
	err := row.Scan(&d.ID, &d.BusinessID, &d.ContactID, &d.Title, &d.Value, &d.Currency, &d.Stage, &d.Probability, &expectedCloseDate, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if expectedCloseDate != nil {
		s := expectedCloseDate.Format("2006-01-02")
		d.ExpectedCloseDate = &s
	}
	return &d, nil
}

func (r *Repository) ListDeals(ctx context.Context, businessID string) ([]Deal, error) {
	rows, err := r.db.Query(ctx, `SELECT `+dealCols+` FROM crm_deals WHERE business_id = $1 ORDER BY created_at DESC`, businessID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Deal
	for rows.Next() {
		d, err := scanDeal(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *d)
	}
	return list, nil
}

func (r *Repository) GetDeal(ctx context.Context, id string) (*Deal, error) {
	return scanDeal(r.db.QueryRow(ctx, `SELECT `+dealCols+` FROM crm_deals WHERE id = $1`, id))
}

func (r *Repository) CreateDeal(ctx context.Context, d *Deal) error {
	d.ID = uuid.New().String()
	d.CreatedAt = time.Now()
	d.UpdatedAt = time.Now()
	var ecd *time.Time
	if d.ExpectedCloseDate != nil && *d.ExpectedCloseDate != "" {
		t, err := time.Parse("2006-01-02", *d.ExpectedCloseDate)
		if err == nil {
			ecd = &t
		}
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO crm_deals (id, business_id, contact_id, title, value, currency, stage, probability, expected_close_date, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		d.ID, d.BusinessID, d.ContactID, d.Title, d.Value, d.Currency, d.Stage, d.Probability, ecd, d.CreatedAt, d.UpdatedAt)
	return err
}

func (r *Repository) UpdateDeal(ctx context.Context, d *Deal) error {
	d.UpdatedAt = time.Now()
	var ecd *time.Time
	if d.ExpectedCloseDate != nil && *d.ExpectedCloseDate != "" {
		t, err := time.Parse("2006-01-02", *d.ExpectedCloseDate)
		if err == nil {
			ecd = &t
		}
	}
	_, err := r.db.Exec(ctx,
		`UPDATE crm_deals SET contact_id=$3, title=$4, value=$5, currency=$6, stage=$7, probability=$8, expected_close_date=$9, updated_at=$10
		 WHERE id=$1 AND business_id=$2`,
		d.ID, d.BusinessID, d.ContactID, d.Title, d.Value, d.Currency, d.Stage, d.Probability, ecd, d.UpdatedAt)
	return err
}

func (r *Repository) DeleteDeal(ctx context.Context, id, businessID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM crm_deals WHERE id=$1 AND business_id=$2`, id, businessID)
	return err
}

// Activity CRUD ---------------------------------------------------------------

const activityCols = `id, business_id, contact_id, type, description, created_by, created_at`

func scanActivity(row pgx.Row) (*Activity, error) {
	var a Activity
	err := row.Scan(&a.ID, &a.BusinessID, &a.ContactID, &a.Type, &a.Description, &a.CreatedBy, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Repository) ListActivities(ctx context.Context, businessID string) ([]Activity, error) {
	rows, err := r.db.Query(ctx, `SELECT `+activityCols+` FROM crm_activities WHERE business_id = $1 ORDER BY created_at DESC`, businessID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Activity
	for rows.Next() {
		a, err := scanActivity(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *a)
	}
	return list, nil
}

func (r *Repository) CreateActivity(ctx context.Context, a *Activity) error {
	a.ID = uuid.New().String()
	a.CreatedAt = time.Now()
	_, err := r.db.Exec(ctx,
		`INSERT INTO crm_activities (id, business_id, contact_id, type, description, created_by, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		a.ID, a.BusinessID, a.ContactID, a.Type, a.Description, a.CreatedBy, a.CreatedAt)
	return err
}

func (r *Repository) DeleteActivity(ctx context.Context, id, businessID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM crm_activities WHERE id=$1 AND business_id=$2`, id, businessID)
	return err
}

// Task CRUD -------------------------------------------------------------------

const taskCols = `id, business_id, contact_id, title, description, due_date, status, assigned_to, created_at, updated_at`

func scanTask(row pgx.Row) (*Task, error) {
	var t Task
	var dueDate *time.Time
	err := row.Scan(&t.ID, &t.BusinessID, &t.ContactID, &t.Title, &t.Description, &dueDate, &t.Status, &t.AssignedTo, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if dueDate != nil {
		s := dueDate.Format("2006-01-02")
		t.DueDate = &s
	}
	return &t, nil
}

func (r *Repository) ListTasks(ctx context.Context, businessID string) ([]Task, error) {
	rows, err := r.db.Query(ctx, `SELECT `+taskCols+` FROM crm_tasks WHERE business_id = $1 ORDER BY created_at DESC`, businessID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Task
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *t)
	}
	return list, nil
}

func (r *Repository) GetTask(ctx context.Context, id string) (*Task, error) {
	return scanTask(r.db.QueryRow(ctx, `SELECT `+taskCols+` FROM crm_tasks WHERE id = $1`, id))
}

func (r *Repository) CreateTask(ctx context.Context, t *Task) error {
	t.ID = uuid.New().String()
	t.CreatedAt = time.Now()
	t.UpdatedAt = time.Now()
	var dd *time.Time
	if t.DueDate != nil && *t.DueDate != "" {
		parsed, err := time.Parse("2006-01-02", *t.DueDate)
		if err == nil {
			dd = &parsed
		}
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO crm_tasks (id, business_id, contact_id, title, description, due_date, status, assigned_to, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		t.ID, t.BusinessID, t.ContactID, t.Title, t.Description, dd, t.Status, t.AssignedTo, t.CreatedAt, t.UpdatedAt)
	return err
}

func (r *Repository) UpdateTask(ctx context.Context, t *Task) error {
	t.UpdatedAt = time.Now()
	var dd *time.Time
	if t.DueDate != nil && *t.DueDate != "" {
		parsed, err := time.Parse("2006-01-02", *t.DueDate)
		if err == nil {
			dd = &parsed
		}
	}
	_, err := r.db.Exec(ctx,
		`UPDATE crm_tasks SET contact_id=$3, title=$4, description=$5, due_date=$6, status=$7, assigned_to=$8, updated_at=$9
		 WHERE id=$1 AND business_id=$2`,
		t.ID, t.BusinessID, t.ContactID, t.Title, t.Description, dd, t.Status, t.AssignedTo, t.UpdatedAt)
	return err
}

func (r *Repository) DeleteTask(ctx context.Context, id, businessID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM crm_tasks WHERE id=$1 AND business_id=$2`, id, businessID)
	return err
}
