package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"strings"
	"time"

	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/recraft"
)

const (
	brandingDesignRules = `You are a legendary logo designer at the level of Pentagram, Wolff Olins, and Landor.

DESIGN DOCTRINE (non-negotiable):
1. SIMPLICITY — describable in ONE sentence, drawable from memory. Max 3 shapes, max 3 colors.
2. BLACK-AND-WHITE FIRST — design the mark as if it will only ever exist in a single color. Structure, hierarchy and meaning must be carried entirely by SHAPE, never by color, gradient or effect. Color is applied at the end as a finishing layer. If the design stops working when every fill becomes #111111, it is rejected.
3. SCALABILITY — legible at 16px (favicon) and on a building facade. No fine details, minimum stroke width ≥ 4px.
4. RELEVANCE WITHOUT LITERALNESS — evoke the industry and values; NEVER illustrate the product (Apple's logo is not a computer, Nike's is not a shoe). Abstraction beats depiction.
5. TIMELESSNESS OVER TREND — no fashionable effects, no fake 3D, no decorative noise. Simple geometry ages best.
6. DISTINCTIVENESS — the mark must be recognizable from its filled SILHOUETTE alone.
7. DECLINABILITY — the mark must survive light/dark/monochrome recoloring and icon-only extraction without any redesign.

INDUSTRY ARCHETYPES (choose ONE based on business):
- tech_precision: sharp angles, monochrome, geometric grids, negative space
- tech_human: rounded, warm palette, approachable forms
- finance_trust: deep navy/green, serif influence, stability, shield-like structure
- health_wellness: clean whites, soft teal/blue, open space, organic curves
- luxury_heritage: black/gold, tight spacing, minimal, serif
- energy_motion: diagonals, bold red/orange, dynamic forms
- creative_studio: asymmetry, accent color, personality, unexpected shapes
- sustainability: organic curves, greens, earth tones, leaf motifs, recycled textures
- food_hospitality: warm colors, friendly curves, fork/spoon/leaf icons, appetite appeal
- education: book/open/light motifs, approachable serif, humanist, knowledge marks
- retail_ecommerce: bag/cart motifs, friendly bold marks, colorful, promotional energy
- industrial_manufacturing: heavy forms, bold sans, angular, structural, rugged
- logistics_transport: speed lines, arrows, motion marks, bold geometric, fleet-ready
- media_entertainment: dynamic shapes, vibrant colors, bold typography, spotlight motifs
- legal_professional: shield/balance motifs, restrained serif/sans, deep blues, authoritative
- nonprofit_social: open hands/circle motifs, warm tones, humanist fonts, approachable, inclusive

VISUAL SEED (pick one style per concept):
- seed_A: letterform-driven (derived from the brand initials or first letter)
- seed_B: geometry-first (derived from pure mathematics — circles, arcs, polygons)
- seed_C: narrative (contains hidden meaning/story relevant to the brand)
- seed_D: negative space (the empty area IS the meaning — FedEx arrow principle)

SYMMETRY MODE (pick one):
- axial_vertical: mirror across vertical center line (default, safest)
- axial_horizontal: mirror across horizontal center
- radial: N identical units rotated around center (N = 2, 3, 4, 6)
- point_symmetry: 180° rotational symmetry around center
- balanced_asym: asymmetric but visual masses balance around vertical axis

THREE LOGO TYPES — generate exactly one of each:

TYPE A — ICON + WORDMARK:
- Icon: max 2 shapes (3 only if structurally necessary), must work standalone as app icon
- Positioned LEFT of brand name, bounding box 48x48
- Wordmark: real <text> element with proper font, right of icon with 12px spacing
- Font size = totalHeight * 0.35, weight 600 or 700
- Icon must pass black-and-white and silhouette tests on its own

TYPE B — WORDMARK ONLY (logotype):
- Typography IS the logo. No icon or symbol.
- Exactly ONE deliberate typographic strategy (choose: weight_statement, color_sequence, tracking_play, case_contrast, letterform_hack, baseline_rhythm, weight_contrast, hidden_element)
- Real type only — <text> element with proper font, no freehand letterforms
- Pass black-and-white test: the strategy must work through FORM, not color alone

TYPE C — MONOGRAM (initials only):
- Max 2-3 initials, UPPERCASE, from brand name
- Container: circle, square, rounded, or none
- Exactly ONE advanced technique (overlap, cutout, weight_contrast, color_split, rotation, monogram_lock)

CONSTRUCTION SYSTEM:
- MODULAR GRID: use a consistent unit (u = icon_height / 8). Every coordinate/width/gap is a multiple of u/2. Snap to grid.
- PROPORTION SCALE: use Golden Ratio (1:1.618) or Rational (1:1.5, 1:2) for size ratios.
- STROKE CONSISTENCY: maximum 2 distinct stroke widths (ideally 1).
- CANONICAL ANGLES ONLY: every angle in the mark belongs to {0, 15, 30, 45, 60, 90} degrees.
- NEGATIVE SPACE: every enclosed empty area is a conscious design decision with its own geometry.

TECHNICAL STANDARDS:
- viewBox="0 0 W H" — fit content with 12px padding minimum
- No filters, drop-shadows, masks, foreignObject, scripts, or inline CSS
- Forbidden clichés (auto-reject): globe, gear, lightbulb, upward arrow, speech bubble, shield, menu burger, orbit, swoosh, handshake
- Font fallbacks: Inter, Helvetica Neue, Arial, sans-serif (700 weight); Playfair Display, Georgia, serif (for luxury)

COLOR RULES:
- Use ONLY the brand palette colors (primary, secondary, accent) + white + near-black
- Max 3 colors total
- Primary carries 60-70%, secondary 25-30%, accent ≤10% visual weight
- Adjacent fills must remain distinguishable when converted to grayscale
- Ensure WCAG AA contrast (4.5:1 text, 3:1 elements)
- If the final logo uses a gradient, it must still work with the gradient flattened to a single color

QUALITY GATES (verify internally before output):
1. BLACK-AND-WHITE TEST: set every fill to #111111 — mark remains readable, hierarchical, meaningful
2. SILHOUETTE TEST: filled outline alone is distinctive and recognizable
3. Symmetry: computed twins, not eyeballed coordinates
4. Coordinates snapped to grid; all angles canonical
5. Legible at 16x16px (counters open, no fine details)
6. No forbidden symbols; no literal product illustration
7. Only brand palette colors (no invented hex)
8. Describable in one sentence; drawable from memory

Return SVG as a valid <svg> string in the "svg" field of each logo object.`

	brandingCritiquePrompt = `You are an uncompromising design director at a world-class identity studio (Pentagram level). You review junior designers' logo work before it ever reaches a client.

AUDIT CHECKLIST — score each criterion mentally, then aggregate:
1. BLACK-AND-WHITE TEST — with every fill set to a single color, does the mark keep its structure, hierarchy and meaning? Color must never carry the design.
2. SILHOUETTE — is the filled outline distinctive and recognizable on its own?
3. GEOMETRY & SYMMETRY — are shapes mathematically clean (aligned, symmetric where intended, snapped to a coherent grid, canonical angles)? "Almost aligned" elements are an automatic fail.
4. SIMPLICITY — describable in one sentence? ≤ 3 shapes? No decorative noise?
5. SCALABILITY — legible at 16px? Open counters, no fine details, minimum stroke widths?
6. STROKE & VALUE DISCIPLINE — at most 2 stroke widths? Radii/gaps from one coherent scale?
7. TYPOGRAPHY — real, undistorted letterforms? Correct kerning? No clipped or overflowing text? Baseline consistent?
8. LAYOUT — nothing clipped by the viewBox, clear space respected, icon/text balance correct?
9. COLOR — ≤ 3 colors, from the brand palette, hierarchy survives grayscale, sufficient contrast?
10. CLICHÉS — no globe, gear, bulb, generic swoosh, handshake, shield, speech bubble?
11. RELEVANCE — evokes the industry/values without literally illustrating the product?

VERDICT RULES:
- FAIL if ANY of: text clipped or overflowing, broken/asymmetric geometry that was meant to be symmetric, illegible at small size, > 3 colors or non-palette colors, distorted letterforms, forbidden cliché, mark unreadable in one color.
- FAIL if aggregate quality is below professional standard (score < 70).
- PASS otherwise. A pass means you would sign this work with your name.
- Be strict but fair: do not fail a clean, simple mark for stylistic taste alone.

Return JSON: {"pass": true/false, "score": 0-100, "issues": ["specific issue 1","specific issue 2"], "suggestions": "precise revision instructions in English (actionable coordinates, values, operations)"}
Score < 70 = fail. Only pass logos that are genuinely professional-grade.`
)

