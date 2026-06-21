package websites

import (
	"encoding/json"
	"net/url"
	"strings"
	"testing"
)

func TestNormalizeSubdomain(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "business name", input: "  Acme Ghana Ltd  ", want: "acme-ghana-ltd"},
		{name: "full venturemate address", input: "acme.venturemate.net", want: "acme"},
		{name: "collapses separators", input: "Acme---Store", want: "acme-store"},
		{name: "reserved", input: "admin", wantErr: true},
		{name: "too short", input: "ai", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizeSubdomain(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestNormalizeCustomDomain(t *testing.T) {
	tests := []struct {
		input   string
		want    string
		wantErr bool
	}{
		{input: "https://www.example.com/path", want: "www.example.com"},
		{input: "shop.example.com.", want: "shop.example.com"},
		{input: "", want: ""},
		{input: "demo.venturemate.net", wantErr: true},
		{input: "javascript:alert(1)", wantErr: true},
		{input: "127.0.0.1", wantErr: true},
	}
	for _, tt := range tests {
		got, err := NormalizeCustomDomain(tt.input, "venturemate.net")
		if tt.wantErr {
			if err == nil {
				t.Fatalf("NormalizeCustomDomain(%q) expected error, got %q", tt.input, got)
			}
			continue
		}
		if err != nil {
			t.Fatalf("NormalizeCustomDomain(%q): %v", tt.input, err)
		}
		if got != tt.want {
			t.Fatalf("NormalizeCustomDomain(%q)=%q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestValidatePublishablePagesCreatesSnapshot(t *testing.T) {
	raw := `[{"id":"home","slug":"/","title":"Home","isPublished":false,"sections":[]},{"id":"about","slug":"/about","title":"About","sections":[]}]`
	got, err := validatePublishablePages(raw)
	if err != nil {
		t.Fatal(err)
	}
	var pages []map[string]interface{}
	if err := json.Unmarshal([]byte(got), &pages); err != nil {
		t.Fatal(err)
	}
	if len(pages) != 2 {
		t.Fatalf("got %d pages", len(pages))
	}
	for _, page := range pages {
		if published, _ := page["isPublished"].(bool); !published {
			t.Fatalf("page was not marked published: %#v", page)
		}
	}
	if _, err := validatePublishablePages(`[{"slug":"/about"}]`); err == nil {
		t.Fatal("expected missing-home-page validation error")
	}
}

func TestSafeURL(t *testing.T) {
	allowed := []string{"/about", "#contact", "https://example.com", "mailto:hello@example.com", "tel:+233200000000"}
	for _, value := range allowed {
		if got := safeURL(value); got != value {
			t.Errorf("safeURL(%q)=%q", value, got)
		}
	}
	blocked := []string{"//evil.example", "javascript:alert(1)", "data:text/html,test", "ftp://example.com"}
	for _, value := range blocked {
		if got := safeURL(value); got != "" {
			t.Errorf("safeURL(%q) should be blocked, got %q", value, got)
		}
	}
}

func TestSafeImageURLAllowsGeneratedLogoData(t *testing.T) {
	logo := "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="
	if got := safeImageURL(logo); got != logo {
		t.Fatalf("generated SVG logo was rejected: %q", got)
	}
	if got := safeImageURL("data:text/html;base64,PHNjcmlwdD4="); got != "" {
		t.Fatalf("non-image data URL should be rejected: %q", got)
	}
}

func TestRenderPublicPageEscapesUserContent(t *testing.T) {
	site := &PublicWebsite{
		Website: UserWebsite{
			ID:                    "site-id",
			PublishedGlobalStyles: `{}`,
			PublishedNavigation:   `{}`,
			PublishedFooter:       `{}`,
		},
		BusinessName:        `<script>alert(1)</script>`,
		BusinessTagline:     "A useful business",
		BusinessDescription: "Description",
		BusinessBrandKit:    `{}`,
	}
	page := &websitePage{
		Slug:  "/",
		Title: "Home",
		Sections: []map[string]interface{}{
			{"type": "hero", "props": map[string]interface{}{"headline": `<img src=x onerror=alert(1)>`, "ctaUrl": "javascript:alert(1)"}},
			{"type": "contact", "props": map[string]interface{}{"title": "Contact"}},
		},
	}
	html := renderPublicPage(site, page, []websitePage{*page}, "demo.venturemate.net")
	if strings.Contains(html, `<script>alert(1)</script>`) || strings.Contains(html, `<img src=x onerror=alert(1)>`) {
		t.Fatal("unescaped user content appeared in rendered HTML")
	}
	if !strings.Contains(html, "&lt;script&gt;alert(1)&lt;/script&gt;") {
		t.Fatal("escaped business name not found")
	}
	if !strings.Contains(html, `action="/api/public-sites/contact"`) {
		t.Fatal("contact form endpoint missing")
	}
	if !strings.Contains(html, `https://demo.venturemate.net/`) {
		t.Fatal("canonical public URL missing")
	}
}

func TestFindPageNormalizesRoutes(t *testing.T) {
	raw := `[{"slug":"/","title":"Home","sections":[]},{"slug":"about","title":"About","sections":[]}]`
	page, pages := findPage(raw, "/about/")
	if page == nil || page.Title != "About" || len(pages) != 2 {
		t.Fatalf("unexpected page lookup result: %#v, %d", page, len(pages))
	}
}

func TestCanonicalRedirectURLUsesVerifiedCustomDomain(t *testing.T) {
	site := &PublicWebsite{Website: UserWebsite{PublishedSubdomain: "acme", PublishedCustomDomain: "www.acme.com"}}
	u, err := url.Parse("/pricing?plan=pro")
	if err != nil {
		t.Fatal(err)
	}
	got := canonicalRedirectURL(site, "acme.venturemate.net", "venturemate.net", u)
	if got != "https://www.acme.com/pricing?plan=pro" {
		t.Fatalf("unexpected redirect: %q", got)
	}
	if got := canonicalRedirectURL(site, "www.acme.com", "venturemate.net", u); got != "" {
		t.Fatalf("custom domain must not redirect to itself: %q", got)
	}
}

func TestRenderSectionAcceptsAIContentAndCarousel(t *testing.T) {
	site := &PublicWebsite{BusinessName: "Acme", BusinessTagline: "Build better", BusinessDescription: "Description", BusinessIndustry: "Technology"}
	hero := renderSection(map[string]interface{}{
		"type": "hero",
		"content": map[string]interface{}{
			"headline":    "AI-created headline",
			"subheadline": "AI-created copy",
			"primaryCta":  "Book a demo",
		},
	}, site)
	for _, expected := range []string{"AI-created headline", "AI-created copy", "Book a demo"} {
		if !strings.Contains(hero, expected) {
			t.Fatalf("hero did not render %q from the AI content contract", expected)
		}
	}

	carousel := renderSection(map[string]interface{}{
		"type": "carousel",
		"props": map[string]interface{}{
			"title":    "Our work",
			"autoplay": true,
			"interval": float64(4000),
			"items": []interface{}{
				map[string]interface{}{"title": "First project", "description": "A useful result", "cta": "See more", "href": "/work"},
			},
		},
	}, site)
	for _, expected := range []string{"vm-carousel", "Our work", "First project", "A useful result", "See more"} {
		if !strings.Contains(carousel, expected) {
			t.Fatalf("carousel did not render %q", expected)
		}
	}
}

func TestRenderPublicPageSkipsHiddenAISections(t *testing.T) {
	site := &PublicWebsite{
		Website:      UserWebsite{ID: "site-id", PublishedGlobalStyles: `{}`, PublishedNavigation: `{}`, PublishedFooter: `{}`},
		BusinessName: "Acme", BusinessTagline: "Build better", BusinessDescription: "Description", BusinessBrandKit: `{}`,
	}
	page := &websitePage{Slug: "/", Title: "Home", Sections: []map[string]interface{}{
		{"type": "custom", "visible": false, "props": map[string]interface{}{"title": "Hidden section", "content": "Do not render"}},
		{"type": "custom", "visible": true, "props": map[string]interface{}{"title": "Visible section", "content": "Render this"}},
	}}
	output := renderPublicPage(site, page, []websitePage{*page}, "demo.venturemate.net")
	if strings.Contains(output, "Hidden section") || strings.Contains(output, "Do not render") {
		t.Fatal("hidden AI section was rendered")
	}
	if !strings.Contains(output, "Visible section") || !strings.Contains(output, "Render this") {
		t.Fatal("visible AI section was not rendered")
	}
}
