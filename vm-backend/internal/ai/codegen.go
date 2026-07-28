package ai

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type ProjectFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type CodeGenResult struct {
	Files       []ProjectFile     `json:"files"`
	Type        string            `json:"type"` // react-vite or standalone-html
	Routes      []string          `json:"routes"`
	Diagnostics []BuildDiagnostic `json:"diagnostics"`
	GeneratedAt string            `json:"generatedAt"`
}

type BuildDiagnostic struct {
	Severity string `json:"severity"`
	Message  string `json:"message"`
	Path     string `json:"path"`
}

type websiteDraft struct {
	Name           string         `json:"name"`
	Description    string         `json:"description"`
	Logo           string         `json:"logo"`
	Tagline        string         `json:"tagline"`
	Pages          []pageDraft    `json:"pages"`
	Theme          map[string]any `json:"theme"`
	GlobalStyles   map[string]any `json:"globalStyles"`
	Navigation     map[string]any `json:"navigation"`
	Footer         map[string]any `json:"footer"`
	SEO            map[string]any `json:"seo"`
	Analytics      map[string]any `json:"analytics"`
	DarkMode       bool           `json:"darkMode"`
	ResponsiveImg  bool           `json:"responsiveImage"`
	DevelopmentCfg map[string]any `json:"developmentConfig"`
}

type pageDraft struct {
	ID       string         `json:"id"`
	Slug     string         `json:"slug"`
	Title    string         `json:"title"`
	IsHome   bool           `json:"isHome"`
	Sections []sectionDraft `json:"sections"`
}

type sectionDraft struct {
	ID      string         `json:"id"`
	Type    string         `json:"type"`
	Order   int            `json:"order"`
	Visible *bool          `json:"visible,omitempty"`
	Props   map[string]any `json:"props"`
}

