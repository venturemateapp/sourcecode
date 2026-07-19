package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/venturemate/vmbackend/internal/banking"
	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/domains"
	"github.com/venturemate/vmbackend/internal/investors"
	"github.com/venturemate/vmbackend/internal/invoices"
	"github.com/venturemate/vmbackend/internal/recraft"
	"github.com/venturemate/vmbackend/internal/websites"
)

type ToolFunc func(ctx context.Context, userID string, args map[string]interface{}) (string, error)

type Tool struct {
	Def  ToolDef
	Exec ToolFunc
}

type ToolDependencies struct {
	BusinessRepo    *businesses.Repository
	DomainRepo      *domains.Repository
	WebsiteRepo     *websites.Repository
	BankAccountRepo *banking.Repository
	InvoiceRepo     *invoices.Repository
	InvestorRepo    *investors.Repository
	FileHandler     *FileHandler
	RecraftClient   *recraft.Client
}

type ToolRegistry struct {
	tools map[string]Tool
}

// NewToolRegistry is retained for compatibility with older call sites.
func NewToolRegistry(bizRepo *businesses.Repository, fh *FileHandler) *ToolRegistry {
	return NewFullToolRegistry(ToolDependencies{BusinessRepo: bizRepo, FileHandler: fh})
}

func NewFullToolRegistry(deps ToolDependencies) *ToolRegistry {
	tr := &ToolRegistry{tools: make(map[string]Tool)}
	if deps.BusinessRepo != nil {
		tr.register(getBusinessInfoTool(deps.BusinessRepo))
		tr.register(updateBusinessFieldTool(deps.BusinessRepo))
		tr.register(listBusinessesTool(deps.BusinessRepo))
		tr.register(generateSVGLogoTool(deps.BusinessRepo, deps.RecraftClient))
		tr.register(deleteBusinessTool(deps.BusinessRepo))
	}
	if deps.DomainRepo != nil && deps.BusinessRepo != nil {
		tr.register(getDomainDataTool(deps.BusinessRepo, deps.DomainRepo))
		tr.register(upsertDomainDataTool(deps.BusinessRepo, deps.DomainRepo))
		tr.register(deleteDomainDataTool(deps.BusinessRepo, deps.DomainRepo))
	}
	if deps.WebsiteRepo != nil && deps.BusinessRepo != nil {
		tr.register(getWebsiteTool(deps.BusinessRepo, deps.WebsiteRepo))
		tr.register(saveWebsiteTool(deps.BusinessRepo, deps.WebsiteRepo))
		tr.register(connectWebsiteDomainTool(deps.BusinessRepo, deps.WebsiteRepo))
		tr.register(verifyWebsiteDomainTool(deps.BusinessRepo, deps.WebsiteRepo))
		tr.register(publishWebsiteTool(deps.BusinessRepo, deps.WebsiteRepo))
		tr.register(unpublishWebsiteTool(deps.BusinessRepo, deps.WebsiteRepo))
		tr.register(deleteWebsiteTool(deps.BusinessRepo, deps.WebsiteRepo))
	}
	if deps.BankAccountRepo != nil && deps.BusinessRepo != nil {
		tr.register(listBankAccountsTool(deps.BusinessRepo, deps.BankAccountRepo))
		tr.register(createBankAccountTool(deps.BusinessRepo, deps.BankAccountRepo))
		tr.register(updateBankAccountTool(deps.BusinessRepo, deps.BankAccountRepo))
		tr.register(deleteBankAccountTool(deps.BusinessRepo, deps.BankAccountRepo))
	}
	if deps.InvoiceRepo != nil && deps.BusinessRepo != nil {
		tr.register(listInvoicesTool(deps.BusinessRepo, deps.InvoiceRepo))
		tr.register(createInvoiceTool(deps.BusinessRepo, deps.InvoiceRepo))
		tr.register(updateInvoiceStatusTool(deps.BusinessRepo, deps.InvoiceRepo))
		tr.register(deleteInvoiceTool(deps.BusinessRepo, deps.InvoiceRepo))
	}
	if deps.InvestorRepo != nil {
		tr.register(listInvestorsTool(deps.InvestorRepo))
	}
	if deps.FileHandler != nil {
		tr.register(uploadDocumentTool(deps.FileHandler))
		tr.register(analyzeDocumentTool(deps.FileHandler))
		tr.register(deleteDocumentTool(deps.FileHandler))
	}
	return tr
}

func (tr *ToolRegistry) register(t Tool) {
	tr.tools[t.Def.Name] = t
}

func (tr *ToolRegistry) GetDefs() []ToolDef {
	defs := make([]ToolDef, 0, len(tr.tools))
	for _, t := range tr.tools {
		defs = append(defs, t.Def)
	}
	return defs
}

func (tr *ToolRegistry) Execute(ctx context.Context, userID string, call ToolCall) (string, error) {
	t, ok := tr.tools[call.Name]
	if !ok {
		return "", fmt.Errorf("unknown tool: %s", call.Name)
	}
	return t.Exec(ctx, userID, call.Args)
}

