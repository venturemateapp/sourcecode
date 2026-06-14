package scores

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/invoices"
)

type CreditComponents struct {
	PaymentHistory    int `json:"payment_history"`
	CreditUtilization int `json:"credit_utilization"`
	BusinessAge       int `json:"business_age"`
	RevenueStability  int `json:"revenue_stability"`
	DebtRatio         int `json:"debt_ratio"`
}

type CreditFactors struct {
	Positive []string `json:"positive"`
	Negative []string `json:"negative"`
}

type CreditScoreData struct {
	Score        int              `json:"score"`
	MaxScore     int              `json:"max_score"`
	Grade        string           `json:"grade"`
	RiskLevel    string           `json:"risk_level"`
	CalculatedAt string           `json:"calculated_at"`
	Factors      CreditFactors    `json:"factors"`
	Components   CreditComponents `json:"components"`
}

type FinancingOffer struct {
	ID           string   `json:"id"`
	LenderName   string   `json:"lender_name"`
	ProductType  string   `json:"product_type"`
	MinAmount    float64  `json:"min_amount"`
	MaxAmount    float64  `json:"max_amount"`
	MinRate      float64  `json:"min_rate"`
	MaxRate      float64  `json:"max_rate"`
	TermMonths   int      `json:"term_months"`
	Requirements []string `json:"requirements"`
	PreQualified bool     `json:"pre_qualified"`
	ExpiresAt    string   `json:"expires_at"`
}

type Engine struct {
	bizRepo   *businesses.Repository
	invRepo   *invoices.Repository
	scoreRepo *Repository
}

func NewEngine(bizRepo *businesses.Repository, invRepo *invoices.Repository, scoreRepo *Repository) *Engine {
	return &Engine{bizRepo: bizRepo, invRepo: invRepo, scoreRepo: scoreRepo}
}

