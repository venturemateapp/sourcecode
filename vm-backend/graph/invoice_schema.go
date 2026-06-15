package graph

import (
	"encoding/json"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/invoices"
)

func jsonUnmarshal(s string, v interface{}) error {
	return json.Unmarshal([]byte(s), v)
}

func timeParse(s string) (time.Time, error) {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t, err = time.Parse("2006-01-02", s)
	}
	return t, err
}

var invoiceItemType = graphql.NewObject(graphql.ObjectConfig{
	Name: "InvoiceItem",
	Fields: graphql.Fields{
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"quantity":    &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"unitPrice":   &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
	},
})

var invoiceType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Invoice",
	Fields: graphql.Fields{
		"id":            &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":        &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":    &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"invoiceNumber": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"customerName":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"customerEmail": &graphql.Field{Type: graphql.String},
		"amount":        &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"currency":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"dueDate":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"issueDate":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"paidDate":      &graphql.Field{Type: graphql.String},
		"items":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"notes":         &graphql.Field{Type: graphql.String},
		"createdAt":     &graphql.Field{Type: graphql.String},
		"updatedAt":     &graphql.Field{Type: graphql.String},
		"itemsList": &graphql.Field{
			Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(invoiceItemType))),
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				inv, ok := p.Source.(*invoices.Invoice)
				if !ok {
					return []map[string]interface{}{}, nil
				}
				var items []map[string]interface{}
				if err := jsonUnmarshal(inv.Items, &items); err != nil {
					return []map[string]interface{}{}, nil
				}
				return items, nil
			},
		},
	},
})

func init() {
	rootQuery.AddFieldConfig("invoices", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(invoiceType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []*invoices.Invoice{}, nil
			}
			businessID := p.Args["businessId"].(string)
			return AppContainer.InvoiceRepo.ListByBusiness(p.Context, businessID)
		},
	})

	rootMutation.AddFieldConfig("createInvoice", &graphql.Field{
		Type: invoiceType,
		Args: graphql.FieldConfigArgument{
			"userId":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"invoiceNumber": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"customerName":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"customerEmail": &graphql.ArgumentConfig{Type: graphql.String},
			"amount":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"currency":      &graphql.ArgumentConfig{Type: graphql.String},
			"dueDate":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"issueDate":     &graphql.ArgumentConfig{Type: graphql.String},
			"items":         &graphql.ArgumentConfig{Type: graphql.String},
			"notes":         &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			dueDate, _ := timeParse(p.Args["dueDate"].(string))
			issueDate := dueDate
			if v, ok := p.Args["issueDate"]; ok && v != nil && v.(string) != "" {
				issueDate, _ = timeParse(v.(string))
			}
			inv := &invoices.Invoice{
				UserID:        p.Args["userId"].(string),
				BusinessID:    p.Args["businessId"].(string),
				InvoiceNumber: p.Args["invoiceNumber"].(string),
				CustomerName:  p.Args["customerName"].(string),
				CustomerEmail: getStringArg(p.Args, "customerEmail"),
				Amount:        p.Args["amount"].(float64),
				Currency:      getStringArg(p.Args, "currency"),
				Status:        "draft",
				DueDate:       dueDate,
				IssueDate:     issueDate,
				Items:         getStringArg(p.Args, "items"),
				Notes:         getStringArg(p.Args, "notes"),
			}
			if inv.Currency == "" {
				inv.Currency = "USD"
			}
			if inv.Items == "" {
				inv.Items = "[]"
			}
			err := AppContainer.InvoiceRepo.Create(p.Context, inv)
			return inv, err
		},
	})

	rootMutation.AddFieldConfig("updateInvoiceStatus", &graphql.Field{
		Type: invoiceType,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"status": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			id := p.Args["id"].(string)
			status := p.Args["status"].(string)
			err := AppContainer.InvoiceRepo.UpdateStatus(p.Context, id, status)
			if err != nil {
				return nil, err
			}
			return AppContainer.InvoiceRepo.GetByID(p.Context, id)
		},
	})

	rootMutation.AddFieldConfig("deleteInvoice", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return false, nil
			}
			id := p.Args["id"].(string)
			userID := p.Args["userId"].(string)
			err := AppContainer.InvoiceRepo.Delete(p.Context, id, userID)
			return err == nil, err
		},
	})
}
