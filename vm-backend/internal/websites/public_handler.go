package websites

import (
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

type PublicHandler struct {
	repo          *Repository
	baseDomain    string
	customTarget  string
	contactMu     sync.Mutex
	contactLimits map[string]contactLimit
}

type contactLimit struct {
	Count   int
	Expires time.Time
}

func NewPublicHandler(repo *Repository, baseDomain, customTarget string) *PublicHandler {
	baseDomain = strings.ToLower(strings.TrimSpace(baseDomain))
	if baseDomain == "" {
		baseDomain = "venturemate.net"
	}
	customTarget = strings.ToLower(strings.TrimSuffix(strings.TrimSpace(customTarget), "."))
	if customTarget == "" {
		customTarget = "sites." + baseDomain
	}
	return &PublicHandler{repo: repo, baseDomain: baseDomain, customTarget: customTarget, contactLimits: make(map[string]contactLimit)}
}

func (h *PublicHandler) AllowDomain(w http.ResponseWriter, r *http.Request) {
	domain := strings.TrimSpace(r.URL.Query().Get("domain"))
	if domain == "" {
		http.Error(w, "domain is required", http.StatusBadRequest)
		return
	}
	allowed, err := h.repo.IsDomainAllowed(r.Context(), domain, h.baseDomain)
	if err != nil {
		log.Printf("public-site domain authorization failed for %q: %v", domain, err)
		http.Error(w, "domain check failed", http.StatusInternalServerError)
		return
	}
	if !allowed {
		http.Error(w, "domain is not connected to a published VentureMate site", http.StatusForbidden)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("allowed"))
}

func (h *PublicHandler) SubdomainAvailability(w http.ResponseWriter, r *http.Request) {
	value := r.URL.Query().Get("subdomain")
	exclude := r.URL.Query().Get("websiteId")
	available, normalized, err := h.repo.IsSubdomainAvailable(r.Context(), value, exclude)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"available": false, "normalized": normalized, "message": err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"available": available, "normalized": normalized})
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0]); forwarded != "" {
		return forwarded
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func (h *PublicHandler) allowContact(ip string) bool {
	h.contactMu.Lock()
	defer h.contactMu.Unlock()
	now := time.Now()
	limit := h.contactLimits[ip]
	if limit.Expires.IsZero() || now.After(limit.Expires) {
		limit = contactLimit{Expires: now.Add(time.Minute)}
	}
	if limit.Count >= 5 {
		return false
	}
	limit.Count++
	h.contactLimits[ip] = limit
	return true
}

func (h *PublicHandler) SubmitContact(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !h.allowContact(clientIP(r)) {
		http.Error(w, "too many submissions; try again shortly", http.StatusTooManyRequests)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 32<<10)
	if err := r.ParseForm(); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}
	// Honeypot field. Bots commonly fill every field.
	if strings.TrimSpace(r.FormValue("website_url")) != "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	site, err := h.repo.GetPublishedByHost(r.Context(), r.Host, h.baseDomain)
	if err != nil || site == nil {
		http.Error(w, "published site not found", http.StatusNotFound)
		return
	}
	if postedID := strings.TrimSpace(r.FormValue("websiteId")); postedID != "" && postedID != site.Website.ID {
		http.Error(w, "invalid website", http.StatusBadRequest)
		return
	}
	truncate := func(value string, max int) string {
		value = strings.TrimSpace(value)
		if len(value) > max {
			return value[:max]
		}
		return value
	}
	submission := ContactSubmission{
		WebsiteID:  site.Website.ID,
		BusinessID: site.Website.BusinessID,
		Name:       truncate(r.FormValue("name"), 255),
		Email:      truncate(r.FormValue("email"), 320),
		Phone:      truncate(r.FormValue("phone"), 80),
		Company:    truncate(r.FormValue("company"), 255),
		Message:    truncate(r.FormValue("message"), 5000),
		Metadata: map[string]string{
			"ip":        clientIP(r),
			"userAgent": truncate(r.UserAgent(), 500),
			"referer":   truncate(r.Referer(), 1000),
		},
	}
	if err := h.repo.SaveContactSubmission(r.Context(), submission); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Thanks — your message has been sent."})
}

