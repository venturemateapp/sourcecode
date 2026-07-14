package ai

import (
	"context"
	"encoding/base64"
	"fmt"
	"sort"
	"strings"

	"github.com/venturemate/vmbackend/internal/businesses"
)

type MockupSupport struct {
	Key      string   `json:"key"`
	Name     string   `json:"name"`
	Examples []string `json:"examples"`
	Context  string   `json:"context"`
}

type IndustryConfig struct {
	Primary   []string `json:"primary"`
	Secondary []string `json:"secondary"`
}

var mockupSupports = []MockupSupport{
	{"business_cards", "Business Cards", []string{"Visiting cards", "Corporate cards", "Contact cards"}, "Professional networking essential"},
	{"stationery", "Stationery", []string{"Letterheads", "Envelopes", "Notepads", "Folders"}, "Corporate stationery set"},
	{"signage", "Signage", []string{"Store signs", "Directional signs", "Wall signs", "Window graphics"}, "Physical brand signage"},
	{"storefront", "Storefront", []string{"Shop front", "Entrance", "Window display", "Facade"}, "Retail storefront branding"},
	{"packaging", "Packaging", []string{"Product boxes", "Gift boxes", "Shipping boxes", "Wrapping"}, "Product and shipping packaging"},
	{"food_packaging", "Food Packaging", []string{"Takeout boxes", "Cups", "Napkins", "Bags"}, "Food-grade packaging"},
	{"product_packaging", "Product Packaging", []string{"Product boxes", "Bottles", "Tubes", "Containers"}, "Consumer product packaging"},
	{"shopping_bags", "Shopping Bags", []string{"Paper bags", "Fabric totes", "Plastic bags"}, "Retail shopping bags"},
	{"uniforms", "Uniforms", []string{"Polos", "Aprons", "Lab coats", "Caps"}, "Employee uniforms and workwear"},
	{"athletic_wear", "Athletic Wear", []string{"Jerseys", "Shorts", "Caps", "Water bottles"}, "Sports apparel and accessories"},
	{"vehicle_branding", "Vehicle Branding", []string{"Car wraps", "Fleet branding", "Truck signage"}, "Vehicle fleet branding"},
	{"digital_interfaces", "Digital Interfaces", []string{"Website", "App UI", "Dashboard", "Email"}, "Digital brand presence"},
	{"digital_screens", "Digital Screens", []string{"Billboards", "Digital signage", "TV screens"}, "Digital display screens"},
	{"menu_design", "Menu Design", []string{"Restaurant menus", "Digital menus", "Menu boards"}, "Restaurant menu branding"},
	{"office_branding", "Office Branding", []string{"Reception", "Meeting rooms", "Wall art", "Desk items"}, "Office environment branding"},
	{"event_materials", "Event Materials", []string{"Banners", "Tickets", "Badges", "Tents"}, "Event and conference materials"},
	{"presentation_materials", "Presentation Materials", []string{"Slide decks", "Proposals", "Reports", "Brochures"}, "Business presentation materials"},
	{"safety_equipment", "Safety Equipment", []string{"Hard hats", "Vests", "Toolboxes", "Barriers"}, "Safety-branded equipment"},
	{"eco_packaging", "Eco Packaging", []string{"Recyclable boxes", "Compostable bags", "Paper wrap"}, "Sustainable packaging options"},
	{"tech_accessories", "Tech Accessories", []string{"Phone cases", "Laptop skins", "USB drives", "Tablets"}, "Tech accessories and gadgets"},
	{"corporate_gifts", "Corporate Gifts", []string{"Mugs", "Pens", "Notebooks", "Bottles"}, "Corporate gift items"},
}

