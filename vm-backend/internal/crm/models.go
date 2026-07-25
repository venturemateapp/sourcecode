package crm

import "time"

type Contact struct {
	ID          string    `json:"id"`
	BusinessID  string    `json:"businessId"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone"`
	Company     string    `json:"company"`
	JobTitle    string    `json:"jobTitle"`
	ContactType string    `json:"contactType"`
	Source      string    `json:"source"`
	Notes       string    `json:"notes"`
	Avatar      string    `json:"avatar"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Deal struct {
	ID                string    `json:"id"`
	BusinessID        string    `json:"businessId"`
	ContactID         string    `json:"contactId"`
	Title             string    `json:"title"`
	Value             float64   `json:"value"`
	Currency          string    `json:"currency"`
	Stage             string    `json:"stage"`
	Probability       int       `json:"probability"`
	ExpectedCloseDate *string   `json:"expectedCloseDate"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type Activity struct {
	ID          string    `json:"id"`
	BusinessID  string    `json:"businessId"`
	ContactID   string    `json:"contactId"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	CreatedBy   string    `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Task struct {
	ID          string    `json:"id"`
	BusinessID  string    `json:"businessId"`
	ContactID   *string   `json:"contactId"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DueDate     *string   `json:"dueDate"`
	Status      string    `json:"status"`
	AssignedTo  string    `json:"assignedTo"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