func (h *PublicHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	site, err := h.repo.GetPublishedByHost(r.Context(), r.Host, h.baseDomain)
	if err != nil {
		log.Printf("public-site lookup failed for %q: %v", r.Host, err)
		http.Error(w, "site temporarily unavailable", http.StatusServiceUnavailable)
		return
	}
	if site == nil {
		renderNotFound(w, "This VentureMate website is not published or the address is incorrect.")
		return
	}

	if target := canonicalRedirectURL(site, cleanHost(r.Host), h.baseDomain, r.URL); target != "" {
		http.Redirect(w, r, target, http.StatusPermanentRedirect)
		return
	}

	switch r.URL.Path {
	case "/robots.txt":
		h.renderRobots(w, r)
		return
	case "/sitemap.xml":
		h.renderSitemap(w, r, site)
		return
	case "/favicon.ico":
		w.WriteHeader(http.StatusNoContent)
		return
	}

	page, pages := findPage(site.Website.PublishedPages, r.URL.Path)
	if page == nil {
		renderNotFound(w, "The page you requested does not exist.")
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
	w.Header().Set("Content-Security-Policy", fmt.Sprintf("default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline'; frame-src https://www.youtube.com https://player.vimeo.com; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self' https://%s https://www.%s http://localhost:* http://127.0.0.1:*", h.baseDomain, h.baseDomain))
	w.Header().Set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
	_, _ = w.Write([]byte(renderPublicPage(site, page, pages, r.Host)))
}

func (h *PublicHandler) renderRobots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = fmt.Fprintf(w, "User-agent: *\nAllow: /\nSitemap: https://%s/sitemap.xml\n", cleanHost(r.Host))
}

func (h *PublicHandler) renderSitemap(w http.ResponseWriter, r *http.Request, site *PublicWebsite) {
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	host := cleanHost(r.Host)
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`)
	for _, slug := range PublishedPageSlugs(site.Website.PublishedPages) {
		if !strings.HasPrefix(slug, "/") {
			slug = "/" + slug
		}
		b.WriteString("<url><loc>https://" + html.EscapeString(host+slug) + "</loc></url>")
	}
	b.WriteString("</urlset>")
	_, _ = w.Write([]byte(b.String()))
}

func cleanHost(host string) string {
	host = strings.TrimSpace(strings.ToLower(host))
	if h, _, err := net.SplitHostPort(host); err == nil {
		return h
	}
	return strings.TrimSuffix(host, ".")
}

func canonicalRedirectURL(site *PublicWebsite, requestHost, baseDomain string, requestURL *url.URL) string {
	if site == nil || requestURL == nil || site.Website.PublishedCustomDomain == "" || site.Website.PublishedSubdomain == "" {
		return ""
	}
	subdomainHost := strings.ToLower(site.Website.PublishedSubdomain + "." + baseDomain)
	if !strings.EqualFold(cleanHost(requestHost), subdomainHost) {
		return ""
	}
	path := requestURL.EscapedPath()
	if path == "" {
		path = "/"
	}
	target := "https://" + site.Website.PublishedCustomDomain + path
	if requestURL.RawQuery != "" {
		target += "?" + requestURL.RawQuery
	}
	return target
}

type websitePage struct {
	ID              string                   `json:"id"`
	Slug            string                   `json:"slug"`
	Title           string                   `json:"title"`
	MetaDescription string                   `json:"metaDescription"`
	Sections        []map[string]interface{} `json:"sections"`
	IsPublished     bool                     `json:"isPublished"`
}

func normalizePath(value string) string {
	value = "/" + strings.Trim(strings.TrimSpace(value), "/")
	if value == "//" || value == "" {
		return "/"
	}
	return value
}

func findPage(raw, path string) (*websitePage, []websitePage) {
	var pages []websitePage
	if err := json.Unmarshal([]byte(raw), &pages); err != nil {
		return nil, nil
	}
	wanted := normalizePath(path)
	for i := range pages {
		if normalizePath(pages[i].Slug) == wanted {
			return &pages[i], pages
		}
	}
	return nil, pages
}

func renderNotFound(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusNotFound)
	_, _ = fmt.Fprintf(w, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site not found</title><style>body{font-family:system-ui;background:#07111f;color:#e5eef9;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:560px;padding:40px;border:1px solid #20324a;border-radius:24px;background:#0d1b2d;text-align:center}a{color:#5eead4}</style></head><body><main class="card"><h1>Website unavailable</h1><p>%s</p><p><a href="https://venturemate.net">Powered by VentureMate</a></p></main></body></html>`, html.EscapeString(message))
}

func parseObject(raw string) map[string]interface{} {
	var value map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &value); err != nil {
		return map[string]interface{}{}
	}
	return value
}

func propString(values map[string]interface{}, key, fallback string) string {
	if value, ok := values[key]; ok {
		switch typed := value.(type) {
		case string:
			if strings.TrimSpace(typed) != "" {
				return typed
			}
		case float64:
			return strconv.FormatFloat(typed, 'f', -1, 64)
		case json.Number:
			return typed.String()
		}
	}
	return fallback
}

func propBool(values map[string]interface{}, key string, fallback bool) bool {
	if value, ok := values[key].(bool); ok {
		return value
	}
	return fallback
}

func propSlice(values map[string]interface{}, key string) []interface{} {
	if values == nil {
		return nil
	}
	if value, ok := values[key].([]interface{}); ok {
		return value
	}
	return nil
}

