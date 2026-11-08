package marketplace

import "time"

type ServiceProvider struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Title      string    `json:"title"`
	Category   string    `json:"category"`
	Bio        string    `json:"bio"`
	Picture    string    `json:"picture"`
	Email      string    `json:"email"`
	Phone      string    `json:"phone"`
	RateHourly float64   `json:"rateHourly"`
	YearsExp   int       `json:"yearsExperience"`
	Skills     string    `json:"skills"`
	Portfolio  string    `json:"portfolio"`
	IsActive   bool      `json:"isActive"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Booking struct {
	ID            string    `json:"id"`
	ProviderID    string    `json:"providerId"`
	UserID        string    `json:"userId"`
	BusinessID    string    `json:"businessId"`
	ProjectTitle  string    `json:"projectTitle"`
	Description   string    `json:"description"`
	Status        string    `json:"status"`
	AdminNotes    string    `json:"adminNotes"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	ProviderName  string    `json:"providerName,omitempty"`
	ProviderEmail string    `json:"providerEmail,omitempty"`
	ProviderPhone string    `json:"providerPhone,omitempty"`
	UserName      string    `json:"userName,omitempty"`
}

type BookingNotificationDetails struct {
	ID            string
	ProjectTitle  string
	Description   string
	Status        string
	AdminNotes    string
	CreatedAt     time.Time
	ProviderName  string
	ProviderEmail string
	ProviderPhone string
	UserName      string
	UserEmail     string
}
