package subscriptions

import "time"

type Subscription struct {
	ID                string     `json:"id"`
	UserID            string     `json:"userId"`
	PlanID            string     `json:"planId"`
	Status            string     `json:"status"`
	CurrentPeriodStart time.Time `json:"currentPeriodStart"`
	CurrentPeriodEnd  *time.Time `json:"currentPeriodEnd,omitempty"`
	TrialEnd          *time.Time `json:"trialEnd,omitempty"`
	CancelAtPeriodEnd bool       `json:"cancelAtPeriodEnd"`
	StripeSubscriptionID *string `json:"stripeSubscriptionId,omitempty"`
	StripeCustomerID     *string `json:"stripeCustomerId,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
	Plan              *Plan      `json:"plan,omitempty"`
}

type UserSubscription struct {
	Subscription Subscription `json:"subscription"`
	Plan         Plan         `json:"plan"`
}
