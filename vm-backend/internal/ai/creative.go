package ai

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"strings"
	"time"

	"github.com/venturemate/vmbackend/internal/businesses"
)

func creativeDomain(domain string) string {
	switch normalizeDomain(domain) {
	case "branding", "brand", "brand-kit", "branding-kit", "logo":
		return "branding"
	case "business-plan", "businessplan", "plan":
		return "business-plan"
	case "pitch-deck", "pitchdeck", "deck":
		return "pitch-deck"
	case "website", "website-builder", "site":
		return "website"
	default:
		return normalizeDomain(domain)
	}
}

func isCreativeDomain(domain string) bool {
	switch creativeDomain(domain) {
	case "branding", "business-plan", "pitch-deck", "website":
		return true
	default:
		return false
	}
}

func creativeBusinessContextJSON(biz *businesses.Business, domain string) []byte {
	if biz == nil {
		return []byte("{}")
	}
	context := map[string]interface{}{
		"id":          biz.ID,
		"name":        biz.Name,
		"tagline":     biz.Tagline,
		"description": biz.Description,
		"industry":    biz.Industry,
		"stage":       biz.Stage,
		"foundedDate": biz.FoundedDate,
		"location":    biz.Location,
		"website":     biz.Website,
		"status":      biz.Status,
		"createdAt":   biz.CreatedAt,
		"updatedAt":   biz.UpdatedAt,
	}
	switch creativeDomain(domain) {
	case "branding":
		context["currentBrandKit"] = creativeContextValue(biz.BrandKit, 1200)
	case "business-plan":
		context["brandKit"] = creativeContextValue(biz.BrandKit, 650)
		context["existingBusinessPlan"] = creativeContextValue(biz.BusinessPlan, 1100)
		context["milestones"] = creativeContextValue(biz.Milestones, 650)
		context["team"] = creativeContextValue(biz.Team, 650)
		context["financials"] = creativeContextValue(biz.Financials, 750)
		context["metrics"] = creativeContextValue(biz.Metrics, 550)
	case "pitch-deck":
		context["brandKit"] = creativeContextValue(biz.BrandKit, 550)
		context["businessPlan"] = creativeContextValue(biz.BusinessPlan, 1300)
		context["existingPitchDeck"] = creativeContextValue(biz.PitchDeck, 800)
		context["team"] = creativeContextValue(biz.Team, 550)
		context["financials"] = creativeContextValue(biz.Financials, 650)
		context["metrics"] = creativeContextValue(biz.Metrics, 500)
	case "website":
		context["brandKit"] = creativeContextValue(biz.BrandKit, 1200)
		context["existingWebsiteConfig"] = creativeContextValue(biz.WebsiteConfig, 850)
		context["team"] = creativeContextValue(biz.Team, 500)
		context["metrics"] = creativeContextValue(biz.Metrics, 400)
	}
	encoded, err := json.Marshal(context)
	if err != nil {
		return []byte("{}")
	}
	return encoded
}

func creativeContextValue(raw string, maxChars int) interface{} {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return map[string]interface{}{}
	}
	if len(raw) > maxChars {
		return map[string]interface{}{
			"note":    "Existing data was shortened to fit the local model context window.",
			"excerpt": raw[:maxChars],
		}
	}
	var value interface{}
	if json.Unmarshal([]byte(raw), &value) == nil {
		return value
	}
	return raw
}

func promptContextExcerpt(value string, maxChars int) string {
	value = strings.TrimSpace(value)
	if len(value) <= maxChars {
		return value
	}
	return value[:maxChars] + "\n[context shortened for the local model]"
}

func defaultCreativeChange(domain string, biz *businesses.Business) ProposedChange {
	field := ""
	current := "{}"
	summary := "AI-generated creative proposal"
	switch creativeDomain(domain) {
	case "branding":
		field, current, summary = "brandKit", biz.BrandKit, "Generate or revise the complete brand identity and logo"
	case "business-plan":
		field, current, summary = "businessPlan", biz.BusinessPlan, "Generate or revise the complete business plan"
	case "pitch-deck":
		field, current, summary = "pitchDeck", biz.PitchDeck, "Generate or revise the complete pitch deck"
	case "website":
		field, current, summary = "websiteDraft", biz.WebsiteConfig, "Generate or revise the private website draft"
	}
	return ProposedChange{ID: "1", Type: "update", Field: field, Summary: summary, CurrentValue: current, NewValue: "{}"}
}

