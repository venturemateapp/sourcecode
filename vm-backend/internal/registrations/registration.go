package registrations

import "time"

type BusinessRegistration struct {
	ID               string    `json:"id"`
	BusinessID       string    `json:"businessId"`
	UserID           string    `json:"userId"`
	RegistrationType string    `json:"registrationType"`
	Status           string    `json:"status"`
	LegalName        string    `json:"legalName"`
	TaxID            string    `json:"taxId"`
	OwnerName        string    `json:"ownerName"`
	OwnerDOB         string    `json:"ownerDob"`
	OwnerSSN         string    `json:"ownerSsn"`
	OwnerEmail       string    `json:"ownerEmail"`
	OwnerPhone       string    `json:"ownerPhone"`
	AddressStreet    string    `json:"addressStreet"`
	AddressCity      string    `json:"addressCity"`
	AddressState     string    `json:"addressState"`
	AddressZip       string    `json:"addressZip"`
	AddressCountry   string    `json:"addressCountry"`
	Documents        string    `json:"documents"`
	Members          string    `json:"members"`
	AdminNotes       string    `json:"adminNotes"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}