func ensureBusinessAccess(ctx context.Context, repo *businesses.Repository, userID, businessID string) (*businesses.Business, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(businessID) == "" {
		return nil, fmt.Errorf("user and business context are required")
	}
	biz, err := repo.GetByIDAndUser(ctx, businessID, userID)
	if err != nil || biz == nil {
		return nil, fmt.Errorf("business not found or access denied")
	}
	return biz, nil
}

func getBusinessInfoTool(repo *businesses.Repository) Tool {
	return Tool{Def: ToolDef{Name: "getBusinessInfo", Description: "Get the complete current business record for the signed-in user.", Parameters: rawSchema(`{
		"type":"object","properties":{"businessId":{"type":"string"}},"required":["businessId"]
	}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		biz, err := ensureBusinessAccess(ctx, repo, userID, asString(args, "businessId"))
		if err != nil {
			return jsonError(err), nil
		}
		return jsonValue(biz), nil
	}}
}

func listBusinessesTool(repo *businesses.Repository) Tool {
	return Tool{Def: ToolDef{Name: "listBusinesses", Description: "List the signed-in user's businesses.", Parameters: rawSchema(`{"type":"object","properties":{}}`)}, Exec: func(ctx context.Context, userID string, _ map[string]interface{}) (string, error) {
		list, err := repo.ListByUser(ctx, userID)
		if err != nil {
			return jsonError(err), nil
		}
		type brief struct{ ID, Name, Industry, Stage, Status string }
		out := make([]brief, 0, len(list))
		for _, b := range list {
			out = append(out, brief{b.ID, b.Name, b.Industry, b.Stage, b.Status})
		}
		return jsonValue(out), nil
	}}
}

func updateBusinessFieldTool(repo *businesses.Repository) Tool {
	return Tool{Def: ToolDef{Name: "updateBusinessField", Description: "Update one non-creative business field. Creative assets (brandKit, pitchDeck, businessPlan, websiteConfig) must use the proposal and approval workflow.", Parameters: rawSchema(`{
		"type":"object","properties":{
			"businessId":{"type":"string"},
			"field":{"type":"string","enum":["name","tagline","description","industry","stage","location","website","status","milestones","team","documents","financials","metrics","aiGenerated"]},
			"value":{"type":"string"}
		},"required":["businessId","field","value"]
	}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		biz, err := ensureBusinessAccess(ctx, repo, userID, asString(args, "businessId"))
		if err != nil {
			return jsonError(err), nil
		}
		field, value := asString(args, "field"), asString(args, "value")
		switch field {
		case "brandKit", "pitchDeck", "businessPlan", "websiteConfig", "websiteDraft":
			return jsonError(fmt.Errorf("%s uses the AI proposal and user approval workflow", field)), nil
		}
		if isJSONBusinessField(field) && !json.Valid([]byte(value)) {
			return jsonError(fmt.Errorf("%s must be valid JSON", field)), nil
		}
		switch field {
		case "name":
			biz.Name = value
		case "tagline":
			biz.Tagline = value
		case "description":
			biz.Description = value
		case "industry":
			biz.Industry = value
		case "stage":
			biz.Stage = value
		case "location":
			biz.Location = value
		case "website":
			biz.Website = value
		case "status":
			biz.Status = value
		case "brandKit":
			biz.BrandKit = value
		case "pitchDeck":
			biz.PitchDeck = value
		case "businessPlan":
			biz.BusinessPlan = value
		case "milestones":
			biz.Milestones = value
		case "team":
			biz.Team = value
		case "documents":
			biz.Documents = value
		case "websiteConfig":
			biz.WebsiteConfig = value
		case "financials":
			biz.Financials = value
		case "metrics":
			biz.Metrics = value
		case "aiGenerated":
			biz.AIGenerated = value
		default:
			return jsonError(fmt.Errorf("unsupported field %q", field)), nil
		}
		if err := repo.Update(ctx, biz); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "field": field, "message": "Business updated"}), nil
	}}
}

