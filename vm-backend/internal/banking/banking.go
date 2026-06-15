package banking

import "time"

type BankAccount struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	BusinessID   string    `json:"businessId"`
	BankName      string    `json:"bankName"`
	AccountType   string    `json:"accountType"`
	AccountNumber string    `json:"accountNumber"`
	AccountName   string    `json:"accountName"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
