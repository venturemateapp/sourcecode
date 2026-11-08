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
	previousDocument := currentDocument
	if freshDocumentRequested(prompt) {
		currentDocument = ""
	}
	current := "No current plan."
	if strings.TrimSpace(currentDocument) != "" && currentDocument != "{}" {
		current = "CURRENT PLAN JSON. Preserve locked and unrelated sections/blocks:\n" + currentDocument
	}
	system := `You are VentureMate Business Plan Studio. Return one JSON object only matching schemaVersion 2.0.
Required top-level fields: schemaVersion,title,executiveSummary,metadata,sections,assumptions,projection,theme.
Allowed blocks: heading,paragraph,bullet_list,numbered_list,callout,quote,image,table,chart,page_break,financial_assumptions,financial_projection_table.
Create a complete professional plan adapted to the business: cover, executive summary, company, problem/opportunity, product, target market, competitors, business model/pricing, go-to-market, operations, organization/team, milestones, risks, projections, funding/use, appendix.
Never invent customers, traction, historic revenue, team, regulations, awards, market statistics or sources. State "Verification required" where data is missing. Historic and projected figures must never be mixed. Use only the supplied deterministic projection figures. Apply the user's request to the document; never return the current plan unchanged. For explicit requests to create a new, complete, or from-scratch plan, generate fresh unlocked content and do not preserve old unlocked sections. For a scoped revision, preserve unrelated content and locked blocks.
Every section and block needs a stable unique id. Keep prose clear and specific, not promotional filler.`
	response, err := provider.Chat(ctx, system, []ai.Message{{Role: "user", Content: businessContext + "\n\n" + projectionJSON + "\n\nUSER REQUEST\n" + prompt + "\n\n" + current}}, nil)
	if err != nil {
		return nil, nil, err
	}
	raw := extractJSONObject(response.Content)
	raw = normalizePlanShape(raw)
	var document Document
	if err := json.Unmarshal([]byte(raw), &document); err != nil {
		// Long-form plans occasionally contain a valid-looking object with one
		// field in the wrong JSON shape (for example theme as a string or
		// assumptions as a keyed object). Give the provider one constrained
		// repair pass before failing the job.
		repairResponse, repairErr := provider.Chat(ctx,
			"Repair the following business-plan JSON. Return only one valid JSON object matching schemaVersion 2.0. Convert assumptions to an array of objects and theme to an object when needed. Preserve all content; do not add commentary or markdown.",
			[]ai.Message{{Role: "user", Content: raw}}, nil)
		if repairErr != nil || repairResponse == nil {
			return nil, response, fmt.Errorf("AI returned invalid business plan JSON: %w", err)
		}
		repaired := normalizePlanShape(extractJSONObject(repairResponse.Content))
		if repairDecodeErr := json.Unmarshal([]byte(repaired), &document); repairDecodeErr != nil {
			return nil, response, fmt.Errorf("AI returned invalid business plan JSON: %w", err)
		}
		response = repairResponse
	}
	if projection != nil {
		document.Projection = projection
	}
	if err := document.Validate(); err != nil {
		return nil, response, err
	}
	if strings.TrimSpace(previousDocument) != "" && previousDocument != "{}" {
		if previous, parseErr := Parse(previousDocument); parseErr == nil && planContentSignature(previous) == planContentSignature(&document) {
			retryPrompt := businessContext + "\n\n" + projectionJSON + "\n\nUSER REQUEST\n" + prompt + "\n\nCURRENT PLAN JSON\n" + previousDocument + "\n\nYour previous response repeated the existing plan. Apply the user request now and change the relevant content. Preserve unrelated sections only when the request is scoped."
			retryResponse, retryErr := provider.Chat(ctx, system+"\n\nRETRY REQUIREMENT: The next answer must contain substantive requested changes and must not copy the current plan unchanged.", []ai.Message{{Role: "user", Content: retryPrompt}}, nil)
			if retryErr != nil || retryResponse == nil {
				return nil, response, errors.New("AI repeated the existing business plan and the retry failed")
			}
			var retryDocument Document
			if err := json.Unmarshal([]byte(normalizePlanShape(extractJSONObject(retryResponse.Content))), &retryDocument); err != nil {
				return nil, retryResponse, fmt.Errorf("AI repeated the existing business plan and returned invalid content on retry: %w", err)
			}
			if projection != nil {
				retryDocument.Projection = projection
			}
			if err := retryDocument.Validate(); err != nil {
				return nil, retryResponse, err
			}
			if planContentSignature(previous) == planContentSignature(&retryDocument) {
				return nil, retryResponse, errors.New("AI could not apply the request; no unchanged business plan was saved")
			}
			document, response = retryDocument, retryResponse
		}
	}
	return &document, response, nil
}

func freshDocumentRequested(prompt string) bool {
	value := strings.ToLower(prompt)
	for _, phrase := range []string{"from scratch", "start over", "regenerate", "brand new", "completely new", "new business plan", "new plan", "create a complete", "write a complete", "full rewrite", "replace the entire"} {
		if strings.Contains(value, phrase) {
			return true
		}
	}
	return false
}

