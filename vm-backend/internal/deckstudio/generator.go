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
	system := `You are VentureMate Pitch Deck Studio — a senior investor-deck designer. Return ONE JSON object only (no markdown, no prose), matching schemaVersion "2.0".

CANVAS & COORDINATES
- The slide is 13.333 x 7.5 inches (16:9). All x,y,w,h are inches.
- Keep a safe margin: content lives within x∈[0.7, 12.63], y∈[0.5, 7.0]. Never let x+w exceed 13.33 or y+h exceed 7.5.
- Every element needs stable unique id, type, x, y, w, h, zIndex, visible:true, locked:false, and a style object.
- Allowed element types: text, image, shape, icon, chart, table, line, group.

VISUAL DESIGN SYSTEM (make every slide look professionally designed, not a text dump)
- Build a cohesive theme and REUSE it on every slide: primary, secondary, accent, dark background, light text, muted text. Set document.theme accordingly.
- Layer slides: start with a full-bleed background shape (zIndex 0) in the theme background, then an accent shape/bar (a thin colored rectangle or side band using theme.primary) for visual rhythm, then text on top.
- Typographic hierarchy: slide kicker/eyebrow (~14pt, muted, uppercase), headline (36-52pt, bold 800), body (16-20pt), captions (12-13pt). Left-align body copy; large headlines can be left or centered.
- Number-forward slides (market, traction, business model, financials): show 2-4 big STAT blocks — a large number (40-64pt, theme.primary) with a small label below. Use shape cards (rounded rectangles, style.borderRadius ~0.12, subtle fill) behind stat groups.
- Use generous whitespace. Do not cram. 5-9 elements per slide is ideal.
- style keys you may use: fontSize, fontWeight (400-800), color, textAlign ("left"|"center"|"right"), background (hex for shapes), opacity (0-1), borderRadius (inches), borderColor, borderWidth.

DECK STRUCTURE (adapt count to stage; 11-13 slides)
cover, problem, solution, product/how-it-works, market opportunity (TAM/SAM/SOM), business model, go-to-market, traction & roadmap, competition/why-we-win, team, financial outlook, the ask, closing.
Each slide: a clear headline, a tight narrative, and supporting bullets or stat blocks. Confident, specific, investor-grade language.

TRUTH & SAFETY
- Never invent customers, traction, revenue, team members, awards, market share, or historic financials. For unknown facts insert clearly editable text like "Add verified metric". Label all forward figures as projections/assumptions.
- Images may ONLY use durable supplied URLs or be omitted; never fabricate temporary image URLs. Preserve locked slides/elements and unrelated manual edits from the current deck.

OUTPUT
Return the complete deck with required top-level fields: schemaVersion, title, template, theme, slides, metadata. Produce EVERY slide fully — do not stop early or leave placeholders empty.`
	ctx = ai.WithResponseTokenLimit(ctx, ai.DeckResponseTokens)
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
	document.Theme = mergeTheme(document.Theme, DefaultTheme(document.Template))
	if err := document.Validate(); err != nil {
		return nil, response, err
	}
	return &document, response, nil
}

// mergeTheme fills any theme field the model left empty with a sensible default,
// so slides always render with a cohesive, complete palette and fonts.
func mergeTheme(theme, fallback Theme) Theme {
	pick := func(value, def string) string {
		if strings.TrimSpace(value) == "" {
			return def
		}
		return value
	}
	return Theme{
		Primary:     pick(theme.Primary, fallback.Primary),
		Secondary:   pick(theme.Secondary, fallback.Secondary),
		Background:  pick(theme.Background, fallback.Background),
		Surface:     pick(theme.Surface, fallback.Surface),
		Text:        pick(theme.Text, fallback.Text),
		MutedText:   pick(theme.MutedText, fallback.MutedText),
		HeadingFont: pick(theme.HeadingFont, fallback.HeadingFont),
		BodyFont:    pick(theme.BodyFont, fallback.BodyFont),
	}
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