func deleteBusinessTool(repo *businesses.Repository) Tool {
	return Tool{Def: ToolDef{Name: "deleteBusiness", Description: "Permanently delete a business. Only call after the user explicitly confirms permanent deletion and supplies the exact business name.", Parameters: rawSchema(`{
		"type":"object","properties":{"businessId":{"type":"string"},"businessName":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["businessId","businessName","confirmed"]
	}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		biz, err := ensureBusinessAccess(ctx, repo, userID, asString(args, "businessId"))
		if err != nil {
			return jsonError(err), nil
		}
		if !asBool(args, "confirmed") || asString(args, "businessName") != biz.Name {
			return jsonError(fmt.Errorf("permanent deletion requires explicit confirmation and the exact business name")), nil
		}
		if err := repo.Delete(ctx, biz.ID, userID); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Business permanently deleted"}), nil
	}}
}

func generateSVGLogoTool(repo *businesses.Repository, rc *recraft.Client) Tool {
	return Tool{Def: ToolDef{Name: "generateSVGLogo", Description: "Generate a logo. Uses Recraft AI for high-quality logos. Save it only when the user explicitly approved this exact version.", Parameters: rawSchema(`{
		"type":"object","properties":{
			"businessId":{"type":"string"},"label":{"type":"string"},"primaryColor":{"type":"string"},"secondaryColor":{"type":"string"},"shape":{"type":"string","enum":["rounded","circle","square"]},"confirmed":{"type":"boolean"}
		},"required":["businessId"]
	}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		biz, err := ensureBusinessAccess(ctx, repo, userID, asString(args, "businessId"))
		if err != nil {
			return jsonError(err), nil
		}
		primary := validHexOr(asString(args, "primaryColor"), "#10b981")
		label := strings.TrimSpace(asString(args, "label"))
		if label == "" {
			label = biz.Name
		}
		secondary := "#059669"
		accent := "#34d399"
		if biz.BrandKit != "" {
			var bk map[string]interface{}
			if json.Unmarshal([]byte(biz.BrandKit), &bk) == nil {
				if s, ok := bk["secondaryColor"].(string); ok { secondary = s }
				if a, ok := bk["accentColor"].(string); ok { accent = a }
			}
		}

		// Use Recraft for high-quality logo generation
		var logoURL string
		var svgURL string
		if rc != nil {
			prompt := fmt.Sprintf(`Create a premium, production-ready logo for "%s".

VISUAL DIRECTION:
Style: Modern geometric minimalist with a luxury-finish feel
Aesthetic: High-end, sophisticated, timeless — looks like a top 10 global brand
Color Palette: Primary %s, Secondary %s, Accent %s (use these exact colors prominently)
Mood: Confident but approachable, cutting-edge but grounded

DESIGN SPECIFICATIONS:
- Geometric, scalable form — works at favicon 16px and billboard 1000px+
- Central motif incorporating the brand's core purpose subtly (no literal icons)
- Negative space integration — logo reads instantly at small scale
- Clean vector lines, precise geometric construction
- Solid color blocks only — zero gradients, shadows, or effects
- Full-color vibrant design, NOT black and white, NOT monochrome

TECHNICAL OUTPUT:
- Vector-quality design suitable for SVG
- Icon-only mark for standalone use (works with or without wordmark)
- Maximum 3 distinct color areas in the main composition

WHAT NOT TO DO:
- No drop shadows, glows, lens flares, or any effects
- No gradients or gradient fills of any kind
- Avoid clichés: no generic globes, swooshes, or tech circles
- No trendy or dated elements — design for longevity
- Do NOT make it monochrome, black and white, or grayscale

Make it unforgettable — a logo people recognize instantly from the shape alone.`, label, primary, secondary, accent)
			result, err := rc.GenerateLogo(prompt)
			if err == nil && len(result.Data) > 0 {
				logoURL = result.Data[0].URL
				if svg, err := rc.VectorizeImage(logoURL); err == nil {
					svgURL = svg
				}
			}
		}

		// Fallback to local SVG if Recraft unavailable
		if logoURL == "" {
			secondary := validHexOr(asString(args, "secondaryColor"), "#059669")
			initials := label
			if len([]rune(initials)) > 4 {
				initials = string([]rune(initials)[:4])
			}
			shape := asString(args, "shape")
			rx := "24"
			if shape == "square" {
				rx = "0"
			}
			if shape == "circle" {
				rx = "64"
			}
			svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient></defs><rect width="128" height="128" rx="%s" fill="url(#g)"/><text x="64" y="74" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="42" font-weight="700">%s</text></svg>`, primary, secondary, rx, html.EscapeString(initials))
			logoURL = "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(svg))
			svgURL = logoURL
		}

		brand := map[string]interface{}{}
		if json.Valid([]byte(biz.BrandKit)) {
			_ = json.Unmarshal([]byte(biz.BrandKit), &brand)
		}
		brand["logo"], brand["logoWhite"], brand["logoIcon"] = logoURL, logoURL, svgURL
		brand["primaryColor"] = primary
		if !asBool(args, "confirmed") {
			return jsonValue(map[string]interface{}{"success": true, "preview": true, "saved": false, "logo": logoURL, "brandKit": brand, "message": "Logo proposal generated but not saved. The user must approve this exact version."}), nil
		}
		brandBytes, _ := json.Marshal(brand)
		biz.BrandKit = string(brandBytes)
		if err := repo.Update(ctx, biz); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "saved": true, "logo": logoURL, "message": "Approved logo saved"}), nil
	}}
}

func getDomainDataTool(bizRepo *businesses.Repository, repo *domains.Repository) Tool {
	return Tool{Def: ToolDef{Name: "getDomainData", Description: "Read JSON data for a startup OS module such as crm, social, marketplace, banking notes, market research, financial forecast, messages, settings, or any other module.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"domain":{"type":"string"}},"required":["businessId","domain"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		data, err := repo.Get(ctx, businessID, normalizeDomain(asString(args, "domain")))
		if err != nil {
			return jsonError(err), nil
		}
		if data == nil {
			return `{"data":{},"exists":false}`, nil
		}
		return jsonValue(data), nil
	}}
}

func upsertDomainDataTool(bizRepo *businesses.Repository, repo *domains.Repository) Tool {
	return Tool{Def: ToolDef{Name: "upsertDomainData", Description: "Create or replace a module's complete JSON data. Preserve existing fields unless the user explicitly requests their removal.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"domain":{"type":"string"},"data":{"type":"string","description":"Complete valid JSON object or array"}},"required":["businessId","domain","data"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID, data := asString(args, "businessId"), asString(args, "data")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		if !json.Valid([]byte(data)) {
			return jsonError(fmt.Errorf("data must be valid JSON")), nil
		}
		result, err := repo.Upsert(ctx, businessID, normalizeDomain(asString(args, "domain")), data)
		if err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "domainData": result}), nil
	}}
}

func deleteDomainDataTool(bizRepo *businesses.Repository, repo *domains.Repository) Tool {
	return Tool{Def: ToolDef{Name: "deleteDomainData", Description: "Permanently clear all stored data for one module. Requires explicit confirmation.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"domain":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["businessId","domain","confirmed"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		if !asBool(args, "confirmed") {
			return jsonError(fmt.Errorf("explicit confirmation is required")), nil
		}
		if err := repo.Delete(ctx, businessID, normalizeDomain(asString(args, "domain"))); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Module data permanently deleted"}), nil
	}}
}

func defaultWebsiteSubdomain(ctx context.Context, repo *websites.Repository, businessName, businessID string) string {
	var b strings.Builder
	lastHyphen := false
	for _, r := range strings.ToLower(strings.TrimSpace(businessName)) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastHyphen = false
		} else if b.Len() > 0 && !lastHyphen {
			b.WriteByte('-')
			lastHyphen = true
		}
	}
	candidate := strings.Trim(b.String(), "-")
	compactID := strings.ToLower(strings.ReplaceAll(businessID, "-", ""))
	if len(compactID) > 8 {
		compactID = compactID[:8]
	}
	if len(candidate) < 3 {
		candidate = "business-" + compactID
	}
	if len(candidate) > 63 {
		candidate = strings.Trim(candidate[:63], "-")
	}
	if normalized, err := websites.NormalizeSubdomain(candidate); err == nil {
		if available, _, checkErr := repo.IsSubdomainAvailable(ctx, normalized, ""); checkErr == nil && available {
			return normalized
		}
	}
	if compactID == "" {
		compactID = strconv.FormatInt(time.Now().Unix(), 36)
	}
	maxBase := 62 - len(compactID)
	if maxBase < 3 {
		maxBase = 3
	}
	if len(candidate) > maxBase {
		candidate = candidate[:maxBase]
	}
	candidate = strings.Trim(candidate, "-") + "-" + compactID
	if normalized, err := websites.NormalizeSubdomain(candidate); err == nil {
		return normalized
	}
	return "business-" + compactID
}

func getWebsiteTool(bizRepo *businesses.Repository, repo *websites.Repository) Tool {
	return Tool{Def: ToolDef{Name: "getWebsite", Description: "Get the selected business website and available templates.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"}},"required":["businessId"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		website, err := repo.GetWebsiteByBusiness(ctx, businessID)
		if err != nil {
			return jsonError(err), nil
		}
		templates, _ := repo.ListTemplates(ctx)
		baseDomain := strings.TrimSpace(os.Getenv("PUBLIC_SITE_BASE_DOMAIN"))
		if baseDomain == "" {
			baseDomain = "venturemate.net"
		}
		cnameTarget := strings.TrimSpace(os.Getenv("PUBLIC_SITE_CNAME_TARGET"))
		if cnameTarget == "" {
			cnameTarget = "sites." + baseDomain
		}
		return jsonValue(map[string]interface{}{"website": website, "templates": templates, "publicBaseDomain": baseDomain, "customDomainCNAMETarget": cnameTarget, "publishingMode": "draft changes stay private until explicitly published"}), nil
	}}
}

func saveWebsiteTool(bizRepo *businesses.Repository, repo *websites.Repository) Tool {
	return Tool{Def: ToolDef{Name: "saveWebsite", Description: "Create or update the full website configuration for the selected business.", Parameters: rawSchema(`{
		"type":"object","properties":{"businessId":{"type":"string"},"templateId":{"type":"string"},"subdomain":{"type":"string"},"customDomain":{"type":"string"},"pages":{"type":"string"},"globalStyles":{"type":"string"},"navigation":{"type":"string"},"footer":{"type":"string"}},"required":["businessId","pages"]
	}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		biz, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID)
		if err != nil {
			return jsonError(err), nil
		}
		for _, key := range []string{"pages", "globalStyles", "navigation", "footer"} {
			if v := asString(args, key); v != "" && !json.Valid([]byte(v)) {
				return jsonError(fmt.Errorf("%s must be valid JSON", key)), nil
			}
		}
		w, err := repo.GetWebsiteByBusiness(ctx, businessID)
		if err != nil {
			return jsonError(err), nil
		}
		if w == nil {
			w = &websites.UserWebsite{BusinessID: businessID, Status: websites.StatusDraft}
		}
		if v := asString(args, "templateId"); v != "" {
			w.TemplateID = v
		}
		if v := asString(args, "subdomain"); v != "" {
			w.Subdomain = v
		}
		if strings.TrimSpace(w.Subdomain) == "" {
			w.Subdomain = defaultWebsiteSubdomain(ctx, repo, biz.Name, businessID)
		}
		_, customDomainProvided := args["customDomain"]
		if v := asString(args, "pages"); v != "" {
			w.Pages = v
		}
		if v := asString(args, "globalStyles"); v != "" {
			w.GlobalStyles = v
		}
		if v := asString(args, "navigation"); v != "" {
			w.Navigation = v
		}
		if v := asString(args, "footer"); v != "" {
			w.Footer = v
		}
		if w.ID == "" {
			err = repo.CreateWebsite(ctx, w)
		} else {
			err = repo.UpdateWebsite(ctx, w)
		}
		if err != nil {
			return jsonError(err), nil
		}
		if customDomainProvided {
			baseDomain := strings.TrimSpace(os.Getenv("PUBLIC_SITE_BASE_DOMAIN"))
			if baseDomain == "" {
				baseDomain = "venturemate.net"
			}
			w, err = repo.SetCustomDomain(ctx, w.ID, businessID, asString(args, "customDomain"), baseDomain)
			if err != nil {
				return jsonError(err), nil
			}
		}
		config := map[string]interface{}{"id": w.ID, "subdomain": w.Subdomain, "customDomain": w.CustomDomain, "status": w.Status, "template": w.TemplateID}
		var pages interface{}
		_ = json.Unmarshal([]byte(defaultJSON(w.Pages, "[]")), &pages)
		config["pages"] = pages
		configBytes, _ := json.Marshal(config)
		biz.WebsiteConfig = string(configBytes)
		_ = bizRepo.Update(ctx, biz)
		return jsonValue(map[string]interface{}{"success": true, "message": "Website draft saved. It remains private until the user explicitly publishes it.", "website": w}), nil
	}}
}

func connectWebsiteDomainTool(bizRepo *businesses.Repository, repo *websites.Repository) Tool {
	return Tool{Def: ToolDef{Name: "connectWebsiteDomain", Description: "Connect or remove a custom domain on the website draft. Returns DNS records that the user must configure before verification.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"domain":{"type":"string"}},"required":["businessId","domain"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		w, err := repo.GetWebsiteByBusiness(ctx, businessID)
		if err != nil || w == nil {
			return jsonError(fmt.Errorf("website not found")), nil
		}
		baseDomain := strings.TrimSpace(os.Getenv("PUBLIC_SITE_BASE_DOMAIN"))
		if baseDomain == "" {
			baseDomain = "venturemate.net"
		}
		cnameTarget := strings.TrimSpace(os.Getenv("PUBLIC_SITE_CNAME_TARGET"))
		if cnameTarget == "" {
			cnameTarget = "sites." + baseDomain
		}
		updated, err := repo.SetCustomDomain(ctx, w.ID, businessID, asString(args, "domain"), baseDomain)
		if err != nil {
			return jsonError(err), nil
		}
		if updated.CustomDomain == "" {
			return jsonValue(map[string]interface{}{"success": true, "message": "Custom domain removed from the draft. Republish to remove it from the live snapshot.", "website": updated}), nil
		}
		return jsonValue(map[string]interface{}{
			"success": true,
			"message": "Custom domain saved. Configure DNS, verify it, then explicitly republish the site.",
			"website": updated,
			"dns": map[string]interface{}{
				"recommendedCNAME": map[string]string{"host": updated.CustomDomain, "target": cnameTarget},
				"ownershipTXT":     map[string]string{"host": "_venturemate." + updated.CustomDomain, "value": updated.CustomDomainVerificationToken},
			},
		}), nil
	}}
}

func verifyWebsiteDomainTool(bizRepo *businesses.Repository, repo *websites.Repository) Tool {
	return Tool{Def: ToolDef{Name: "verifyWebsiteDomain", Description: "Verify DNS ownership/routing for the custom domain connected to the selected business website.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"}},"required":["businessId"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		w, err := repo.GetWebsiteByBusiness(ctx, businessID)
		if err != nil || w == nil {
			return jsonError(fmt.Errorf("website not found")), nil
		}
		baseDomain := strings.TrimSpace(os.Getenv("PUBLIC_SITE_BASE_DOMAIN"))
		if baseDomain == "" {
			baseDomain = "venturemate.net"
		}
		cnameTarget := strings.TrimSpace(os.Getenv("PUBLIC_SITE_CNAME_TARGET"))
		if cnameTarget == "" {
			cnameTarget = "sites." + baseDomain
		}
		verified, err := repo.VerifyCustomDomain(ctx, w.ID, businessID, cnameTarget)
		if err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Custom domain verified. Explicitly republish to use it as the live primary URL.", "website": verified}), nil
	}}
}

