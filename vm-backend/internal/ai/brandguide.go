package ai

import (
	"encoding/base64"
	"fmt"
	"html"
	"strings"

	"github.com/venturemate/vmbackend/internal/businesses"
)

type BrandGuideSection struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Content string `json:"content"` // raw HTML
	Order   int    `json:"order"`
}

func GenerateBrandGuide(biz *businesses.Business, brandKit map[string]interface{}) ([]BrandGuideSection, error) {
	name := biz.Name
	primary := stringValue(brandKit, "primaryColor", "#10b981")
	secondary := stringValue(brandKit, "secondaryColor", "#059669")
	accent := stringValue(brandKit, "accentColor", "#34d399")
	dark := stringValue(brandKit, "darkColor", "#052e24")
	fontHeading := stringValue(brandKit, "fontHeading", "Inter")
	fontBody := stringValue(brandKit, "fontBody", "Inter")
	logo := stringValue(brandKit, "logo", "")
	logoIcon := stringValue(brandKit, "logoIcon", "")
	logoWhite := stringValue(brandKit, "logoWhite", "")

	logos, _ := brandKit["logos"].([]interface{})
	colors, _ := brandKit["colors"].([]interface{})
	typos, _ := brandKit["typography"].([]interface{})

	sections := []BrandGuideSection{
		{
			ID: "cover", Title: "Brand Guide", Order: 0,
			Content: coverPage(name, logo, primary, secondary, dark),
		},
		{
			ID: "logo-system", Title: "Logo System", Order: 1,
			Content: logoSections(name, logo, logoIcon, logoWhite, logos, primary, secondary, dark),
		},
		{
			ID: "color-palette", Title: "Color Palette", Order: 2,
			Content: colorSections(colors, primary, secondary, accent, dark),
		},
		{
			ID: "typography", Title: "Typography", Order: 3,
			Content: typoSections(typos, fontHeading, fontBody, primary),
		},
		{
			ID: "usage-guidelines", Title: "Usage Guidelines", Order: 4,
			Content: usageSections(primary, dark),
		},
		{
			ID: "mockups", Title: "Brand Applications", Order: 5,
			Content: mockupSections(brandKit, name, primary, secondary),
		},
		{
			ID: "footer", Title: "", Order: 6,
			Content: guideFooter(primary, dark),
		},
	}
	return sections, nil
}

