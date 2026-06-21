package subscriptions

import "time"

type Plan struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	DisplayName  string    `json:"displayName"`
	Description  string    `json:"description"`
	PriceMonthly float64   `json:"priceMonthly"`
	PriceYearly  float64   `json:"priceYearly"`
	Features     string    `json:"features"`
	SortOrder    int       `json:"sortOrder"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

const (
	PlanFree    = "free"
	PlanPro     = "pro"
	PlanProPlus = "pro_plus"
)