var industryMockups = map[string]IndustryConfig{
	"delivery":         {[]string{"vehicle_branding", "packaging", "uniforms", "signage"}, []string{"business_cards", "stationery", "digital_screens", "safety_equipment"}},
	"food":             {[]string{"food_packaging", "menu_design", "storefront", "table_settings"}, []string{"uniforms", "shopping_bags", "business_cards", "digital_screens"}},
	"healthcare":       {[]string{"signage", "uniforms", "stationery", "packaging"}, []string{"business_cards", "digital_screens", "safety_equipment"}},
	"finance":          {[]string{"business_cards", "stationery", "digital_interfaces", "office_branding"}, []string{"signage", "presentation_materials", "corporate_gifts"}},
	"education":        {[]string{"stationery", "signage", "digital_interfaces", "office_branding"}, []string{"uniforms", "event_materials", "corporate_gifts"}},
	"retail":           {[]string{"packaging", "shopping_bags", "storefront", "signage"}, []string{"business_cards", "digital_interfaces", "corporate_gifts", "uniforms"}},
	"sports":           {[]string{"athletic_wear", "safety_equipment", "signage", "digital_interfaces"}, []string{"water_bottles", "business_cards", "event_materials"}},
	"travel":           {[]string{"signage", "stationery", "uniforms", "digital_interfaces"}, []string{"business_cards", "corporate_gifts", "packaging"}},
	"beauty":           {[]string{"product_packaging", "storefront", "business_cards", "signage"}, []string{"uniforms", "corporate_gifts", "digital_interfaces"}},
	"construction":     {[]string{"vehicle_branding", "safety_equipment", "signage", "uniforms"}, []string{"business_cards", "stationery", "office_branding"}},
	"real-estate":      {[]string{"signage", "business_cards", "stationery", "vehicle_branding"}, []string{"presentation_materials", "digital_interfaces", "office_branding"}},
	"fashion":          {[]string{"shopping_bags", "packaging", "storefront", "uniforms"}, []string{"business_cards", "corporate_gifts", "digital_interfaces"}},
	"technology":       {[]string{"digital_interfaces", "business_cards", "office_branding", "tech_accessories"}, []string{"packaging", "event_materials", "corporate_gifts", "signage"}},
	"general":          {[]string{"business_cards", "stationery", "office_branding", "digital_interfaces"}, []string{"signage", "presentation_materials", "corporate_gifts", "packaging"}},
}

var industryAliases = map[string]string{
	"delivery": "delivery", "logistics": "delivery", "courier": "delivery", "transport": "delivery", "shipping": "delivery",
	"food": "food", "restaurant": "food", "catering": "food", "bakery": "food", "beverage": "food", "bar": "food", "cafe": "food",
	"healthcare": "healthcare", "medical": "healthcare", "health": "healthcare", "hospital": "healthcare", "clinic": "healthcare", "wellness": "healthcare",
	"finance": "finance", "banking": "finance", "financial": "finance", "insurance": "finance", "investment": "finance", "accounting": "finance",
	"education": "education", "school": "education", "training": "education", "learning": "education", "academy": "education", "university": "education",
	"retail": "retail", "ecommerce": "retail", "e-commerce": "retail", "shop": "retail", "store": "retail",
	"sports": "sports", "fitness": "sports", "gym": "sports", "athletic": "sports", "sport": "sports",
	"travel": "travel", "hospitality": "travel", "hotel": "travel", "tourism": "travel", "lodging": "travel",
	"beauty": "beauty", "cosmetics": "beauty", "salon": "beauty", "spa": "beauty", "skincare": "beauty",
	"construction": "construction", "building": "construction", "engineering": "construction", "contractor": "construction",
	"real-estate": "real-estate", "realestate": "real-estate", "property": "real-estate", "realtor": "real-estate", "housing": "real-estate",
	"fashion": "fashion", "apparel": "fashion", "clothing": "fashion", "garment": "fashion", "textile": "fashion",
	"technology": "technology", "tech": "technology", "software": "technology", "saas": "technology", "it": "technology", "startup": "technology",
}

func normalizeIndustry(name string) string {
	name = strings.TrimSpace(strings.ToLower(name))
	if mapped, ok := industryAliases[name]; ok {
		return mapped
	}
	// partial match
	for alias, canonical := range industryAliases {
		if strings.Contains(name, alias) {
			return canonical
		}
	}
	return "general"
}

