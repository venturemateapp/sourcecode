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
	previousDocument := currentDocument
	if freshDocumentRequested(prompt) {
		currentDocument = ""
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
- Images may ONLY use durable supplied URLs or be omitted; never fabricate temporary image URLs. Always apply the user's request and never return the current deck unchanged. Explicit new, complete, or from-scratch requests must create fresh unlocked slides; scoped revisions should preserve unrelated content and locked slides/elements.

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
		// A single syntax-repair pass prevents transient malformed JSON from
		// failing an otherwise valid long-form deck generation.
		repairResponse, repairErr := provider.Chat(ctx,
			"Repair the following pitch-deck JSON. Return only one valid JSON object matching the requested deck schema. Do not add commentary, markdown, or change the content beyond fixing JSON syntax.",
			[]ai.Message{{Role: "user", Content: raw}}, nil)
		if repairErr == nil && repairResponse != nil {
			repaired := extractJSONObject(repairResponse.Content)
			if repairDecodeErr := json.NewDecoder(strings.NewReader(repaired)).Decode(&document); repairDecodeErr == nil {
				response = repairResponse
			} else {
				return nil, response, fmt.Errorf("AI returned invalid deck JSON: %w", err)
			}
		} else {
			return nil, response, fmt.Errorf("AI returned invalid deck JSON: %w", err)
		}
	}
	document.Theme = mergeTheme(document.Theme, DefaultTheme(document.Template))
	if err := document.Validate(); err != nil {
		return nil, response, err
	}
	if strings.TrimSpace(previousDocument) != "" && previousDocument != "{}" {
		var previous Document
		if json.Unmarshal([]byte(previousDocument), &previous) == nil && deckContentSignature(&previous) == deckContentSignature(&document) {
			retryPrompt := businessContext + "\n\nUSER REQUEST\n" + prompt + "\n\nCURRENT DECK JSON\n" + previousDocument + "\n\nYour previous response repeated the existing deck. Apply the user request now and change the relevant slides. Preserve unrelated slides only when the request is scoped."
			retryResponse, retryErr := provider.Chat(ctx, system+"\n\nRETRY REQUIREMENT: The next answer must contain substantive requested changes and must not copy the current deck unchanged.", []ai.Message{{Role: "user", Content: retryPrompt}}, nil)
			if retryErr != nil || retryResponse == nil {
				return nil, response, errors.New("AI repeated the existing pitch deck and the retry failed")
			}
			var retryDocument Document
			if err := json.NewDecoder(strings.NewReader(extractJSONObject(retryResponse.Content))).Decode(&retryDocument); err != nil {
				return nil, retryResponse, fmt.Errorf("AI repeated the existing pitch deck and returned invalid content on retry: %w", err)
			}
			retryDocument.Theme = mergeTheme(retryDocument.Theme, DefaultTheme(retryDocument.Template))
			if err := retryDocument.Validate(); err != nil {
				return nil, retryResponse, err
			}
			if deckContentSignature(&previous) == deckContentSignature(&retryDocument) {
				return nil, retryResponse, errors.New("AI could not apply the request; no unchanged pitch deck was saved")
			}
			document, response = retryDocument, retryResponse
		}
	}
	return &document, response, nil
}

func freshDocumentRequested(prompt string) bool {
	value := strings.ToLower(prompt)
	for _, phrase := range []string{"from scratch", "start over", "regenerate", "brand new", "completely new", "new pitch deck", "new deck", "create a complete", "full rewrite", "replace the entire", "investor pitch deck"} {
		if strings.Contains(value, phrase) {
			return true
		}
	}
	return false
}

func clearElementIDs(element *Element) {
	element.ID = ""
	for index := range element.Children {
		clearElementIDs(&element.Children[index])
	}
}

func deckContentSignature(document *Document) string {
	type slideContent struct {
		Type       string
		Title      string
		Background Background
		Notes      string
		Elements   []string
	}
	slides := make([]slideContent, 0, len(document.Slides))
	for _, slide := range document.Slides {
		content := slideContent{Type: slide.Type, Title: slide.Title, Background: slide.Background, Notes: slide.Notes}
		for _, element := range slide.Elements {
			copy := element
			clearElementIDs(&copy)
			encoded, _ := json.Marshal(copy)
			content.Elements = append(content.Elements, string(encoded))
		}
		slides = append(slides, content)
	}
	encoded, _ := json.Marshal(struct {
		Title    string
		Template string
		Theme    Theme
		Slides   []slideContent
	}{document.Title, document.Template, document.Theme, slides})
	return string(encoded)
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
