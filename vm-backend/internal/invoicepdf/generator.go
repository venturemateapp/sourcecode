package invoicepdf

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/invoices"
)

type Generator struct {
	bizRepo *businesses.Repository
}

func NewGenerator(bizRepo *businesses.Repository) *Generator {
	return &Generator{bizRepo: bizRepo}
}

func (g *Generator) Generate(ctx context.Context, inv *invoices.Invoice, businessID string) ([]byte, error) {
	biz, err := g.bizRepo.GetByID(ctx, businessID)
	if err != nil {
		return nil, fmt.Errorf("get business: %w", err)
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	primaryR, primaryG, primaryB := 16, 185, 129
	headerR, headerG, headerB := 15, 23, 42

	pdf.SetFillColor(headerR, headerG, headerB)
	pdf.Rect(20, 20, 170, 30, "F")
	pdf.SetY(24)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 16)
	pdf.CellFormat(80, 10, "INVOICE", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetY(36)
	pdf.CellFormat(80, 6, fmt.Sprintf("Invoice #: %s", inv.InvoiceNumber), "", 0, "L", false, 0, "")

	pdf.SetY(24)
	pdf.SetX(130)
	pdf.SetFont("Helvetica", "B", 14)
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(60, 10, biz.Name, "", 0, "R", false, 0, "")
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetX(130)
	pdf.SetY(32)
	pdf.CellFormat(60, 6, biz.Tagline, "", 0, "R", false, 0, "")

	pdf.SetY(60)
	pdf.SetTextColor(headerR, headerG, headerB)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.CellFormat(80, 6, "From:", "", 0, "L", false, 0, "")
	pdf.CellFormat(80, 6, "To:", "", 0, "L", false, 0, "")

	pdf.SetY(67)
	pdf.SetTextColor(60, 60, 60)
	pdf.SetFont("Helvetica", "", 8)
	pdf.CellFormat(80, 5, biz.Name, "", 0, "L", false, 0, "")
	pdf.CellFormat(80, 5, inv.CustomerName, "", 0, "L", false, 0, "")

	pdf.SetY(73)
	pdf.CellFormat(80, 5, biz.Location, "", 0, "L", false, 0, "")
	if inv.CustomerAddress != "" {
		pdf.CellFormat(80, 5, inv.CustomerAddress, "", 0, "L", false, 0, "")
	}

	pdf.SetY(67)
	pdf.SetX(130)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(headerR, headerG, headerB)
	pdf.CellFormat(60, 5, fmt.Sprintf("Date: %s", inv.IssueDate.Format("Jan 02, 2006")), "", 0, "R", false, 0, "")
	pdf.SetY(73)
	pdf.SetX(130)
	pdf.SetTextColor(60, 60, 60)
	pdf.CellFormat(60, 5, fmt.Sprintf("Due: %s", inv.DueDate.Format("Jan 02, 2006")), "", 0, "R", false, 0, "")
	if inv.PONumber != "" {
		pdf.SetY(79)
		pdf.SetX(130)
		pdf.CellFormat(60, 5, "PO: "+inv.PONumber, "", 0, "R", false, 0, "")
	}

	pdf.SetY(90)
	pdf.SetFillColor(primaryR, primaryG, primaryB)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 8)
	colW := []float64{80, 20, 30, 30}
	headers := []string{"Description", "Qty", "Unit Price", "Amount"}
	for i, h := range headers {
		pdf.CellFormat(colW[i], 8, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetTextColor(40, 40, 40)
	pdf.SetFont("Helvetica", "", 8)
	var items []invoices.InvoiceItem
	json.Unmarshal([]byte(inv.Items), &items)
	for _, item := range items {
		total := float64(item.Quantity) * item.UnitPrice
		y := pdf.GetY()
		if y+7 > 270 {
			pdf.AddPage()
		}
		pdf.CellFormat(colW[0], 7, item.Description, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colW[1], 7, fmt.Sprintf("%d", item.Quantity), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW[2], 7, fmt.Sprintf("%.2f", item.UnitPrice), "1", 0, "R", false, 0, "")
		pdf.CellFormat(colW[3], 7, fmt.Sprintf("%.2f", total), "1", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	totalY := pdf.GetY() + 4
	pdf.SetY(totalY)
	pdf.SetX(120)
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(40, 40, 40)
	pdf.CellFormat(40, 6, "Subtotal:", "", 0, "R", false, 0, "")
	pdf.CellFormat(40, 6, fmt.Sprintf("$%.2f", inv.Subtotal), "", 0, "R", false, 0, "")
	pdf.Ln(-1)

	if inv.Discount > 0 {
		pdf.SetX(120)
		pdf.CellFormat(40, 6, "Discount:", "", 0, "R", false, 0, "")
		pdf.CellFormat(40, 6, fmt.Sprintf("-$%.2f", inv.Discount), "", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}
	if inv.TaxRate > 0 {
		pdf.SetX(120)
		pdf.CellFormat(40, 6, fmt.Sprintf("Tax (%.1f%%):", inv.TaxRate), "", 0, "R", false, 0, "")
		pdf.CellFormat(40, 6, fmt.Sprintf("$%.2f", inv.TaxAmount), "", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}
	if inv.ShippingCost > 0 {
		pdf.SetX(120)
		pdf.CellFormat(40, 6, "Shipping:", "", 0, "R", false, 0, "")
		pdf.CellFormat(40, 6, fmt.Sprintf("$%.2f", inv.ShippingCost), "", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	pdf.SetY(pdf.GetY() + 2)
	pdf.SetFillColor(primaryR, primaryG, primaryB)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.SetX(120)
	pdf.CellFormat(40, 8, "TOTAL:", "1", 0, "R", true, 0, "")
	pdf.CellFormat(40, 8, fmt.Sprintf("$%.2f", inv.Amount), "1", 0, "R", true, 0, "")

	pdf.SetY(totalY + 2)
	pdf.SetX(20)
	statusColors := map[string][3]int{
		"draft": {180, 180, 180}, "sent": {59, 130, 246},
		"paid": {52, 211, 153}, "overdue": {239, 68, 68}, "cancelled": {148, 163, 184},
	}
	sc := statusColors[inv.Status]
	pdf.SetFillColor(sc[0], sc[1], sc[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 7)
	pdf.CellFormat(20, 5, strings.ToUpper(inv.Status), "1", 0, "C", true, 0, "")

	if inv.Notes != "" {
		pdf.SetY(260)
		pdf.SetTextColor(100, 100, 100)
		pdf.SetFont("Helvetica", "I", 7)
		pdf.CellFormat(170, 5, "Notes:", "", 0, "L", false, 0, "")
		pdf.SetY(265)
		pdf.MultiCell(170, 4, inv.Notes, "", "L", false)
	}

	pdf.SetY(-15)
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(150, 150, 150)
	pdf.CellFormat(170, 5, fmt.Sprintf("Generated by VentureMate on %s", time.Now().Format("Jan 02, 2006 15:04")), "", 0, "C", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("pdf output: %w", err)
	}
	return buf.Bytes(), nil
}