func creativeProposalGuidance(domain string) string {
	switch creativeDomain(domain) {
	case "branding":
		return `
This is an AI-first branding workflow. Return exactly one change with field "brandKit" whenever the user asks to generate, revise, replace, or refine a logo or brand identity.
The newValue must be a COMPLETE JSON object with:
{
  "logo":"optional data URL; the server will generate one when omitted",
  "logoWhite":"optional",
  "logoIcon":"optional",
  "primaryColor":"#RRGGBB",
  "secondaryColor":"#RRGGBB",
  "accentColor":"#RRGGBB",
  "darkColor":"#RRGGBB",
  "fontHeading":"font name",
  "fontBody":"font name",
  "patterns":[],
  "socialBanners":[],
  "logoConcept":{"mark":"1-4 letters or a simple symbol","shape":"rounded|circle|square","style":"modern|minimal|bold|friendly|premium","rationale":"why it fits the business"}
}
Preserve any existing brand values the user did not ask to change. Never ask the user to upload a logo.`
	case "business-plan":
		return `
This is an AI-first business-plan workflow. Return exactly one change with field "businessPlan" for generation or revision.
The newValue must be a COMPLETE JSON object with:
{
  "id":"plan id",
  "title":"...",
  "executiveSummary":"...",
  "sections":[{"id":"...","title":"...","content":"detailed prose","aiGenerated":true,"order":0}],
  "lastModified":"ISO timestamp",
  "version":"1.0",
  "exportFormats":["pdf","docx","md"]
}
Use the business profile, metrics, financials, milestones, team, and prior plan. Do not invent precise financial or legal facts; label assumptions clearly.`
	case "pitch-deck":
		return `
This is an AI-first pitch-deck workflow. Return exactly one change with field "pitchDeck" for generation or revision.
The newValue must be a COMPLETE JSON object with:
{
  "id":"deck id",
  "title":"...",
  "template":"ai-modern",
  "slides":[{"id":"...","type":"title|problem|solution|market|product|business-model|traction|team|financials|competition|roadmap|ask|closing|custom","title":"...","content":"...","bullets":["..."],"order":0,"layout":"center|split|grid"}],
  "lastModified":"ISO timestamp",
  "exportFormats":["pdf","pptx"],
  "views":0
}
Build the story from the approved business profile and business plan. Do not invent traction, revenue, valuation, customer counts, or funding figures.`
	case "website":
		return `
This is an AI-only website-builder workflow. Return exactly one change with field "websiteDraft" for website generation or revision.
The newValue must be a COMPLETE JSON object with:
{
  "templateId":"optional existing template UUID; otherwise empty",
  "subdomain":"optional preferred venturemate.net subdomain",
  "pages":[{"id":"...","slug":"/","title":"Home","metaDescription":"...","isHome":true,"isPublished":false,"sections":[{"id":"...","type":"hero|features|carousel|testimonials|pricing|team|contact|cta|about|stats|faq|image|video|custom","props":{},"order":0,"visible":true}]}],
  "globalStyles":{"primaryColor":"#RRGGBB","secondaryColor":"#RRGGBB","accentColor":"#RRGGBB","darkColor":"#RRGGBB","fontHeading":"Inter","fontBody":"Inter","radius":"16px"},
  "navigation":{"items":[{"label":"Home","href":"/"}],"style":"horizontal","position":"top"},
  "footer":{"showLogo":true,"showSocial":true,"customText":"..."}
}
Automatically use the approved business name, tagline, description, location, and brand kit. Put section data in "props". For carousel sections use {"title":"...","subtitle":"...","autoplay":true,"interval":5000,"items":[{"title":"...","description":"...","image":"optional safe URL","cta":"optional","href":"optional"}]}. Create a complete responsive site, not a fragment. The proposal only updates the PRIVATE DRAFT; publishing requires a later explicit confirmation.`
	default:
		return ""
	}
}