func selectMockupSupports(industry, description string, count int) []MockupSupport {
	cfg, ok := industryMockups[industry]
	if !ok {
		cfg = industryMockups["general"]
	}

	type scored struct {
		support MockupSupport
		score   int
	}
	supportMap := map[string]*MockupSupport{}
	for i := range mockupSupports {
		s := mockupSupports[i]
		supportMap[s.Key] = &mockupSupports[i]
	}

	scoredSet := map[string]bool{}
	var results []scored
	desc := strings.ToLower(description)

	primary := cfg.Primary
	secondary := cfg.Secondary
	if len(primary) == 0 {
		primary = industryMockups["general"].Primary
	}
	if len(secondary) == 0 {
		secondary = industryMockups["general"].Secondary
	}

	for _, key := range primary {
		if s, ok := supportMap[key]; ok && !scoredSet[key] {
			scoredSet[key] = true
			base := 10
			if isGeneric(key) {
				base = 2
			}
			results = append(results, scored{*s, base + 7 + contextScore(desc, key)})
		}
	}
	for _, key := range secondary {
		if s, ok := supportMap[key]; ok && !scoredSet[key] {
			scoredSet[key] = true
			base := 5
			if isGeneric(key) {
				base = 1
			}
			results = append(results, scored{*s, base + contextScore(desc, key)})
		}
	}
	// add remaining generic supports as low-priority filler
	for _, s := range mockupSupports {
		if !scoredSet[s.Key] {
			results = append(results, scored{s, 0})
			scoredSet[s.Key] = true
		}
	}

	sort.SliceStable(results, func(i, j int) bool { return results[i].score > results[j].score })
	if count < 1 {
		count = 3
	}
	if count > len(results) {
		count = len(results)
	}
	out := make([]MockupSupport, count)
	for i := 0; i < count; i++ {
		out[i] = results[i].support
	}
	return out
}

func isGeneric(key string) bool {
	switch key {
	case "business_cards", "digital_interfaces", "stationery":
		return true
	}
	return false
}

func contextScore(desc, key string) int {
	pairs := map[string][]string{
		"vehicle_branding":   {"delivery", "fleet", "transport", "logistic", "truck", "car"},
		"digital_interfaces": {"digital", "app", "website", "software", "online", "platform", "saas", "tech"},
		"packaging":          {"product", "package", "ship", "retail", "store"},
		"food_packaging":     {"food", "restaurant", "meal", "kitchen", "catering"},
		"event_materials":    {"event", "conference", "expo", "gathering", "launch"},
		"safety_equipment":   {"safety", "construction", "industrial", "warehouse", "manufacturing"},
		"uniforms":           {"team", "staff", "employee", "uniform", "workwear"},
		"storefront":         {"store", "shop", "retail", "boutique", "showroom"},
	}
	score := 0
	for _, kw := range pairs[key] {
		if strings.Contains(desc, kw) {
			score += 4
		}
	}
	return score
}

