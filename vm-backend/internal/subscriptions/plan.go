package subscriptions

import "time"

type PlanLimits struct {
	AITokensMonthly  int  `json:"ai_tokens_monthly"`
	MaxBusinesses    int  `json:"max_businesses"`
	MaxTeamMembers   int  `json:"max_team_members"`
	MaxPitchDecks    int  `json:"max_pitch_decks"`
	MaxBusinessPlans int  `json:"max_business_plans"`
	StorageGB        int  `json:"storage_gb"`
	IsAdvanced       bool `json:"is_advanced"`
}

type Plan struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	DisplayName  string    `json:"displayName"`
	Description  string    `json:"description"`
	PriceMonthly float64   `json:"priceMonthly"`
	PriceYearly  float64   `json:"priceYearly"`
	Features     string    `json:"features"`
	Limits       string    `json:"limits"`
	SortOrder    int       `json:"sortOrder"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

const (
	PlanFree    = "free"
	PlanStarter = "starter"
	PlanGrowth  = "growth"
	PlanScale   = "scale"
)
