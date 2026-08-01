package subscriptions

import "time"

type UsageLog struct {
	ID                string    `json:"id"`
	UserID            string    `json:"userId"`
	BillingPeriod     string    `json:"billingPeriod"`
	AITokensUsed      int64     `json:"aiTokensUsed"`
	StorageBytes      int64     `json:"storageBytes"`
	RecraftImagesUsed int64     `json:"recraftImagesUsed"`
	AIBuildsUsed      int64     `json:"aiBuildsUsed"`
	AIExportsUsed     int64     `json:"aiExportsUsed"`
	AIDeploymentsUsed int64     `json:"aiDeploymentsUsed"`
	AIProjectBytes    int64     `json:"aiProjectBytes"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}
