package subscriptions

import (
	"context"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func (r *Repository) CreatePlan(ctx context.Context, name, displayName, description string, priceMonthly, priceYearly float64) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO subscription_plans (id, name, display_name, description, price_monthly, price_yearly)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		uuid.New().String(), name, displayName, description, priceMonthly, priceYearly)
	return err
}

func (r *Repository) DeletePlan(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM subscription_plans WHERE id = $1`, id)
	return err
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetAllPlans(ctx context.Context) ([]Plan, error) {
	query := `SELECT id, name, display_name, description, price_monthly, price_yearly, features::text, limits::text, sort_order, is_active, created_at, updated_at
	          FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []Plan
	for rows.Next() {
		var p Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, &p.Description, &p.PriceMonthly, &p.PriceYearly, &p.Features, &p.Limits, &p.SortOrder, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *Repository) GetPlanByName(ctx context.Context, name string) (*Plan, error) {
	query := `SELECT id, name, display_name, description, price_monthly, price_yearly, features::text, limits::text, sort_order, is_active, created_at, updated_at
	          FROM subscription_plans WHERE name = $1 AND is_active = true LIMIT 1`
	var p Plan
	err := r.db.QueryRow(ctx, query, name).Scan(&p.ID, &p.Name, &p.DisplayName, &p.Description, &p.PriceMonthly, &p.PriceYearly, &p.Features, &p.Limits, &p.SortOrder, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) GetUserSubscription(ctx context.Context, userID string) (*Subscription, *Plan, error) {
	query := `SELECT s.id, s.user_id, s.plan_id, s.status, s.current_period_start, s.current_period_end, s.trial_end, s.cancel_at_period_end,
	                 s.stripe_subscription_id, s.stripe_customer_id, s.created_at, s.updated_at,
	                 p.id, p.name, p.display_name, p.description, p.price_monthly, p.price_yearly, p.features::text, p.limits::text, p.sort_order, p.is_active, p.created_at, p.updated_at
	          FROM user_subscriptions s
	          JOIN subscription_plans p ON s.plan_id = p.id
	          WHERE s.user_id = $1 LIMIT 1`
	var sub Subscription
	var plan Plan
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&sub.ID, &sub.UserID, &sub.PlanID, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.TrialEnd, &sub.CancelAtPeriodEnd,
		&sub.StripeSubscriptionID, &sub.StripeCustomerID, &sub.CreatedAt, &sub.UpdatedAt,
		&plan.ID, &plan.Name, &plan.DisplayName, &plan.Description, &plan.PriceMonthly, &plan.PriceYearly, &plan.Features, &plan.Limits, &plan.SortOrder, &plan.IsActive, &plan.CreatedAt, &plan.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	sub.Plan = &plan
	return &sub, &plan, nil
}

func (r *Repository) CreateFreeSubscription(ctx context.Context, userID string) error {
	plan, err := r.GetPlanByName(ctx, PlanFree)
	if err != nil {
		return err
	}
	query := `INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, created_at, updated_at)
	          VALUES ($1, $2, $3, 'active', NOW(), NOW(), NOW())
	          ON CONFLICT (user_id) DO NOTHING`
	_, err = r.db.Exec(ctx, query, uuid.New().String(), userID, plan.ID)
	return err
}

func (r *Repository) ChangePlan(ctx context.Context, userID, planName string) (*Subscription, *Plan, error) {
	plan, err := r.GetPlanByName(ctx, planName)
	if err != nil {
		return nil, nil, err
	}

	query := `UPDATE user_subscriptions SET plan_id = $1, updated_at = NOW() WHERE user_id = $2
	          RETURNING id, user_id, plan_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end,
	                    stripe_subscription_id, stripe_customer_id, created_at, updated_at`
	var sub Subscription
	err = r.db.QueryRow(ctx, query, plan.ID, userID).Scan(
		&sub.ID, &sub.UserID, &sub.PlanID, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.TrialEnd, &sub.CancelAtPeriodEnd,
		&sub.StripeSubscriptionID, &sub.StripeCustomerID, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		return nil, nil, err
	}
	sub.Plan = plan
	return &sub, plan, nil
}

func (r *Repository) CancelSubscription(ctx context.Context, userID string) error {
	query := `UPDATE user_subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE user_id = $1`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

func (r *Repository) GetUserByID(ctx context.Context, userID string) (string, error) {
	query := `SELECT id FROM users WHERE id = $1 LIMIT 1`
	var id string
	err := r.db.QueryRow(ctx, query, userID).Scan(&id)
	return id, err
}

type AdminUserPlanRow struct {
	UserID         string   `json:"userId"`
	FirstName      string   `json:"firstName"`
	Surname        string   `json:"surname"`
	Email          string   `json:"email"`
	PlanName       *string  `json:"planName"`
	PlanDisplayName *string `json:"planDisplayName"`
	Status         *string  `json:"status"`
	AITokensUsed   int64    `json:"aiTokensUsed"`
	StorageBytes   int64    `json:"storageBytes"`
	StorageLimit   *float64 `json:"storageLimit"`
	AITokenLimit   *float64 `json:"aiTokenLimit"`
}

func (r *Repository) QueryAdminUserPlans(ctx context.Context) ([]map[string]interface{}, error) {
	query := `SELECT u.id, u.first_name, u.surname, u.email, sp.name, sp.display_name, us.status,
	          COALESCE(ul.ai_tokens_used, 0), COALESCE(ul.storage_bytes, 0),
	          sp.limits->>'storage_gb', sp.limits->>'ai_tokens_monthly'
	          FROM users u
	          JOIN user_subscriptions us ON us.user_id = u.id
	          JOIN subscription_plans sp ON sp.id = us.plan_id
	          LEFT JOIN usage_log ul ON ul.user_id = u.id AND ul.billing_period::text = to_char(NOW(), 'YYYY-MM')
	          ORDER BY u.created_at DESC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var userID, firstName, surname, email string
		var planName, planDisplayName, status *string
		var aiTokensUsed, storageBytes int64
		var storageLimitStr, aiTokenLimitStr *string
		if err := rows.Scan(&userID, &firstName, &surname, &email, &planName, &planDisplayName, &status,
			&aiTokensUsed, &storageBytes, &storageLimitStr, &aiTokenLimitStr); err != nil {
			return nil, err
		}
		var storageLimit *float64
		if storageLimitStr != nil {
			if v, err := strconv.ParseFloat(*storageLimitStr, 64); err == nil {
				storageLimit = &v
			}
		}
		var aiTokenLimit *float64
		if aiTokenLimitStr != nil {
			if v, err := strconv.ParseFloat(*aiTokenLimitStr, 64); err == nil {
				aiTokenLimit = &v
			}
		}
		results = append(results, map[string]interface{}{
			"userId":          userID,
			"firstName":       firstName,
			"surname":         surname,
			"email":           email,
			"planName":        planName,
			"planDisplayName": planDisplayName,
			"status":          status,
			"aiTokensUsed":    aiTokensUsed,
			"storageBytes":    storageBytes,
			"storageLimit":    storageLimit,
			"aiTokenLimit":    aiTokenLimit,
		})
	}
	return results, nil
}

func (r *Repository) UpdatePlan(ctx context.Context, planID string, args map[string]interface{}) error {
	displayName, _ := args["displayName"].(string)
	description, _ := args["description"].(string)
	priceMonthly, pmOk := args["priceMonthly"].(float64)
	priceYearly, pyOk := args["priceYearly"].(float64)
	isActive, iaOk := args["isActive"].(bool)
	query := `UPDATE subscription_plans SET updated_at = NOW()`
	var vals []interface{}
	i := 1
	if displayName != "" {
		query += fmt.Sprintf(", display_name = $%d", i); i++
		vals = append(vals, displayName)
	}
	if description != "" {
		query += fmt.Sprintf(", description = $%d", i); i++
		vals = append(vals, description)
	}
	if pmOk {
		query += fmt.Sprintf(", price_monthly = $%d", i); i++
		vals = append(vals, priceMonthly)
	}
	if pyOk {
		query += fmt.Sprintf(", price_yearly = $%d", i); i++
		vals = append(vals, priceYearly)
	}
	if iaOk {
		query += fmt.Sprintf(", is_active = $%d", i); i++
		vals = append(vals, isActive)
	}
	query += fmt.Sprintf(" WHERE id = $%d", i)
	vals = append(vals, planID)
	_, err := r.db.Exec(ctx, query, vals...)
	return err
}