func normalizeCreativeProposal(proposal *Proposal, biz *businesses.Business, domain string) error {
	if proposal == nil || biz == nil {
		return nil
	}
	kind := creativeDomain(domain)
	if len(proposal.Changes) > 1 {
		proposal.Changes = proposal.Changes[:1]
	}
	for i := range proposal.Changes {
		change := &proposal.Changes[i]
		change.ID = "1"
		change.Type = "update"
		if strings.TrimSpace(change.Summary) == "" {
			change.Summary = "AI-generated " + strings.ReplaceAll(kind, "-", " ") + " proposal"
		}
		switch kind {
		case "branding":
			change.Field = "brandKit"
			normalized, err := normalizeBrandKitProposal(change.NewValue, biz)
			if err != nil {
				return err
			}
			change.NewValue = normalized
		case "business-plan":
			change.Field = "businessPlan"
			normalized, err := normalizeBusinessPlanProposal(change.NewValue, biz)
			if err != nil {
				return err
			}
			change.NewValue = normalized
		case "pitch-deck":
			change.Field = "pitchDeck"
			normalized, err := normalizePitchDeckProposal(change.NewValue, biz)
			if err != nil {
				return err
			}
			change.NewValue = normalized
		case "website":
			change.Field = "websiteDraft"
			normalized, err := normalizeWebsiteDraftProposal(change.NewValue, biz)
			if err != nil {
				return err
			}
			change.NewValue = normalized
		}
	}
	return nil
}

func decodeJSONMap(raw string) (map[string]interface{}, error) {
	out := map[string]interface{}{}
	if strings.TrimSpace(raw) == "" {
		return out, nil
	}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, err
	}
	return out, nil
}

func mergeJSONMap(raw string, fallback string) map[string]interface{} {
	out := map[string]interface{}{}
	if json.Valid([]byte(fallback)) {
		_ = json.Unmarshal([]byte(fallback), &out)
	}
	var incoming map[string]interface{}
	if json.Unmarshal([]byte(raw), &incoming) == nil {
		for key, value := range incoming {
			out[key] = value
		}
	}
	return out
}

func stringValue(values map[string]interface{}, key, fallback string) string {
	if value, ok := values[key].(string); ok && strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}

func normalizeBrandKitProposal(raw string, biz *businesses.Business) (string, error) {
	incoming := map[string]interface{}{}
	_ = json.Unmarshal([]byte(raw), &incoming)
	brand := mergeJSONMap(raw, biz.BrandKit)
	brand["primaryColor"] = validHexOr(stringValue(brand, "primaryColor", "#10b981"), "#10b981")
	brand["secondaryColor"] = validHexOr(stringValue(brand, "secondaryColor", "#059669"), "#059669")
	brand["accentColor"] = validHexOr(stringValue(brand, "accentColor", "#34d399"), "#34d399")
	brand["darkColor"] = validHexOr(stringValue(brand, "darkColor", "#052e24"), "#052e24")
	brand["fontHeading"] = stringValue(brand, "fontHeading", "Inter")
	brand["fontBody"] = stringValue(brand, "fontBody", "Inter")
	if _, ok := brand["patterns"]; !ok {
		brand["patterns"] = []interface{}{}
	}
	if _, ok := brand["socialBanners"]; !ok {
		brand["socialBanners"] = []interface{}{}
	}

	concept, _ := brand["logoConcept"].(map[string]interface{})
	if concept == nil {
		concept = map[string]interface{}{}
	}
	mark := stringValue(concept, "mark", initials(biz.Name))
	if len([]rune(mark)) > 4 {
		mark = string([]rune(mark)[:4])
	}
	shape := stringValue(concept, "shape", "rounded")
	switch shape {
	case "rounded", "circle", "square":
	default:
		shape = "rounded"
	}
	style := stringValue(concept, "style", "modern")
	switch style {
	case "modern", "minimal", "bold", "friendly", "premium":
	default:
		style = "modern"
	}
	concept["mark"], concept["shape"], concept["style"] = mark, shape, style
	if _, ok := concept["rationale"]; !ok {
		concept["rationale"] = "Generated from the business name, industry, and positioning."
	}
	brand["logoConcept"] = concept

	// Only accept a logo explicitly returned in this proposal. Otherwise render a
	// fresh SVG from the proposed concept so "change my logo" cannot silently
	// retain the previously approved image through the merge fallback.
	logo, _ := incoming["logo"].(string)
	if !strings.HasPrefix(logo, "data:image/") && !strings.HasPrefix(logo, "https://") {
		logo = generatedLogoDataURL(mark, shape, style, brand["primaryColor"].(string), brand["secondaryColor"].(string), false)
	}
	brand["logo"] = logo
	brand["logoIcon"] = generatedLogoDataURL(mark, shape, style, brand["primaryColor"].(string), brand["secondaryColor"].(string), false)
	brand["logoWhite"] = generatedLogoDataURL(mark, shape, style, "#ffffff", "#d1fae5", true)
	encoded, err := json.Marshal(brand)
	return string(encoded), err
}