func creativeDomain(domain string) string {
	switch normalizeDomain(domain) {
	case "branding", "brand", "brand-kit", "branding-kit", "logo":
		return "branding"
	case "business-plan", "businessplan", "plan":
		return "business-plan"
	case "pitch-deck", "pitchdeck", "deck":
		return "pitch-deck"
	case "website", "website-builder", "site", "landing-page", "landing":
		return "website"
	case "web-app", "webapp", "appgen", "application", "app":
		return "webapp"
	case "mockup", "mockups", "mock-up", "mock-ups", "brand-mockup":
		return "mockups"
	default:
		return normalizeDomain(domain)
	}
}

func isCreativeDomain(domain string) bool {
	switch creativeDomain(domain) {
	case "branding", "business-plan", "pitch-deck", "website", "webapp", "mockups":
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
	case "webapp":
		context["brandKit"] = creativeContextValue(biz.BrandKit, 1000)
		context["businessPlan"] = creativeContextValue(biz.BusinessPlan, 800)
		context["websiteConfig"] = creativeContextValue(biz.WebsiteConfig, 600)
		context["team"] = creativeContextValue(biz.Team, 400)
	case "mockups":
		context["brandKit"] = creativeContextValue(biz.BrandKit, 2000)
		context["website"] = biz.Website
		context["industry"] = biz.Industry
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
	case "webapp":
		field, current, summary = "websiteDraft", biz.WebsiteConfig, "Generate or revise a full web application"
	case "mockups":
		field, current, summary = "brandKit", biz.BrandKit, "Generate brand mockup visualizations"
	}
	return ProposedChange{ID: "1", Type: "update", Field: field, Summary: summary, CurrentValue: current, NewValue: "{}"}
}