type MockupResult struct {
	SupportType string `json:"supportType"`
	SupportName string `json:"supportName"`
	SVG         string `json:"svg"`
	HTML        string `json:"html"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type brandKitForMockup struct {
	Name         string `json:"name"`
	Tagline      string `json:"tagline"`
	Description  string `json:"description"`
	Industry     string `json:"industry"`
	Logo         string `json:"logo"`
	PrimaryColor string `json:"primaryColor"`
	Secondary    string `json:"secondary"`
	Accent       string `json:"accent"`
	FontHeading  string `json:"fontHeading"`
}

func GenerateMockups(ctx context.Context, provider Provider, biz *businesses.Business, brandKit map[string]interface{}) ([]MockupResult, error) {
	logo := stringValue(brandKit, "logo", "")
	primary := stringValue(brandKit, "primaryColor", "#10b981")
	secondary := stringValue(brandKit, "secondaryColor", "#059669")
	accent := stringValue(brandKit, "accentColor", "#34d399")
	font := stringValue(brandKit, "fontHeading", "Inter")

	industry := normalizeIndustry(biz.Industry)
	supports := selectMockupSupports(industry, biz.Description, 3)

	brand := brandKitForMockup{
		Name:         biz.Name,
		Tagline:      biz.Tagline,
		Description:  biz.Description,
		Industry:     biz.Industry,
		Logo:         logo,
		PrimaryColor: primary,
		Secondary:    secondary,
		Accent:       accent,
		FontHeading:  font,
	}

	results := make([]MockupResult, 0, len(supports))
	systemPrompt := fmt.Sprintf(`You are a brand mockup designer. Generate SVG mockups showing a brand's visual identity applied to real-world items.
Use the brand colors, logo, and typography provided. Each SVG must:
- Use viewBox="0 0 800 600" for landscape composition
- Show the branded item in a realistic scene context
- Include clean typography for labels
- Be valid SVG with inline CSS for styling
- Use brand colors (#%s, #%s, #%s) and font %s
- Never use external images or raster assets`, strings.TrimPrefix(primary, "#"), strings.TrimPrefix(secondary, "#"), strings.TrimPrefix(accent, "#"), font)

	for _, support := range supports {
		prompt := fmt.Sprintf(`Create an SVG brand mockup for %s (%s) — %s.

Brand: %s
Tagline: %s
Description: %s
Industry: %s
Logo: %s

Scene: Show a %s in a realistic setting with the brand identity applied.
The design should include the brand logo and colors prominently on the item.
Add a subtle label "venturemate.net/brand" in the corner.

Return ONLY valid SVG markup.`,
			biz.Name, biz.Industry, support.Name,
			biz.Name, biz.Tagline, biz.Description, biz.Industry,
			logo, support.Name)

		resp, err := provider.Chat(ctx, systemPrompt, []Message{{Role: "user", Content: prompt}}, nil)
		if err != nil {
			continue
		}
		svg := extractSVG(resp.Content)
		if svg == "" {
			svg = fallbackMockupSVG(brand, support)
		}

		html := generateMockupHTML(brand, support, svg)

		results = append(results, MockupResult{
			SupportType: support.Key,
			SupportName: support.Name,
			SVG:         "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(svg)),
			HTML:        html,
			Title:       support.Name + " Mockup",
			Description: fmt.Sprintf("%s branded %s mockup showing the %s visual identity in context.", biz.Name, support.Name, biz.Name),
		})
	}
	return results, nil
}

func fallbackMockupSVG(brand brandKitForMockup, support MockupSupport) string {
	primary := brand.PrimaryColor
	if primary == "" {
		primary = "#10b981"
	}
	secondary := brand.Secondary
	if secondary == "" {
		secondary = "#059669"
	}
	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="%s mockup">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="%s"/>
      <stop offset="1" stop-color="%s"/>
    </linearGradient>
    <linearGradient id="item" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#ffffff" stop-opacity=".95"/>
      <stop offset="1" stop-color="#f0f0f0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect x="150" y="100" width="500" height="400" rx="20" fill="url(#item)" stroke="%s" stroke-width="2"/>
  <circle cx="400" cy="220" r="60" fill="%s" opacity=".9"/>
  <text x="400" y="240" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-size="36" font-weight="700">%s</text>
  <text x="400" y="310" text-anchor="middle" fill="%s" font-family="Inter,sans-serif" font-size="20">%s</text>
  <text x="400" y="350" text-anchor="middle" fill="#666" font-family="Inter,sans-serif" font-size="14">%s</text>
  <text x="740" y="580" text-anchor="end" fill="#fff" font-family="Inter,sans-serif" font-size="10" opacity=".5">venturemate.net/brand</text>
</svg>`, support.Name, primary, secondary, secondary, primary, initials(brand.Name), secondary, brand.Name, support.Name)
}

func generateMockupHTML(brand brandKitForMockup, support MockupSupport, svg string) string {
	safeName := strings.ReplaceAll(brand.Name, "'", "\\'")
	dataURL := "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(svg))
	return fmt.Sprintf(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s - %s Mockup</title><style>
*{margin:0;padding:0;box-sizing:border-box}body{width:100%%;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,%s,%s);font-family:%s,sans-serif}.card{background:#fff;border-radius:24px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.15);max-width:900px;width:90%%;text-align:center}.card img{width:100%%;max-height:500px;object-fit:contain;border-radius:12px;margin-bottom:20px}.card h1{font-size:24px;color:%s;margin-bottom:8px}.card p{color:#666;font-size:14px;line-height:1.6}.badge{display:inline-block;background:%s;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;margin-top:12px}
</style></head><body><div class="card"><img src="%s" alt="%s Mockup"><h1>%s Mockup</h1><p>%s</p><span class="badge">%s</span></div></body></html>`,
		brand.Name, support.Name, brand.PrimaryColor, brand.Secondary, brand.FontHeading, brand.PrimaryColor, brand.Accent, dataURL, safeName, safeName, support.Name, brand.Name)
}