func publishWebsiteTool(bizRepo *businesses.Repository, repo *websites.Repository) Tool {
	return Tool{Def: ToolDef{Name: "publishWebsite", Description: "Publish a website. Requires the user's explicit confirmation because this makes changes public.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["businessId","confirmed"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		if !asBool(args, "confirmed") {
			return jsonError(fmt.Errorf("explicit confirmation is required before publishing")), nil
		}
		w, err := repo.GetWebsiteByBusiness(ctx, businessID)
		if err != nil || w == nil {
			return jsonError(fmt.Errorf("website not found")), nil
		}
		published, err := repo.PublishWebsite(ctx, w.ID, businessID)
		if err != nil {
			return jsonError(err), nil
		}
		baseDomain := strings.TrimSpace(os.Getenv("PUBLIC_SITE_BASE_DOMAIN"))
		if baseDomain == "" {
			baseDomain = "venturemate.net"
		}
		publicURL := "https://" + published.PublishedSubdomain + "." + baseDomain
		if published.PublishedCustomDomain != "" {
			publicURL = "https://" + published.PublishedCustomDomain
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Website published", "publicUrl": publicURL, "website": published}), nil
	}}
}

func unpublishWebsiteTool(bizRepo *businesses.Repository, repo *websites.Repository) Tool {
	return Tool{Def: ToolDef{Name: "unpublishWebsite", Description: "Take a published website offline. Requires explicit confirmation because the public site will stop serving immediately.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["businessId","confirmed"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		if !asBool(args, "confirmed") {
			return jsonError(fmt.Errorf("explicit confirmation is required before taking the website offline")), nil
		}
		w, err := repo.GetWebsiteByBusiness(ctx, businessID)
		if err != nil || w == nil {
			return jsonError(fmt.Errorf("website not found")), nil
		}
		updated, err := repo.UnpublishWebsite(ctx, w.ID, businessID)
		if err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Website is now offline. Its draft and previous snapshot were preserved for republishing.", "website": updated}), nil
	}}
}