func asObject(value interface{}) map[string]interface{} {
	if object, ok := value.(map[string]interface{}); ok {
		return object
	}
	return map[string]interface{}{}
}

var hexColorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{3,8}$`)
var fontPattern = regexp.MustCompile(`^[a-zA-Z0-9 ,'-]{1,80}$`)

func safeColor(value, fallback string) string {
	if hexColorPattern.MatchString(strings.TrimSpace(value)) {
		return value
	}
	return fallback
}

func safeFont(value, fallback string) string {
	if fontPattern.MatchString(strings.TrimSpace(value)) {
		return value
	}
	return fallback
}

func safeURL(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "#") || (strings.HasPrefix(value, "/") && !strings.HasPrefix(value, "//")) {
		return value
	}
	parsed, err := url.Parse(value)
	if err != nil {
		return ""
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https", "mailto", "tel":
		return value
	default:
		return ""
	}
}

var dataImagePattern = regexp.MustCompile(`(?i)^data:image/(?:png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=]+$`)

func safeImageURL(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 2<<20 && dataImagePattern.MatchString(value) {
		return value
	}
	return safeURL(value)
}

func youtubeEmbed(value string) string {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return ""
	}
	host := strings.ToLower(parsed.Hostname())
	var id string
	if host == "youtu.be" {
		id = strings.Trim(parsed.Path, "/")
	} else if strings.Contains(host, "youtube.com") {
		if strings.HasPrefix(parsed.Path, "/embed/") {
			id = strings.TrimPrefix(parsed.Path, "/embed/")
		} else {
			id = parsed.Query().Get("v")
		}
	}
	id = regexp.MustCompile(`[^a-zA-Z0-9_-]`).ReplaceAllString(id, "")
	if id == "" {
		return ""
	}
	return "https://www.youtube.com/embed/" + id
}