func generatedLogoDataURL(mark, shape, style, primary, secondary string, transparent bool) string {
	rx := "24"
	if shape == "square" {
		rx = "8"
	} else if shape == "circle" {
		rx = "64"
	}
	bg := fmt.Sprintf(`<rect x="4" y="4" width="120" height="120" rx="%s" fill="url(#g)"/>`, rx)
	textColor := "#ffffff"
	if transparent {
		bg = ""
		textColor = primary
	}
	weight := "750"
	letterSpacing := "0"
	if style == "premium" {
		weight, letterSpacing = "600", "2"
	} else if style == "friendly" {
		weight = "700"
	}
	svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="logo"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient></defs>%s<circle cx="96" cy="32" r="10" fill="%s" opacity=".7"/><text x="64" y="77" text-anchor="middle" fill="%s" font-family="Inter,Arial,sans-serif" font-size="40" font-weight="%s" letter-spacing="%s">%s</text></svg>`, primary, secondary, bg, secondary, textColor, weight, letterSpacing, html.EscapeString(mark))
	return "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(svg))
}

func normalizeBusinessPlanProposal(raw string, biz *businesses.Business) (string, error) {
	plan := mergeJSONMap(raw, biz.BusinessPlan)
	now := time.Now().UTC().Format(time.RFC3339)
	plan["id"] = stringValue(plan, "id", "plan-"+biz.ID)
	plan["title"] = stringValue(plan, "title", biz.Name+" Business Plan")
	plan["executiveSummary"] = stringValue(plan, "executiveSummary", biz.Description)
	plan["lastModified"] = now
	plan["version"] = stringValue(plan, "version", "1.0")
	plan["exportFormats"] = []string{"pdf", "docx", "md"}
	sections, _ := plan["sections"].([]interface{})
	for i, item := range sections {
		section, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		section["id"] = stringValue(section, "id", fmt.Sprintf("section-%d", i+1))
		section["title"] = stringValue(section, "title", fmt.Sprintf("Section %d", i+1))
		section["content"] = stringValue(section, "content", "")
		section["aiGenerated"] = true
		section["order"] = i
	}
	if len(sections) == 0 {
		sections = []interface{}{
			map[string]interface{}{"id": "section-1", "title": "Executive Summary", "content": stringValue(plan, "executiveSummary", biz.Description), "aiGenerated": true, "order": 0},
			map[string]interface{}{"id": "section-2", "title": "Business Overview", "content": biz.Description, "aiGenerated": true, "order": 1},
			map[string]interface{}{"id": "section-3", "title": "Market and Growth Strategy", "content": "AI-generated strategy based on the approved business profile. Validate market assumptions before external use.", "aiGenerated": true, "order": 2},
		}
	}
	plan["sections"] = sections
	encoded, err := json.Marshal(plan)
	return string(encoded), err
}

func normalizePitchDeckProposal(raw string, biz *businesses.Business) (string, error) {
	deck := mergeJSONMap(raw, biz.PitchDeck)
	deck["id"] = stringValue(deck, "id", "deck-"+biz.ID)
	deck["title"] = stringValue(deck, "title", biz.Name+" Pitch Deck")
	deck["template"] = stringValue(deck, "template", "ai-modern")
	deck["lastModified"] = time.Now().UTC().Format(time.RFC3339)
	deck["exportFormats"] = []string{"pdf", "pptx"}
	if _, ok := deck["views"]; !ok {
		deck["views"] = 0
	}
	slides, _ := deck["slides"].([]interface{})
	for i, item := range slides {
		slide, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		slide["id"] = stringValue(slide, "id", fmt.Sprintf("slide-%d", i+1))
		slide["type"] = stringValue(slide, "type", "custom")
		slide["title"] = stringValue(slide, "title", fmt.Sprintf("Slide %d", i+1))
		slide["content"] = stringValue(slide, "content", "")
		slide["order"] = i
		slide["layout"] = stringValue(slide, "layout", "center")
		if _, ok := slide["bullets"]; !ok {
			slide["bullets"] = []interface{}{}
		}
	}
	if len(slides) == 0 {
		slides = []interface{}{
			map[string]interface{}{"id": "slide-1", "type": "title", "title": biz.Name, "content": biz.Tagline, "bullets": []interface{}{}, "order": 0, "layout": "center"},
			map[string]interface{}{"id": "slide-2", "type": "problem", "title": "The Problem", "content": "Define the customer problem using verified business information.", "bullets": []interface{}{}, "order": 1, "layout": "split"},
			map[string]interface{}{"id": "slide-3", "type": "solution", "title": "Our Solution", "content": biz.Description, "bullets": []interface{}{}, "order": 2, "layout": "split"},
		}
	}
	deck["slides"] = slides
	encoded, err := json.Marshal(deck)
	return string(encoded), err
}

func normalizeWebsiteDraftProposal(raw string, biz *businesses.Business) (string, error) {
	draft := mergeJSONMap(raw, biz.WebsiteConfig)
	brand := mergeJSONMap("{}", biz.BrandKit)
	styles, _ := draft["globalStyles"].(map[string]interface{})
	if styles == nil {
		styles = map[string]interface{}{}
	}
	styles["primaryColor"] = validHexOr(stringValue(styles, "primaryColor", stringValue(brand, "primaryColor", "#10b981")), "#10b981")
	styles["secondaryColor"] = validHexOr(stringValue(styles, "secondaryColor", stringValue(brand, "secondaryColor", "#059669")), "#059669")
	styles["accentColor"] = validHexOr(stringValue(styles, "accentColor", stringValue(brand, "accentColor", "#34d399")), "#34d399")
	styles["darkColor"] = validHexOr(stringValue(styles, "darkColor", stringValue(brand, "darkColor", "#052e24")), "#052e24")
	styles["fontHeading"] = stringValue(styles, "fontHeading", stringValue(brand, "fontHeading", "Inter"))
	styles["fontBody"] = stringValue(styles, "fontBody", stringValue(brand, "fontBody", "Inter"))
	styles["radius"] = stringValue(styles, "radius", "16px")
	draft["globalStyles"] = styles
	draft["templateId"] = stringValue(draft, "templateId", "")

	pages, _ := draft["pages"].([]interface{})
	for pi, item := range pages {
		page, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		page["id"] = stringValue(page, "id", fmt.Sprintf("page-%d", pi+1))
		slug := stringValue(page, "slug", "/")
		if pi == 0 || page["isHome"] == true {
			slug, page["isHome"] = "/", true
		}
		page["slug"] = slug
		page["title"] = stringValue(page, "title", "Page")
		page["metaDescription"] = stringValue(page, "metaDescription", biz.Description)
		page["isPublished"] = false
		sections, _ := page["sections"].([]interface{})
		for si, sectionItem := range sections {
			section, ok := sectionItem.(map[string]interface{})
			if !ok {
				continue
			}
			section["id"] = stringValue(section, "id", fmt.Sprintf("section-%d-%d", pi+1, si+1))
			section["type"] = stringValue(section, "type", "custom")
			section["order"] = si
			if _, ok := section["visible"]; !ok {
				section["visible"] = true
			}
			props, propsOK := section["props"].(map[string]interface{})
			content, contentOK := section["content"].(map[string]interface{})
			switch {
			case propsOK:
				section["content"] = props
			case contentOK:
				section["props"] = content
			default:
				empty := map[string]interface{}{}
				section["props"] = empty
				section["content"] = empty
			}
		}
	}
	if len(pages) == 0 {
		pages = []interface{}{
			map[string]interface{}{
				"id": "page-home", "slug": "/", "title": "Home", "metaDescription": biz.Description, "isHome": true, "isPublished": false,
				"sections": []interface{}{
					map[string]interface{}{"id": "hero", "type": "hero", "order": 0, "visible": true, "props": map[string]interface{}{"headline": biz.Tagline, "subheadline": biz.Description, "ctaPrimary": "Get Started", "logo": brand["logo"]}},
					map[string]interface{}{"id": "about", "type": "about", "order": 1, "visible": true, "props": map[string]interface{}{"title": "About " + biz.Name, "content": biz.Description}},
					map[string]interface{}{"id": "contact", "type": "contact", "order": 2, "visible": true, "props": map[string]interface{}{"title": "Contact Us", "subtitle": biz.Location}},
				},
			},
		}
	}
	draft["pages"] = pages
	if _, ok := draft["navigation"]; !ok {
		draft["navigation"] = map[string]interface{}{"items": []interface{}{map[string]interface{}{"label": "Home", "href": "/"}}, "style": "horizontal", "position": "top"}
	}
	if _, ok := draft["footer"]; !ok {
		draft["footer"] = map[string]interface{}{"showLogo": true, "showSocial": true, "customText": fmt.Sprintf("© %d %s", time.Now().Year(), biz.Name)}
	}
	encoded, err := json.Marshal(draft)
	return string(encoded), err
}
