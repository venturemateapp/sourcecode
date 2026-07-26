package invoicepdf

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/invoices"
)

type Generator struct {
	bizRepo *businesses.Repository
	http    *http.Client
}

func NewGenerator(bizRepo *businesses.Repository) *Generator {
	return &Generator{bizRepo: bizRepo, http: &http.Client{Timeout: 10 * time.Second}}
}

func (g *Generator) Generate(ctx context.Context, inv *invoices.Invoice, businessID string) ([]byte, error) {
	biz, err := g.bizRepo.GetByID(ctx, businessID)
	if err != nil {
		return nil, fmt.Errorf("get business: %w", err)
	}

	// Parse brand kit for logo and colors
	type BrandKit struct {
		Logo         string `json:"logo"`
		PrimaryColor string `json:"primaryColor"`
		DarkColor    string `json:"darkColor"`
	}
	var brand BrandKit
	if biz.BrandKit != "" {
		json.Unmarshal([]byte(biz.BrandKit), &brand)
	}
	primary := "#10b981"
	dark := "#065f46"
	if brand.PrimaryColor != "" {
		primary = brand.PrimaryColor
	}
	if brand.DarkColor != "" {
		dark = brand.DarkColor
	}
	pr, pg, pb := parseHex(primary)
	dr, dg, db := parseHex(dark)

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 12, 20)
	pdf.SetAutoPageBreak(true, 18)
	pdf.AddPage()

	// === HEADER with logo ===
	if brand.Logo != "" {
		logoReader, imgType := g.logoReader(brand.Logo)
		if logoReader != nil && imgType != "" {
			pdf.RegisterImageReader("logo", imgType, logoReader)
			pdf.Image("logo", 20, 12, 25, 0, false, "", 0, "")
		}
	}

	// Invoice title on the right
	pdf.SetY(15)
	pdf.SetFont("Helvetica", "B", 20)
	pdf.SetTextColor(dr, dg, db)
	pdf.CellFormat(170, 9, "INVOICE", "", 0, "R", false, 0, "")

	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(100, 100, 100)
	pdf.SetY(24)
	pdf.CellFormat(170, 4, fmt.Sprintf("# %s", inv.InvoiceNumber), "", 0, "R", false, 0, "")

	// Divider line
	pdf.SetY(32)
	pdf.SetDrawColor(pr, pg, pb)
	pdf.SetLineWidth(0.5)
	pdf.Line(20, 32, 190, 32)

	// === FROM / TO section ===
	y := float64(36)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(dr, dg, db)
	pdf.SetXY(20, y)
	pdf.CellFormat(80, 4, "FROM", "", 0, "L", false, 0, "")
	pdf.SetXY(120, y)
	pdf.CellFormat(80, 4, "TO", "", 0, "L", false, 0, "")
	y += 4.5

	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(30, 30, 30)
	pdf.SetXY(20, y)
	pdf.CellFormat(85, 4.5, truncate(biz.Name, 50), "", 0, "L", false, 0, "")
	pdf.SetXY(120, y)
	pdf.CellFormat(80, 4.5, truncate(inv.CustomerName, 45), "", 0, "L", false, 0, "")
	y += 4.5

	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(100, 100, 100)
	pdf.SetXY(20, y)
	pdf.CellFormat(85, 3, truncate(biz.Location, 60), "", 0, "L", false, 0, "")
	addrLine := inv.CustomerAddress
	if inv.BillingAddress != "" {
		addrLine = inv.BillingAddress
	}
	pdf.SetXY(120, y)
	pdf.CellFormat(80, 3, truncate(addrLine, 50), "", 0, "L", false, 0, "")
	y += 3.5

	if inv.CustomerEmail != "" {
		pdf.SetXY(120, y)
		pdf.CellFormat(80, 3, truncate(inv.CustomerEmail, 50), "", 0, "L", false, 0, "")
		y += 3.5
	}

	// === INVOICE DETAILS (2 columns) ===
	details := []struct{ label, value string }{
		{"Date:", inv.IssueDate.Format("Jan 02, 2006")},
		{"Due Date:", inv.DueDate.Format("Jan 02, 2006")},
	}
	if inv.PONumber != "" {
		details = append(details, struct{ label, value string }{"PO#:", truncate(inv.PONumber, 20)})
	}
	if inv.PaymentTerms != "" {
		details = append(details, struct{ label, value string }{"Terms:", inv.PaymentTerms})
	}
	pdf.SetFont("Helvetica", "B", 8)
	for _, d := range details {
		pdf.SetTextColor(dr, dg, db)
		pdf.SetXY(20, y)
		pdf.CellFormat(20, 3.5, d.label, "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 8)
		pdf.SetTextColor(60, 60, 60)
		pdf.SetX(40)
		pdf.CellFormat(60, 3.5, d.value, "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "B", 8)
		y += 3.5
	}
	y += 2

	// === ITEMS TABLE HEADER ===
	pdf.SetY(y + 3)
	pdf.SetFillColor(pr, pg, pb)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 8)
	colW := []float64{96, 22, 32, 40}
	headers := []string{"Description", "Qty", "Unit Price", "Amount"}
	for i, h := range headers {
		pdf.CellFormat(colW[i], 7, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// === ITEMS ===
	pdf.SetTextColor(40, 40, 40)
	pdf.SetFont("Helvetica", "", 8)
	var items []invoices.InvoiceItem
	json.Unmarshal([]byte(inv.Items), &items)
	rowH := 5.5
	for _, item := range items {
		qty := float64(item.Quantity)
		lineTotal := qty * item.UnitPrice
		y = pdf.GetY()
		if y+rowH+2 > 260 {
			pdf.AddPage()
		}
		pdf.CellFormat(colW[0], rowH, item.Description, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colW[1], rowH, fmt.Sprintf("%d", item.Quantity), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW[2], rowH, fmt.Sprintf("%.2f", item.UnitPrice), "1", 0, "R", false, 0, "")
		pdf.CellFormat(colW[3], rowH, fmt.Sprintf("%.2f", lineTotal), "1", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	// === TOTALS ===
	pdf.SetY(pdf.GetY() + 2)
	rightX := 120.0
	pdf.SetX(rightX)
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(60, 60, 60)

	totals := []struct{ label, value string }{
		{"Subtotal:", fmt.Sprintf("$%.2f", inv.Subtotal)},
	}
	if inv.Discount > 0 {
		totals = append(totals, struct{ label, value string }{"Discount:", fmt.Sprintf("-$%.2f", inv.Discount)})
	}
	if inv.TaxRate > 0 {
		totals = append(totals, struct{ label, value string }{fmt.Sprintf("Tax (%.1f%%):", inv.TaxRate), fmt.Sprintf("$%.2f", inv.TaxAmount)})
	}
	if inv.ShippingCost > 0 {
		totals = append(totals, struct{ label, value string }{"Shipping:", fmt.Sprintf("$%.2f", inv.ShippingCost)})
	}

	for _, t := range totals {
		pdf.SetX(rightX)
		pdf.CellFormat(35, 5.5, t.label, "", 0, "R", false, 0, "")
		pdf.CellFormat(35, 5.5, t.value, "", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	// Total row (calculate: subtotal - discount + tax + shipping)
	grandTotal := inv.Subtotal - inv.Discount + inv.TaxAmount + inv.ShippingCost
	pdf.Ln(1.5)
	pdf.SetFillColor(pr, pg, pb)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.SetX(rightX - 5)
	pdf.CellFormat(40, 8, "TOTAL:", "1", 0, "R", true, 0, "")
	pdf.CellFormat(35, 8, fmt.Sprintf("$%.2f", grandTotal), "1", 0, "R", true, 0, "")

	// Notes
	if inv.Notes != "" {
		pdf.Ln(3)
		pdf.SetFont("Helvetica", "B", 7)
		pdf.SetTextColor(dr, dg, db)
		pdf.CellFormat(170, 3, "Notes:", "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 7)
		pdf.SetTextColor(100, 100, 100)
		pdf.MultiCell(170, 3, inv.Notes, "", "L", false)
	}

	// Footer
	pdf.SetY(-15)
	pdf.SetFont("Helvetica", "", 6)
	pdf.SetTextColor(160, 160, 160)
	pdf.CellFormat(170, 4, fmt.Sprintf("Generated by VentureMate on %s", time.Now().Format("Jan 02, 2006")), "", 0, "C", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("pdf output: %w", err)
	}
	return buf.Bytes(), nil
}

func svgToPNG(svgData []byte) ([]byte, error) {
	icon, err := oksvg.ReadIconStream(bytes.NewReader(svgData))
	if err != nil {
		return nil, err
	}
	w := int(icon.ViewBox.W)
	h := int(icon.ViewBox.H)
	if w == 0 || h == 0 {
		w, h = 200, 200
	}
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	scanner := rasterx.NewScannerGV(w, h, img, img.Bounds())
	raster := rasterx.NewDasher(w, h, scanner)
	icon.SetTarget(0, 0, float64(w), float64(h))
	icon.Draw(raster, 1)
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (g *Generator) logoReader(logo string) (io.Reader, string) {
	if strings.HasPrefix(logo, "data:image/") {
		rest := strings.TrimPrefix(logo, "data:image/")
		parts := strings.SplitN(rest, ";", 2)
		if len(parts) < 2 || !strings.HasPrefix(parts[1], "base64,") {
			return nil, ""
		}
		ext := parts[0]
		b64 := parts[1][7:]
		b, err := base64.StdEncoding.DecodeString(b64)
		if err != nil {
			return nil, ""
		}
		if ext == "svg+xml" || ext == "svg" {
			pngData, err := svgToPNG(b)
			if err != nil {
				return nil, ""
			}
			return bytes.NewReader(pngData), "png"
		}
		return bytes.NewReader(b), ext
	}
	if strings.HasPrefix(logo, "http") {
		resp, err := g.http.Get(logo)
		if err != nil || resp.StatusCode != http.StatusOK {
			return nil, ""
		}
		defer resp.Body.Close()
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, ""
		}
		// Detect image type from Content-Type header
		ct := resp.Header.Get("Content-Type")
		var ext string
		switch {
		case strings.Contains(ct, "png"):
			ext = "png"
		case strings.Contains(ct, "jpeg"), strings.Contains(ct, "jpg"):
			ext = "jpg"
		case strings.Contains(ct, "gif"):
			ext = "gif"
		case strings.Contains(ct, "svg"):
			// Convert SVG to PNG
			if pngData, err := svgToPNG(data); err == nil {
				return bytes.NewReader(pngData), "png"
			}
			return nil, ""
		default:
			// Try extension-based fallback
			lower := strings.ToLower(logo)
			switch {
			case strings.HasSuffix(lower, ".png"):
				ext = "png"
			case strings.HasSuffix(lower, ".jpg"), strings.HasSuffix(lower, ".jpeg"):
				ext = "jpg"
			case strings.HasSuffix(lower, ".gif"):
				ext = "gif"
			default:
				return nil, ""
			}
		}
		return bytes.NewReader(data), ext
	}
	// Handle raw SVG string (<svg>...</svg>)
	if strings.HasPrefix(strings.TrimSpace(logo), "<svg") {
		pngData, err := svgToPNG([]byte(logo))
		if err != nil {
			return nil, ""
		}
		return bytes.NewReader(pngData), "png"
	}
	return nil, ""
}

func truncate(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen-1] + "…"
	}
	return s
}

func parseHex(hex string) (int, int, int) {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) != 6 {
		return 16, 185, 129
	}
	r, g, b := 0, 0, 0
	fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
	return r, g, b
}
