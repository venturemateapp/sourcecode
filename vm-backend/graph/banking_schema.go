package graph

import (
	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/banking"
)

var bankAccountType = graphql.NewObject(graphql.ObjectConfig{
	Name: "BankAccount",
	Fields: graphql.Fields{
		"id":            &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":        &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":    &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"bankName":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"accountType":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"accountNumber": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"accountName":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"currency":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":     &graphql.Field{Type: graphql.String},
		"updatedAt":     &graphql.Field{Type: graphql.String},
	},
})

func init() {
	rootQuery.AddFieldConfig("bankAccounts", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(bankAccountType))),
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []*banking.BankAccount{}, nil
			}
			userID := p.Args["userId"].(string)
			return AppContainer.BankAccountRepo.ListByUser(p.Context, userID)
		},
	})

	rootQuery.AddFieldConfig("allBankAccounts", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(bankAccountType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []*banking.BankAccount{}, nil
			}
			return AppContainer.BankAccountRepo.ListAll(p.Context)
		},
	})

	rootMutation.AddFieldConfig("createBankAccount", &graphql.Field{
		Type: bankAccountType,
		Args: graphql.FieldConfigArgument{
			"userId":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"bankName":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"accountType":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"accountNumber": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"accountName":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"currency":      &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			a := &banking.BankAccount{
				UserID:        p.Args["userId"].(string),
				BusinessID:    p.Args["businessId"].(string),
				BankName:      p.Args["bankName"].(string),
				AccountType:   p.Args["accountType"].(string),
				AccountNumber: p.Args["accountNumber"].(string),
				AccountName:   p.Args["accountName"].(string),
				Currency:      getStringArg(p.Args, "currency"),
				Status:        "pending",
			}
			if a.Currency == "" {
				a.Currency = "USD"
			}
			err := AppContainer.BankAccountRepo.Create(p.Context, a)
			return a, err
		},
	})

	rootMutation.AddFieldConfig("approveBankAccount", &graphql.Field{
		Type: bankAccountType,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			id := p.Args["id"].(string)
			err := AppContainer.BankAccountRepo.UpdateStatus(p.Context, id, "approved")
			if err != nil {
				return nil, err
			}
			return AppContainer.BankAccountRepo.GetByID(p.Context, id)
		},
	})

	rootMutation.AddFieldConfig("rejectBankAccount", &graphql.Field{
		Type: bankAccountType,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			id := p.Args["id"].(string)
			err := AppContainer.BankAccountRepo.UpdateStatus(p.Context, id, "rejected")
			if err != nil {
				return nil, err
			}
			return AppContainer.BankAccountRepo.GetByID(p.Context, id)
		},
	})
}
