package investors

import "time"

type Investor struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Type            string    `json:"type"`
	Logo            string    `json:"logo"`
	Location        string    `json:"location"`
	FocusIndustries string    `json:"focusIndustries"`
	Stages          string    `json:"stages"`
	CheckSize       string    `json:"checkSize"`
	Aum             *int64    `json:"aum"`
	Portfolio       string    `json:"portfolio"`
	Team            string    `json:"team"`
	Thesis          string    `json:"thesis"`
	Criteria        string    `json:"criteria"`
	MatchScore      *int      `json:"matchScore"`
	Status          string    `json:"status"`
	ConnectedAt     *string   `json:"connectedAt"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}
