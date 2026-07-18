package subscriptions

import "time"

type AddonPurchase struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	AddonType   string    `json:"addonType"`
	Label       string    `json:"label"`
	Price       float64   `json:"price"`
	Quantity    int       `json:"quantity"`
	Metadata    string    `json:"metadata"`
	PurchasedAt time.Time `json:"purchasedAt"`
	ExpiresAt   *time.Time `json:"expiresAt,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}