func 	creativeProposalGuidance(domain string) string {
	switch creativeDomain(domain) {
	case "branding":
		return fmt.Sprintf(`
This is an AI-first branding workflow. Return exactly one change with field "brandKit" for generation or revision.

%s

COLOUR PALETTE GENERATION (%s):
%s

TYPOGRAPHY GENERATION (%s):
%s

LOGO SYSTEM — Generate EXACTLY 3 logo concepts, one of each type:
TYPE A (ICON + WORDMARK) — %s
TYPE B (WORDMARK ONLY) — %s
TYPE C (MONOGRAM) — %s

The newValue must be a COMPLETE JSON object with:
{
  "logos":[{"svg":"<svg>...</svg>","name":"concept name","concept":"design rationale","type":"icon|name|initial","colors":["#HEX","#HEX"],"fonts":["font name"]}],
  "selectedLogo":0,
  "colors":[{"name":"palette name","colors":{"primary":"#RRGGBB","secondary":"#RRGGBB","accent":"#RRGGBB","background":"#RRGGBB","text":"#RRGGBB"},"rationale":"color theory reasoning"}],
  "selectedColors":0,
  "typography":[{"name":"pair name","primaryFont":"Google Font name","secondaryFont":"Google Font name","rationale":"pairing reasoning"}],
  "selectedTypography":0,
  "logoWhite":"generated from logo SVG",
  "logoIcon":"generated from logo SVG",
  "patterns":[],
  "socialBanners":[]
}
- Generate EXACTLY 3 logo concepts with different approaches (icon+text, wordmark, monogram)
- Generate EXACTLY 3 color palettes with different moods
- Generate EXACTLY 3 typography pairs with distinct personalities
- Every SVG must be a valid standalone <svg> element with viewBox="0 0 128 128"
- SVG CONTRAST (CRITICAL): Logos MUST be visible on BOTH white and black backgrounds. Never use colors that disappear on dark backgrounds. Text in SVG must use a color with at least 4.5:1 contrast ratio against any background. Avoid pure black (#000000) or pure white (#FFFFFF) for primary text — use near-black (#1a1a1a) or near-white (#f0f0f0) instead. Logo mark must be recognizable in both light and dark contexts.
- SVG COLOR RULES: Use brand palette colors (primary, secondary, accent) as fill="..." and stroke="..." attributes. Every fill color must be tested mentally against both white and dark backgrounds. If a color is very light (like #B3D4E0), ensure there's a dark outline or dark secondary element so the logo works on white backgrounds. If a color is very dark (like #0A1628), ensure there's a light accent element so the logo works on dark backgrounds.
- COLOR QUALITY: Every color in the palette must be distinct and harmonious. Primary color should be versatile (works on white AND dark backgrounds). Secondary complements primary. Accent provides pop. Include hex values that are valid (#RRGGBB format).
- VALID XML: Every opening tag must have a closing tag. No unescaped ampersands in text content (use &amp;). SVG must parse without errors.
- Preserve any existing brand values the user did not ask to change
- Never ask the user to upload a logo`,
			brandingDesignRules,
			"specialist", colorsGenerationPrompt,
			"specialist", typographyGenerationPrompt,
			logoIconTypePrompt,
			logoNameTypePrompt,
			logoInitialTypePrompt)
	case "business-plan":
		return `
This is an AI-first business-plan workflow. Return exactly one change with field "businessPlan" for generation or revision.

You are a world-class business strategist. Produce a complete, investor-ready business plan with ALL 10 sections below. Each section must be written as detailed prose (2-5 paragraphs per section) with data, insights, and strategic thinking.

SECTION 1 — COVER PAGE
Specialist instruction: ` + bpCoverPrompt + `

SECTION 2 — EXECUTIVE SUMMARY
Specialist instruction: ` + bpExecutiveSummaryPrompt + `

SECTION 3 — COMPANY SUMMARY
Specialist instruction: ` + bpCompanySummaryPrompt + `

SECTION 4 — MARKET OPPORTUNITY
Specialist instruction: ` + bpOpportunityPrompt + `

SECTION 5 — TARGET AUDIENCE
Specialist instruction: ` + bpTargetAudiencePrompt + `

SECTION 6 — PRODUCTS & SERVICES
Specialist instruction: ` + bpProductsServicesPrompt + `

SECTION 7 — MARKETING & SALES
Specialist instruction: ` + bpMarketingSalesPrompt + `

SECTION 8 — FINANCIAL PLAN
Specialist instruction: ` + bpFinancialPlanPrompt + `

SECTION 9 — GOAL PLANNING
Specialist instruction: ` + bpGoalPlanningPrompt + `

SECTION 10 — APPENDIX
Specialist instruction: ` + bpAppendixPrompt + `

GLOBAL RULES:
- Each section must have complete, detailed prose (2-5 paragraphs), not outlines or bullet lists
- Financial projections must be labelled "Projection — estimate". Never invent precise figures without basis.
- Use the provided business profile context for specifics
- Tone: confident, data-driven, investor-ready

The newValue must be a COMPLETE JSON object:
{
  "title":"Business Name Business Plan",
  "executiveSummary":"2-3 paragraph overview",
  "sections":[
    {"id":"cover","title":"Cover Page","content":"...","order":0},
    {"id":"executive-summary","title":"Executive Summary","content":"...","order":1},
    {"id":"company-summary","title":"Company Summary","content":"...","order":2},
    {"id":"market-opportunity","title":"Market Opportunity","content":"...","order":3},
    {"id":"target-audience","title":"Target Audience","content":"...","order":4},
    {"id":"products-services","title":"Products & Services","content":"...","order":5},
    {"id":"marketing-sales","title":"Marketing & Sales","content":"...","order":6},
    {"id":"financial-plan","title":"Financial Plan","content":"...","order":7},
    {"id":"goal-planning","title":"Goal Planning","content":"...","order":8},
    {"id":"appendix","title":"Appendix","content":"...","order":9}
  ],
  "version":"1.0",
  "exportFormats":["pdf","docx","md"]
}
- Use business profile, metrics, financials, milestones, team, and prior plan
- Each section must be complete, detailed, and specific to the business
- Do NOT use placeholders or generic filler text`
	case "pitch-deck":
		return `
This is an AI-first pitch-deck workflow. Return exactly one change with field "pitchDeck" for generation or revision.

` + pdSharedPrompt + `

SLIDE 1 — COVER
Specialist instruction: ` + pdCoverPrompt + `

SLIDE 2 — PROBLEM
Specialist instruction: ` + pdProblemPrompt + `

SLIDE 3 — SOLUTION
Specialist instruction: ` + pdSolutionPrompt + `

SLIDE 4 — MARKET
Specialist instruction: ` + pdMarketPrompt + `

SLIDE 5 — PRODUCT
Specialist instruction: ` + pdProductPrompt + `

SLIDE 6 — BUSINESS MODEL
Specialist instruction: ` + pdBusinessModelPrompt + `

SLIDE 7 — TRACTION
Specialist instruction: ` + pdTractionPrompt + `

SLIDE 8 — COMPETITION
Specialist instruction: ` + pdCompetitionPrompt + `

SLIDE 9 — TEAM
Specialist instruction: ` + pdTeamPrompt + `

SLIDE 10 — FINANCIALS
Specialist instruction: ` + pdFinancialsPrompt + `

SLIDE 11 — ASK
Specialist instruction: ` + pdAskPrompt + `

GLOBAL RULES:
- Build the story from the approved business profile and business plan
- Do not invent traction, revenue, valuation, customer counts, or funding figures without basis — label projections
- Every slide type must have real, complete content — no placeholders or "..."
- Each slide must tell a story. Lead with the insight, then support with data.

The newValue must be a COMPLETE JSON object:
{
  "title":"Business Name Pitch Deck",
  "template":"ai-modern",
  "slides":[
    {"id":"cover","type":"title","title":"Business Name","content":"One-line positioning statement","bullets":["PITCH DECK","Date","Confidential"],"order":0,"layout":"center"},
    {"id":"problem","type":"problem","title":"The Problem","content":"paragraph explaining the problem","bullets":["Pain point 1","Pain point 2","Pain point 3"],"order":1,"layout":"split"},
    {"id":"solution","type":"solution","title":"Our Solution","content":"paragraph explaining solution","bullets":["Capability 1","Capability 2","Capability 3"],"order":2,"layout":"split"},
    {"id":"market","type":"market","title":"Market Opportunity","content":"market analysis paragraph","bullets":["TAM: $X","SAM: $Y","SOM: $Z"],"order":3,"layout":"center"},
    {"id":"product","type":"product","title":"How It Works","content":"product description","bullets":["Step 1","Step 2","Step 3"],"order":4,"layout":"split"},
    {"id":"business-model","type":"business-model","title":"Business Model","content":"revenue model paragraph","bullets":["Revenue stream","Pricing tier 1","Pricing tier 2"],"order":5,"layout":"split"},
    {"id":"traction","type":"traction","title":"Traction","content":"progress paragraph","bullets":["Metric 1","Metric 2","Metric 3"],"order":6,"layout":"center"},
    {"id":"competition","type":"competition","title":"Why We Win","content":"competitive advantage","bullets":["Differentiator 1","Differentiator 2","Differentiator 3"],"order":7,"layout":"split"},
    {"id":"team","type":"team","title":"The Team","content":"team overview paragraph","bullets":["Name — Role — Credibility","Name — Role — Credibility","Name — Role — Credibility"],"order":8,"layout":"center"},
    {"id":"financials","type":"financials","title":"Financial Outlook","content":"3-year projection paragraph","bullets":["Year 1: Revenue $X, Costs $Y","Year 2: Revenue $X, Costs $Y","Year 3: Revenue $X, Costs $Y"],"order":9,"layout":"center"},
    {"id":"ask","type":"ask","title":"The Ask","content":"funding request paragraph","bullets":["Use bucket 1: $X","Use bucket 2: $Y","Use bucket 3: $Z"],"order":10,"layout":"center"}
  ],
  "exportFormats":["pdf","pptx"]
}`
	case "mockups":
		return `
This is an AI-only mockup generation workflow. Return exactly one change with field "brandKit" whenever the user asks to generate brand mockups.
The newValue must be a COMPLETE JSON object with:
{
  "mockups": [
    {
      "supportType":"business_cards|signage|packaging|digital_interfaces|uniforms|vehicle_branding|storefront",
      "supportName":"Business Cards",
      "svg":"<svg>...</svg>",
      "title":"Business Cards Mockup",
      "description":"Description of the mockup"
    }
  ]
}
Generate 3 SVG mockups showing the brand identity on different physical items suitable for the business industry. Use the existing brand kit colors and logo. Each SVG must be a valid standalone <svg viewBox="0 0 800 600"> element.`
	case "website":
		return `
This is an AI-first website builder. Return exactly one change with field "websiteDraft" for generation or revision.

` + websiteDesignPrinciples + `

PAGE STRUCTURE GUIDE (choose based on industry):
` + wsHomePagePrompt + `

SPECIALIST SECTION AGENTS — Build the home page sections using:
HERO SECTION: ` + wsHeroSectionPrompt + `
FEATURES SECTION: ` + wsFeaturesSectionPrompt + `
TESTIMONIALS SECTION: ` + wsTestimonialsSectionPrompt + `
PRICING SECTION: ` + wsPricingSectionPrompt + `
ABOUT SECTION: ` + wsAboutSectionPrompt + `
TEAM SECTION: ` + wsTeamSectionPrompt + `
STATS SECTION: ` + wsStatsSectionPrompt + `
CONTACT SECTION: ` + wsContactSectionPrompt + `
CTA SECTION: ` + wsCtaSectionPrompt + `
FAQ SECTION: ` + wsFaqSectionPrompt + `
CAROUSEL SECTION: ` + wsCarouselSectionPrompt + `

For sub-pages (About, Services, FAQ, Contact, etc.):
` + wsStandardPagePrompt + `

DEVELOPMENT CONFIG (include to enable code generation):
"developmentConfig": {
  "stack": "react-vite-tailwind",
  "features": {"seo":true,"contactForm":true,"analytics":true,"i18n":true}
}

The newValue must be a COMPLETE JSON object:
{
  "templateId":"",
  "subdomain":"auto",
  "developmentConfig":{...},
  "pages":[{"id":"page-home","slug":"/","title":"Home","metaDescription":"...","isHome":true,"isPublished":false,"sections":[...]}],
  "globalStyles":{"primaryColor":"#RRGGBB","secondaryColor":"#RRGGBB","accentColor":"#RRGGBB","fontHeading":"Inter","fontBody":"Inter","radius":"16px"},
  "navigation":{"items":[{"label":"Home","href":"/"}],"style":"horizontal","position":"top"},
  "footer":{"showLogo":true,"showSocial":true,"customText":"..."}
}
 - Use brand kit colors, fonts, and logo automatically
 - Create 4-5 pages minimum with real content in every section
 - The proposal only updates the PRIVATE DRAFT; publishing requires later confirmation`
	case "webapp":
		return `
This is an AI-first web application generator. Return exactly one change with field "websiteDraft" for generation, or "aiGenerated" for code revision.

` + codegenDesignPrinciples + `

PROJECT SETUP — ` + cgProjectSetupPrompt + `

LAYOUT COMPONENTS — ` + cgLayoutComponentPrompt + `

HOME PAGE — ` + cgHomePagePrompt + `

SUB PAGES — ` + cgSubPagePrompt + `

DEPLOYMENT CONFIG — ` + cgDeploymentConfigPrompt + `

STANDALONE HTML — ` + cgStandaloneHtmlPrompt + `

The newValue must be a COMPLETE JSON object:
{
  "type": "react-vite" or "standalone-html",
  "files": [
    {"path": "src/App.tsx", "content": "..."},
    {"path": "src/pages/Home.tsx", "content": "..."}
  ],
  "routes": ["/", "/about", "/services"],
  "developmentConfig": {
    "stack": "react-vite-tailwind",
    "features": {"seo": true, "contactForm": true, "analytics": true}
  }
}
- Use brand kit for all colors, fonts, and logo
- Every file must be complete — no TODOs, no placeholders
- TypeScript strict mode, proper error boundaries
- Responsive design on every page`
	default:
		return ""
	}
}

