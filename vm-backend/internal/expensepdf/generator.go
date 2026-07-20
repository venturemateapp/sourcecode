package expensepdf

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
	"github.com/venturemate/vmbackend/internal/expenditure"
)

type Generator struct {
	bizRepo *businesses.Repository
	http    *http.Client
}

func NewGenerator(bizRepo *businesses.Repository) *Generator {
	return &Generator{bizRepo: bizRepo, http: &http.Client{Timeout: 10 * time.Second}}
}

type expenseItem struct {
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
}

func (g *Generator) Generate(ctx context.Context, exp *expenditure.Expenditure, businessID string) ([]byte, error) {
	biz, err := g.bizRepo.GetByID(ctx, businessID)
	if err != nil {
		return nil, fmt.Errorf("get business: %w", err)
	}

	type BrandKit struct {
		Logo         string `json:"logo"`
		PrimaryColor string `json:"primaryColor"`
		DarkColor    string `json:"darkColor"`
	}
	var brand BrandKit
	if biz.BrandKit != "" {
		json.Unmarshal([]byte(biz.BrandKit), &brand)
	}
	primary := "#000000"
	dark := "#000000"
	pr, pg, pb := parseHex(primary)
	dr, dg, db := parseHex(dark)

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 15, 20)
	pdf.AddPage()

	if brand.Logo != "" {
		logoReader, imgType := g.logoReader(brand.Logo)
		if logoReader != nil && imgType != "" {
			pdf.RegisterImageReader("logo", imgType, logoReader)
			pdf.Image("logo", 20, 15, 30, 0, false, "", 0, "")
		}
	}

	pdf.SetY(18)
	pdf.SetFont("Helvetica", "B", 22)
	pdf.SetTextColor(dr, dg, db)
	pdf.CellFormat(170, 10, "EXPENSE REPORT", "", 0, "R", false, 0, "")

	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(100, 100, 100)
	pdf.SetY(29)
	pdf.CellFormat(170, 5, fmt.Sprintf("# %s", exp.ID[:8]), "", 0, "R", false, 0, "")

	pdf.SetY(38)
	pdf.SetDrawColor(pr, pg, pb)
	pdf.SetLineWidth(0.5)
	pdf.Line(20, 38, 190, 38)

	pdf.SetY(44)
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(dr, dg, db)
	pdf.CellFormat(85, 5, "FROM", "", 0, "L", false, 0, "")

	pdf.SetY(50)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(30, 30, 30)
	pdf.CellFormat(85, 5, biz.Name, "", 0, "L", false, 0, "")

	pdf.SetY(56)
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(85, 4, biz.Location, "", 0, "L", false, 0, "")

	pdf.SetY(44)
	pdf.SetX(120)
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(dr, dg, db)

	details := []struct{ label, value string }{
		{"Date:", exp.ExpenseDate},
		{"Vendor:", exp.Vendor},
		{"Category:", strings.ToUpper(exp.Category)},
	}
	y := float64(50)
	for _, d := range details {
		pdf.SetXY(120, y)
		pdf.SetFont("Helvetica", "B", 8)
		pdf.SetTextColor(dr, dg, db)
		pdf.CellFormat(35, 4, d.label, "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 8)
		pdf.SetTextColor(60, 60, 60)
		pdf.CellFormat(50, 4, d.value, "", 0, "L", false, 0, "")
		y += 5
	}

	var items []expenseItem
	json.Unmarshal([]byte(exp.Items), &items)
	if len(items) == 0 {
		items = []expenseItem{{Description: exp.Description, Quantity: 1, UnitPrice: exp.Amount}}
	}

	tableTop := 75.0
	pdf.SetY(tableTop)
	pdf.SetFillColor(pr, pg, pb)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 8)
	colW := []float64{76, 18, 28, 28, 28}
	headers := []string{"Description", "Qty", "Unit Price", "Tax", "Amount"}
	for i, h := range headers {
		pdf.CellFormat(colW[i], 8, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetTextColor(40, 40, 40)
	pdf.SetFont("Helvetica", "", 8)
	rowH := 6.0
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
		taxStr := "-"
		pdf.CellFormat(colW[3], rowH, taxStr, "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW[4], rowH, fmt.Sprintf("%.2f", lineTotal), "1", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	totalStart := pdf.GetY() + 3
	pdf.SetY(totalStart)
	pdf.SetX(130)
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(60, 60, 60)
	pdf.SetX(130)
	pdf.CellFormat(35, 6, "Total:", "", 0, "R", false, 0, "")
	pdf.CellFormat(35, 6, fmt.Sprintf("$%.2f", exp.Amount), "", 0, "R", false, 0, "")

	pdf.Ln(2)
	pdf.SetFillColor(pr, pg, pb)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetX(125)
	pdf.CellFormat(40, 9, "TOTAL:", "1", 0, "R", true, 0, "")
	pdf.CellFormat(35, 9, fmt.Sprintf("$%.2f", exp.Amount), "1", 0, "R", true, 0, "")

	if exp.Notes != "" {
		pdf.SetY(248)
		pdf.SetFont("Helvetica", "B", 7)
		pdf.SetTextColor(dr, dg, db)
		pdf.CellFormat(170, 4, "Notes:", "", 0, "L", false, 0, "")
		pdf.SetY(253)
		pdf.SetFont("Helvetica", "", 7)
		pdf.SetTextColor(100, 100, 100)
		pdf.MultiCell(170, 3.5, exp.Notes, "", "L", false)
	}

	pdf.SetY(-12)
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
		lower := strings.ToLower(logo)
		var ext string
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
		resp, err := g.http.Get(logo)
		if err != nil || resp.StatusCode != http.StatusOK {
			return nil, ""
		}
		defer resp.Body.Close()
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, ""
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

func parseHex(hex string) (int, int, int) {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) != 6 {
		return 16, 185, 129
	}
	r, g, b := 0, 0, 0
	fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
	return r, g, b
}
