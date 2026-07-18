package expenditure

import "time"

type ExpenditureItem struct {
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
}

type Expenditure struct {
	ID          string    `json:"id"`
	BusinessID  string    `json:"businessId"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	Amount      float64   `json:"amount"`
	Currency    string    `json:"currency"`
	ExpenseDate string    `json:"expenseDate"`
	Vendor      string    `json:"vendor"`
	ReceiptURL  string    `json:"receiptUrl"`
	Items       string    `json:"items"`
	Notes       string    `json:"notes"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
