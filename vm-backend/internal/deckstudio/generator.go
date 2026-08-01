package deckstudio

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/venturemate/vmbackend/internal/ai"
	"github.com/venturemate/vmbackend/internal/businesses"
)

func Generate(ctx context.Context, provider ai.Provider, business *businesses.Business, prompt, currentDocument string) (*Document, *ai.ProviderResponse, error) {
	if provider == nil {
		return nil, nil, errors.New("AI provider is unavailable")
	}
	if strings.TrimSpace(prompt) == "" {
		return nil, nil, errors.New("deck prompt is required")
	}
	businessContext := "No linked business. Use placeholders for facts the user must verify."
	if business != nil {
		businessContext = fmt.Sprintf("VERIFIED BUSINESS DATA\nName: %s\nTagline: %s\nDescription: %s\nIndustry: %s\nStage: %s\nLocation: %s\nTeam JSON: %s\nMetrics JSON: %s\nFinancials JSON: %s\nBrand JSON: %s",
			business.Name, business.Tagline, business.Description, business.Industry, business.Stage, business.Location, business.Team, business.Metrics, business.Financials, business.BrandKit)
	}
	current := "No existing deck."
	if strings.TrimSpace(currentDocument) != "" && currentDocument != "{}" {
		current = "CURRENT DECK JSON. Preserve unrelated manual edits and locked slides/elements:\n" + currentDocument
	}
	system := `You are VentureMate Pitch Deck Studio. Return one JSON object only, matching schemaVersion 2.0.
Canvas coordinates are inches on a 13.333 x 7.5 PowerPoint wide slide. Every element needs stable id,type,x,y,w,h,zIndex,visible,locked and style.
Allowed elements: text,image,shape,icon,chart,table,line,group. Keep all content concise and presentation-ready.
Use a strong investor story: cover, problem, solution, product, market, business model, go-to-market, traction, competition, team, projections, ask, closing, adapted to stage.
Never invent customers, traction, revenue, team members, awards, market share or historic financials. For missing facts insert clearly editable text such as "Add verified metric". Future financials must be labelled projections and assumptions.
Images may only use durable supplied URLs or an empty asset placeholder; never create temporary URLs. Preserve locked and unrelated content from the current deck.
Required top-level fields: schemaVersion,title,template,theme,slides,metadata.`
	response, err := provider.Chat(ctx, system, []ai.Message{{Role: "user", Content: businessContext + "\n\nUSER REQUEST\n" + prompt + "\n\n" + current}}, nil)
	if err != nil {
		return nil, nil, err
	}
	raw := extractJSONObject(response.Content)
	var document Document
	decoder := json.NewDecoder(strings.NewReader(raw))
	if err := decoder.Decode(&document); err != nil {
		return nil, response, fmt.Errorf("AI returned invalid deck JSON: %w", err)
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
	start := strings.IndexByte(value, '{')
	end := strings.LastIndexByte(value, '}')
	if start >= 0 && end > start {
		return value[start : end+1]
	}
	return value
}
