package scores

import "time"

type BusinessScore struct {
	ID           string    `json:"id"`
	BusinessID   string    `json:"businessId"`
	ScoreType    string    `json:"scoreType"`
	ScoreData    string    `json:"scoreData"`
	CalculatedAt time.Time `json:"calculatedAt"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