func renderPublicPage(site *PublicWebsite, page *websitePage, pages []websitePage, host string) string {
	styles := parseObject(site.Website.PublishedGlobalStyles)
	primary := safeColor(propString(styles, "primaryColor", "#10b981"), "#10b981")
	secondary := safeColor(propString(styles, "secondaryColor", "#059669"), "#059669")
	accent := safeColor(propString(styles, "accentColor", "#34d399"), "#34d399")
	headingFont := safeFont(propString(styles, "fontHeading", "Inter"), "Inter")
	bodyFont := safeFont(propString(styles, "fontBody", "Inter"), "Inter")
	canonical := "https://" + cleanHost(host) + normalizePath(page.Slug)
	title := strings.TrimSpace(page.Title)
	if title == "" || strings.EqualFold(title, "Home") {
		title = site.BusinessName
	} else {
		title = title + " | " + site.BusinessName
	}
	description := strings.TrimSpace(page.MetaDescription)
	if description == "" {
		description = site.BusinessDescription
	}
	if description == "" {
		description = site.BusinessTagline
	}

	brandKit := parseObject(site.BusinessBrandKit)
	logo := safeImageURL(propString(brandKit, "logoUrl", propString(brandKit, "logo", "")))
	navigation := parseObject(site.Website.PublishedNavigation)
	footer := parseObject(site.Website.PublishedFooter)

	var b strings.Builder
	b.WriteString("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">")
	b.WriteString("<title>" + html.EscapeString(title) + "</title>")
	b.WriteString("<meta name=\"description\" content=\"" + html.EscapeString(description) + "\">")
	b.WriteString("<link rel=\"canonical\" href=\"" + html.EscapeString(canonical) + "\">")
	b.WriteString("<meta property=\"og:title\" content=\"" + html.EscapeString(title) + "\"><meta property=\"og:description\" content=\"" + html.EscapeString(description) + "\"><meta property=\"og:url\" content=\"" + html.EscapeString(canonical) + "\"><meta property=\"og:type\" content=\"website\">")
	b.WriteString("<meta name=\"twitter:card\" content=\"summary_large_image\">")
	b.WriteString(`<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`)
	b.WriteString(`<style>` + publicCSS(primary, secondary, accent, headingFont, bodyFont) + `</style></head><body>`)
	b.WriteString(`<header class="vm-header"><div class="vm-shell vm-nav">`)
	b.WriteString(`<a class="vm-brand" href="/">`)
	if logo != "" {
		b.WriteString(`<img src="` + html.EscapeString(logo) + `" alt="` + html.EscapeString(site.BusinessName) + ` logo">`)
	}
	b.WriteString(`<span>` + html.EscapeString(site.BusinessName) + `</span></a>`)
	b.WriteString(`<button class="vm-menu-button" type="button" aria-label="Toggle navigation" onclick="document.querySelector('.vm-links').classList.toggle('open')">☰</button>`)
	b.WriteString(`<nav class="vm-links">`)
	navItems := propSlice(navigation, "items")
	if len(navItems) == 0 {
		for _, item := range pages {
			b.WriteString(`<a href="` + html.EscapeString(normalizePath(item.Slug)) + `">` + html.EscapeString(item.Title) + `</a>`)
		}
	} else {
		for _, value := range navItems {
			item := asObject(value)
			label := propString(item, "label", "Page")
			slug := safeURL(propString(item, "href", propString(item, "slug", "/")))
			if slug == "" {
				slug = "/"
			}
			b.WriteString(`<a href="` + html.EscapeString(slug) + `">` + html.EscapeString(label) + `</a>`)
		}
	}
	b.WriteString(`</nav></div></header><main>`)
	for _, section := range page.Sections {
		if !propBool(section, "visible", true) {
			continue
		}
		b.WriteString(renderSection(section, site))
	}
	b.WriteString(`</main><footer class="vm-footer"><div class="vm-shell vm-footer-inner"><div><strong>` + html.EscapeString(site.BusinessName) + `</strong>`)
	if site.BusinessLocation != "" {
		b.WriteString(`<p>` + html.EscapeString(site.BusinessLocation) + `</p>`)
	}
	b.WriteString(`</div><p>` + html.EscapeString(propString(footer, "customText", "© "+strconv.Itoa(time.Now().Year())+" "+site.BusinessName+". All rights reserved.")) + `</p>`)
	b.WriteString(`<a class="vm-powered" href="https://venturemate.net" rel="noopener">Built with VentureMate</a></div></footer>`)
	b.WriteString(contactScript())
	b.WriteString(`</body></html>`)
	return b.String()
}

func renderSection(section map[string]interface{}, site *PublicWebsite) string {
	sectionType := propString(section, "type", "text")
	props, _ := section["props"].(map[string]interface{})
	if props == nil {
		props, _ = section["content"].(map[string]interface{})
	}
	if props == nil {
		props = map[string]interface{}{}
	}
	var b strings.Builder
	switch sectionType {
	case "hero":
		headline := propString(props, "headline", site.BusinessName)
		subheadline := propString(props, "subheadline", site.BusinessTagline)
		cta := propString(props, "ctaPrimary", propString(props, "primaryCta", "Get Started"))
		ctaURL := safeURL(propString(props, "ctaUrl", propString(props, "primaryCtaUrl", "#contact")))
		image := safeImageURL(propString(props, "image", ""))
		b.WriteString(`<section class="vm-section vm-hero"><div class="vm-shell vm-hero-grid"><div><span class="vm-eyebrow">` + html.EscapeString(site.BusinessIndustry) + `</span><h1>` + html.EscapeString(headline) + `</h1><p>` + html.EscapeString(subheadline) + `</p><div class="vm-actions"><a class="vm-button" href="` + html.EscapeString(ctaURL) + `">` + html.EscapeString(cta) + `</a>`)
		if secondary := propString(props, "ctaSecondary", ""); secondary != "" {
			b.WriteString(`<a class="vm-button secondary" href="#about">` + html.EscapeString(secondary) + `</a>`)
		}
		b.WriteString(`</div></div>`)
		if image != "" {
			b.WriteString(`<div class="vm-hero-media"><img src="` + html.EscapeString(image) + `" alt=""></div>`)
		} else {
			b.WriteString(`<div class="vm-hero-art" aria-hidden="true"><span></span><span></span><span></span></div>`)
		}
		b.WriteString(`</div></section>`)
	case "features":
		b.WriteString(sectionHeading(props, "Why choose us", "Everything you need to succeed"))
		b.WriteString(`<div class="vm-shell vm-grid vm-grid-3">`)
		for _, value := range propSlice(props, "features") {
			item := asObject(value)
			b.WriteString(`<article class="vm-card"><div class="vm-icon">✦</div><h3>` + html.EscapeString(propString(item, "title", "Feature")) + `</h3><p>` + html.EscapeString(propString(item, "description", "")) + `</p></article>`)
		}
		b.WriteString(`</div></section>`)
	case "pricing":
		b.WriteString(sectionHeading(props, "Simple pricing", propString(props, "subtitle", "Choose the plan that works for you")))
		b.WriteString(`<div class="vm-shell vm-grid vm-grid-3">`)
		for _, value := range propSlice(props, "plans") {
			item := asObject(value)
			popular := ""
			if propBool(item, "popular", false) {
				popular = " popular"
			}
			b.WriteString(`<article class="vm-card vm-price` + popular + `"><h3>` + html.EscapeString(propString(item, "name", "Plan")) + `</h3><div class="vm-price-value">` + html.EscapeString(propString(item, "currency", "$")) + html.EscapeString(propString(item, "price", "0")) + `<small>/` + html.EscapeString(propString(item, "period", "month")) + `</small></div><ul>`)
			for _, feature := range propSlice(item, "features") {
				b.WriteString(`<li>✓ ` + html.EscapeString(fmt.Sprint(feature)) + `</li>`)
			}
			b.WriteString(`</ul><a class="vm-button" href="#contact">` + html.EscapeString(propString(item, "cta", "Choose plan")) + `</a></article>`)
		}
		b.WriteString(`</div></section>`)
	case "testimonials":
		b.WriteString(sectionHeading(props, "What customers say", propString(props, "subtitle", "")))
		b.WriteString(`<div class="vm-shell vm-grid vm-grid-3">`)
		for _, value := range propSlice(props, "testimonials") {
			item := asObject(value)
			b.WriteString(`<figure class="vm-card vm-quote"><blockquote>“` + html.EscapeString(propString(item, "quote", "")) + `”</blockquote><figcaption><strong>` + html.EscapeString(propString(item, "author", "Customer")) + `</strong><span>` + html.EscapeString(propString(item, "role", "")) + `</span></figcaption></figure>`)
		}
		b.WriteString(`</div></section>`)
	case "carousel":
		b.WriteString(sectionHeading(props, "Highlights", propString(props, "subtitle", "Explore what makes us different")))
		items := propSlice(props, "items")
		if len(items) == 0 {
			items = propSlice(props, "slides")
		}
		interval := 5000
		if raw, ok := props["interval"].(float64); ok && raw >= 2000 && raw <= 30000 {
			interval = int(raw)
		}
		autoplay := propBool(props, "autoplay", true)
		b.WriteString(`<div class="vm-shell vm-carousel-wrap"><div class="vm-carousel-actions"><button type="button" aria-label="Previous slide" onclick="this.closest('.vm-carousel-wrap').querySelector('.vm-carousel').scrollBy({left:-420,behavior:'smooth'})">←</button><button type="button" aria-label="Next slide" onclick="this.closest('.vm-carousel-wrap').querySelector('.vm-carousel').scrollBy({left:420,behavior:'smooth'})">→</button></div>`)
		b.WriteString(`<div class="vm-carousel" data-autoplay="` + strconv.FormatBool(autoplay) + `" data-interval="` + strconv.Itoa(interval) + `">`)
		for _, value := range items {
			item := asObject(value)
			image := safeImageURL(propString(item, "image", ""))
			b.WriteString(`<article class="vm-carousel-card">`)
			if image != "" {
				b.WriteString(`<img src="` + html.EscapeString(image) + `" alt="` + html.EscapeString(propString(item, "alt", "")) + `" loading="lazy">`)
			}
			b.WriteString(`<div class="vm-carousel-copy"><h3>` + html.EscapeString(propString(item, "title", "Highlight")) + `</h3><p>` + html.EscapeString(propString(item, "description", propString(item, "content", ""))) + `</p>`)
			if cta := propString(item, "cta", ""); cta != "" {
				href := safeURL(propString(item, "href", "#contact"))
				if href == "" {
					href = "#contact"
				}
				b.WriteString(`<a class="vm-carousel-link" href="` + html.EscapeString(href) + `">` + html.EscapeString(cta) + ` →</a>`)
			}
			b.WriteString(`</div></article>`)
		}
		b.WriteString(`</div></div></section>`)
	case "cta":
		b.WriteString(`<section class="vm-section"><div class="vm-shell vm-cta"><h2>` + html.EscapeString(propString(props, "headline", "Ready to get started?")) + `</h2><p>` + html.EscapeString(propString(props, "subheadline", "")) + `</p><a class="vm-button light" href="#contact">` + html.EscapeString(propString(props, "cta", "Contact us")) + `</a></div></section>`)
	case "team":
		b.WriteString(sectionHeading(props, "Meet the team", propString(props, "subtitle", "")))
		b.WriteString(`<div class="vm-shell vm-grid vm-grid-3">`)
		for _, value := range propSlice(props, "members") {
			item := asObject(value)
			avatar := safeImageURL(propString(item, "avatar", ""))
			b.WriteString(`<article class="vm-card vm-team">`)
			if avatar != "" {
				b.WriteString(`<img src="` + html.EscapeString(avatar) + `" alt="">`)
			} else {
				b.WriteString(`<div class="vm-avatar">` + html.EscapeString(firstLetter(propString(item, "name", "T"))) + `</div>`)
			}
			b.WriteString(`<h3>` + html.EscapeString(propString(item, "name", "Team member")) + `</h3><p>` + html.EscapeString(propString(item, "role", "")) + `</p></article>`)
		}
		b.WriteString(`</div></section>`)
	case "faq":
		b.WriteString(sectionHeading(props, "Frequently asked questions", propString(props, "subtitle", "")))
		b.WriteString(`<div class="vm-shell vm-faq">`)
		for _, value := range propSlice(props, "items") {
			item := asObject(value)
			b.WriteString(`<details><summary>` + html.EscapeString(propString(item, "question", "Question")) + `</summary><p>` + html.EscapeString(propString(item, "answer", "")) + `</p></details>`)
		}
		b.WriteString(`</div></section>`)
	case "stats":
		b.WriteString(`<section class="vm-section vm-muted"><div class="vm-shell"><h2 class="vm-center">` + html.EscapeString(propString(props, "title", "By the numbers")) + `</h2><div class="vm-stats">`)
		for _, value := range propSlice(props, "stats") {
			item := asObject(value)
			b.WriteString(`<div><strong>` + html.EscapeString(propString(item, "value", "0")) + `</strong><span>` + html.EscapeString(propString(item, "label", "")) + `</span></div>`)
		}
		b.WriteString(`</div></div></section>`)
	case "contact":
		b.WriteString(`<section class="vm-section" id="contact"><div class="vm-shell vm-contact"><div><span class="vm-eyebrow">Contact</span><h2>` + html.EscapeString(propString(props, "title", "Get in touch")) + `</h2><p>` + html.EscapeString(propString(props, "subtitle", "We would love to hear from you")) + `</p></div><form class="vm-contact-form" action="/api/public-sites/contact" method="post"><input type="hidden" name="websiteId" value="` + html.EscapeString(site.Website.ID) + `"><input class="vm-honeypot" name="website_url" tabindex="-1" autocomplete="off"><label>Name<input name="name" maxlength="255" required></label><label>Email<input name="email" type="email" maxlength="320" required></label>`)
		if propBool(props, "showCompany", false) {
			b.WriteString(`<label>Company<input name="company" maxlength="255"></label>`)
		}
		if propBool(props, "showPhone", false) {
			b.WriteString(`<label>Phone<input name="phone" maxlength="80"></label>`)
		}
		b.WriteString(`<label class="full">Message<textarea name="message" maxlength="5000" rows="5" required></textarea></label><button class="vm-button full" type="submit">Send message</button><p class="vm-form-status full" role="status"></p></form></div></section>`)
	case "image":
		src := safeImageURL(propString(props, "src", ""))
		if src != "" {
			b.WriteString(`<section class="vm-section"><figure class="vm-shell vm-image"><img src="` + html.EscapeString(src) + `" alt="` + html.EscapeString(propString(props, "alt", "")) + `">`)
			if caption := propString(props, "caption", ""); caption != "" {
				b.WriteString(`<figcaption>` + html.EscapeString(caption) + `</figcaption>`)
			}
			b.WriteString(`</figure></section>`)
		}
	case "video":
		embed := youtubeEmbed(propString(props, "url", ""))
		if embed != "" {
			b.WriteString(`<section class="vm-section"><div class="vm-shell vm-video"><iframe src="` + html.EscapeString(embed) + `" title="` + html.EscapeString(propString(props, "title", "Video")) + `" loading="lazy" allowfullscreen></iframe></div></section>`)
		}
	default:
		b.WriteString(`<section class="vm-section" id="about"><div class="vm-shell vm-copy"><h2>` + html.EscapeString(propString(props, "title", site.BusinessName)) + `</h2><p>` + html.EscapeString(propString(props, "content", site.BusinessDescription)) + `</p></div></section>`)
	}
	return b.String()
}

func firstLetter(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "V"
	}
	return strings.ToUpper(string([]rune(value)[0]))
}