func deleteWebsiteTool(bizRepo *businesses.Repository, repo *websites.Repository) Tool {
	return Tool{Def: ToolDef{Name: "deleteWebsite", Description: "Permanently delete the website. Requires explicit confirmation.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["businessId","confirmed"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		biz, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID)
		if err != nil {
			return jsonError(err), nil
		}
		if !asBool(args, "confirmed") {
			return jsonError(fmt.Errorf("explicit confirmation is required")), nil
		}
		w, err := repo.GetWebsiteByBusiness(ctx, businessID)
		if err != nil || w == nil {
			return jsonError(fmt.Errorf("website not found")), nil
		}
		if err := repo.DeleteWebsite(ctx, w.ID, businessID); err != nil {
			return jsonError(err), nil
		}
		biz.WebsiteConfig = "{}"
		_ = bizRepo.Update(ctx, biz)
		return jsonValue(map[string]interface{}{"success": true, "message": "Website permanently deleted"}), nil
	}}
}

func listBankAccountsTool(bizRepo *businesses.Repository, repo *banking.Repository) Tool {
	return Tool{Def: ToolDef{Name: "listBankAccounts", Description: "List bank accounts for the signed-in user, filtered to the selected business.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"}},"required":["businessId"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		list, err := repo.ListByUser(ctx, userID)
		if err != nil {
			return jsonError(err), nil
		}
		out := []banking.BankAccount{}
		for _, a := range list {
			if a.BusinessID == businessID {
				a.AccountNumber = maskAccountNumber(a.AccountNumber)
				out = append(out, a)
			}
		}
		return jsonValue(out), nil
	}}
}

