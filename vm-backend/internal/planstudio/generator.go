package planstudio

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/venturemate/vmbackend/internal/ai"
	"github.com/venturemate/vmbackend/internal/businesses"
)

func Generate(ctx context.Context, provider ai.Provider, business *businesses.Business, prompt, currentDocument string, projection *Projection) (*Document, *ai.ProviderResponse, error) {
	if provider == nil {
		return nil, nil, errors.New("AI provider is unavailable")
	}
	if strings.TrimSpace(prompt) == "" {
		return nil, nil, errors.New("business plan prompt is required")
	}
	businessContext := "No linked business. Use explicit placeholders for unverified facts."
	if business != nil {
		businessContext = fmt.Sprintf("VERIFIED BUSINESS DATA\nName: %s\nTagline: %s\nDescription: %s\nIndustry: %s\nStage: %s\nLocation: %s\nTeam JSON: %s\nMetrics JSON: %s\nFinancials JSON: %s",
			business.Name, business.Tagline, business.Description, business.Industry, business.Stage, business.Location, business.Team, business.Metrics, business.Financials)
	}
	projectionJSON := "No deterministic projection supplied. Add an assumptions placeholder instead of calculating figures."
	if projection != nil {
		b, _ := json.Marshal(projection)
		projectionJSON = "DETERMINISTIC MANAGEMENT PROJECTION (label as projection, never actual):\n" + string(b)
	}
	current := "No current plan."
	if strings.TrimSpace(currentDocument) != "" && currentDocument != "{}" {
		current = "CURRENT PLAN JSON. Preserve locked and unrelated sections/blocks:\n" + currentDocument
	}
	system := `You are VentureMate Business Plan Studio. Return one JSON object only matching schemaVersion 2.0.
Required top-level fields: schemaVersion,title,executiveSummary,metadata,sections,assumptions,projection,theme.
Allowed blocks: heading,paragraph,bullet_list,numbered_list,callout,quote,image,table,chart,page_break,financial_assumptions,financial_projection_table.
Create a complete professional plan adapted to the business: cover, executive summary, company, problem/opportunity, product, target market, competitors, business model/pricing, go-to-market, operations, organization/team, milestones, risks, projections, funding/use, appendix.
Never invent customers, traction, historic revenue, team, regulations, awards, market statistics or sources. State "Verification required" where data is missing. Historic and projected figures must never be mixed. Use only the supplied deterministic projection figures. Preserve locked and unrelated content from the current document.
Every section and block needs a stable unique id. Keep prose clear and specific, not promotional filler.`
	response, err := provider.Chat(ctx, system, []ai.Message{{Role: "user", Content: businessContext + "\n\n" + projectionJSON + "\n\nUSER REQUEST\n" + prompt + "\n\n" + current}}, nil)
	if err != nil {
		return nil, nil, err
	}
	raw := extractJSONObject(response.Content)
	var document Document
	if err := json.Unmarshal([]byte(raw), &document); err != nil {
		return nil, response, fmt.Errorf("AI returned invalid business plan JSON: %w", err)
	}
	if projection != nil {
		document.Projection = projection
	}
	if err := document.Validate(); err != nil {
		return nil, response, err
	}
	return &document, response, nil
}

func extractJSONObject(value string) string {
	value = strings.TrimSpace(value)
	if strings.HasPrefix(value, "```") {
		value = strings.TrimPrefix(value, "```json")
		value = strings.TrimPrefix(value, "```")
		value = strings.TrimSuffix(value, "```")
		value = strings.TrimSpace(value)
	}
	start, end := strings.IndexByte(value, '{'), strings.LastIndexByte(value, '}')
	if start >= 0 && end > start {
		return value[start : end+1]
	}
	return value
}