func sectionHeading(props map[string]interface{}, title, subtitle string) string {
	return `<section class="vm-section"><div class="vm-shell vm-section-heading"><h2>` + html.EscapeString(propString(props, "title", title)) + `</h2><p>` + html.EscapeString(propString(props, "subtitle", subtitle)) + `</p></div>`
}

func contactScript() string {
	return `<script>document.querySelectorAll('.vm-contact-form').forEach(function(form){form.addEventListener('submit',async function(event){event.preventDefault();var status=form.querySelector('.vm-form-status');var button=form.querySelector('button[type=submit]');status.textContent='Sending…';button.disabled=true;try{var response=await fetch(form.action,{method:'POST',body:new URLSearchParams(new FormData(form))});var data=await response.json().catch(function(){return{}});if(!response.ok)throw new Error(data.message||'Unable to send message');status.textContent=data.message||'Message sent.';form.reset()}catch(error){status.textContent=error.message||'Unable to send message'}finally{button.disabled=false}})});document.querySelectorAll('.vm-carousel[data-autoplay="true"]').forEach(function(carousel){var interval=Math.max(2000,Math.min(30000,Number(carousel.dataset.interval)||5000));var timer=setInterval(function(){var atEnd=carousel.scrollLeft+carousel.clientWidth>=carousel.scrollWidth-12;carousel.scrollTo({left:atEnd?0:carousel.scrollLeft+Math.min(420,carousel.clientWidth*.85),behavior:'smooth'})},interval);carousel.addEventListener('mouseenter',function(){clearInterval(timer)},{once:true})});</script>`
}

