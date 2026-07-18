package subscriptions

import "time"

type UsageLog struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	BillingPeriod string    `json:"billingPeriod"`
	AITokensUsed  int64     `json:"aiTokensUsed"`
	StorageBytes  int64     `json:"storageBytes"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
