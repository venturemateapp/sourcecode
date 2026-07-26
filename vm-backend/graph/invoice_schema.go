package graph

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/invoices"
	"github.com/venturemate/vmbackend/internal/subscriptions"
)

var invoiceItemType = graphql.NewObject(graphql.ObjectConfig{
	Name: "InvoiceItem",
	Fields: graphql.Fields{
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"quantity":    &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"unitPrice":   &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
	},
})

func formatInvoiceTime(t time.Time) string {
	return t.Format("2006-01-02T15:04:05Z")
}

func formatInvoiceTimePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02T15:04:05Z")
}

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
		"dueDate":         &graphql.Field{Type: graphql.NewNonNull(graphql.String), Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if inv, ok := p.Source.(*invoices.Invoice); ok { return formatInvoiceTime(inv.DueDate), nil }
			if inv, ok := p.Source.(invoices.Invoice); ok { return formatInvoiceTime(inv.DueDate), nil }
			return "", nil
		}},
		"issueDate": &graphql.Field{Type: graphql.NewNonNull(graphql.String), Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if inv, ok := p.Source.(*invoices.Invoice); ok { return formatInvoiceTime(inv.IssueDate), nil }
			if inv, ok := p.Source.(invoices.Invoice); ok { return formatInvoiceTime(inv.IssueDate), nil }
			return "", nil
		}},
		"paidDate": &graphql.Field{Type: graphql.String, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if inv, ok := p.Source.(*invoices.Invoice); ok { return formatInvoiceTimePtr(inv.PaidDate), nil }
			if inv, ok := p.Source.(invoices.Invoice); ok { return formatInvoiceTimePtr(inv.PaidDate), nil }
			return "", nil
		}},
		"items":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"notes":           &graphql.Field{Type: graphql.String},
		"customerAddress": &graphql.Field{Type: graphql.String},
		"billingAddress":  &graphql.Field{Type: graphql.String},
		"poNumber":        &graphql.Field{Type: graphql.String},
		"paymentTerms":    &graphql.Field{Type: graphql.String},
		"pdfUrl":          &graphql.Field{Type: graphql.String},
		"pdfGeneratedAt":  &graphql.Field{Type: graphql.String, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if inv, ok := p.Source.(*invoices.Invoice); ok { return formatInvoiceTimePtr(inv.PdfGeneratedAt), nil }
			if inv, ok := p.Source.(invoices.Invoice); ok { return formatInvoiceTimePtr(inv.PdfGeneratedAt), nil }
			return "", nil
		}},
		"createdAt": &graphql.Field{Type: graphql.String, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if inv, ok := p.Source.(*invoices.Invoice); ok { return formatInvoiceTime(inv.CreatedAt), nil }
			if inv, ok := p.Source.(invoices.Invoice); ok { return formatInvoiceTime(inv.CreatedAt), nil }
			return "", nil
		}},
		"updatedAt": &graphql.Field{Type: graphql.String, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if inv, ok := p.Source.(*invoices.Invoice); ok { return formatInvoiceTime(inv.UpdatedAt), nil }
			if inv, ok := p.Source.(invoices.Invoice); ok { return formatInvoiceTime(inv.UpdatedAt), nil }
			return "", nil
		}},
		"itemsList": &graphql.Field{
			Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(invoiceItemType))),
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				var itemsStr string
				if inv, ok := p.Source.(*invoices.Invoice); ok {
					itemsStr = inv.Items
				} else if inv, ok := p.Source.(invoices.Invoice); ok {
					itemsStr = inv.Items
				} else {
					return []map[string]interface{}{}, nil
				}
				var items []map[string]interface{}
				if err := json.Unmarshal([]byte(itemsStr), &items); err != nil {
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

	rootMutation.AddFieldConfig("updateInvoice", &graphql.Field{
		Type: invoiceType,
		Args: graphql.FieldConfigArgument{
			"id":              &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
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
			id := p.Args["id"].(string)
			existing, err := AppContainer.InvoiceRepo.GetByID(p.Context, id)
			if err != nil {
				return nil, err
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
			existing.InvoiceNumber = p.Args["invoiceNumber"].(string)
			existing.CustomerName = p.Args["customerName"].(string)
			existing.CustomerEmail = getStringArg(p.Args, "customerEmail")
			existing.Amount = p.Args["amount"].(float64)
			existing.Subtotal = getFloatArg(p.Args, "subtotal")
			existing.TaxRate = getFloatArg(p.Args, "taxRate")
			existing.TaxAmount = getFloatArg(p.Args, "taxAmount")
			existing.Discount = getFloatArg(p.Args, "discount")
			existing.ShippingCost = getFloatArg(p.Args, "shippingCost")
			existing.Currency = getStringArg(p.Args, "currency")
			existing.DueDate = dueDate
			existing.IssueDate = issueDate
			existing.Items = getStringArg(p.Args, "items")
			existing.Notes = getStringArg(p.Args, "notes")
			existing.CustomerAddress = getStringArg(p.Args, "customerAddress")
			existing.BillingAddress = getStringArg(p.Args, "billingAddress")
			existing.PONumber = getStringArg(p.Args, "poNumber")
			existing.PaymentTerms = getStringArg(p.Args, "paymentTerms")
			if existing.Currency == "" {
				existing.Currency = "USD"
			}
			if existing.Items == "" {
				existing.Items = "[]"
			}
			if existing.PaymentTerms == "" {
				existing.PaymentTerms = "net30"
			}
			// Clear cached PDF on invoice edit so it regenerates on next download/send
			existing.PdfURL = ""
			existing.PdfSizeBytes = 0
			existing.PdfGeneratedAt = nil
			err = AppContainer.InvoiceRepo.Update(p.Context, existing)
			return existing, err
		},
	})

	rootMutation.AddFieldConfig("sendInvoice", &graphql.Field{
		Type: invoiceType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.InvoicePdfGenerator == nil || AppContainer.Email == nil {
				return nil, nil
			}
			inv, err := AppContainer.InvoiceRepo.GetByID(p.Context, p.Args["id"].(string))
			if err != nil {
				return nil, err
			}

			// Generate PDF if not already generated
			if inv.PdfURL == "" {
				pdfData, err := AppContainer.InvoicePdfGenerator.Generate(p.Context, inv, p.Args["businessId"].(string))
				if err != nil {
					return nil, fmt.Errorf("pdf generation failed: %w", err)
				}
				fileName := fmt.Sprintf("invoices/%s.pdf", inv.InvoiceNumber)
				pdfURL, err := AppContainer.S3.Upload(p.Context, fileName, pdfData, "application/pdf")
				if err != nil {
					return nil, fmt.Errorf("pdf upload failed: %w", err)
				}
				// Make PDF publicly accessible for customers viewing via email
				if setACLErr := AppContainer.S3.SetPublicRead(p.Context, fileName); setACLErr != nil {
					// Non-fatal: log but continue
				}
			if err := AppContainer.InvoiceRepo.UpdatePdfURLWithSize(p.Context, inv.ID, pdfURL, int64(len(pdfData))); err != nil {
				return nil, fmt.Errorf("save pdf url failed: %w", err)
			}
			inv.PdfURL = pdfURL

			// Update storage usage
			if AppContainer.UsageRepo != nil && AppContainer.FileHandler != nil {
				if totalStorage, err := AppContainer.FileHandler.CalculateTotalStorage(p.Context, inv.UserID); err == nil {
					AppContainer.UsageRepo.UpdateStorage(p.Context, inv.UserID, subscriptions.BillingPeriod(time.Now()), totalStorage)
				}
			}
		}

		// Send email to customer
			custEmail := strings.TrimSpace(inv.CustomerEmail)
			if custEmail != "" && strings.Contains(custEmail, "@") {
				biz, err := AppContainer.BusinessRepo.GetByID(p.Context, p.Args["businessId"].(string))
				if err != nil {
					biz = &businesses.Business{Name: "VentureMate"}
				}
				// Build line items table
			var items []invoices.InvoiceItem
			json.Unmarshal([]byte(inv.Items), &items)
			itemsHTML := ""
			for _, item := range items {
				lineTotal := float64(item.Quantity) * item.UnitPrice
				itemsHTML += fmt.Sprintf(`<tr><td style="padding:6px;border-bottom:1px solid #eee;">%s</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">%d</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">%s %.2f</td></tr>`, item.Description, item.Quantity, inv.Currency, lineTotal)
			}
			if len(items) == 0 {
				itemsHTML = fmt.Sprintf(`<tr><td style="padding:6px;border-bottom:1px solid #eee;" colspan="3">%s</td></tr>`, inv.Notes)
			}

			// Build totals section
			totalsHTML := fmt.Sprintf(`<tr style="font-weight:bold;"><td style="padding:6px;" colspan="2">Subtotal</td><td style="padding:6px;text-align:right;">%s %.2f</td></tr>`, inv.Currency, inv.Subtotal)
			if inv.Discount > 0 {
				totalsHTML += fmt.Sprintf(`<tr><td style="padding:6px;" colspan="2">Discount</td><td style="padding:6px;text-align:right;">-%s %.2f</td></tr>`, inv.Currency, inv.Discount)
			}
			if inv.TaxRate > 0 {
				totalsHTML += fmt.Sprintf(`<tr><td style="padding:6px;" colspan="2">Tax (%.1f%%)</td><td style="padding:6px;text-align:right;">%s %.2f</td></tr>`, inv.TaxRate, inv.Currency, inv.TaxAmount)
			}
			if inv.ShippingCost > 0 {
				totalsHTML += fmt.Sprintf(`<tr><td style="padding:6px;" colspan="2">Shipping</td><td style="padding:6px;text-align:right;">%s %.2f</td></tr>`, inv.Currency, inv.ShippingCost)
			}
			grandTotal := inv.Subtotal - inv.Discount + inv.TaxAmount + inv.ShippingCost
			totalsHTML += fmt.Sprintf(`<tr style="font-weight:bold;background:#10b981;color:#fff;"><td style="padding:8px;" colspan="2">TOTAL</td><td style="padding:8px;text-align:right;">%s %.2f</td></tr>`, inv.Currency, grandTotal)

			pdfLink := inv.PdfURL
			if pdfLink == "" {
				pdfLink = fmt.Sprintf("https://venturemate.net/api/pdf/download?type=invoice&id=%s", inv.ID)
			}

			emailBody := fmt.Sprintf(`
<h2>Invoice from %s</h2>
<p>Dear %s,</p>
<p>Please find your invoice <strong>#%s</strong> attached below.</p>
<table style="width:100%%;border-collapse:collapse;margin:16px 0;">
<tr style="background:#10b981;color:#fff;"><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:center;">Qty</th><th style="padding:8px;text-align:right;">Amount</th></tr>
%s
</table>
<table style="width:100%%;border-collapse:collapse;margin:16px 0;max-width:300px;margin-left:auto;">
%s
</table>
<p><a href="%s" style="display:inline-block;padding:10px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View Invoice PDF</a></p>
<p style="color:#64748b;font-size:12px;">Due date: %s<br>Payment terms: %s</p>
<hr>
<p style="color:#64748b;font-size:12px;">Thank you for your business!</p>
<p style="margin-top:16px;font-size:13px;">—<br>You can also <a href="https://venturemate.net/signup" style="color:#10b981;font-weight:bold;text-decoration:underline;">try VentureMate now</a> to manage your finances, send invoices, and grow your business.</p>
`, biz.Name, inv.CustomerName, inv.InvoiceNumber, itemsHTML, totalsHTML, pdfLink, inv.DueDate.Format("Jan 02, 2006"), inv.PaymentTerms)

				if err := AppContainer.Email.SendTemplatedEmail(
					[]string{custEmail},
					fmt.Sprintf("Invoice #%s from %s", inv.InvoiceNumber, biz.Name),
					emailBody,
				); err != nil {
					return nil, fmt.Errorf("email send failed: %w", err)
				}
			}

			// Update status to sent
			if err := AppContainer.InvoiceRepo.UpdateStatus(p.Context, inv.ID, "sent"); err != nil {
				return nil, fmt.Errorf("status update failed: %w", err)
			}
			inv.Status = "sent"

			return inv, nil
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
			if err := AppContainer.InvoiceRepo.UpdatePdfURLWithSize(p.Context, inv.ID, pdfURL, int64(len(pdfData))); err != nil {
				return "", fmt.Errorf("save pdf url failed: %w", err)
			}

			// Update storage usage
			if AppContainer.UsageRepo != nil && AppContainer.FileHandler != nil {
				if totalStorage, err := AppContainer.FileHandler.CalculateTotalStorage(p.Context, inv.UserID); err == nil {
					AppContainer.UsageRepo.UpdateStorage(p.Context, inv.UserID, subscriptions.BillingPeriod(time.Now()), totalStorage)
				}
			}

			return pdfURL, nil
		},
	})
}


