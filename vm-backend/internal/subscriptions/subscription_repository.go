package subscriptions

import (
	"context"

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

func (r *Repository) GetAllPlans(ctx context.Context) ([]Plan, error) {
	query := `SELECT id, name, display_name, description, price_monthly, price_yearly, features::text, sort_order, is_active, created_at, updated_at
	          FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []Plan
	for rows.Next() {
		var p Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, &p.Description, &p.PriceMonthly, &p.PriceYearly, &p.Features, &p.SortOrder, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *Repository) GetPlanByName(ctx context.Context, name string) (*Plan, error) {
	query := `SELECT id, name, display_name, description, price_monthly, price_yearly, features::text, sort_order, is_active, created_at, updated_at
	          FROM subscription_plans WHERE name = $1 AND is_active = true LIMIT 1`
	var p Plan
	err := r.db.QueryRow(ctx, query, name).Scan(&p.ID, &p.Name, &p.DisplayName, &p.Description, &p.PriceMonthly, &p.PriceYearly, &p.Features, &p.SortOrder, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) GetUserSubscription(ctx context.Context, userID string) (*Subscription, *Plan, error) {
	query := `SELECT s.id, s.user_id, s.plan_id, s.status, s.current_period_start, s.current_period_end, s.trial_end, s.cancel_at_period_end,
	                 s.stripe_subscription_id, s.stripe_customer_id, s.created_at, s.updated_at,
	                 p.id, p.name, p.display_name, p.description, p.price_monthly, p.price_yearly, p.features::text, p.sort_order, p.is_active, p.created_at, p.updated_at
	          FROM user_subscriptions s
	          JOIN subscription_plans p ON s.plan_id = p.id
	          WHERE s.user_id = $1 LIMIT 1`
	var sub Subscription
	var plan Plan
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&sub.ID, &sub.UserID, &sub.PlanID, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.TrialEnd, &sub.CancelAtPeriodEnd,
		&sub.StripeSubscriptionID, &sub.StripeCustomerID, &sub.CreatedAt, &sub.UpdatedAt,
		&plan.ID, &plan.Name, &plan.DisplayName, &plan.Description, &plan.PriceMonthly, &plan.PriceYearly, &plan.Features, &plan.SortOrder, &plan.IsActive, &plan.CreatedAt, &plan.UpdatedAt,
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