func createBankAccountTool(bizRepo *businesses.Repository, repo *banking.Repository) Tool {
	return Tool{Def: ToolDef{Name: "createBankAccount", Description: "Create a bank account connection record for the selected business. Never invent account numbers.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"bankName":{"type":"string"},"accountType":{"type":"string"},"accountNumber":{"type":"string"},"accountName":{"type":"string"},"currency":{"type":"string"}},"required":["businessId","bankName","accountType","accountNumber","accountName","currency"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		a := &banking.BankAccount{UserID: userID, BusinessID: businessID, BankName: asString(args, "bankName"), AccountType: asString(args, "accountType"), AccountNumber: asString(args, "accountNumber"), AccountName: asString(args, "accountName"), Currency: asString(args, "currency")}
		if err := repo.Create(ctx, a); err != nil {
			return jsonError(err), nil
		}
		a.AccountNumber = maskAccountNumber(a.AccountNumber)
		return jsonValue(map[string]interface{}{"success": true, "account": a}), nil
	}}
}

func updateBankAccountTool(bizRepo *businesses.Repository, repo *banking.Repository) Tool {
	return Tool{Def: ToolDef{Name: "updateBankAccount", Description: "Update an existing bank account record owned by the signed-in user.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"accountId":{"type":"string"},"bankName":{"type":"string"},"accountType":{"type":"string"},"accountNumber":{"type":"string"},"accountName":{"type":"string"},"currency":{"type":"string"}},"required":["businessId","accountId"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		a, err := repo.GetByID(ctx, asString(args, "accountId"))
		if err != nil || a == nil || a.UserID != userID || a.BusinessID != businessID {
			return jsonError(fmt.Errorf("bank account not found or access denied")), nil
		}
		if v := asString(args, "bankName"); v != "" {
			a.BankName = v
		}
		if v := asString(args, "accountType"); v != "" {
			a.AccountType = v
		}
		if v := asString(args, "accountNumber"); v != "" {
			a.AccountNumber = v
		}
		if v := asString(args, "accountName"); v != "" {
			a.AccountName = v
		}
		if v := asString(args, "currency"); v != "" {
			a.Currency = v
		}
		if err := repo.Update(ctx, a); err != nil {
			return jsonError(err), nil
		}
		a.AccountNumber = maskAccountNumber(a.AccountNumber)
		return jsonValue(map[string]interface{}{"success": true, "account": a}), nil
	}}
}

