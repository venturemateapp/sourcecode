package notifications

import "time"

type Notification struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Read        bool      `json:"read"`
	ActionURL   *string   `json:"actionUrl"`
	ActionLabel *string   `json:"actionLabel"`
	CreatedAt   time.Time `json:"createdAt"`
}