func GenerateReactProject(raw string, bizName, logoURL, tagline string) (*CodeGenResult, error) {
	var draft websiteDraft
	if err := json.Unmarshal([]byte(raw), &draft); err != nil {
		return nil, fmt.Errorf("invalid website draft: %w", err)
	}
	if len(draft.Pages) == 0 {
		return nil, fmt.Errorf("website draft has no pages")
	}
	diagnostics := validateWebsiteProject(&draft)

	// Support both old (globalStyles) and new (theme) field structures
	styles := draft.GlobalStyles
	if styles == nil {
		styles = draft.Theme
	}
	if styles == nil {
		styles = make(map[string]any)
	}
	primary := propString(styles, "primaryColor", propString(styles, "primary", "#10b981"))
	secondary := propString(styles, "secondaryColor", propString(styles, "secondary", "#059669"))
	accent := propString(styles, "accentColor", propString(styles, "accent", "#34d399"))
	darkColor := propString(styles, "dark", "#1f2937")
	fontHeading := propString(styles, "fontHeading", propString(styles, "fontHeading", "Inter"))
	fontBody := propString(styles, "fontBody", propString(styles, "fontBody", "Inter"))
	radius := propString(styles, "radius", "16px")

	// Use draft-level values if bizName/logoURL/tagline are empty (new format)
	if bizName == "" {
		bizName = draft.Name
	}
	if logoURL == "" {
		logoURL = draft.Logo
	}
	if tagline == "" {
		tagline = draft.Tagline
	}

	seoDesc := ""
	if draft.SEO != nil {
		if d, ok := draft.SEO["metaDescription"].(string); ok {
			seoDesc = d
		}
	}

	gaID := ""
	if draft.Analytics != nil {
		if g, ok := draft.Analytics["googleAnalyticsId"].(string); ok {
			gaID = g
		}
	}

	navItems := getNavItems(draft.Navigation)

	var files []ProjectFile

	// package.json
	packageJSON := fmt.Sprintf(`{
  "name": "%s-site",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "lucide-react": "^0.441.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "@types/react": "^18.3.3",
    "typescript": "^5.5.0"
  }
}`, safePackageName(bizName))

	files = append(files, ProjectFile{Path: "package.json", Content: packageJSON})

	// vite.config.js
	files = append(files, ProjectFile{Path: "vite.config.js", Content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 }
});`})

	// netlify.toml - tells Netlify to build the project
	files = append(files, ProjectFile{Path: "netlify.toml", Content: `[build]
  command = "npm install && npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`})

	// index.html
	metaDesc := ""
	if seoDesc != "" {
		metaDesc = fmt.Sprintf(`<meta name="description" content="%s" />`, html.EscapeString(seoDesc))
	}
	gaSnippet := ""
	if gaID != "" {
		gaSnippet = fmt.Sprintf(`<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','%s');</script>`, html.EscapeString(gaID), html.EscapeString(gaID))
	}
	darkModeClass := ""
	if draft.DarkMode {
		darkModeClass = `<meta name="color-scheme" content="dark light" />`
	}
	files = append(files, ProjectFile{Path: "index.html", Content: fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>%s</title>
    %s
    %s
    %s
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=%s:wght@300;400;500;600;700;800&family=%s:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`, html.EscapeString(bizName), metaDesc, darkModeClass, gaSnippet, urlencodeFont(fontHeading), urlencodeFont(fontBody))})

	// src/main.jsx
	files = append(files, ProjectFile{Path: "src/main.jsx", Content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);`})

	// src/styles/index.css
	darkModeCSS := ""
	if draft.DarkMode {
		darkModeCSS = fmt.Sprintf(`
@media (prefers-color-scheme: dark) {
  :root { --bg: %s; --text: #f9fafb; --text-muted: #94a3b8; --section-alt: #1e293b; }
  body { background: var(--bg); color: var(--text); }
  .section-alt { background: var(--section-alt); }
}`,
			darkColor)
	}
	cssContent := fmt.Sprintf(`:root {
  --primary: %s;
  --secondary: %s;
  --accent: %s;
  --font-heading: '%s', sans-serif;
  --font-body: '%s', sans-serif;
  --radius: %s;
  --bg: #ffffff;
  --text: #1a1a2e;
  --text-muted: #64748b;
  --section-alt: #f8fafc;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--font-body); color: var(--text); background: var(--bg); line-height: 1.6; }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); font-weight: 700; line-height: 1.2; }
a { color: var(--primary); text-decoration: none; }
img { max-width: 100%%; height: auto; }
.container { width: min(1180px, calc(100%% - 40px)); margin: 0 auto; }
.header { position: sticky; top: 0; z-index: 50; min-height: 72px; padding: 0 max(20px, calc((100vw - 1180px) / 2)); display: flex; align-items: center; justify-content: space-between; gap: 32px; background: color-mix(in srgb, var(--bg) 88%%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--text) 10%%, transparent); backdrop-filter: blur(18px); }
.header-logo { display: flex; align-items: center; min-width: 0; }
.header-links { display: flex; align-items: center; gap: 28px; }
.nav-link { color: var(--text-muted); font-size: 14px; font-weight: 650; transition: color .2s ease; }
.nav-link:hover, .nav-link.active { color: var(--primary); }
.section { padding: clamp(64px, 9vw, 112px) 0; }
.section-alt { background: var(--section-alt); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 12px 24px; border-radius: var(--radius); font-weight: 700; font-size: 15px; cursor: pointer; border: none; transition: transform .2s ease, box-shadow .2s ease, opacity .2s ease; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { opacity: .92; transform: translateY(-2px); box-shadow: 0 14px 35px color-mix(in srgb, var(--primary) 30%%, transparent); }
.btn-secondary { background: transparent; border: 2px solid var(--primary); color: var(--primary); }
.heading { font-size: clamp(32px, 5vw, 56px); letter-spacing: -.035em; margin-bottom: 16px; text-wrap: balance; }
.subtitle { font-size: 18px; color: var(--text-muted); margin-bottom: 40px; max-width: 600px; }
.text-center { text-align: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%%), 1fr)); gap: 24px; }
@media (max-width: 768px) {
  .header { min-height: 64px; }
  .header-links { max-width: 65vw; overflow-x: auto; gap: 18px; scrollbar-width: none; }
  .nav-link { white-space: nowrap; font-size: 13px; }
  .container { width: min(100%% - 32px, 1180px); }
}
%s`, primary, secondary, accent, fontHeading, fontBody, radius, darkModeCSS)

	files = append(files, ProjectFile{Path: "src/styles/index.css", Content: cssContent})

	// Components directory
	headerContent := generateHeader(navItems, bizName, primary, logoURL)
	files = append(files, ProjectFile{Path: "src/components/Header.jsx", Content: headerContent})

	footerContent := generateFooter(draft.Footer, bizName, logoURL)
	files = append(files, ProjectFile{Path: "src/components/Footer.jsx", Content: footerContent})

	sectionRenderer := generateSectionRenderer(primary, secondary, accent, fontHeading)
	files = append(files, ProjectFile{Path: "src/components/SectionRenderer.jsx", Content: sectionRenderer})

	routes := make([]string, 0, len(draft.Pages))
	for i := range draft.Pages {
		if strings.TrimSpace(draft.Pages[i].Slug) == "" {
			draft.Pages[i].Slug = "/"
		}
		p := draft.Pages[i]
		routes = append(routes, p.Slug)
	}

	// App.jsx with routes
	appContent := generateAppJSX(draft.Pages, bizName, tagline)
	files = append(files, ProjectFile{Path: "src/App.jsx", Content: appContent})

	return &CodeGenResult{
		Files: files, Type: "react-vite", Routes: routes,
		Diagnostics: diagnostics, GeneratedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func validateWebsiteProject(draft *websiteDraft) []BuildDiagnostic {
	var diagnostics []BuildDiagnostic
	seenRoutes := map[string]bool{}
	hasHome := false
	supported := map[string]bool{
		"hero": true, "features": true, "testimonials": true, "pricing": true,
		"contact": true, "cta": true, "stats": true, "faq": true,
		"carousel": true, "team": true, "about": true,
	}
	for pageIndex, page := range draft.Pages {
		slug := strings.TrimSpace(page.Slug)
		if slug == "" {
			slug = "/"
		}
		path := fmt.Sprintf("pages[%d]", pageIndex)
		if seenRoutes[slug] {
			diagnostics = append(diagnostics, BuildDiagnostic{Severity: "error", Path: path, Message: "Duplicate route " + slug})
		}
		seenRoutes[slug] = true
		if page.IsHome || slug == "/" {
			hasHome = true
		}
		if len(page.Sections) == 0 {
			diagnostics = append(diagnostics, BuildDiagnostic{Severity: "warning", Path: path, Message: "Page has no sections"})
		}
		for sectionIndex, section := range page.Sections {
			if !supported[section.Type] {
				diagnostics = append(diagnostics, BuildDiagnostic{
					Severity: "warning",
					Path:     fmt.Sprintf("%s.sections[%d]", path, sectionIndex),
					Message:  "Unknown section type " + section.Type + " will use the generic renderer",
				})
			}
		}
	}
	if !hasHome {
		diagnostics = append(diagnostics, BuildDiagnostic{Severity: "error", Path: "pages", Message: "Project requires a home route at /"})
	}
	return diagnostics
}

func ZipProjectFiles(files []ProjectFile) ([]byte, error) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	for _, f := range files {
		fw, err := w.Create(f.Path)
		if err != nil {
			return nil, err
		}
		if _, err := fw.Write([]byte(f.Content)); err != nil {
			return nil, err
		}
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ZipDirectory zips an entire directory recursively.
func ZipDirectory(dir string) ([]byte, error) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		fw, err := w.Create(rel)
		if err != nil {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		_, err = fw.Write(data)
		return err
	})
	if err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func generateHeader(items []navItem, bizName, primary, logoURL string) string {
	var links strings.Builder
	for _, item := range items {
		links.WriteString(fmt.Sprintf(`<NavLink to="%s" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>{'%s'}</NavLink>`, item.href, item.label))
	}
	safe := html.EscapeString(bizName)
	logo := ""
	if logoURL != "" {
		logo = fmt.Sprintf(`<img src="%s" alt="%s" style="height:32px;margin-right:8px" />`, html.EscapeString(logoURL), safe)
	} else {
		logo = fmt.Sprintf(`<span style="font-weight:700;font-size:20px;color:'%s'">%s</span>`, primary, safe)
	}
	return fmt.Sprintf(`import { NavLink } from 'react-router-dom';
export default function Header() {
  return (
    <nav className="header">
      <div className="header-logo">%s</div>
      <div className="header-links">%s</div>
    </nav>
  );
}`, logo, links.String())
}

func generateFooter(data map[string]any, bizName, logoURL string) string {
	customText, _ := data["customText"].(string)
	if customText == "" {
		customText = fmt.Sprintf("© 2026 %s. All rights reserved.", bizName)
	}
	logo := ""
	if logoURL != "" {
		logo = fmt.Sprintf(`<img src="%s" alt="%s" style="height:28px;margin-bottom:8px" />`, html.EscapeString(logoURL), html.EscapeString(bizName))
	}

	// Footer columns
	columns, _ := data["columns"].([]interface{})
	colsHTML := ""
	if len(columns) > 0 {
		var colBuilder strings.Builder
		for _, col := range columns {
			if cm, ok := col.(map[string]interface{}); ok {
				title, _ := cm["title"].(string)
				links, _ := cm["links"].([]interface{})
				colBuilder.WriteString(fmt.Sprintf(`<div style="flex:1;min-width:150px"><h4 style="color:#fff;font-size:14px;margin-bottom:12px;font-weight:700">%s</h4>`, html.EscapeString(title)))
				for _, l := range links {
					if lm, ok := l.(map[string]interface{}); ok {
						label, _ := lm["label"].(string)
						href, _ := lm["href"].(string)
						colBuilder.WriteString(fmt.Sprintf(`<a href="%s" style="display:block;color:rgba(255,255,255,.6);font-size:13px;margin-bottom:6px;text-decoration:none">%s</a>`, html.EscapeString(href), html.EscapeString(label)))
					}
				}
				colBuilder.WriteString(`</div>`)
			}
		}
		colsHTML = fmt.Sprintf(`<div style="display:flex;flex-wrap:wrap;gap:24px;max-width:900px;margin:0 auto 24px;text-align:left">%s</div>`, colBuilder.String())
	}

	return fmt.Sprintf(`export default function Footer() {
  return (
    <footer style={{background:'#1a1a2e',color:'#fff',textAlign:'center',padding:'40px 20px'}}>
      %s
      %s
      <p style={{fontSize:14,opacity:.7}}>%s</p>
    </footer>
  );
}`, logo, colsHTML, html.EscapeString(customText))
}

func generateSectionRenderer(primary, secondary, accent, fontHeading string) string {
	return fmt.Sprintf(`import { ArrowRight, Star, ChevronRight, Check, Phone, Mail, MapPin } from 'lucide-react';
const vars = {primary:'%s',secondary:'%s',accent:'%s',fontHeading:'%s'};
export default function SectionRenderer({ section }) {
  const p = section.props || {};
  switch (section.type) {
    case 'hero':
      return <section className="section" style={{background:'linear-gradient(135deg,'+vars.primary+','+vars.secondary+')',color:'#fff',padding:'120px 0'}}>
        <div className="container" style={{display:'grid',gridTemplateColumns:p.image?'minmax(0,1.05fr) minmax(300px,.95fr)':'1fr',gap:56,alignItems:'center'}}>
          <div className={p.image?'':'text-center'}>
            {p.logo && <img src={p.logo} alt="" style={{height:64,marginBottom:16}}/>}
            <h1 className="heading" style={{fontSize:48,marginBottom:16}}>{p.headline||'Welcome'}</h1>
            <p style={{fontSize:20,opacity:.9,marginBottom:32,maxWidth:640,margin:p.image?'0 0 32px':'0 auto 32px'}}>{p.subheadline||''}</p>
            <div style={{display:'flex',gap:12,justifyContent:p.image?'flex-start':'center',flexWrap:'wrap'}}>
              {p.ctaPrimary && <a className="btn btn-primary" style={{background:'#fff',color:vars.primary}} href="#contact">{p.ctaPrimary} <ArrowRight size={18}/></a>}
              {p.secondaryCta && <a className="btn btn-secondary" style={{borderColor:'#fff',color:'#fff'}} href="#about">{p.secondaryCta}</a>}
            </div>
          </div>
          {p.image && <img src={p.image} alt={p.imageAlt||''} width="1365" height="1024" fetchPriority="high" style={{width:'100%%',aspectRatio:'4/3',objectFit:'cover',borderRadius:28,boxShadow:'0 28px 70px rgba(0,0,0,.24)'}}/>}
        </div>
      </section>;
    case 'features':
      return <section className="section" id="features"><div className="container text-center">
        <h2 className="heading">{p.title||'Features'}</h2>
        {p.subtitle && <p className="subtitle" style={{margin:'0 auto 40px'}}>{p.subtitle}</p>}
        <div className="grid">
          {(p.features||[]).map((f,i) => <div key={i} style={{padding:24,borderRadius:16,border:'1px solid #e2e8f0',textAlign:'left'}}>
            <div style={{width:48,height:48,borderRadius:12,background:vars.primary+'15',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,color:vars.primary}}>✨</div>
            <h3 style={{marginBottom:8}}>{f.title||''}</h3>
            <p style={{color:'#64748b',fontSize:14}}>{f.description||''}</p>
          </div>)}
        </div>
      </div></section>;
    case 'testimonials':
      return <section className="section section-alt" id="testimonials"><div className="container text-center">
        <h2 className="heading">{p.title||'Testimonials'}</h2>
        {p.subtitle && <p className="subtitle" style={{margin:'0 auto 40px'}}>{p.subtitle}</p>}
        <div className="grid">
          {(p.testimonials||[]).map((t,i) => <div key={i} style={{padding:24,borderRadius:16,background:'#fff',boxShadow:'0 4px 12px rgba(0,0,0,.06)',textAlign:'left'}}>
            <div style={{color:vars.accent,marginBottom:12}}>{'★'.repeat(5)}</div>
            <p style={{fontStyle:'italic',marginBottom:16,color:'#475569'}}>"{t.quote||''}"</p>
            <div><strong>{t.author||''}</strong><br/><span style={{fontSize:13,color:'#64748b'}}>{t.role||''}</span></div>
          </div>)}
        </div>
      </div></section>;
    case 'pricing':
      return <section className="section" id="pricing"><div className="container text-center">
        <h2 className="heading">{p.title||'Pricing'}</h2>
        {p.subtitle && <p className="subtitle" style={{margin:'0 auto 40px'}}>{p.subtitle}</p>}
        <div className="grid" style={{alignItems:'start'}}>
          {(p.items||[]).map((pl,i) => <div key={i} style={{padding:32,borderRadius:16,border:'1px solid #e2e8f0',textAlign:'center'}}>
            <h3 style={{marginBottom:8}}>{pl.name||''}</h3>
            <p style={{color:'#64748b',fontSize:14,marginBottom:16}}>{pl.description||''}</p>
            <div style={{fontSize:36,fontWeight:700,color:vars.primary,marginBottom:24}}>{pl.price||''}</div>
            <ul style={{listStyle:'none',padding:0,marginBottom:24,textAlign:'left'}}>
              {(pl.features||[]).map((ft,j) => <li key={j} style={{padding:'6px 0',display:'flex',alignItems:'center',gap:8}}><Check size={16} color={vars.primary}/>{ft}</li>)}
            </ul>
            {pl.cta && <a className="btn btn-primary" href={pl.href||'#'}>{pl.cta}</a>}
          </div>)}
        </div>
      </div></section>;
    case 'contact':
      return <section className="section section-alt" id="contact"><div className="container text-center">
        <h2 className="heading">{p.title||'Contact'}</h2>
        {p.subtitle && <p className="subtitle" style={{margin:'0 auto 40px'}}>{p.subtitle}</p>}
        <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap'}}>
          {p.location && <div style={{display:'flex',alignItems:'center',gap:8,color:'#475569'}}><MapPin size={18}/> {p.location}</div>}
          {p.email && <a href={'mailto:'+p.email} style={{display:'flex',alignItems:'center',gap:8,color:'#475569'}}><Mail size={18}/> {p.email}</a>}
          {p.phone && <a href={'tel:'+p.phone} style={{display:'flex',alignItems:'center',gap:8,color:'#475569'}}><Phone size={18}/> {p.phone}</a>}
        </div>
      </div></section>;
    case 'cta':
      return <section className="section" style={{background:'linear-gradient(135deg,'+vars.primary+','+vars.secondary+')',color:'#fff'}}><div className="container text-center">
        <h2 className="heading" style={{fontSize:32}}>{p.headline||''}</h2>
        <p style={{fontSize:18,opacity:.9,marginBottom:32,maxWidth:500,margin:'0 auto 32px'}}>{p.subheadline||''}</p>
        {p.cta && <a className="btn" style={{background:'#fff',color:vars.primary}} href={p.href||'#'}>{p.cta} <ArrowRight size={18}/></a>}
      </div></section>;
    case 'stats':
      return <section className="section section-alt" id="stats"><div className="container text-center">
        <h2 className="heading">{p.title||'Stats'}</h2>
        <div className="grid">
          {(p.stats||[]).map((s,i) => <div key={i}>
            <div style={{fontSize:40,fontWeight:800,color:vars.primary}}>{s.value||''}</div>
            <p style={{color:'#64748b'}}>{s.label||''}</p>
          </div>)}
        </div>
      </div></section>;
    case 'faq':
      return <section className="section" id="faq"><div className="container" style={{maxWidth:800}}>
        <h2 className="heading text-center">{p.title||'FAQ'}</h2>
        {(p.items||[]).map((f,i) => <details key={i} style={{padding:16,borderBottom:'1px solid #e2e8f0',cursor:'pointer'}}>
          <summary style={{fontWeight:600,marginBottom:8}}>{f.question||''}</summary>
          <p style={{color:'#64748b',paddingLeft:16}}>{f.answer||''}</p>
        </details>)}
      </div></section>;
    case 'carousel':
      return <section className="section" id="carousel"><div className="container">
        <h2 className="heading text-center">{p.title||''}</h2>
        {p.subtitle && <p className="subtitle text-center" style={{margin:'0 auto 40px'}}>{p.subtitle}</p>}
        <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:16,scrollSnapType:'x mandatory'}}>
          {(p.items||[]).map((item,i) => <div key={i} style={{flex:'0 0 320px',padding:24,borderRadius:16,border:'1px solid #e2e8f0',scrollSnapAlign:'start'}}>
            {item.image && <img src={item.image} alt={item.alt||''} loading="lazy" decoding="async" width="640" height="400" style={{width:'100%%',height:160,objectFit:'cover',borderRadius:8,marginBottom:12}}/>}
            <h3 style={{marginBottom:8}}>{item.title||''}</h3>
            <p style={{color:'#64748b',fontSize:14,marginBottom:12}}>{item.description||''}</p>
            {item.cta && <a href={item.href||'#'} style={{color:vars.primary,fontWeight:600,fontSize:14}}>{item.cta} <ChevronRight size={14} style={{display:'inline'}}/></a>}
          </div>)}
        </div>
      </div></section>;
    case 'team':
      return <section className="section section-alt" id="team"><div className="container text-center">
        <h2 className="heading">{p.title||'Team'}</h2>
        {p.subtitle && <p className="subtitle" style={{margin:'0 auto 40px'}}>{p.subtitle}</p>}
        <div className="grid">
          {(p.items||[]).map((m,i) => <div key={i} style={{padding:24}}>
            <div style={{width:96,height:96,borderRadius:'50%%',background:vars.accent+'30',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,color:vars.accent}}>{m.name?m.name[0]:'?'}</div>
            <h3>{m.name||''}</h3>
            <p style={{color:vars.primary,fontWeight:600,fontSize:14}}>{m.role||''}</p>
            <p style={{color:'#64748b',fontSize:13,marginTop:8}}>{m.bio||''}</p>
          </div>)}
        </div>
      </div></section>;
    case 'about':
      return <section className="section" id="about"><div className="container">
        <h2 className="heading">{p.title||'About'}</h2>
        <p style={{color:'#475569',fontSize:16,maxWidth:800,lineHeight:1.8}}>{p.content||''}</p>
      </div></section>;
    case 'image':
      return <section className="section"><figure className="container text-center">
        {p.src && <img src={p.src} alt={p.alt||''} loading="lazy" decoding="async" width="1365" height="1024" style={{width:'100%%',maxHeight:760,objectFit:'cover',borderRadius:24,boxShadow:'0 24px 64px rgba(15,23,42,.14)'}}/>}
        {p.caption && <figcaption style={{marginTop:12,color:'#64748b',fontSize:14}}>{p.caption}</figcaption>}
      </figure></section>;
    default:
      return <section className="section"><div className="container text-center">
        <h2 className="heading">{p.title||section.type}</h2>
        {p.content && <p style={{color:'#475569'}}>{p.content}</p>}
      </div></section>;
  }
}`, primary, secondary, accent, fontHeading)
}

func generateAppJSX(pages []pageDraft, bizName, tagline string) string {
	for i := range pages {
		if strings.TrimSpace(pages[i].Slug) == "" {
			pages[i].Slug = "/"
		}
	}
	pagesJSON, _ := json.Marshal(pages)
	taglineJSON, _ := json.Marshal(tagline)

	return fmt.Sprintf(`import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import SectionRenderer from './components/SectionRenderer';
import './styles/index.css';

const pages = %s;
const SITE_TAGLINE = %s;

export default function App() {
  const homePage = pages.find(p => p.isHome) || pages[0];
  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh'}}>
      <Header />
      <main style={{flex:1}}>
        <Routes>
          {pages.map((page, i) => (
            <Route key={i} path={page.slug} element={
              <div>
                <div style={{display:'none'}}>{SITE_TAGLINE}</div>
                {(page.sections || []).filter(s => s.visible !== false).sort((a,b) => a.order - b.order).map((s, j) => (
                  <SectionRenderer key={j} section={s} />
                ))}
              </div>
            } />
          ))}
          <Route path="*" element={<Navigate to={homePage.slug} replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}`, string(pagesJSON), string(taglineJSON))
}

func generatePageComponents(pages []pageDraft) string {
	// Sections are rendered inline by App.jsx, no separate page components needed
	return ""
}

type navItem struct {
	label string
	href  string
}

func getNavItems(nav map[string]any) []navItem {
	items, _ := nav["items"].([]interface{})
	if len(items) == 0 {
		return []navItem{{label: "Home", href: "/"}}
	}
	out := make([]navItem, 0, len(items))
	for _, item := range items {
		if m, ok := item.(map[string]interface{}); ok {
			label, _ := m["label"].(string)
			href, _ := m["href"].(string)
			if href == "" {
				href = "/"
			}
			out = append(out, navItem{label: label, href: href})
		}
	}
	return out
}

func propString(m map[string]any, key, fallback string) string {
	if v, ok := m[key].(string); ok && v != "" {
		return v
	}
	return fallback
}

func urlencodeFont(name string) string {
	return strings.ReplaceAll(name, " ", "+")
}

func safePackageName(name string) string {
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ReplaceAll(name, "'", "")
	name = strings.ReplaceAll(name, ".", "")
	return name
}