func deleteBankAccountTool(bizRepo *businesses.Repository, repo *banking.Repository) Tool {
	return Tool{Def: ToolDef{Name: "deleteBankAccount", Description: "Permanently delete a bank account record. Requires explicit confirmation.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"accountId":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["businessId","accountId","confirmed"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		if !asBool(args, "confirmed") {
			return jsonError(fmt.Errorf("explicit confirmation is required")), nil
		}
		a, err := repo.GetByID(ctx, asString(args, "accountId"))
		if err != nil || a == nil || a.UserID != userID || a.BusinessID != businessID {
			return jsonError(fmt.Errorf("bank account not found or access denied")), nil
		}
		if err := repo.Delete(ctx, a.ID, userID); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Bank account removed"}), nil
	}}
}

func listInvoicesTool(bizRepo *businesses.Repository, repo *invoices.Repository) Tool {
	return Tool{Def: ToolDef{Name: "listInvoices", Description: "List invoices for the selected business.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"}},"required":["businessId"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		list, err := repo.ListByBusiness(ctx, businessID)
		if err != nil {
			return jsonError(err), nil
		}
		out := []invoices.Invoice{}
		for _, inv := range list {
			if inv.UserID == userID {
				out = append(out, inv)
			}
		}
		return jsonValue(out), nil
	}}
}

func createInvoiceTool(bizRepo *businesses.Repository, repo *invoices.Repository) Tool {
	return Tool{Def: ToolDef{Name: "createInvoice", Description: "Create an invoice for the selected business. Items must be a valid JSON array.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"invoiceNumber":{"type":"string"},"customerName":{"type":"string"},"customerEmail":{"type":"string"},"amount":{"type":"number"},"currency":{"type":"string"},"dueDate":{"type":"string","description":"YYYY-MM-DD"},"issueDate":{"type":"string","description":"YYYY-MM-DD"},"items":{"type":"string"},"notes":{"type":"string"}},"required":["businessId","invoiceNumber","customerName","amount","currency","dueDate"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		due, err := parseDate(asString(args, "dueDate"))
		if err != nil {
			return jsonError(err), nil
		}
		issue := time.Now()
		if v := asString(args, "issueDate"); v != "" {
			issue, err = parseDate(v)
			if err != nil {
				return jsonError(err), nil
			}
		}
		items := defaultJSON(asString(args, "items"), "[]")
		if !json.Valid([]byte(items)) {
			return jsonError(fmt.Errorf("items must be valid JSON")), nil
		}
		inv := &invoices.Invoice{UserID: userID, BusinessID: businessID, InvoiceNumber: asString(args, "invoiceNumber"), CustomerName: asString(args, "customerName"), CustomerEmail: asString(args, "customerEmail"), Amount: asFloat(args, "amount"), Currency: asString(args, "currency"), Status: "draft", DueDate: due, IssueDate: issue, Items: items, Notes: asString(args, "notes")}
		if err := repo.Create(ctx, inv); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "invoice": inv}), nil
	}}
}

func updateInvoiceStatusTool(bizRepo *businesses.Repository, repo *invoices.Repository) Tool {
	return Tool{Def: ToolDef{Name: "updateInvoiceStatus", Description: "Update an invoice status for an invoice owned by the signed-in user.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"invoiceId":{"type":"string"},"status":{"type":"string","enum":["draft","sent","paid","overdue","cancelled"]}},"required":["businessId","invoiceId","status"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		inv, err := repo.GetByID(ctx, asString(args, "invoiceId"))
		if err != nil || inv == nil || inv.UserID != userID || inv.BusinessID != businessID {
			return jsonError(fmt.Errorf("invoice not found or access denied")), nil
		}
		if err := repo.UpdateStatus(ctx, inv.ID, asString(args, "status")); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Invoice status updated"}), nil
	}}
}

func deleteInvoiceTool(bizRepo *businesses.Repository, repo *invoices.Repository) Tool {
	return Tool{Def: ToolDef{Name: "deleteInvoice", Description: "Permanently delete an invoice. Requires explicit confirmation.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"invoiceId":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["businessId","invoiceId","confirmed"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		businessID := asString(args, "businessId")
		if _, err := ensureBusinessAccess(ctx, bizRepo, userID, businessID); err != nil {
			return jsonError(err), nil
		}
		if !asBool(args, "confirmed") {
			return jsonError(fmt.Errorf("explicit confirmation is required")), nil
		}
		inv, err := repo.GetByID(ctx, asString(args, "invoiceId"))
		if err != nil || inv == nil || inv.UserID != userID || inv.BusinessID != businessID {
			return jsonError(fmt.Errorf("invoice not found or access denied")), nil
		}
		if err := repo.Delete(ctx, inv.ID, userID); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Invoice deleted"}), nil
	}}
}

func listInvestorsTool(repo *investors.Repository) Tool {
	return Tool{Def: ToolDef{Name: "listInvestors", Description: "List investor directory records for research and matching. This is read-only for normal users.", Parameters: rawSchema(`{"type":"object","properties":{}}`)}, Exec: func(ctx context.Context, _ string, _ map[string]interface{}) (string, error) {
		list, err := repo.List(ctx)
		if err != nil {
			return jsonError(err), nil
		}
		return jsonValue(list), nil
	}}
}

