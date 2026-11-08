package investors

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func jsonOrArr(s string) string {
	if s == "" {
		return "[]"
	}
	return s
}

func jsonOrObj(s string) string {
	if s == "" {
		return "{}"
	}
	return s
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const listQuery = `SELECT id, name, type, email, phone, logo, location,
	focus_industries::text, stages::text, check_size::text, aum,
	portfolio::text, team::text, thesis, criteria::text,
	match_score, status, connected_at::text, is_active, created_at, updated_at FROM investors`

func scanInvestor(row pgx.Row) (*Investor, error) {
	var i Investor
	err := row.Scan(&i.ID, &i.Name, &i.Type, &i.Email, &i.Phone, &i.Logo, &i.Location,
		&i.FocusIndustries, &i.Stages, &i.CheckSize, &i.Aum,
		&i.Portfolio, &i.Team, &i.Thesis, &i.Criteria,
		&i.MatchScore, &i.Status, &i.ConnectedAt, &i.IsActive, &i.CreatedAt, &i.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func scanInvestors(rows pgx.Rows) ([]Investor, error) {
	defer rows.Close()
	var list []Investor
	for rows.Next() {
		i, err := scanInvestor(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *i)
	}
	return list, nil
}

func (r *Repository) List(ctx context.Context) ([]Investor, error) {
	return r.ListFiltered(ctx, true)
}

func (r *Repository) ListFiltered(ctx context.Context, activeOnly bool) ([]Investor, error) {
	query := listQuery
	if activeOnly {
		query += " WHERE is_active = true"
	}
	rows, err := r.db.Query(ctx, query+" ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	return scanInvestors(rows)
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Investor, error) {
	i, err := scanInvestor(r.db.QueryRow(ctx, listQuery+" WHERE id = $1", id))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return i, nil
}

func (r *Repository) Create(ctx context.Context, i *Investor) error {
	i.ID = uuid.New().String()
	now := time.Now()
	i.CreatedAt = now
	i.UpdatedAt = now
	if i.Status == "" {
		i.Status = "not-connected"
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO investors (id, name, type, email, phone, logo, location,
			focus_industries, stages, check_size, aum,
			portfolio, team, thesis, criteria,
			match_score, status, connected_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,
			$12::jsonb,$13::jsonb,$14,$15::jsonb,
			$16,$17,$18,$19,$20)`,
		i.ID, i.Name, i.Type, i.Email, i.Phone, i.Logo, i.Location,
		jsonOrArr(i.FocusIndustries), jsonOrArr(i.Stages), jsonOrObj(i.CheckSize), i.Aum,
		jsonOrArr(i.Portfolio), jsonOrArr(i.Team), i.Thesis, jsonOrArr(i.Criteria),
		i.MatchScore, i.Status, i.ConnectedAt, i.CreatedAt, i.UpdatedAt)
	return err
}

func (r *Repository) Update(ctx context.Context, i *Investor) error {
	i.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx, `
		UPDATE investors SET name=$2, type=$3, email=$4, phone=$5, logo=$6, location=$7,
			focus_industries=$8::jsonb, stages=$9::jsonb, check_size=$10::jsonb, aum=$11,
			portfolio=$12::jsonb, team=$13::jsonb, thesis=$14, criteria=$15::jsonb,
			match_score=$16, status=$17, connected_at=$18, is_active=$19, updated_at=$20
		WHERE id=$1`,
		i.ID, i.Name, i.Type, i.Email, i.Phone, i.Logo, i.Location,
		jsonOrArr(i.FocusIndustries), jsonOrArr(i.Stages), jsonOrObj(i.CheckSize), i.Aum,
		jsonOrArr(i.Portfolio), jsonOrArr(i.Team), i.Thesis, jsonOrArr(i.Criteria),
		i.MatchScore, i.Status, i.ConnectedAt, i.IsActive, i.UpdatedAt)
	return err
}

func (r *Repository) Upsert(ctx context.Context, args map[string]interface{}) error {
	id := args["id"].(string)
	name := args["name"].(string)
	investorType := args["type"].(string)
	location := args["location"].(string)
	logoArg := args["logo"]
	logo, _ := logoArg.(string)
	logoProvided := logoArg != nil
	thesis := args["thesis"].(string)
	email, _ := args["email"].(string)
	phone, _ := args["phone"].(string)
	activeArg := args["isActive"]
	isActive, activeProvided := activeArg.(bool)
	if !activeProvided {
		isActive = true
	}
	activeProvided = activeArg != nil
	_, err := r.db.Exec(ctx, `
		INSERT INTO investors (id, name, type, location, logo, focus_industries, thesis, email, phone, is_active, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,NOW(),NOW())
		ON CONFLICT (id) DO UPDATE SET name=$2, type=$3, location=$4, logo=CASE WHEN $11 THEN $5 ELSE investors.logo END, focus_industries=$6::jsonb, thesis=$7, email=$8, phone=$9, is_active=CASE WHEN $12 THEN $10 ELSE investors.is_active END, updated_at=NOW()`,
		id, name, investorType, location, logo, args["focusIndustries"].(string), thesis, email, phone, isActive, logoProvided, activeProvided)
	return err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM investors WHERE id=$1", id)
	return err
}