func planContentSignature(document *Document) string {
	var parts []string
	parts = append(parts, document.Title, document.ExecutiveSummary)
	for _, section := range document.Sections {
		parts = append(parts, section.Title)
		for _, block := range section.Blocks {
			parts = append(parts, block.Type, block.Text, strings.Join(block.Items, "\n"), strings.Join(block.Headers, "\n"), block.URL, block.AltText)
			for _, row := range block.Rows {
				parts = append(parts, strings.Join(row, "\n"))
			}
			for _, value := range []map[string]any{block.Chart, block.Data} {
				if encoded, err := json.Marshal(value); err == nil {
					parts = append(parts, string(encoded))
				}
			}
		}
	}
	for _, assumption := range document.Assumptions {
		parts = append(parts, assumption.Label, fmt.Sprint(assumption.Value), fmt.Sprint(assumption.ValueEntered), assumption.Unit, assumption.Description, assumption.Source)
	}
	return strings.Join(parts, "\x00")
}

func normalizePlanShape(raw string) string {
	raw = normalizeExecutiveSummary(raw)
	raw = normalizeAssumptions(raw)
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal([]byte(raw), &envelope); err != nil {
		return raw
	}
	if theme, ok := envelope["theme"]; ok {
		trimmed := strings.TrimSpace(string(theme))
		if trimmed == "" || trimmed[0] != '{' {
			// Preserve a textual theme as a harmless style hint instead of
			// rejecting the entire otherwise-valid plan.
			var label string
			if json.Unmarshal(theme, &label) == nil && strings.TrimSpace(label) != "" {
				encoded, _ := json.Marshal(map[string]any{"style": label})
				envelope["theme"] = encoded
			} else {
				envelope["theme"] = json.RawMessage(`{}`)
			}
			result, err := json.Marshal(envelope)
			if err == nil {
				return string(result)
			}
		}
	}
	return raw
}

// Models sometimes return executiveSummary as a structured object containing
// summary paragraphs, highlights, or a text/content field. The document
// schema intentionally stores it as plain text, so coerce that shape without
// discarding the generated content.
func normalizeExecutiveSummary(raw string) string {
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal([]byte(raw), &envelope); err != nil {
		return raw
	}
	value, ok := envelope["executiveSummary"]
	if !ok || len(value) == 0 || value[0] == '"' {
		return raw
	}
	var object map[string]json.RawMessage
	if json.Unmarshal(value, &object) == nil {
		for _, key := range []string{"text", "content", "summary", "description"} {
			if candidate, exists := object[key]; exists {
				var text string
				if json.Unmarshal(candidate, &text) == nil && strings.TrimSpace(text) != "" {
					envelope["executiveSummary"], _ = json.Marshal(text)
					encoded, err := json.Marshal(envelope)
					if err == nil {
						return string(encoded)
					}
				}
			}
		}
		if blocks, exists := object["blocks"]; exists {
			var list []struct {
				Text  string   `json:"text"`
				Items []string `json:"items"`
			}
			if json.Unmarshal(blocks, &list) == nil {
				var parts []string
				for _, block := range list {
					if strings.TrimSpace(block.Text) != "" {
						parts = append(parts, block.Text)
					}
					parts = append(parts, block.Items...)
				}
				if len(parts) > 0 {
					envelope["executiveSummary"], _ = json.Marshal(strings.Join(parts, "\n\n"))
					encoded, err := json.Marshal(envelope)
					if err == nil {
						return string(encoded)
					}
				}
			}
		}
	}
	// Last resort: keep all structured content as valid readable JSON text.
	var structured any
	if json.Unmarshal(value, &structured) == nil {
		text, err := json.Marshal(structured)
		if err == nil {
			envelope["executiveSummary"], _ = json.Marshal(string(text))
			encoded, marshalErr := json.Marshal(envelope)
			if marshalErr == nil {
				return string(encoded)
			}
		}
	}
	return raw
}

// Models occasionally return assumptions as a keyed object instead of the
// documented array. Normalize that shape before decoding so one formatting
// variation cannot fail an otherwise valid business plan.
func normalizeAssumptions(raw string) string {
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal([]byte(raw), &envelope); err != nil {
		return raw
	}
	assumptions, ok := envelope["assumptions"]
	if !ok || len(assumptions) == 0 || assumptions[0] != '{' {
		return raw
	}
	var keyed map[string]json.RawMessage
	if err := json.Unmarshal(assumptions, &keyed); err != nil {
		return raw
	}
	converted := make([]Assumption, 0, len(keyed))
	for label, value := range keyed {
		item := Assumption{ID: "assumption-" + strings.ToLower(strings.ReplaceAll(label, " ", "-")), Label: label, Unit: "unspecified", Source: "Verification required"}
		var number float64
		if json.Unmarshal(value, &number) == nil {
			item.Value = number
		} else {
			var textValue string
			if json.Unmarshal(value, &textValue) == nil {
				item.Description = textValue
			} else {
				item.Description = string(value)
			}
		}
		converted = append(converted, item)
	}
	encoded, err := json.Marshal(converted)
	if err != nil {
		return raw
	}
	envelope["assumptions"] = encoded
	result, err := json.Marshal(envelope)
	if err != nil {
		return raw
	}
	return string(result)
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