func publicCSS(primary, secondary, accent, headingFont, bodyFont string) string {
	return fmt.Sprintf(`:root{--primary:%s;--secondary:%s;--accent:%s;--ink:#0b1324;--muted:#5f6b7a;--surface:#fff;--soft:#f4f7fb;--line:#e3e9f1;--heading:%q;--body:%q}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--surface);font-family:var(--body),system-ui,sans-serif;line-height:1.6}h1,h2,h3{font-family:var(--heading),system-ui,sans-serif;line-height:1.12;margin:0 0 16px}h1{font-size:clamp(2.6rem,7vw,5.8rem);letter-spacing:-.05em}h2{font-size:clamp(2rem,4vw,3.5rem);letter-spacing:-.035em}h3{font-size:1.3rem}p{margin:0 0 18px;color:var(--muted)}a{text-decoration:none;color:inherit}.vm-shell{width:min(1120px,calc(100%% - 40px));margin:auto}.vm-header{position:sticky;top:0;z-index:20;border-bottom:1px solid rgba(227,233,241,.8);background:rgba(255,255,255,.9);backdrop-filter:blur(18px)}.vm-nav{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:24px}.vm-brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:1.05rem}.vm-brand img{width:38px;height:38px;object-fit:contain;border-radius:10px}.vm-links{display:flex;align-items:center;gap:24px;font-size:.94rem;font-weight:650}.vm-links a:hover{color:var(--primary)}.vm-menu-button{display:none;border:0;background:none;font-size:1.5rem}.vm-section{padding:96px 0}.vm-muted{background:var(--soft)}.vm-hero{min-height:calc(100vh - 72px);display:grid;align-items:center;background:radial-gradient(circle at 82%% 12%%,color-mix(in srgb,var(--accent) 18%%,transparent),transparent 35%%),linear-gradient(180deg,#fff,var(--soft))}.vm-hero-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);align-items:center;gap:72px}.vm-hero p{font-size:clamp(1.08rem,2vw,1.35rem);max-width:720px}.vm-eyebrow{display:inline-flex;padding:7px 12px;border-radius:999px;color:var(--secondary);background:color-mix(in srgb,var(--primary) 12%%,white);font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;margin-bottom:20px}.vm-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.vm-button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border:0;border-radius:12px;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 12px 28px color-mix(in srgb,var(--primary) 28%%,transparent)}.vm-button.secondary{background:#fff;color:var(--ink);border:1px solid var(--line);box-shadow:none}.vm-button.light{background:#fff;color:var(--secondary)}.vm-button:disabled{opacity:.6;cursor:not-allowed}.vm-hero-art{aspect-ratio:1;border-radius:36px;background:linear-gradient(145deg,var(--primary),var(--secondary));position:relative;overflow:hidden;box-shadow:0 30px 80px color-mix(in srgb,var(--primary) 32%%,transparent)}.vm-hero-art span{position:absolute;border-radius:999px;background:rgba(255,255,255,.18);backdrop-filter:blur(10px)}.vm-hero-art span:nth-child(1){width:62%%;height:62%%;right:-10%%;top:-8%%}.vm-hero-art span:nth-child(2){width:42%%;height:42%%;left:10%%;bottom:8%%}.vm-hero-art span:nth-child(3){width:22%%;height:22%%;left:18%%;top:17%%}.vm-hero-media img{width:100%%;max-height:620px;object-fit:cover;border-radius:32px;box-shadow:0 28px 70px rgba(11,19,36,.18)}.vm-section-heading{text-align:center;max-width:760px;margin-bottom:46px}.vm-section-heading p{font-size:1.08rem}.vm-grid{display:grid;gap:22px}.vm-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}.vm-carousel-wrap{position:relative}.vm-carousel-actions{display:flex;justify-content:flex-end;gap:10px;margin:-20px 0 14px}.vm-carousel-actions button{width:42px;height:42px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font-size:1.15rem;cursor:pointer;box-shadow:0 8px 24px rgba(11,19,36,.08)}.vm-carousel{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(290px,38%%);gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin;padding:4px 4px 18px}.vm-carousel-card{scroll-snap-align:start;overflow:hidden;border:1px solid var(--line);border-radius:24px;background:#fff;box-shadow:0 12px 34px rgba(11,19,36,.07)}.vm-carousel-card img{display:block;width:100%%;aspect-ratio:16/10;object-fit:cover}.vm-carousel-copy{padding:24px}.vm-carousel-copy p{min-height:3.2em}.vm-carousel-link{color:var(--primary);font-weight:850}.vm-card{padding:30px;border:1px solid var(--line);border-radius:22px;background:#fff;box-shadow:0 10px 30px rgba(11,19,36,.055)}.vm-card p:last-child{margin-bottom:0}.vm-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:color-mix(in srgb,var(--primary) 13%%,white);color:var(--primary);font-size:1.25rem;margin-bottom:22px}.vm-price{display:flex;flex-direction:column}.vm-price.popular{border-color:var(--primary);transform:translateY(-8px);box-shadow:0 24px 60px color-mix(in srgb,var(--primary) 14%%,transparent)}.vm-price-value{font-size:2.6rem;font-weight:900;margin:8px 0 18px}.vm-price-value small{font-size:.9rem;color:var(--muted);font-weight:600}.vm-price ul{list-style:none;padding:0;margin:0 0 24px;flex:1}.vm-price li{padding:8px 0;color:var(--muted)}.vm-quote blockquote{font-size:1.12rem;margin:0 0 24px}.vm-quote figcaption{display:flex;flex-direction:column}.vm-quote figcaption span{color:var(--muted);font-size:.9rem}.vm-cta{padding:64px;border-radius:32px;text-align:center;color:#fff;background:linear-gradient(135deg,var(--primary),var(--secondary));box-shadow:0 30px 80px color-mix(in srgb,var(--primary) 25%%,transparent)}.vm-cta p{color:rgba(255,255,255,.8);max-width:680px;margin:0 auto 26px}.vm-team{text-align:center}.vm-team img,.vm-avatar{width:92px;height:92px;border-radius:50%%;object-fit:cover;margin:0 auto 18px}.vm-avatar{display:grid;place-items:center;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;font-size:2rem;font-weight:900}.vm-faq{max-width:820px}.vm-faq details{border-bottom:1px solid var(--line);padding:18px 0}.vm-faq summary{cursor:pointer;font-weight:800}.vm-faq p{padding-top:12px}.vm-center{text-align:center}.vm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:42px;text-align:center}.vm-stats strong{display:block;font-size:clamp(2rem,4vw,3.4rem);color:var(--primary)}.vm-stats span{color:var(--muted)}.vm-contact{display:grid;grid-template-columns:.8fr 1.2fr;gap:72px;align-items:start}.vm-contact-form{display:grid;grid-template-columns:1fr 1fr;gap:16px}.vm-contact-form label{display:grid;gap:7px;font-size:.84rem;font-weight:800}.vm-contact-form input,.vm-contact-form textarea{width:100%%;border:1px solid var(--line);border-radius:12px;padding:13px 14px;font:inherit;background:#fff}.vm-contact-form input:focus,.vm-contact-form textarea:focus{outline:2px solid color-mix(in srgb,var(--primary) 25%%,transparent);border-color:var(--primary)}.vm-contact-form .full{grid-column:1/-1}.vm-honeypot{position:absolute!important;left:-10000px!important}.vm-form-status{min-height:24px}.vm-copy{max-width:820px}.vm-copy p{white-space:pre-line;font-size:1.05rem}.vm-image{text-align:center}.vm-image img{max-width:100%%;height:auto;border-radius:24px;box-shadow:0 20px 60px rgba(11,19,36,.14)}.vm-image figcaption{margin-top:12px;color:var(--muted)}.vm-video{aspect-ratio:16/9}.vm-video iframe{width:100%%;height:100%%;border:0;border-radius:24px}.vm-footer{padding:48px 0;border-top:1px solid var(--line);background:#07111f;color:#e8eef7}.vm-footer p{color:#98a8ba;margin:4px 0}.vm-footer-inner{display:grid;grid-template-columns:1fr 1fr auto;gap:28px;align-items:center}.vm-powered{color:var(--accent);font-weight:800;font-size:.86rem}@media(max-width:900px){.vm-carousel{grid-auto-columns:minmax(280px,72%%)}.vm-hero-grid,.vm-contact{grid-template-columns:1fr}.vm-hero-art,.vm-hero-media{max-width:560px}.vm-grid-3{grid-template-columns:1fr 1fr}.vm-stats{grid-template-columns:1fr 1fr}.vm-footer-inner{grid-template-columns:1fr}.vm-menu-button{display:block}.vm-links{display:none;position:absolute;left:20px;right:20px;top:64px;flex-direction:column;align-items:stretch;padding:18px;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:0 20px 50px rgba(11,19,36,.12)}.vm-links.open{display:flex}}@media(max-width:600px){.vm-carousel{grid-auto-columns:88%%}.vm-carousel-actions{margin-top:-10px}.vm-shell{width:min(calc(100%% - 28px),1120px)}.vm-section{padding:68px 0}.vm-grid-3{grid-template-columns:1fr}.vm-hero{min-height:auto;padding:72px 0}.vm-hero-grid{gap:40px}.vm-card{padding:24px}.vm-cta{padding:42px 22px}.vm-contact-form{grid-template-columns:1fr}.vm-contact-form .full{grid-column:auto}}`, primary, secondary, accent, headingFont, bodyFont)
}
