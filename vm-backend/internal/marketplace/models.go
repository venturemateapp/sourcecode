package marketplace

import "time"

type ServiceProvider struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Title          string    `json:"title"`
	Category       string    `json:"category"`
	Bio            string    `json:"bio"`
	Picture        string    `json:"picture"`
	RateHourly     float64   `json:"rateHourly"`
	YearsExp       int       `json:"yearsExperience"`
	Skills         string    `json:"skills"`
	Portfolio      string    `json:"portfolio"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type Booking struct {
	ID           string    `json:"id"`
	ProviderID   string    `json:"providerId"`
	UserID       string    `json:"userId"`
	BusinessID   string    `json:"businessId"`
	ProjectTitle string    `json:"projectTitle"`
	Description  string    `json:"description"`
	Status       string    `json:"status"`
	AdminNotes   string    `json:"adminNotes"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	ProviderName string    `json:"providerName,omitempty"`
	UserName     string    `json:"userName,omitempty"`
}