func normalizeCreativeProposal(proposal *Proposal, biz *businesses.Business, domain string, rc *recraft.Client) error {
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
			normalized, err := normalizeBrandKitProposal(change.NewValue, biz, rc)
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
		case "webapp":
			if strings.Contains(strings.ToLower(change.Summary), "code") || strings.Contains(strings.ToLower(change.Summary), "generate") {
				change.Field = "aiGenerated"
			} else {
				change.Field = "websiteDraft"
			}
			normalized, err := normalizeWebsiteDraftProposal(change.NewValue, biz)
			if err != nil {
				return err
			}
			change.NewValue = normalized
		case "mockups":
			change.Field = "brandKit"
			normalized, err := normalizeMockupProposal(change.NewValue, biz)
			if err != nil {
				return err
			}
			change.NewValue = normalized
		}
	}
	return nil
}

func critiqueAndReviseLogo(ctx context.Context, provider Provider, biz *businesses.Business, svg string) string {
	original := svg
	critiquePrompt := fmt.Sprintf(`%s

Logo SVG to review:
%s

Business: %s | Industry: %s | Tagline: %s`, brandingCritiquePrompt, svg, biz.Name, biz.Industry, biz.Tagline)

	resp, err := provider.Chat(ctx, "", []Message{{Role: "user", Content: critiquePrompt}}, nil)
	if err != nil {
		return svg
	}
	content := extractJSONObject(resp.Content)
	var critique struct {
		Pass        bool     `json:"pass"`
		Score       float64  `json:"score"`
		Suggestions string   `json:"suggestions"`
	}
	if json.Unmarshal([]byte(content), &critique) != nil || critique.Pass || critique.Score >= 70 {
		return svg
	}

	for retry := 0; retry < 2; retry++ {
		revisionPrompt := fmt.Sprintf(`Revise this logo SVG based on the design director's feedback.

Current SVG:
%s

Feedback to address:
%s

Produce an improved SVG following the design doctrine. Return ONLY the <svg> element.`, svg, critique.Suggestions)

		resp, err := provider.Chat(ctx, brandingDesignRules, []Message{{Role: "user", Content: revisionPrompt}}, nil)
		if err != nil {
			return svg
		}
		if s := extractSVG(resp.Content); s != "" {
			svg = s
		} else {
			return original
		}

		critiquePrompt = fmt.Sprintf(`%s

Logo SVG to review:
%s

Business: %s | Industry: %s | Tagline: %s`, brandingCritiquePrompt, svg, biz.Name, biz.Industry, biz.Tagline)
		resp, err = provider.Chat(ctx, "", []Message{{Role: "user", Content: critiquePrompt}}, nil)
		if err != nil {
			return svg
		}
		content = extractJSONObject(resp.Content)
		if json.Unmarshal([]byte(content), &critique) == nil && (critique.Pass || critique.Score >= 70) {
			return svg
		}
	}
	return svg
}