func wrapGuide(content, primary, dark, fontHeading string) string {
	return fmt.Sprintf(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brand Guide</title><link href="https://fonts.googleapis.com/css2?family=%s:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'%s',sans-serif;color:#1a1a2e;background:#fff;line-height:1.7;-webkit-font-smoothing:antialiased}
.section{padding:64px 24px;max-width:960px;margin:0 auto}
@media(min-width:768px){.section{padding:80px 48px}}
.section-alt{background:#f8fafc}
h1{font-size:clamp(28px,5vw,48px);font-weight:800;line-height:1.15;margin-bottom:8px}
h2{font-size:clamp(20px,3vw,32px);font-weight:700;margin-bottom:16px;line-height:1.25}
h3{font-size:clamp(16px,2vw,22px);font-weight:600;margin-bottom:12px;line-height:1.3}
p{color:#475569;font-size:clamp(13px,1.2vw,16px);line-height:1.8;margin-bottom:16px;max-width:720px}
img{max-width:100%%;height:auto;border-radius:8px}
svg{max-width:100%%;height:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:clamp(12px,2vw,24px);margin:24px 0}
.card{padding:clamp(16px,2vw,24px);border-radius:clamp(8px,1.5vw,16px);border:1px solid #e2e8f0;text-align:center;background:#fff;transition:box-shadow .2s}
.card:hover{box-shadow:0 4px 16px rgba(0,0,0,.06)}
.logo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:clamp(8px,1.5vw,16px);margin:16px 0}
.logo-cell{padding:clamp(12px,2vw,24px);border-radius:12px;text-align:center;background:#fff;border:1px solid #e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px}
.logo-cell img,.logo-cell svg{max-width:140px;max-height:80px;width:auto;height:auto}
.logo-label{font-size:10px;color:#64748b;margin-top:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
.swatch{width:100%%;height:clamp(40px,5vw,60px);border-radius:8px;margin-bottom:10px}
.color-label{font-size:clamp(11px,1vw,14px);font-weight:600;color:#1a1a2e}
.color-hex{font-size:10px;color:#64748b;font-family:monospace;margin-top:2px}
.dark-bg{background:%s;color:#fff;padding:clamp(20px,3vw,40px);border-radius:16px;margin:24px 0}
.dark-bg p{color:rgba(255,255,255,.7);max-width:100%%}
.rule-card{padding:clamp(12px,1.5vw,20px);border-left:4px solid %s;background:#f8fafc;border-radius:0 8px 8px 0;margin-bottom:12px}
.rule-card p:last-child{margin-bottom:0}
.rule-do{border-color:#10b981}
.rule-dont{border-color:#ef4444}
.mini-svg svg{width:clamp(40px,5vw,60px);height:auto;display:block;margin:0 auto}
.color-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:clamp(8px,1.5vw,16px);margin:16px 0}
</style></head><body>%s</body></html>`,
		strings.ReplaceAll(fontHeading, " ", "+"), fontHeading, dark, primary, content)
}

func coverPage(name, logoURL, primary, secondary, dark string) string {
	logoHTML := ""
	if strings.HasPrefix(logoURL, "http") {
		logoHTML = fmt.Sprintf(`<img src="%s" alt="%s logo" style="max-width:160px;max-height:120px;margin-bottom:32px;border-radius:12px;background:rgba(255,255,255,.1);padding:16px" />`, html.EscapeString(logoURL), html.EscapeString(name))
	} else if strings.Contains(logoURL, "<svg") {
		logoHTML = fmt.Sprintf(`<div style="width:120px;height:120px;margin-bottom:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1);border-radius:20px;padding:16px">%s</div>`, logoURL)
	} else if logoURL != "" {
		logoHTML = fmt.Sprintf(`<img src="%s" alt="%s logo" style="max-width:160px;max-height:120px;margin-bottom:32px;border-radius:12px;background:rgba(255,255,255,.1);padding:16px" />`, html.EscapeString(logoURL), html.EscapeString(name))
	} else {
		initial := initials(name)
		logoHTML = fmt.Sprintf(`<svg viewBox="0 0 80 80" style="width:120px;height:120px;margin-bottom:32px"><rect width="80" height="80" rx="20" fill="rgba(255,255,255,.2)"/><text x="40" y="44" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-size="32" font-weight="700">%s</text></svg>`, initial)
	}
	return fmt.Sprintf(`<div class="section" style="background:linear-gradient(135deg,%s,%s);min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:#fff;padding:80px 40px">
%s
<h1 style="font-size:64px;margin-bottom:8px">%s</h1>
<p style="font-size:20px;opacity:.8;margin-bottom:48px;max-width:600px">Brand Identity Guide</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
<span style="padding:8px 20px;background:rgba(255,255,255,.15);border-radius:20px;font-size:13px">Primary: %s</span>
<span style="padding:8px 20px;background:rgba(255,255,255,.15);border-radius:20px;font-size:13px">Secondary: %s</span>
</div>
<div style="margin-top:64px;font-size:12px;opacity:.5">CONFIDENTIAL — %s Brand Guide</div>
</div>`, primary, secondary, logoHTML, html.EscapeString(name), primary, secondary, html.EscapeString(name))
}

func logoSections(name, logoURL, logoIconURL, logoWhiteURL string, logos []interface{}, primary, secondary, dark string) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`<div class="section section-alt"><h2>Logo System</h2><p>The %s logo system is shown below with the approved primary logo followed by concept explorations.</p>`, html.EscapeString(name)))

	// Show the actual approved logo first
	if logoURL != "" {
		sb.WriteString(`<h3>Primary Logo</h3><div class="logo-grid" style="margin-bottom:40px">`)
		logoVariants := []struct {
			url   string
			label string
			bg    string
		}{
			{logoURL, "Primary", "#ffffff"},
		}
		if logoWhiteURL != "" && logoWhiteURL != logoURL {
			logoVariants = append(logoVariants, struct {
				url   string
				label string
				bg    string
			}{logoWhiteURL, "On Dark", dark})
		}
		if logoIconURL != "" && logoIconURL != logoURL {
			logoVariants = append(logoVariants, struct {
				url   string
				label string
				bg    string
			}{logoIconURL, "Icon", "#ffffff"})
		}
		for _, v := range logoVariants {
			bgStyle := ""
			if strings.Contains(v.bg, "#") {
				bgStyle = fmt.Sprintf(`style="background:%s"`, v.bg)
			}
			sb.WriteString(fmt.Sprintf(`<div class="logo-cell" %s><img src="%s" alt="%s" style="max-width:160px;max-height:100px;object-fit:contain" /><div class="logo-label">%s</div></div>`, bgStyle, html.EscapeString(v.url), html.EscapeString(v.label), v.label))
		}
		sb.WriteString(`</div>`)
	}

	sb.WriteString(`<p>The following concept directions were explored during development.</p>`)

	for li, l := range logos {
		if logo, ok := l.(map[string]interface{}); ok {
			svgStr := stringValue(logo, "svg", "")
			svg := extractSVG(svgStr)
			concept := stringValue(logo, "concept", "")
			variations, _ := logo["variations"].(map[string]interface{})

			sb.WriteString(fmt.Sprintf(`<div style="margin-top:48px"><h3>Concept %d: %s</h3><p style="margin-bottom:16px">%s</p>`, li+1, html.EscapeString(stringValue(logo, "name", "")), html.EscapeString(concept)))

			// 3×3 or 1×3 grid
			sb.WriteString(`<div class="logo-grid">`)

			type variant struct {
				svg   string
				label string
				bg    string
			}
			variants := []variant{
				{svg, "Primary", "#ffffff"},
			}

			if variations != nil {
				if lv := stringValue(variations, "lightBackground", ""); lv != "" {
					variants = append(variants, variant{lv, "Light BG", "#ffffff"})
				}
				if dv := stringValue(variations, "darkBackground", ""); dv != "" {
					variants = append(variants, variant{dv, "Dark BG", dark})
				}
				if mv := stringValue(variations, "monochrome", ""); mv != "" {
					variants = append(variants, variant{mv, "Monochrome", "#f8fafc"})
				}
			}

			for i, v := range variants {
				bgStyle := ""
				if i == 2 {
					bgStyle = fmt.Sprintf("style=\"background:%s\"", v.bg)
				}
				sb.WriteString(fmt.Sprintf(`<div class="logo-cell" %s>%s<div class="logo-label">%s</div></div>`, bgStyle, v.svg, v.label))
			}

			sb.WriteString(`</div></div>`)
		}
	}
	sb.WriteString(`</div>`)
	return sb.String()
}

func colorSections(colors []interface{}, primary, secondary, accent, dark string) string {
	var sb strings.Builder
	sb.WriteString(`<div class="section"><h2>Color Palette</h2><p>The brand color system ensures consistency across all touchpoints. WCAG AA contrast ratios are maintained.</p><div class="grid" style="margin-top:32px">`)

	type swatch struct {
		name  string
		hex   string
		label string
	}
	palette := []swatch{
		{"Primary", primary, "Primary brand color"},
		{"Secondary", secondary, "Secondary brand color"},
		{"Accent", accent, "Accent / CTA color"},
	}
	// Extract from proposal palettes
	if len(colors) > 0 {
		if cp, ok := colors[0].(map[string]interface{}); ok {
			if c, ok := cp["colors"].(map[string]interface{}); ok {
				if p, ok := c["primary"].(string); ok && p != "" {
					palette[0] = swatch{"Primary", p, "Primary brand color"}
				}
				if s, ok := c["secondary"].(string); ok && s != "" {
					palette[1] = swatch{"Secondary", s, "Secondary brand color"}
				}
				if a, ok := c["accent"].(string); ok && a != "" {
					palette[2] = swatch{"Accent", a, "Accent / CTA color"}
				}
			}
		}
	}
	palette = append(palette, []swatch{
		{"Dark", dark, "Dark backgrounds"},
		{"Light", "#ffffff", "Light backgrounds"},
		{"Text", "#1a1a2e", "Body text"},
	}...)

	for _, s := range palette {
		textColor := "#1a1a2e"
		relLum := relativeLuminance(s.hex)
		if relLum < 0.3 {
			textColor = "#ffffff"
		}
		sb.WriteString(fmt.Sprintf(`<div class="card"><div class="swatch" style="background:%s"></div><div class="color-label" style="color:%s">%s</div><div class="color-hex">%s</div><p style="font-size:12px;margin-top:8px">%s</p></div>`,
			s.hex, textColor, s.name, s.hex, s.label))
	}

	sb.WriteString(`</div></div>`)
	return sb.String()
}

func typoSections(typos []interface{}, fontHeading, fontBody, primary string) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`<div class="section section-alt"><h2>Typography</h2><p>Font pairing for headings and body text, with Google Fonts availability.</p><div class="grid" style="margin-top:32px">`))

	// Default pair
	pairs := []struct {
		name    string
		heading string
		body    string
	}{
		{"Primary Pair", fontHeading, fontBody},
	}

	for _, t := range typos {
		if tp, ok := t.(map[string]interface{}); ok {
			h := stringValue(tp, "primaryFont", "")
			b := stringValue(tp, "secondaryFont", "")
			if h != "" && b != "" && h != fontHeading {
				pairs = append(pairs, struct {
					name    string
					heading string
					body    string
				}{stringValue(tp, "name", "Alternate"), h, b})
			}
		}
	}

	for _, p := range pairs {
		sb.WriteString(fmt.Sprintf(`<div class="card"><div style="margin-bottom:16px"><span style="padding:4px 12px;border-radius:12px;background:%s15;color:%s;font-size:12px;font-weight:600">%s</span></div>
<div style="font-family:'%s',sans-serif;font-size:28px;font-weight:700;margin-bottom:4px">Heading</div>
<div style="font-family:'%s',sans-serif;font-size:14px;color:#64748b;margin-bottom:12px">Body text sample — The quick brown fox jumps over the lazy dog.</div>
<div style="font-size:12px;color:#64748b">Heading: %s<br>Body: %s</div></div>`,
			primary, primary, p.name, p.heading, p.body, p.heading, p.body))
	}

	sb.WriteString(`</div></div>`)
	return sb.String()
}

func usageSections(primary, dark string) string {
	return fmt.Sprintf(`<div class="section"><h2>Usage Guidelines</h2><p>Rules for applying the brand identity consistently across all media.</p>
<div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div><h3 style="color:#10b981">✓ Do</h3>
<div class="rule-card rule-do"><strong>Clear space</strong><br>Maintain minimum padding equal to the height of the logo mark on all sides.</div>
<div class="rule-card rule-do"><strong>Single color</strong><br>Use full-color logo on white backgrounds. Use white logo on dark backgrounds.</div>
<div class="rule-card rule-do"><strong>Minimum size</strong><br>Digital: 32px height minimum. Print: 0.5in width minimum.</div>
</div>
<div><h3 style="color:#ef4444">✗ Don't</h3>
<div class="rule-card rule-dont"><strong>Don't distort</strong><br>Never stretch, skew, rotate, or alter the logo proportions.</div>
<div class="rule-card rule-dont"><strong>Don't recolor</strong><br>Never apply custom colors, gradients, or effects not in the brand palette.</div>
<div class="rule-card rule-dont"><strong>Don't crowd</strong><br>Never place the logo on busy backgrounds that reduce readability.</div>
</div>
</div>
<div style="margin-top:48px;padding:24px;background:linear-gradient(135deg,%s,%s);border-radius:16px;color:#fff;text-align:center">
<h3 style="color:#fff">Brand Voice</h3>
<p style="color:rgba(255,255,255,.8)">Confident, clear, and human. Write as an expert who simplifies complexity. Avoid jargon, hype, and empty superlatives.</p>
</div>
</div>`, primary, dark)
}

func mockupSections(brandKit map[string]interface{}, name, primary, secondary string) string {
	mockups, _ := brandKit["mockups"].([]interface{})
	if len(mockups) == 0 {
		return fmt.Sprintf(`<div class="section section-alt"><h2>Brand Applications</h2><p>Mockup visualizations for %s will appear here after generation.</p></div>`, html.EscapeString(name))
	}
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`<div class="section section-alt"><h2>Brand Applications</h2><p>%s brand applied to real-world items.</p><div class="grid" style="margin-top:32px">`, html.EscapeString(name)))
	for _, m := range mockups {
		if mp, ok := m.(map[string]interface{}); ok {
			svg := stringValue(mp, "svg", "")
			title := stringValue(mp, "title", "Mockup")
			desc := stringValue(mp, "description", "")
			sb.WriteString(fmt.Sprintf(`<div class="card"><div>%s</div><h3 style="margin-top:12px">%s</h3><p style="font-size:13px">%s</p></div>`, svg, title, desc))
		}
	}
	sb.WriteString(`</div></div>`)
	return sb.String()
}

func guideFooter(primary, dark string) string {
	return fmt.Sprintf(`<div style="padding:40px;background:%s;color:#fff;text-align:center"><p style="color:rgba(255,255,255,.6);font-size:13px">Generated by VentureMate AI — Brand Identity Guide</p></div>`, dark)
}

func svgToInlineDataURL(svg string) string {
	return "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(svg))
}
