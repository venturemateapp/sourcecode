package crm

import "time"

type Company struct {
	ID            string    `json:"id"`
	BusinessID    string    `json:"businessId"`
	Name          string    `json:"name"`
	Domain        string    `json:"domain"`
	Industry      string    `json:"industry"`
	EmployeeCount int       `json:"employeeCount"`
	Revenue       float64   `json:"revenue"`
	Website       string    `json:"website"`
	Phone         string    `json:"phone"`
	Email         string    `json:"email"`
	AddressStreet string    `json:"addressStreet"`
	AddressCity   string    `json:"addressCity"`
	AddressState  string    `json:"addressState"`
	AddressZip    string    `json:"addressZip"`
	AddressCountry string   `json:"addressCountry"`
	Description   string    `json:"description"`
	LogoURL       string    `json:"logoUrl"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