func extractSVG(content string) string {
	start := strings.Index(content, "<svg")
	if start < 0 {
		return ""
	}
	end := strings.Index(content, "</svg>")
	if end < 0 {
		return ""
	}
	return content[start : end+6]
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

func normalizeBrandKitProposal(raw string, biz *businesses.Business, rc *recraft.Client) (string, error) {
	incoming := map[string]interface{}{}
	_ = json.Unmarshal([]byte(raw), &incoming)
	brand := mergeJSONMap(raw, biz.BrandKit)

	// Extract multi-option design candidates if present
	logos, _ := incoming["logos"].([]interface{})
	colors, _ := incoming["colors"].([]interface{})
	typos, _ := incoming["typography"].([]interface{})

	selLogo := intFromMap(incoming, "selectedLogo", 0)
	selColor := intFromMap(incoming, "selectedColors", 0)
	selTypo := intFromMap(incoming, "selectedTypography", 0)

	// Process selected logo — Recraft first, then fallback to LLM SVG
	recraftUsed := false
	if rc != nil {
		primary := stringValue(brand, "primaryColor", "#10b981")
		prompt := fmt.Sprintf("Design a stunning, full-color modern brand logo for '%s'. Brand color: %s (use this prominently). Create a rich, vibrant logo with depth, gradients, and professional polish. The logo should feature bold colors, modern geometric shapes, and a distinctive mark that works as an app icon. Use multiple colors from a cohesive palette — not just the primary color. Style: premium, contemporary, high-end branding. Make it look like a top-tier Silicon Valley startup logo. Do NOT make it black and white or monochrome. Include subtle gradients or color overlays for a premium feel.", biz.Name, primary)
		if result, err := rc.GenerateLogo(prompt); err == nil && len(result.Data) > 0 {
			rasterURL := result.Data[0].URL
			brand["logo"] = rasterURL
			brand["logoIcon"] = rasterURL
			brand["logoWhite"] = rasterURL
			if svgURL, err := rc.VectorizeImage(rasterURL); err == nil {
				brand["logoWhite"] = svgURL
			}
			recraftUsed = true
		}
	}
	if recraftUsed {
		if selLogo >= 0 && selLogo < len(logos) {
			if logoObj, ok := logos[selLogo].(map[string]interface{}); ok {
				if name, _ := logoObj["name"].(string); name != "" {
					brand["logoName"] = name
				}
				if concept, _ := logoObj["concept"].(string); concept != "" {
					brand["logoConcept"] = concept
				}
				if c, _ := logoObj["colors"].([]interface{}); len(c) > 0 {
					brand["logoColors"] = c
				}
			}
		}
	} else if selLogo >= 0 && selLogo < len(logos) {
		if logoObj, ok := logos[selLogo].(map[string]interface{}); ok {
			svgStr, _ := logoObj["svg"].(string)
			if s := extractSVG(svgStr); s != "" {
				dataURL := svgToDataURL(s)
				brand["logo"] = dataURL
				brand["logoIcon"] = dataURL
				brand["logoWhite"] = svgToDataURL(recolorSVGForWhite(s))
			}
			if name, _ := logoObj["name"].(string); name != "" {
				brand["logoName"] = name
			}
			if concept, _ := logoObj["concept"].(string); concept != "" {
				brand["logoConcept"] = concept
			}
			if c, _ := logoObj["colors"].([]interface{}); len(c) > 0 {
				brand["logoColors"] = c
			}
		}
	} else {
		// Fallback: server-generated SVG
		concept, _ := brand["logoConcept"].(map[string]interface{})
		if concept == nil {
			concept = map[string]interface{}{}
		}
		mark := stringValue(concept, "mark", initials(biz.Name))
		if len([]rune(mark)) > 4 {
			mark = string([]rune(mark)[:4])
		}
		shape := stringValue(concept, "shape", "rounded")
		if shape != "rounded" && shape != "circle" && shape != "square" {
			shape = "rounded"
		}
		style := stringValue(concept, "style", "modern")
		if style != "modern" && style != "minimal" && style != "bold" && style != "friendly" && style != "premium" {
			style = "modern"
		}
		logo, _ := incoming["logo"].(string)
		if !strings.HasPrefix(logo, "data:image/") && !strings.HasPrefix(logo, "https://") {
			logo = generatedLogoDataURL(mark, shape, style, "#10b981", "#059669", false)
		}
		brand["logo"] = logo
		brand["logoIcon"] = generatedLogoDataURL(mark, shape, style, "#10b981", "#059669", false)
		brand["logoWhite"] = generatedLogoDataURL(mark, shape, style, "#ffffff", "#d1fae5", true)
	}

	// Process selected color palette
	if selColor >= 0 && selColor < len(colors) {
		if cObj, ok := colors[selColor].(map[string]interface{}); ok {
			if c, ok := cObj["colors"].(map[string]interface{}); ok {
				for _, key := range []string{"primary", "secondary", "accent", "background", "text"} {
					if v, ok := c[key].(string); ok && v != "" {
						brand[key+"Color"] = validHexOr(v, "#10b981")
					}
				}
			}
		}
	}
	brand["primaryColor"] = validHexOr(stringValue(brand, "primaryColor", "#10b981"), "#10b981")
	brand["secondaryColor"] = validHexOr(stringValue(brand, "secondaryColor", "#059669"), "#059669")
	brand["accentColor"] = validHexOr(stringValue(brand, "accentColor", "#34d399"), "#34d399")
	dark := stringValue(brand, "darkColor", "")
	if dark == "" {
		dark = stringValue(brand, "backgroundColor", "#052e24")
	}
	brand["darkColor"] = validHexOr(dark, "#052e24")
	if _, ok := brand["background"]; !ok {
		brand["background"] = "#ffffff"
	}

	// Process selected typography
	if selTypo >= 0 && selTypo < len(typos) {
		if tObj, ok := typos[selTypo].(map[string]interface{}); ok {
			if pf, _ := tObj["primaryFont"].(string); pf != "" {
				brand["fontHeading"] = pf
			}
			if sf, _ := tObj["secondaryFont"].(string); sf != "" {
				brand["fontBody"] = sf
			}
		}
	}
	brand["fontHeading"] = stringValue(brand, "fontHeading", "Inter")
	brand["fontBody"] = stringValue(brand, "fontBody", "Inter")

	if _, ok := brand["patterns"]; !ok {
		brand["patterns"] = []interface{}{}
	}
	if _, ok := brand["socialBanners"]; !ok {
		brand["socialBanners"] = []interface{}{}
	}

	encoded, err := json.Marshal(brand)
	return string(encoded), err
}

func svgToDataURL(svg string) string {
	return "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(svg))
}

func recolorSVGForWhite(svg string) string {
	result := strings.ReplaceAll(svg, "#10b981", "#ffffff")
	result = strings.ReplaceAll(result, "#059669", "#d1fae5")
	return strings.ReplaceAll(result, "#34d399", "#a7f3d0")
}

func intFromMap(m map[string]interface{}, key string, fallback int) int {
	switch v := m[key].(type) {
	case float64:
		return int(v)
	case int:
		return v
	case json.Number:
		n, _ := v.Int64()
		return int(n)
	}
	return fallback
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
	now := time.Now().UTC().Format(time.RFC3339)
	plan := mergeJSONMap(raw, biz.BusinessPlan)

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
			map[string]interface{}{"id": "cover", "title": "Cover Page", "content": biz.Name + "\n" + biz.Tagline + "\nBusiness Plan\nCONFIDENTIAL", "aiGenerated": true, "order": 0},
			map[string]interface{}{"id": "executive-summary", "title": "Executive Summary", "content": biz.Description + "\n\nThis business plan outlines the vision, strategy, and financial projections for " + biz.Name + ".", "aiGenerated": true, "order": 1},
			map[string]interface{}{"id": "company-summary", "title": "Company Summary", "content": biz.Name + " is a " + biz.Industry + " company founded to deliver value through innovation. Based in " + biz.Location + ", the company focuses on " + biz.Description, "aiGenerated": true, "order": 2},
			map[string]interface{}{"id": "market-opportunity", "title": "Market Opportunity", "content": "The " + biz.Industry + " market presents a significant opportunity for " + biz.Name + ". Market analysis shows growing demand and favorable conditions for entry and expansion.", "aiGenerated": true, "order": 3},
			map[string]interface{}{"id": "target-audience", "title": "Target Audience", "content": biz.Name + " serves customers in the " + biz.Industry + " sector, with a focus on delivering tailored solutions that address specific market needs.", "aiGenerated": true, "order": 4},
			map[string]interface{}{"id": "products-services", "title": "Products & Services", "content": biz.Name + " offers a range of products and services designed to meet the evolving needs of " + biz.Industry + " customers.", "aiGenerated": true, "order": 5},
			map[string]interface{}{"id": "marketing-sales", "title": "Marketing & Sales", "content": "The go-to-market strategy for " + biz.Name + " leverages targeted acquisition channels and a structured sales process to reach " + biz.Industry + " customers.", "aiGenerated": true, "order": 6},
			map[string]interface{}{"id": "financial-plan", "title": "Financial Plan", "content": "Financial projections show a sustainable growth trajectory. Revenue model, cost structure, and funding requirements are detailed below.", "aiGenerated": true, "order": 7},
			map[string]interface{}{"id": "goal-planning", "title": "Goal Planning", "content": "Strategic objectives with key milestones and implementation timeline for " + biz.Name + ".", "aiGenerated": true, "order": 8},
			map[string]interface{}{"id": "appendix", "title": "Appendix", "content": "Supporting documentation, market research sources, financial assumptions, and detailed team profiles.", "aiGenerated": true, "order": 9},
		}
	}
	plan["sections"] = sections
	encoded, err := json.Marshal(plan)
	return string(encoded), err
}

