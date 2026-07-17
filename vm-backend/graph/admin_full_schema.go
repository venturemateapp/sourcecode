package graph

import (
	"encoding/json"
	"fmt"

	"github.com/graphql-go/graphql"
)

var adminRegistrationType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminBusinessRegistration",
	Fields: graphql.Fields{
		"id":               &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"registrationType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"legalName":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"taxId":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerName":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerEmail":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerPhone":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressCity":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressCountry":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"adminNotes":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	// Admin: all business registrations
	rootQuery.AddFieldConfig("adminRegistrations", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(adminRegistrationType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if ok, _ := adminGuard(p.Context); !ok {
				return []interface{}{}, nil
			}
			regs, err := AppContainer.RegistrationRepo.ListAll(p.Context)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(regs))
			for i, r := range regs {
				result[i] = map[string]interface{}{
					"id": r.ID, "businessId": r.BusinessID, "userId": r.UserID,
					"registrationType": r.RegistrationType, "status": r.Status,
					"legalName": r.LegalName, "taxId": r.TaxID,
					"ownerName": r.OwnerName, "ownerEmail": r.OwnerEmail, "ownerPhone": r.OwnerPhone,
					"addressCity": r.AddressCity, "addressCountry": r.AddressCountry,
					"adminNotes": r.AdminNotes,
					"createdAt": r.CreatedAt.Format("2006-01-02T15:04:05Z"),
					"updatedAt": r.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	// Admin approve/reject registrations
	rootMutation.AddFieldConfig("adminApproveRegistration", &graphql.Field{
		Type: adminRegistrationType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"adminNotes": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			id := p.Args["id"].(string)
			notes, _ := p.Args["adminNotes"].(string)
			if err := AppContainer.RegistrationRepo.UpdateStatus(p.Context, id, "approved", notes); err != nil {
				return nil, err
			}
			r, _ := AppContainer.RegistrationRepo.GetByID(p.Context, id)
			if r == nil {
				return nil, fmt.Errorf("registration not found")
			}
			return map[string]interface{}{
				"id": r.ID, "businessId": r.BusinessID, "userId": r.UserID,
				"registrationType": r.RegistrationType, "status": r.Status,
				"legalName": r.LegalName, "taxId": r.TaxID,
				"ownerName": r.OwnerName, "ownerEmail": r.OwnerEmail, "ownerPhone": r.OwnerPhone,
				"addressCity": r.AddressCity, "addressCountry": r.AddressCountry,
				"adminNotes": r.AdminNotes,
				"createdAt": r.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": r.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("adminRejectRegistration", &graphql.Field{
		Type: adminRegistrationType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"adminNotes": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			id := p.Args["id"].(string)
			notes, _ := p.Args["adminNotes"].(string)
			if err := AppContainer.RegistrationRepo.UpdateStatus(p.Context, id, "rejected", notes); err != nil {
				return nil, err
			}
			r, _ := AppContainer.RegistrationRepo.GetByID(p.Context, id)
			if r == nil {
				return nil, fmt.Errorf("registration not found")
			}
			return map[string]interface{}{
				"id": r.ID, "businessId": r.BusinessID, "userId": r.UserID,
				"registrationType": r.RegistrationType, "status": r.Status,
				"legalName": r.LegalName, "taxId": r.TaxID,
				"ownerName": r.OwnerName, "ownerEmail": r.OwnerEmail, "ownerPhone": r.OwnerPhone,
				"addressCity": r.AddressCity, "addressCountry": r.AddressCountry,
				"adminNotes": r.AdminNotes,
				"createdAt": r.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": r.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	// Admin: close support session
	rootMutation.AddFieldConfig("adminCloseSupportSession", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"sessionId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			err := AppContainer.SupportRepo.UpdateSessionStatus(p.Context, p.Args["sessionId"].(string), "closed")
			return err == nil, err
		},
	})

	// Admin: list all invoices
	rootQuery.AddFieldConfig("adminInvoices", &graphql.Field{
		Type: graphql.NewNonNull(graphql.String),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if ok, _ := adminGuard(p.Context); !ok {
				return "[]", nil
			}
			list, err := AppContainer.InvoiceRepo.ListAll(p.Context)
			if err != nil {
				return "[]", nil
			}
			b, _ := json.Marshal(list)
			return string(b), nil
		},
	})

	// Admin: update invoice status
	rootMutation.AddFieldConfig("adminUpdateInvoiceStatus", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"status": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			err := AppContainer.InvoiceRepo.UpdateStatus(p.Context, p.Args["id"].(string), p.Args["status"].(string))
			return err == nil, err
		},
	})

	// SECURITY FIX: allBankAccounts now requires admin
	rootQuery.AddFieldConfig("allBankAccounts", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(bankAccountType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []interface{}{}, nil
			}
			if !isAdmin(p.Context) {
				return []interface{}{}, nil
			}
			accounts, err := AppContainer.BankAccountRepo.ListAll(p.Context)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(accounts))
			for i, a := range accounts {
				result[i] = map[string]interface{}{
					"id": a.ID, "userId": a.UserID, "businessId": a.BusinessID,
					"bankName": a.BankName, "accountType": a.AccountType,
					"accountNumber": a.AccountNumber, "accountName": a.AccountName,
					"currency": a.Currency, "status": a.Status,
					"createdAt": a.CreatedAt.Format("2006-01-02T15:04:05Z"),
					"updatedAt": a.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	// SECURITY FIX: approveBankAccount requires admin
	rootMutation.AddFieldConfig("approveBankAccount", &graphql.Field{
		Type: bankAccountType,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			id := p.Args["id"].(string)
			if err := AppContainer.BankAccountRepo.UpdateStatus(p.Context, id, "approved"); err != nil {
				return nil, err
			}
			a, _ := AppContainer.BankAccountRepo.GetByID(p.Context, id)
			if a == nil {
				return nil, fmt.Errorf("account not found")
			}
			return map[string]interface{}{
				"id": a.ID, "userId": a.UserID, "businessId": a.BusinessID,
				"bankName": a.BankName, "accountType": a.AccountType,
				"accountNumber": a.AccountNumber, "accountName": a.AccountName,
				"currency": a.Currency, "status": a.Status,
				"createdAt": a.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": a.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	// SECURITY FIX: rejectBankAccount requires admin
	rootMutation.AddFieldConfig("rejectBankAccount", &graphql.Field{
		Type: bankAccountType,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			id := p.Args["id"].(string)
			if err := AppContainer.BankAccountRepo.UpdateStatus(p.Context, id, "rejected"); err != nil {
				return nil, err
			}
			a, _ := AppContainer.BankAccountRepo.GetByID(p.Context, id)
			if a == nil {
				return nil, fmt.Errorf("account not found")
			}
			return map[string]interface{}{
				"id": a.ID, "userId": a.UserID, "businessId": a.BusinessID,
				"bankName": a.BankName, "accountType": a.AccountType,
				"accountNumber": a.AccountNumber, "accountName": a.AccountName,
				"currency": a.Currency, "status": a.Status,
				"createdAt": a.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": a.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})
}
