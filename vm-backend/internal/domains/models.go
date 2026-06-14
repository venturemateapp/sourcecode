package domains

import "time"

type DomainData struct {
	ID         string    `json:"id"`
	BusinessID string    `json:"businessId"`
	Domain     string    `json:"domain"`
	Data       string    `json:"data"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