func normalizePitchDeckProposal(raw string, biz *businesses.Business) (string, error) {
	deck := mergeJSONMap(raw, biz.PitchDeck)
	deck["title"] = stringValue(deck, "title", biz.Name+" Pitch Deck")
	deck["template"] = stringValue(deck, "template", "ai-modern")
	deck["lastModified"] = time.Now().UTC().Format(time.RFC3339)
	deck["exportFormats"] = []string{"pdf", "pptx"}

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
			map[string]interface{}{"id": "cover", "type": "title", "title": biz.Name, "content": biz.Tagline + " — " + biz.Industry + "\nPITCH DECK\nConfidential", "bullets": []interface{}{"PITCH DECK", biz.Location, "Confidential"}, "order": 0, "layout": "center"},
			map[string]interface{}{"id": "problem", "type": "problem", "title": "The Problem", "content": biz.Industry + " customers face significant challenges that " + biz.Name + " is uniquely positioned to solve.", "bullets": []interface{}{"Pain point in " + biz.Industry, "Current solutions fall short", biz.Name + " addresses the gap"}, "order": 1, "layout": "split"},
			map[string]interface{}{"id": "solution", "type": "solution", "title": "Our Solution", "content": biz.Description, "bullets": []interface{}{"Core capability 1", "Core capability 2", "Core capability 3"}, "order": 2, "layout": "split"},
			map[string]interface{}{"id": "market", "type": "market", "title": "Market Opportunity", "content": "The " + biz.Industry + " market represents a substantial opportunity for " + biz.Name + ".", "bullets": []interface{}{"Total Addressable Market", "Serviceable Addressable Market", "Serviceable Obtainable Market"}, "order": 3, "layout": "center"},
			map[string]interface{}{"id": "product", "type": "product", "title": "How It Works", "content": biz.Name + " delivers its solution through a streamlined, customer-focused approach.", "bullets": []interface{}{"Step 1: Discovery", "Step 2: Solution design", "Step 3: Delivery & support"}, "order": 4, "layout": "split"},
			map[string]interface{}{"id": "business-model", "type": "business-model", "title": "Business Model", "content": "Sustainable revenue model built on delivering measurable value to " + biz.Industry + " customers.", "bullets": []interface{}{"Primary revenue stream", "Pricing model", "Unit economics"}, "order": 5, "layout": "split"},
			map[string]interface{}{"id": "traction", "type": "traction", "title": "Traction & Roadmap", "content": biz.Name + " is executing against a clear growth plan with measurable milestones.", "bullets": []interface{}{"Key achievement 1", "Key achievement 2", "Upcoming milestones"}, "order": 6, "layout": "center"},
			map[string]interface{}{"id": "competition", "type": "competition", "title": "Why We Win", "content": biz.Name + " has clear competitive advantages that differentiate it in the " + biz.Industry + " market.", "bullets": []interface{}{"Key differentiator 1", "Key differentiator 2", "Key differentiator 3"}, "order": 7, "layout": "split"},
			map[string]interface{}{"id": "team", "type": "team", "title": "The Team", "content": "Experienced team with deep " + biz.Industry + " expertise.", "bullets": []interface{}{"Leadership — Domain expertise", "Operations — Delivery excellence", "Advisors — Industry guidance"}, "order": 8, "layout": "center"},
			map[string]interface{}{"id": "financials", "type": "financials", "title": "Financial Outlook", "content": "Three-year financial projections showing a clear path to sustainable growth. Projections — estimate.", "bullets": []interface{}{"Year 1: Building foundation", "Year 2: Growth & expansion", "Year 3: Scale & profitability"}, "order": 9, "layout": "center"},
			map[string]interface{}{"id": "ask", "type": "ask", "title": "The Ask", "content": "We are seeking funding to accelerate growth and capture market share in the " + biz.Industry + " sector.", "bullets": []interface{}{"Product development", "Marketing & sales", "Operations & team"}, "order": 10, "layout": "center"},
		}
	}
	deck["slides"] = slides
	encoded, err := json.Marshal(deck)
	return string(encoded), err
}