func (e *Engine) CalculateAndStore(ctx context.Context, businessID string) (*CreditScoreData, error) {
	biz, err := e.bizRepo.GetByID(ctx, businessID)
	if err != nil || biz == nil {
		return nil, err
	}

	invoiceList, err := e.invRepo.ListByBusiness(ctx, businessID)
	if err != nil {
		return nil, err
	}

	data := e.calculate(biz, invoiceList)

	jsonBytes, _ := json.Marshal(data)
	now := time.Now()
	bs := &BusinessScore{
		ID:           "",
		BusinessID:   businessID,
		ScoreType:    "credit",
		ScoreData:    string(jsonBytes),
		CalculatedAt: now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := e.scoreRepo.Upsert(ctx, bs); err != nil {
		return nil, err
	}

	return data, nil
}

func (e *Engine) GetOffers(score int) []FinancingOffer {
	offers := []FinancingOffer{
		{
			ID: "fo_001", LenderName: "Stripe Capital", ProductType: "loan",
			MinAmount: 5000, MaxAmount: 250000, MinRate: 6.5, MaxRate: 15.0, TermMonths: 12,
			Requirements: []string{"6 months revenue history", "$10k+ monthly revenue"},
			ExpiresAt:    time.Now().Add(30 * 24 * time.Hour).Format(time.RFC3339),
		},
		{
			ID: "fo_002", LenderName: "Brex", ProductType: "line_of_credit",
			MinAmount: 10000, MaxAmount: 1000000, MinRate: 7.0, MaxRate: 18.0, TermMonths: 6,
			Requirements: []string{"Incorporated business", "$50k+ monthly revenue"},
			ExpiresAt:    time.Now().Add(45 * 24 * time.Hour).Format(time.RFC3339),
		},
		{
			ID: "fo_003", LenderName: "Silicon Valley Bank", ProductType: "loan",
			MinAmount: 50000, MaxAmount: 5000000, MinRate: 8.0, MaxRate: 20.0, TermMonths: 60,
			Requirements: []string{"2+ years in business", "$1M+ annual revenue", "Strong credit history"},
			ExpiresAt:    time.Now().Add(60 * 24 * time.Hour).Format(time.RFC3339),
		},
	}

	for i := range offers {
		offers[i].PreQualified = score >= scoreThresholdForOffer(offers[i].ID)
	}

	return offers
}

func scoreThresholdForOffer(offerID string) int {
	switch offerID {
	case "fo_001":
		return 50
	case "fo_002":
		return 60
	case "fo_003":
		return 75
	default:
		return 70
	}
}

func (e *Engine) calculate(biz *businesses.Business, invoiceList []invoices.Invoice) *CreditScoreData {
	paymentHistory := calcPaymentHistory(invoiceList)
	creditUtilization := calcCreditUtilization(biz, invoiceList)
	businessAge := calcBusinessAge(biz)
	revenueStability := calcRevenueStability(biz)
	debtRatio := calcDebtRatio(biz)

	score := int(math.Round(
		0.30*float64(paymentHistory) +
			0.20*float64(creditUtilization) +
			0.15*float64(businessAge) +
			0.20*float64(revenueStability) +
			0.15*float64(debtRatio),
	))
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	var positive []string
	var negative []string

	if paymentHistory >= 80 {
		positive = append(positive, "Strong payment history")
	} else if paymentHistory < 50 {
		negative = append(negative, "Poor payment history")
	}

	if creditUtilization >= 70 {
		positive = append(positive, "Low credit utilization")
	} else if creditUtilization < 40 {
		negative = append(negative, "High credit utilization")
	}

	if businessAge >= 70 {
		positive = append(positive, "Established business history")
	} else if businessAge < 40 {
		negative = append(negative, "Short business history")
	}

	if revenueStability >= 70 {
		positive = append(positive, "Consistent revenue")
	} else if revenueStability < 40 {
		negative = append(negative, "Inconsistent revenue")
	}

	if debtRatio >= 70 {
		positive = append(positive, "Low debt ratio")
	} else if debtRatio < 40 {
		negative = append(negative, "High debt ratio")
	}

	if len(positive) == 0 {
		positive = append(positive, "Sufficient business data")
	}

	return &CreditScoreData{
		Score:        score,
		MaxScore:     100,
		Grade:        scoreGrade(score),
		RiskLevel:    scoreRiskLevel(score),
		CalculatedAt: time.Now().Format(time.RFC3339),
		Factors: CreditFactors{
			Positive: positive,
			Negative: negative,
		},
		Components: CreditComponents{
			PaymentHistory:    paymentHistory,
			CreditUtilization: creditUtilization,
			BusinessAge:       businessAge,
			RevenueStability:  revenueStability,
			DebtRatio:         debtRatio,
		},
	}
}

func calcPaymentHistory(invoiceList []invoices.Invoice) int {
	if len(invoiceList) == 0 {
		return 50
	}
	var paid, overdue int
	now := time.Now()
	for _, inv := range invoiceList {
		switch inv.Status {
		case "paid":
			paid++
		case "sent":
			if inv.DueDate.Before(now) {
				overdue++
			}
		}
	}
	total := paid + overdue
	if total == 0 {
		return 50
	}
	return int(math.Round(float64(paid) / float64(total) * 100))
}

func calcCreditUtilization(biz *businesses.Business, invoiceList []invoices.Invoice) int {
	var outstanding float64
	for _, inv := range invoiceList {
		if inv.Status == "draft" || inv.Status == "sent" {
			outstanding += inv.Amount
		}
	}
	if outstanding == 0 {
		return 80
	}

	revenue := extractRevenue(biz)

	if revenue <= 0 {
		if outstanding > 10000 {
			return 30
		}
		return 50
	}

	ratio := outstanding / revenue * 100
	if ratio <= 25 {
		return 80
	}
	if ratio <= 50 {
		return 60
	}
	if ratio <= 75 {
		return 40
	}
	return 20
}

func calcBusinessAge(biz *businesses.Business) int {
	var startTime time.Time
	if biz.FoundedDate != "" {
		formats := []string{"2006-01-02", "2006-01-02T15:04:05Z", time.RFC3339}
		for _, f := range formats {
			if t, err := time.Parse(f, biz.FoundedDate); err == nil {
				startTime = t
				break
			}
		}
	}
	if startTime.IsZero() {
		startTime = biz.CreatedAt
	}

	months := int(time.Since(startTime).Hours() / (24 * 30))
	if months <= 0 {
		months = 1
	}

	if months >= 60 {
		return 100
	}
	if months >= 36 {
		return 80
	}
	if months >= 18 {
		return 60
	}
	if months >= 6 {
		return 40
	}
	return 20
}

func calcRevenueStability(biz *businesses.Business) int {
	if biz.Financials == "" || biz.Financials == "{}" {
		return 50
	}

	var fin map[string]interface{}
	if err := json.Unmarshal([]byte(biz.Financials), &fin); err != nil {
		return 50
	}

	monthsRaw, ok := fin["monthlyRevenueHistory"]
	if !ok {
		return 50
	}

	monthsArr, ok := monthsRaw.([]interface{})
	if !ok || len(monthsArr) < 3 {
		return 50
	}

	var revenues []float64
	for _, m := range monthsArr {
		switch v := m.(type) {
		case float64:
			revenues = append(revenues, v)
		case map[string]interface{}:
			if r, ok := v["revenue"].(float64); ok {
				revenues = append(revenues, r)
			}
		}
	}

	if len(revenues) < 3 {
		return 50
	}

	mean := 0.0
	for _, r := range revenues {
		mean += r
	}
	mean /= float64(len(revenues))

	if mean == 0 {
		return 50
	}

	variance := 0.0
	for _, r := range revenues {
		diff := r - mean
		variance += diff * diff
	}
	variance /= float64(len(revenues))
	cv := math.Sqrt(variance) / mean * 100

	if cv <= 10 {
		return 100
	}
	if cv <= 20 {
		return 80
	}
	if cv <= 35 {
		return 60
	}
	if cv <= 50 {
		return 40
	}
	return 20
}

func calcDebtRatio(biz *businesses.Business) int {
	revenue := extractRevenue(biz)
	if revenue <= 0 {
		return 50
	}

	if biz.Financials == "" || biz.Financials == "{}" {
		return 50
	}

	var fin map[string]interface{}
	if err := json.Unmarshal([]byte(biz.Financials), &fin); err != nil {
		return 50
	}

	expenses := 0.0
	if exp, ok := fin["monthlyExpenses"].(float64); ok {
		expenses = exp
	}

	ratio := expenses / revenue * 100
	if ratio <= 30 {
		return 90
	}
	if ratio <= 50 {
		return 70
	}
	if ratio <= 70 {
		return 50
	}
	if ratio <= 90 {
		return 30
	}
	return 15
}

func extractRevenue(biz *businesses.Business) float64 {
	if biz.Financials != "" && biz.Financials != "{}" {
		var fin map[string]interface{}
		if err := json.Unmarshal([]byte(biz.Financials), &fin); err == nil {
			if rev, ok := fin["monthlyRevenue"].(float64); ok && rev > 0 {
				return rev
			}
			if revStr, ok := fin["monthlyRevenue"].(string); ok {
				var r float64
				if _, err := fmt.Sscanf(revStr, "%f", &r); err == nil {
					return r
				}
			}
		}
	}

	if biz.Metrics != "" && biz.Metrics != "{}" {
		var met map[string]interface{}
		if err := json.Unmarshal([]byte(biz.Metrics), &met); err == nil {
			if rev, ok := met["monthlyRevenue"].(float64); ok && rev > 0 {
				return rev
			}
		}
	}

	return 0
}

func scoreGrade(score int) string {
	if score >= 90 {
		return "Excellent"
	}
	if score >= 80 {
		return "Very Good"
	}
	if score >= 70 {
		return "Good"
	}
	if score >= 60 {
		return "Fair"
	}
	return "Poor"
}

func scoreRiskLevel(score int) string {
	if score >= 80 {
		return "low"
	}
	if score >= 60 {
		return "moderate"
	}
	if score >= 40 {
		return "high"
	}
	return "very_high"
}
