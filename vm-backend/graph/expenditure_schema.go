package graph

import (
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/expenditure"
)

var expenditureType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Expenditure",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"category":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"amount":      &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"currency":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"expenseDate": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"vendor":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"receiptUrl":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"notes":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("expenditures", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(expenditureType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.ExpenditureRepo == nil {
				return []interface{}{}, nil
			}
			exps, err := AppContainer.ExpenditureRepo.ListByBusiness(p.Context, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(exps))
			for i, e := range exps {
				result[i] = map[string]interface{}{
					"id": e.ID, "businessId": e.BusinessID, "category": e.Category,
					"description": e.Description, "amount": e.Amount, "currency": e.Currency,
					"expenseDate": e.ExpenseDate, "vendor": e.Vendor,
					"receiptUrl": e.ReceiptURL, "notes": e.Notes,
					"createdAt": e.CreatedAt.Format("2006-01-02T15:04:05Z"),
					"updatedAt": e.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("createExpenditure", &graphql.Field{
		Type: expenditureType,
		Args: graphql.FieldConfigArgument{
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"category":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"amount":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"currency":    &graphql.ArgumentConfig{Type: graphql.String},
			"expenseDate": &graphql.ArgumentConfig{Type: graphql.String},
			"vendor":      &graphql.ArgumentConfig{Type: graphql.String},
			"receiptUrl":  &graphql.ArgumentConfig{Type: graphql.String},
			"notes":       &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.ExpenditureRepo == nil {
				return nil, nil
			}
			e := &expenditure.Expenditure{
				BusinessID:  p.Args["businessId"].(string),
				Category:    p.Args["category"].(string),
				Description: p.Args["description"].(string),
				Amount:      p.Args["amount"].(float64),
				Currency:    getStringArg(p.Args, "currency"),
				Vendor:      getStringArg(p.Args, "vendor"),
				ReceiptURL:  getStringArg(p.Args, "receiptUrl"),
				Notes:       getStringArg(p.Args, "notes"),
			}
			if e.Currency == "" {
				e.Currency = "USD"
			}
			if d, ok := p.Args["expenseDate"].(string); ok {
				e.ExpenseDate = d
			} else {
				e.ExpenseDate = time.Now().Format("2006-01-02")
			}
			if err := AppContainer.ExpenditureRepo.Create(p.Context, e); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": e.ID, "businessId": e.BusinessID, "category": e.Category,
				"description": e.Description, "amount": e.Amount, "currency": e.Currency,
				"expenseDate": e.ExpenseDate, "vendor": e.Vendor,
				"receiptUrl": e.ReceiptURL, "notes": e.Notes,
				"createdAt": e.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": e.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("updateExpenditure", &graphql.Field{
		Type: expenditureType,
		Args: graphql.FieldConfigArgument{
			"id":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"category":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"amount":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"currency":    &graphql.ArgumentConfig{Type: graphql.String},
			"expenseDate": &graphql.ArgumentConfig{Type: graphql.String},
			"vendor":      &graphql.ArgumentConfig{Type: graphql.String},
			"receiptUrl":  &graphql.ArgumentConfig{Type: graphql.String},
			"notes":       &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.ExpenditureRepo == nil {
				return nil, nil
			}
			e := &expenditure.Expenditure{
				ID:          p.Args["id"].(string),
				BusinessID:  p.Args["businessId"].(string),
				Category:    p.Args["category"].(string),
				Description: p.Args["description"].(string),
				Amount:      p.Args["amount"].(float64),
				Currency:    getStringArg(p.Args, "currency"),
				Vendor:      getStringArg(p.Args, "vendor"),
				ReceiptURL:  getStringArg(p.Args, "receiptUrl"),
				Notes:       getStringArg(p.Args, "notes"),
			}
			if d, ok := p.Args["expenseDate"].(string); ok {
				e.ExpenseDate = d
			}
			existing, err := AppContainer.ExpenditureRepo.GetByID(p.Context, e.ID)
			if err != nil {
				return nil, err
			}
			e.CreatedAt = existing.CreatedAt
			if err := AppContainer.ExpenditureRepo.Update(p.Context, e); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": e.ID, "businessId": e.BusinessID, "category": e.Category,
				"description": e.Description, "amount": e.Amount, "currency": e.Currency,
				"expenseDate": e.ExpenseDate, "vendor": e.Vendor,
				"receiptUrl": e.ReceiptURL, "notes": e.Notes,
				"createdAt": e.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": e.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("deleteExpenditure", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.ExpenditureRepo == nil {
				return false, nil
			}
			err := AppContainer.ExpenditureRepo.Delete(p.Context, p.Args["id"].(string), p.Args["businessId"].(string))
			return err == nil, err
		},
	})
}
