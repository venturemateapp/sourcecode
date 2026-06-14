package scores

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"time"

	"github.com/venturemate/vmbackend/internal/businesses"
)

type HealthComponent struct {
	Score  int `json:"score"`
	Weight int `json:"weight"`
}

type HealthRecommendation struct {
	ID          string `json:"id"`
	Component   string `json:"component"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Impact      string `json:"impact"`
	Effort      string `json:"effort"`
}

type HealthPriorityAction struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Component   string `json:"component"`
	Deadline    string `json:"deadline"`
	Completed   bool   `json:"completed"`
}

type HealthScoreData struct {
	OverallScore     int                       `json:"overallScore"`
	CalculatedAt     string                    `json:"calculatedAt"`
	Components       map[string]HealthComponent `json:"components"`
	Recommendations  []HealthRecommendation     `json:"recommendations"`
	PriorityActions  []HealthPriorityAction     `json:"priorityActions"`
}

type HealthEngine struct {
	bizRepo   *businesses.Repository
	scoreRepo *Repository
}

func NewHealthEngine(bizRepo *businesses.Repository, scoreRepo *Repository) *HealthEngine {
	return &HealthEngine{bizRepo: bizRepo, scoreRepo: scoreRepo}
}

func (e *HealthEngine) CalculateAndStore(ctx context.Context, businessID string) (*HealthScoreData, error) {
	biz, err := e.bizRepo.GetByID(ctx, businessID)
	if err != nil || biz == nil {
		return nil, err
	}

	data := e.calculate(biz)
	jsonBytes, _ := json.Marshal(data)
	now := time.Now()
	bs := &BusinessScore{
		ID:           "",
		BusinessID:   businessID,
		ScoreType:    "health",
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

func (e *HealthEngine) calculate(biz *businesses.Business) *HealthScoreData {
	compliance := calcCompliance(biz)
	revenueViability := calcRevenueViability(biz)
	marketFit := calcMarketFit(biz)
	teamStructure := calcTeamStructure(biz)
	financialSustainability := calcFinancialSustainability(biz)
	digitalPresence := calcDigitalPresence(biz)

	overall := int(math.Round(
		0.15*float64(compliance) +
			0.25*float64(revenueViability) +
			0.20*float64(marketFit) +
			0.15*float64(teamStructure) +
			0.15*float64(financialSustainability) +
			0.10*float64(digitalPresence),
	))
	if overall > 100 {
		overall = 100
	}
	if overall < 0 {
		overall = 0
	}

	components := map[string]HealthComponent{
		"compliance":                {Score: compliance, Weight: 15},
		"revenue_viability":         {Score: revenueViability, Weight: 25},
		"market_fit":               {Score: marketFit, Weight: 20},
		"team_structure":           {Score: teamStructure, Weight: 15},
		"financial_sustainability": {Score: financialSustainability, Weight: 15},
		"digital_presence":         {Score: digitalPresence, Weight: 10},
	}

	recommendations := buildRecommendations(components)
	priorityActions := buildPriorityActions(components)

	return &HealthScoreData{
		OverallScore:    overall,
		CalculatedAt:    time.Now().Format(time.RFC3339),
		Components:      components,
		Recommendations: recommendations,
		PriorityActions: priorityActions,
	}
}

func calcCompliance(biz *businesses.Business) int {
	score := 30

	if biz.Status != "" && biz.Status == "active" {
		score += 20
	}

	docs := parseStringArray(biz.Documents)
	docCount := len(docs)
	if docCount > 0 {
		score += int(math.Min(float64(docCount)*10, 30))
	}

	if biz.BusinessPlan != "" && biz.BusinessPlan != "{}" {
		score += 10
	}

	if biz.PitchDeck != "" && biz.PitchDeck != "{}" {
		score += 10
	}

	return int(math.Min(float64(score), 100))
}

func calcRevenueViability(biz *businesses.Business) int {
	score := 20

	revenue := extractRevenue(biz)
	if revenue > 0 {
		score += 30
		if revenue >= 10000 {
			score += 15
		}
	}

	fin := parseJSONMap(biz.Financials)
	if len(fin) > 0 {
		score += 10
		if _, ok := fin["fundingRaised"]; ok {
			score += 10
		}
		if _, ok := fin["monthlyRevenueHistory"]; ok {
			score += 15
		}
	}

	return int(math.Min(float64(score), 100))
}

func calcMarketFit(biz *businesses.Business) int {
	score := 20

	if biz.Industry != "" {
		score += 20
	}
	if biz.Stage != "" {
		score += 10
	}
	if biz.Tagline != "" {
		score += 15
	}
	if biz.Description != "" && len(biz.Description) > 50 {
		score += 15
	}
	if biz.Location != "" {
		score += 10
	}

	milestones := parseStringArray(biz.Milestones)
	if len(milestones) > 0 {
		score += 10
	}

	return int(math.Min(float64(score), 100))
}

func calcTeamStructure(biz *businesses.Business) int {
	score := 20

	team := parseStringArray(biz.Team)
	memberCount := len(team)
	if memberCount > 0 {
		score += int(math.Min(float64(memberCount)*15, 40))
	}

	if biz.Team != "" && biz.Team != "[]" {
		var teamList []map[string]interface{}
		if err := json.Unmarshal([]byte(biz.Team), &teamList); err == nil {
			for _, m := range teamList {
				if role, ok := m["role"].(string); ok && role != "" {
					score += 5
				}
			}
		}
	}

	return int(math.Min(float64(score), 100))
}

func calcFinancialSustainability(biz *businesses.Business) int {
	score := 30

	revenue := extractRevenue(biz)
	if revenue > 0 {
		score += 30
	}

	fin := parseJSONMap(biz.Financials)
	if len(fin) > 0 {
		if rev, ok := fin["monthlyRevenue"].(float64); ok && rev > 0 {
			if exp, ok := fin["monthlyExpenses"].(float64); ok && exp > 0 {
				ratio := exp / rev * 100
				if ratio <= 50 {
					score += 20
				} else if ratio <= 80 {
					score += 10
				}
			}
		}
		if fund, ok := fin["fundingRaised"].(float64); ok && fund > 0 {
			score += 10
		}
	}

	if biz.Metrics != "" && biz.Metrics != "{}" {
		met := parseJSONMap(biz.Metrics)
		if len(met) > 0 {
			score += 10
		}
	}

	return int(math.Min(float64(score), 100))
}

func calcDigitalPresence(biz *businesses.Business) int {
	score := 20

	if biz.Website != "" {
		score += 30
	}

	if biz.WebsiteConfig != "" && biz.WebsiteConfig != "{}" {
		score += 20
	}

	if biz.Metrics != "" && biz.Metrics != "{}" {
		met := parseJSONMap(biz.Metrics)
		if traffic, ok := met["websiteTraffic"].(float64); ok && traffic > 0 {
			score += 15
		}
	}

	if biz.AIGenerated != "" && biz.AIGenerated != "{}" {
		score += 15
	}

	return int(math.Min(float64(score), 100))
}

func buildRecommendations(components map[string]HealthComponent) []HealthRecommendation {
	var recs []HealthRecommendation
	id := 1

	lowComponents := []struct {
		key  string
		label string
	}{
		{"compliance", "Compliance & Legal"},
		{"revenue_viability", "Revenue Viability"},
		{"market_fit", "Market Fit"},
		{"team_structure", "Team Structure"},
		{"financial_sustainability", "Financial Sustainability"},
		{"digital_presence", "Digital Presence"},
	}

	recTemplates := map[string]struct {
		title       string
		description string
		impact      string
		effort      string
	}{
		"compliance": {
			title:       "Complete Business Documentation",
			description: "Upload business documents, business plan, and pitch deck to strengthen your compliance score.",
			impact:      "high",
			effort:      "medium",
		},
		"revenue_viability": {
			title:       "Establish Revenue Streams",
			description: "Add revenue data and funding information to demonstrate business viability.",
			impact:      "high",
			effort:      "medium",
		},
		"market_fit": {
			title:       "Define Your Market Position",
			description: "Complete your business profile with industry, stage, and a compelling description.",
			impact:      "medium",
			effort:      "low",
		},
		"team_structure": {
			title:       "Build Your Team",
			description: "Add team members with roles to strengthen your team structure score.",
			impact:      "high",
			effort:      "medium",
		},
		"financial_sustainability": {
			title:       "Improve Financial Health",
			description: "Track revenue and expenses. Aim for expense-to-revenue ratio below 50%.",
			impact:      "high",
			effort:      "high",
		},
		"digital_presence": {
			title:       "Build Digital Presence",
			description: "Set up your business website and track online traffic metrics.",
			impact:      "medium",
			effort:      "low",
		},
	}

	for _, c := range lowComponents {
		comp, ok := components[c.key]
		if !ok || comp.Score >= 70 {
			continue
		}
		tmpl := recTemplates[c.key]
		recs = append(recs, HealthRecommendation{
			ID:          "rec_" + padInt(id),
			Component:   c.key,
			Title:       tmpl.title,
			Description: tmpl.description,
			Impact:      tmpl.impact,
			Effort:      tmpl.effort,
		})
		id++
	}

	return recs
}

func buildPriorityActions(components map[string]HealthComponent) []HealthPriorityAction {
	var actions []HealthPriorityAction
	id := 1

	order := []string{"compliance", "revenue_viability", "market_fit", "team_structure", "financial_sustainability", "digital_presence"}

	for _, key := range order {
		comp, ok := components[key]
		if !ok || comp.Score >= 60 {
			continue
		}
		action := HealthPriorityAction{
			ID:          "act_" + padInt(id),
			Component:   key,
			Completed:   false,
			Deadline:    time.Now().AddDate(0, 1, 0).Format(time.RFC3339),
		}
		switch key {
		case "compliance":
			action.Title = "Complete Business Documentation"
			action.Description = "Upload business documents, business plan, and pitch deck"
		case "revenue_viability":
			action.Title = "Add Revenue Data"
			action.Description = "Enter your monthly revenue and funding information"
		case "market_fit":
			action.Title = "Complete Business Profile"
			action.Description = "Add industry, stage, tagline, and description"
		case "team_structure":
			action.Title = "Add Team Members"
			action.Description = "Invite team members and assign roles"
		case "financial_sustainability":
			action.Title = "Optimize Financial Ratios"
			action.Description = "Track expenses and work toward sustainable revenue"
		case "digital_presence":
			action.Title = "Build Your Website"
			action.Description = "Set up your business website and track traffic"
		}
		actions = append(actions, action)
		id++
	}

	return actions
}

func padInt(n int) string {
	if n < 10 {
		return "00" + strconv.Itoa(n)
	}
	if n < 100 {
		return "0" + strconv.Itoa(n)
	}
	return strconv.Itoa(n)
}

func parseStringArray(s string) []string {
	if s == "" || s == "[]" || s == "{}" {
		return nil
	}
	var arr []string
	if err := json.Unmarshal([]byte(s), &arr); err != nil {
		var arrIf []interface{}
		if err := json.Unmarshal([]byte(s), &arrIf); err == nil {
			for _, v := range arrIf {
				if str, ok := v.(string); ok {
					arr = append(arr, str)
				}
			}
		}
	}
	return arr
}

func parseJSONMap(s string) map[string]interface{} {
	if s == "" || s == "{}" {
		return nil
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		return nil
	}
	return m
}