func normalizeMockupProposal(raw string, biz *businesses.Business) (string, error) {
	var incoming struct {
		Mockups []MockupResult `json:"mockups"`
	}
	_ = json.Unmarshal([]byte(raw), &incoming)

	brand := mergeJSONMap(raw, biz.BrandKit)
	if len(incoming.Mockups) > 0 {
		var svgs []map[string]interface{}
		for _, m := range incoming.Mockups {
			svgs = append(svgs, map[string]interface{}{
				"supportType": m.SupportType,
				"supportName": m.SupportName,
				"svg":         m.SVG,
				"title":       m.Title,
				"description": m.Description,
			})
		}
		brand["mockups"] = svgs
	} else {
		brand["mockups"] = []interface{}{}
	}
	encoded, err := json.Marshal(brand)
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

	pages, _ := draft["pages"].([]interface{})
	hasValidSections := false
	for _, item := range pages {
		if page, ok := item.(map[string]interface{}); ok {
			if _, ok := page["sections"]; ok {
				hasValidSections = true
				break
			}
		}
	}

	if !hasValidSections {
		richDraft := richWebsiteDraft(biz, brand)
		for key, value := range richDraft {
			draft[key] = value
		}
	}

	draft["globalStyles"] = styles
	draft["templateId"] = stringValue(draft, "templateId", "")

	pages, _ = draft["pages"].([]interface{})
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
		draft["pages"] = pages
	}
	if _, ok := draft["navigation"]; !ok {
		draft["navigation"] = map[string]interface{}{"items": []interface{}{map[string]interface{}{"label": "Home", "href": "/"}}, "style": "horizontal", "position": "top"}
	}
	if _, ok := draft["footer"]; !ok {
		draft["footer"] = map[string]interface{}{"showLogo": true, "showSocial": true, "customText": fmt.Sprintf("© %d %s", time.Now().Year(), biz.Name)}
	}
	encoded, err := json.Marshal(draft)
	return string(encoded), err
}