func uploadDocumentTool(fh *FileHandler) Tool {
	return Tool{Def: ToolDef{Name: "uploadDocument", Description: "Upload a document supplied as base64 to the current business.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"fileName":{"type":"string"},"fileDataBase64":{"type":"string"},"category":{"type":"string"},"tags":{"type":"string"}},"required":["businessId","fileName","fileDataBase64"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		data, err := base64.StdEncoding.DecodeString(asString(args, "fileDataBase64"))
		if err != nil {
			return jsonError(fmt.Errorf("invalid base64 data")), nil
		}
		category := asString(args, "category")
		if category == "" {
			category = "other"
		}
		doc, err := fh.ProcessUpload(ctx, data, asString(args, "fileName"), category, splitAndTrim(asString(args, "tags"), ","), asString(args, "businessId"), userID)
		if err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "document": doc}), nil
	}}
}

func analyzeDocumentTool(fh *FileHandler) Tool {
	return Tool{Def: ToolDef{Name: "analyzeDocument", Description: "Analyze an uploaded business document with the configured AI provider.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"documentId":{"type":"string"},"provider":{"type":"string"}},"required":["businessId","documentId"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		analysis, err := fh.AnalyzeDocumentWithProvider(ctx, asString(args, "documentId"), asString(args, "businessId"), userID, asString(args, "provider"))
		if err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "analysis": analysis}), nil
	}}
}

func deleteDocumentTool(fh *FileHandler) Tool {
	return Tool{Def: ToolDef{Name: "deleteDocument", Description: "Permanently delete an uploaded document. Requires explicit confirmation.", Parameters: rawSchema(`{"type":"object","properties":{"businessId":{"type":"string"},"documentId":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["businessId","documentId","confirmed"]}`)}, Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
		if !asBool(args, "confirmed") {
			return jsonError(fmt.Errorf("explicit confirmation is required")), nil
		}
		if err := fh.DeleteDocument(ctx, asString(args, "documentId"), asString(args, "businessId"), userID); err != nil {
			return jsonError(err), nil
		}
		return jsonValue(map[string]interface{}{"success": true, "message": "Document deleted"}), nil
	}}
}

func rawSchema(value string) json.RawMessage { return json.RawMessage(value) }
func jsonValue(value interface{}) string     { b, _ := json.Marshal(value); return string(b) }
func jsonError(err error) string             { return jsonValue(map[string]interface{}{"error": err.Error()}) }
func asString(args map[string]interface{}, key string) string {
	if v, ok := args[key]; ok {
		switch t := v.(type) {
		case string:
			return strings.TrimSpace(t)
		case json.Number:
			return t.String()
		case float64:
			return strconv.FormatFloat(t, 'f', -1, 64)
		default:
			b, _ := json.Marshal(t)
			return string(b)
		}
	}
	return ""
}
func asBool(args map[string]interface{}, key string) bool {
	if v, ok := args[key]; ok {
		switch t := v.(type) {
		case bool:
			return t
		case string:
			b, _ := strconv.ParseBool(t)
			return b
		}
	}
	return false
}
func asFloat(args map[string]interface{}, key string) float64 {
	if v, ok := args[key]; ok {
		switch t := v.(type) {
		case float64:
			return t
		case json.Number:
			f, _ := t.Float64()
			return f
		case string:
			f, _ := strconv.ParseFloat(t, 64)
			return f
		}
	}
	return 0
}
func splitAndTrim(s, sep string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, sep)
	out := []string{}
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
func normalizeDomain(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "_", "-")
	s = strings.ReplaceAll(s, " ", "-")
	return s
}
func isJSONBusinessField(field string) bool {
	switch field {
	case "brandKit", "pitchDeck", "businessPlan", "milestones", "team", "documents", "websiteConfig", "websiteDraft", "financials", "metrics", "aiGenerated":
		return true
	}
	return false
}
func defaultJSON(v, fallback string) string {
	if strings.TrimSpace(v) == "" {
		return fallback
	}
	return v
}
func parseDate(v string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", v)
	if err != nil {
		return time.Time{}, fmt.Errorf("date must use YYYY-MM-DD")
	}
	return t, nil
}
func maskAccountNumber(v string) string {
	r := []rune(strings.TrimSpace(v))
	if len(r) <= 4 {
		return strings.Repeat("•", len(r))
	}
	return strings.Repeat("•", len(r)-4) + string(r[len(r)-4:])
}
func validHexOr(v, fallback string) string {
	v = strings.TrimSpace(v)
	if len(v) == 7 && v[0] == '#' {
		for _, c := range v[1:] {
			if !strings.ContainsRune("0123456789abcdefABCDEF", c) {
				return fallback
			}
		}
		return v
	}
	return fallback
}
func initials(name string) string {
	parts := strings.Fields(name)
	if len(parts) == 0 {
		return "VM"
	}
	out := []rune{}
	for _, p := range parts {
		r := []rune(p)
		if len(r) > 0 {
			out = append(out, r[0])
		}
		if len(out) == 2 {
			break
		}
	}
	return strings.ToUpper(string(out))
}
