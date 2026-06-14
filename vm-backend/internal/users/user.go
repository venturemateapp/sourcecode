package users

import "time"

type User struct {
	ID              string    `json:"id"`
	FirstName       string    `json:"firstName"`
	Surname         string    `json:"surname"`
	OtherNames      string    `json:"otherNames,omitempty"`
	DOB             string    `json:"dob,omitempty"`
	Email           string    `json:"email"`
	Password        string    `json:"-"` // never expose
	PrimaryPhone    string    `json:"primaryPhone,omitempty"`
	SecondaryPhone  string    `json:"secondaryPhone,omitempty"`
	Picture         string    `json:"picture,omitempty"`
	Bio             string    `json:"bio,omitempty"`
	Country         string    `json:"country,omitempty"`
	City            string    `json:"city,omitempty"`
	Language        string    `json:"language,omitempty"`
	LinkedIn        string    `json:"linkedIn,omitempty"`
	Twitter         string    `json:"twitter,omitempty"`
	Website         string    `json:"website,omitempty"`
	Onboarded       bool      `json:"onboarded"`
	Status             string    `json:"status"` // active, inactive, suspended, pending
	PreferredCurrency  string    `json:"preferredCurrency"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}
