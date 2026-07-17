package graph

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/invoices"
)

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
		"id":              &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"invoiceNumber":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"customerName":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"customerEmail":   &graphql.Field{Type: graphql.String},
		"amount":          &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"subtotal":        &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"taxRate":         &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"taxAmount":       &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"discount":        &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"shippingCost":    &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"currency":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"dueDate":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"issueDate":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"paidDate":        &graphql.Field{Type: graphql.String},
		"items":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"notes":           &graphql.Field{Type: graphql.String},
		"customerAddress": &graphql.Field{Type: graphql.String},
		"billingAddress":  &graphql.Field{Type: graphql.String},
		"poNumber":        &graphql.Field{Type: graphql.String},
		"paymentTerms":    &graphql.Field{Type: graphql.String},
		"pdfUrl":          &graphql.Field{Type: graphql.String},
		"pdfGeneratedAt":  &graphql.Field{Type: graphql.String},
		"createdAt":       &graphql.Field{Type: graphql.String},
		"updatedAt":       &graphql.Field{Type: graphql.String},
		"itemsList": &graphql.Field{
			Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(invoiceItemType))),
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				inv, ok := p.Source.(*invoices.Invoice)
				if !ok {
					return []map[string]interface{}{}, nil
				}
				var items []map[string]interface{}
				if err := json.Unmarshal([]byte(inv.Items), &items); err != nil {
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
			return AppContainer.InvoiceRepo.ListByBusiness(p.Context, p.Args["businessId"].(string))
		},
	})

	rootMutation.AddFieldConfig("createInvoice", &graphql.Field{
		Type: invoiceType,
		Args: graphql.FieldConfigArgument{
			"userId":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"invoiceNumber":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"customerName":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"customerEmail":   &graphql.ArgumentConfig{Type: graphql.String},
			"amount":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"subtotal":        &graphql.ArgumentConfig{Type: graphql.Float},
			"taxRate":         &graphql.ArgumentConfig{Type: graphql.Float},
			"taxAmount":       &graphql.ArgumentConfig{Type: graphql.Float},
			"discount":        &graphql.ArgumentConfig{Type: graphql.Float},
			"shippingCost":    &graphql.ArgumentConfig{Type: graphql.Float},
			"currency":        &graphql.ArgumentConfig{Type: graphql.String},
			"dueDate":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"issueDate":       &graphql.ArgumentConfig{Type: graphql.String},
			"items":           &graphql.ArgumentConfig{Type: graphql.String},
			"notes":           &graphql.ArgumentConfig{Type: graphql.String},
			"customerAddress": &graphql.ArgumentConfig{Type: graphql.String},
			"billingAddress":  &graphql.ArgumentConfig{Type: graphql.String},
			"poNumber":        &graphql.ArgumentConfig{Type: graphql.String},
			"paymentTerms":    &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			dueDate, _ := time.Parse(time.RFC3339, p.Args["dueDate"].(string))
			if dueDate.IsZero() {
				dueDate, _ = time.Parse("2006-01-02", p.Args["dueDate"].(string))
			}
			issueDate := dueDate
			if v, ok := p.Args["issueDate"]; ok && v != nil && v.(string) != "" {
				issueDate, _ = time.Parse("2006-01-02", v.(string))
				if issueDate.IsZero() {
					issueDate, _ = time.Parse(time.RFC3339, v.(string))
				}
			}
			inv := &invoices.Invoice{
				UserID:          p.Args["userId"].(string),
				BusinessID:      p.Args["businessId"].(string),
				InvoiceNumber:   p.Args["invoiceNumber"].(string),
				CustomerName:    p.Args["customerName"].(string),
				CustomerEmail:   getStringArg(p.Args, "customerEmail"),
				Amount:          p.Args["amount"].(float64),
				Subtotal:        getFloatArg(p.Args, "subtotal"),
				TaxRate:         getFloatArg(p.Args, "taxRate"),
				TaxAmount:       getFloatArg(p.Args, "taxAmount"),
				Discount:        getFloatArg(p.Args, "discount"),
				ShippingCost:    getFloatArg(p.Args, "shippingCost"),
				Currency:        getStringArg(p.Args, "currency"),
				Status:          "draft",
				DueDate:         dueDate,
				IssueDate:       issueDate,
				Items:           getStringArg(p.Args, "items"),
				Notes:           getStringArg(p.Args, "notes"),
				CustomerAddress: getStringArg(p.Args, "customerAddress"),
				BillingAddress:  getStringArg(p.Args, "billingAddress"),
				PONumber:        getStringArg(p.Args, "poNumber"),
				PaymentTerms:    getStringArg(p.Args, "paymentTerms"),
			}
			if inv.Currency == "" {
				inv.Currency = "USD"
			}
			if inv.Items == "" {
				inv.Items = "[]"
			}
			if inv.PaymentTerms == "" {
				inv.PaymentTerms = "net30"
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
			err := AppContainer.InvoiceRepo.Delete(p.Context, p.Args["id"].(string), p.Args["userId"].(string))
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("generateInvoicePdf", &graphql.Field{
		Type: graphql.String,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.InvoicePdfGenerator == nil {
				return "", nil
			}
			inv, err := AppContainer.InvoiceRepo.GetByID(p.Context, p.Args["id"].(string))
			if err != nil {
				return "", err
			}
			pdfData, err := AppContainer.InvoicePdfGenerator.Generate(p.Context, inv, p.Args["businessId"].(string))
			if err != nil {
				return "", fmt.Errorf("pdf generation failed: %w", err)
			}

			// Upload to S3
			fileName := fmt.Sprintf("invoices/%s.pdf", inv.InvoiceNumber)
			pdfURL, err := AppContainer.S3.Upload(p.Context, fileName, pdfData, "application/pdf")
			if err != nil {
				return "", fmt.Errorf("pdf upload failed: %w", err)
			}

			// Save PDF URL to invoice
			if err := AppContainer.InvoiceRepo.UpdatePdfURL(p.Context, inv.ID, pdfURL); err != nil {
				return "", fmt.Errorf("save pdf url failed: %w", err)
			}
			return pdfURL, nil
		},
	})
}

func getFloatArg(args map[string]interface{}, key string) float64 {
	if v, ok := args[key].(float64); ok {
		return v
	}
	return 0
}
