package invoices

import "time"

type InvoiceItem struct {
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
}

type Invoice struct {
	ID            string     `json:"id"`
	UserID        string     `json:"userId"`
	BusinessID    string     `json:"businessId"`
	InvoiceNumber string     `json:"invoiceNumber"`
	CustomerName  string     `json:"customerName"`
	CustomerEmail string     `json:"customerEmail"`
	Amount        float64    `json:"amount"`
	Currency      string     `json:"currency"`
	Status        string     `json:"status"`
	DueDate       time.Time  `json:"dueDate"`
	IssueDate     time.Time  `json:"issueDate"`
	PaidDate      *time.Time `json:"paidDate"`
	Items         string     `json:"items"`
	Notes         string     `json:"notes"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}