func richWebsiteDraft(biz *businesses.Business, brand map[string]interface{}) map[string]interface{} {
	
	name := biz.Name
	tagline := biz.Tagline
	description := biz.Description
	industry := biz.Industry
	location := biz.Location
	logo, _ := brand["logo"].(string)

	homeAboutContent := description
	if strings.TrimSpace(homeAboutContent) == "" {
		homeAboutContent = fmt.Sprintf("%s is a forward-thinking %s company based in %s, built to deliver real value through innovation and reliable execution.", name, industry, location)
	}

	pages := []interface{}{
		map[string]interface{}{
			"id": "page-home", "slug": "/", "title": "Home", "metaDescription": description, "isHome": true, "isPublished": false,
			"sections": []interface{}{
				map[string]interface{}{"id": "hero", "type": "hero", "order": 0, "visible": true, "props": map[string]interface{}{"headline": tagline, "subheadline": homeAboutContent, "ctaPrimary": "Get Started", "secondaryCta": "Learn More", "logo": logo}},
				map[string]interface{}{"id": "stats", "type": "stats", "order": 1, "visible": true, "props": map[string]interface{}{
					"title": "Why " + name,
					"stats": []interface{}{
						map[string]interface{}{"value": "99%", "label": "Client satisfaction"},
						map[string]interface{}{"value": "24/7", "label": "Support coverage"},
						map[string]interface{}{"value": "Fast", "label": "Delivery model"},
						map[string]interface{}{"value": "Proven", "label": industry + " expertise"},
					},
				}},
				map[string]interface{}{"id": "features", "type": "features", "order": 2, "visible": true, "props": map[string]interface{}{
					"title": "What we do",
					"subtitle": "Core capabilities built around your goals",
					"features": []interface{}{
						map[string]interface{}{"icon": "Zap", "title": "Fast delivery", "description": "We move quickly without sacrificing quality or reliability."},
						map[string]interface{}{"icon": "Shield", "title": "Trusted support", "description": "Dedicated assistance and transparent communication at every stage."},
						map[string]interface{}{"icon": "TrendingUp", "title": "Proven results", "description": "Solutions designed to create measurable impact for " + name + " clients."},
					},
				}},
				map[string]interface{}{"id": "carousel", "type": "carousel", "order": 3, "visible": true, "props": map[string]interface{}{"title": "Highlights", "subtitle": "Recent milestones and client outcomes", "autoplay": true, "interval": 5000, "items": []interface{}{
					map[string]interface{}{"title": name + " Launch", "description": "Delivered a complete " + industry + " solution with measurable improvements.", "image": "", "cta": "See case study", "href": "/about"},
					map[string]interface{}{"title": "Ongoing Support", "description": "Continued optimisation and dedicated account management after launch.", "image": "", "cta": "Our process", "href": "/about"},
					map[string]interface{}{"title": "Client Outcomes", "description": "Clients report faster workflows and stronger growth after onboarding.", "image": "", "cta": "Contact us", "href": "/contact"},
				}}},
				map[string]interface{}{"id": "testimonials", "type": "testimonials", "order": 4, "visible": true, "props": map[string]interface{}{
					"title": "Client feedback",
					"subtitle": "Trusted by teams and customers across " + location,
					"testimonials": []interface{}{
						map[string]interface{}{"quote": "Working with " + name + " transformed how we serve our customers.", "author": "Operations Director", "role": industry + " client"},
						map[string]interface{}{"quote": "Reliable, responsive, and genuinely invested in our success.", "author": "Product Lead", "role": "SMB partner"},
						map[string]interface{}{"quote": "The team delivered ahead of schedule without cutting corners.", "author": "CEO", "role": "Startup partner"},
					},
				}},
				map[string]interface{}{"id": "cta", "type": "cta", "order": 5, "visible": true, "props": map[string]interface{}{"headline": "Ready to move forward?", "subheadline": "Tell us your goal and we will show you the fastest path to get there.", "cta": "Contact Us", "href": "/contact"}},
			},
		},
		map[string]interface{}{
			"id": "page-about", "slug": "/about", "title": "About", "metaDescription": description, "isHome": false, "isPublished": false,
			"sections": []interface{}{
				map[string]interface{}{"id": "about-hero", "type": "hero", "order": 0, "visible": true, "props": map[string]interface{}{"headline": "About " + name, "subheadline": homeAboutContent, "ctaPrimary": "Our services", "secondaryCta": "Contact us", "logo": logo}},
				map[string]interface{}{"id": "about-content", "type": "about", "order": 1, "visible": true, "props": map[string]interface{}{"title": "Our story", "content": description + " We combine local insight with modern capability so every solution is practical, scalable, and easy to adopt."}},
				map[string]interface{}{"id": "team", "type": "team", "order": 2, "visible": true, "props": map[string]interface{}{"title": "Leadership", "subtitle": "Experienced operators backing every engagement", "items": []interface{}{
					map[string]interface{}{"name": "Operations Lead", "role": "Managing Partner", "bio": "Leads delivery and client experience.", "image": ""},
					map[string]interface{}{"name": "Strategy Lead", "role": "Head of Solutions", "bio": "Aligns offering design with market demand.", "image": ""},
					map[string]interface{}{"name": "Growth Lead", "role": "Partnerships", "bio": "Expands reach through trusted channels.", "image": ""},
				}}},
				map[string]interface{}{"id": "about-stats", "type": "stats", "order": 3, "visible": true, "props": map[string]interface{}{"title": "Our impact", "stats": []interface{}{
					map[string]interface{}{"value": "3+", "label": "Years delivering outcomes"},
					map[string]interface{}{"value": "12+", "label": "Markets served"},
					map[string]interface{}{"value": "98%", "label": "Client retention"},
				}}},
				map[string]interface{}{"id": "about-cta", "type": "cta", "order": 4, "visible": true, "props": map[string]interface{}{"headline": "Want to work together?", "subheadline": "Share your priorities and we will propose the right next step.", "cta": "Get in touch", "href": "/contact"}},
			},
		},
		map[string]interface{}{
			"id": "page-services", "slug": "/services", "title": "Services", "metaDescription": "Professional services from " + name, "isHome": false, "isPublished": false,
			"sections": []interface{}{
				map[string]interface{}{"id": "services-hero", "type": "hero", "order": 0, "visible": true, "props": map[string]interface{}{"headline": "Services", "subheadline": "Designed to create lasting value across " + industry, "ctaPrimary": "Start a project", "logo": logo}},
				map[string]interface{}{"id": "features", "type": "features", "order": 1, "visible": true, "props": map[string]interface{}{
					"title": "What we do",
					"subtitle": "Selected capabilities tailored to your needs",
					"features": []interface{}{
						map[string]interface{}{"icon": "Briefcase", "title": "Advisory", "description": "Clear recommendations grounded in real-world execution."},
						map[string]interface{}{"icon": "Layers", "title": "Implementation", "description": "Hands-on delivery with accountable timelines and owners."},
						map[string]interface{}{"icon": "BarChart3", "title": "Growth", "description": "Performance tracking and optimisation loops that compound results."},
					},
				}},
				map[string]interface{}{"id": "pricing", "type": "pricing", "order": 2, "visible": true, "props": map[string]interface{}{"title": "Engagement options", "subtitle": "Flexible arrangements for every stage", "items": []interface{}{
					map[string]interface{}{"name": "Starter", "description": "Initial assessment and roadmap", "price": "Tailored", "features": []interface{}{"Baseline review", "Recommendations", "30 day follow-up"}, "cta": "Request quote", "href": "/contact"},
					map[string]interface{}{"name": "Growth", "description": "Ongoing delivery and support", "price": "Tailored", "features": []interface{}{"Dedicated manager", "Monthly reporting", "Priority support"}, "cta": "Request quote", "href": "/contact"},
					map[string]interface{}{"name": "Enterprise", "description": "Scoped programme with governance", "price": "Tailored", "features": []interface{}{"Custom scope", "Governance reviews", "Quarterly strategy"}, "cta": "Request quote", "href": "/contact"},
				}}},
				map[string]interface{}{"id": "services-cta", "type": "cta", "order": 3, "visible": true, "props": map[string]interface{}{"headline": "Need a tailored proposal?", "subheadline": "Tell us your timeline and constraints and we will propose a practical plan.", "cta": "Contact Us", "href": "/contact"}},
			},
		},
		map[string]interface{}{
			"id": "page-faq", "slug": "/faq", "title": "FAQ", "metaDescription": "Frequently asked questions about " + name, "isHome": false, "isPublished": false,
			"sections": []interface{}{
				map[string]interface{}{"id": "faq-hero", "type": "hero", "order": 0, "visible": true, "props": map[string]interface{}{"headline": "Questions and answers", "subheadline": "Practical information to help you decide quickly", "ctaPrimary": "Still have questions?", "secondaryCta": "Contact us", "logo": logo}},
				map[string]interface{}{"id": "faq", "type": "faq", "order": 1, "visible": true, "props": map[string]interface{}{"title": "FAQ", "subtitle": "", "items": []interface{}{
					map[string]interface{}{"question": "How fast can you start?", "answer": "Depending on scope, initial recommendations can be ready within days, not weeks."},
					map[string]interface{}{"question": "Which industries do you serve?", "answer": "We specialise in " + industry + " with distributed teams and global clients."},
					map[string]interface{}{"question": "What does engagement look like?", "answer": "Clear milestones, regular reviews, and defined owners from day one."},
					map[string]interface{}{"question": "How do you measure success?", "answer": "With agreed KPIs, simple dashboards, and recurring reporting."},
				}}},
				map[string]interface{}{"id": "faq-contact", "type": "contact", "order": 2, "visible": true, "props": map[string]interface{}{"title": "Still need help?", "subtitle": "Send us a message and we will reply promptly", "showCompany": true, "showPhone": false}},
			},
		},
		map[string]interface{}{
			"id": "page-contact", "slug": "/contact", "title": "Contact", "metaDescription": "Contact " + name, "isHome": false, "isPublished": false,
			"sections": []interface{}{
				map[string]interface{}{"id": "contact-hero", "type": "hero", "order": 0, "visible": true, "props": map[string]interface{}{"headline": "Contact us", "subheadline": location, "ctaPrimary": "Send message", "logo": logo}},
				map[string]interface{}{"id": "contact-form", "type": "contact", "order": 1, "visible": true, "props": map[string]interface{}{"title": "Get in touch", "subtitle": "We usually respond within one business day", "showCompany": true, "showPhone": false}},
				map[string]interface{}{"id": "contact-cta", "type": "cta", "order": 2, "visible": true, "props": map[string]interface{}{"headline": "Prefer email?", "subheadline": "Reach the team directly at " + strings.ToLower(strings.ReplaceAll(name, " ", "")) + "@venturemate.net", "cta": "Email us", "href": "mailto:" + strings.ToLower(strings.ReplaceAll(name, " ", "")) + "@venturemate.net"}},
			},
		},
	}

	brandMap, _ := brand["brandKit"].(map[string]interface{})
	if brandMap == nil {
		brandMap = map[string]interface{}{}
	}

	styles := map[string]interface{}{
		"primaryColor":   stringValue(brandMap, "primaryColor", "#10b981"),
		"secondaryColor": stringValue(brandMap, "secondaryColor", "#059669"),
		"accentColor":    stringValue(brandMap, "accentColor", "#34d399"),
		"darkColor":      stringValue(brandMap, "darkColor", "#052e24"),
		"fontHeading":    stringValue(brandMap, "fontHeading", "Inter"),
		"fontBody":       stringValue(brandMap, "fontBody", "Inter"),
		"radius":         "16px",
	}

	navigation := map[string]interface{}{
		"items": []interface{}{
			map[string]interface{}{"label": "Home", "href": "/"},
			map[string]interface{}{"label": "About", "href": "/about"},
			map[string]interface{}{"label": "Services", "href": "/services"},
			map[string]interface{}{"label": "FAQ", "href": "/faq"},
			map[string]interface{}{"label": "Contact", "href": "/contact"},
		},
		"style":    "horizontal",
		"position": "top",
	}

	footer := map[string]interface{}{
		"showLogo":    true,
		"showSocial":  true,
		"customText": fmt.Sprintf("© %d %s. All rights reserved.", time.Now().Year(), name),
	}

	return map[string]interface{}{
		"templateId":   "",
		"subdomain":     strings.ToLower(strings.ReplaceAll(name, " ", "-")),
		"pages":         pages,
		"globalStyles":  styles,
		"navigation":    navigation,
		"footer":        footer,
	}
}
