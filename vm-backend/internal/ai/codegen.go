package ai

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"strings"
)

type ProjectFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type CodeGenResult struct {
	Files  []ProjectFile `json:"files"`
	Type   string        `json:"type"` // react-vite or standalone-html
	Routes []string      `json:"routes"`
}

type websiteDraft struct {
	Pages           []pageDraft     `json:"pages"`
	GlobalStyles    map[string]any  `json:"globalStyles"`
	Navigation      map[string]any  `json:"navigation"`
	Footer          map[string]any  `json:"footer"`
	DevelopmentCfg  map[string]any  `json:"developmentConfig"`
}

type pageDraft struct {
	ID          string         `json:"id"`
	Slug        string         `json:"slug"`
	Title       string         `json:"title"`
	IsHome      bool           `json:"isHome"`
	Sections    []sectionDraft `json:"sections"`
}

type sectionDraft struct {
	ID      string         `json:"id"`
	Type    string         `json:"type"`
	Order   int            `json:"order"`
	Visible bool           `json:"visible"`
	Props   map[string]any `json:"props"`
}

func GenerateReactProject(raw string, bizName string) (*CodeGenResult, error) {
	var draft websiteDraft
	if err := json.Unmarshal([]byte(raw), &draft); err != nil {
		return nil, fmt.Errorf("invalid website draft: %w", err)
	}
	if len(draft.Pages) == 0 {
		return nil, fmt.Errorf("website draft has no pages")
	}

	styles := draft.GlobalStyles
	primary := propString(styles, "primaryColor", "#10b981")
	secondary := propString(styles, "secondaryColor", "#059669")
	accent := propString(styles, "accentColor", "#34d399")
	fontHeading := propString(styles, "fontHeading", "Inter")
	fontBody := propString(styles, "fontBody", "Inter")
	radius := propString(styles, "radius", "16px")

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

	// index.html
	files = append(files, ProjectFile{Path: "index.html", Content: fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>%s</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=%s:wght@300;400;500;600;700;800&family=%s:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`, html.EscapeString(bizName), urlencodeFont(fontHeading), urlencodeFont(fontBody))})

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
	cssContent := fmt.Sprintf(`:root {
  --primary: %s;
  --secondary: %s;
  --accent: %s;
  --font-heading: '%s', sans-serif;
  --font-body: '%s', sans-serif;
  --radius: %s;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--font-body); color: #1a1a2e; background: #fff; line-height: 1.6; }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); font-weight: 700; line-height: 1.2; }
a { color: var(--primary); text-decoration: none; }
img { max-width: 100%%; height: auto; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.section { padding: 80px 0; }
.section-alt { background: #f8fafc; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; border-radius: var(--radius); font-weight: 600; font-size: 16px; cursor: pointer; border: none; transition: all .2s; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { opacity: .9; transform: translateY(-1px); }
.btn-secondary { background: transparent; border: 2px solid var(--primary); color: var(--primary); }
.heading { font-size: 36px; margin-bottom: 12px; }
.subtitle { font-size: 18px; color: #64748b; margin-bottom: 40px; max-width: 600px; }
.text-center { text-align: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
@media (max-width: 768px) { .section { padding: 48px 0; } .heading { font-size: 28px; } }
`, primary, secondary, accent, fontHeading, fontBody, radius)

	files = append(files, ProjectFile{Path: "src/styles/index.css", Content: cssContent})

	// Components directory
	headerContent := generateHeader(navItems, bizName, primary)
	files = append(files, ProjectFile{Path: "src/components/Header.jsx", Content: headerContent})

	footerContent := generateFooter(draft.Footer, bizName)
	files = append(files, ProjectFile{Path: "src/components/Footer.jsx", Content: footerContent})

	sectionRenderer := generateSectionRenderer(primary, secondary, accent, fontHeading)
	files = append(files, ProjectFile{Path: "src/components/SectionRenderer.jsx", Content: sectionRenderer})

	routes := make([]string, 0, len(draft.Pages))
	for _, p := range draft.Pages {
		routes = append(routes, p.Slug)
	}

	// App.jsx with routes
	appContent := generateAppJSX(draft.Pages, bizName)
	files = append(files, ProjectFile{Path: "src/App.jsx", Content: appContent})

	return &CodeGenResult{Files: files, Type: "react-vite", Routes: routes}, nil
}

func GenerateStandaloneHTML(raw string, bizName string) (*CodeGenResult, error) {
	var draft websiteDraft
	if err := json.Unmarshal([]byte(raw), &draft); err != nil {
		return nil, fmt.Errorf("invalid website draft: %w", err)
	}
	if len(draft.Pages) == 0 {
		return nil, fmt.Errorf("website draft has no pages")
	}

	styles := draft.GlobalStyles
	primary := propString(styles, "primaryColor", "#10b981")
	secondary := propString(styles, "secondaryColor", "#059669")
	accent := propString(styles, "accentColor", "#34d399")
	fontHeading := propString(styles, "fontHeading", "Inter")
	fontBody := propString(styles, "fontBody", "Inter")
	radius := propString(styles, "radius", "16px")

	navItems := getNavItems(draft.Navigation)

	var pagesHTML strings.Builder
	for i, p := range draft.Pages {
		display := "block"
		if !p.IsHome && i != 0 {
			display = "none"
		}
		pagesHTML.WriteString(fmt.Sprintf(`<div id="page-%s" class="page" style="display:%s">`, p.ID, display))
		for _, s := range p.Sections {
			if !s.Visible {
				continue
			}
			pagesHTML.WriteString(renderSectionHTML(s, primary, secondary, accent))
		}
		pagesHTML.WriteString("</div>")
	}

	var navHTML strings.Builder
	for _, item := range navItems {
		navHTML.WriteString(fmt.Sprintf(`<a href="%s" class="nav-link" data-page="%s">%s</a>`, item.href, strings.TrimLeft(item.href, "/"), html.EscapeString(item.label)))
	}

	footerContent := ""
	showLogo, _ := draft.Footer["showLogo"].(bool)
	customText, _ := draft.Footer["customText"].(string)
	if customText == "" {
		customText = fmt.Sprintf("© 2026 %s. All rights reserved.", bizName)
	}
	if showLogo {
		footerContent = fmt.Sprintf(`<div style="margin-bottom:12px;font-weight:700;font-size:18px;color:%s">%s</div>`, primary, html.EscapeString(bizName))
	}

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=%s:wght@300;400;500;600;700;800&family=%s:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--primary:%s;--secondary:%s;--accent:%s;--font-heading:'%s',sans-serif;--font-body:'%s',sans-serif;--radius:%s}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font-body);color:#1a1a2e;background:#fff;line-height:1.6}
h1,h2,h3{font-family:var(--font-heading);font-weight:700;line-height:1.2}
a{color:var(--primary);text-decoration:none}
.container{max-width:1200px;margin:0 auto;padding:0 20px}
.section{padding:80px 0}
.section-alt{background:#f8fafc}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:var(--radius);font-weight:600;font-size:16px;cursor:pointer;border:none;transition:all .2s}
.btn-p{background:var(--primary);color:#fff}
.btn-p:hover{opacity:.9;transform:translateY(-1px)}
.btn-s{background:transparent;border:2px solid var(--primary);color:var(--primary)}
.h1{font-size:36px;margin-bottom:12px}
.h2{font-size:28px;margin-bottom:12px}
.sub{font-size:18px;color:#64748b;margin-bottom:40px;max-width:600px}
.tac{text-align:center}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:100}
.nav-links{display:flex;gap:24px}
.nav-link{color:#475569;font-weight:500;font-size:15px;padding:8px 0;border-bottom:2px solid transparent}
.nav-link:hover,.nav-link.active{color:var(--primary);border-color:var(--primary)}
.page{animation:fadeIn .3s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@media(max-width:768px){.section{padding:48px 0}.h1{font-size:28px}nav{padding:12px 16px;flex-direction:column;gap:8px}}
</style>
</head><body>
<nav><div style="font-weight:700;font-size:20px;color:var(--primary)">%s</div>
<div class="nav-links">%s</div></nav>
%s
<footer style="background:#1a1a2e;color:#fff;text-align:center;padding:40px 20px">%s<p style="font-size:14px;opacity:.7">%s</p></footer>
<script>
document.querySelectorAll('.nav-link').forEach(a=>{a.addEventListener('click',e=>{e.preventDefault();const p=a.dataset.page;document.querySelectorAll('.page').forEach(x=>x.style.display='none');const t=document.getElementById('page-'+p);if(t)t.style.display='block';document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));a.classList.add('active')})})
document.querySelector('.nav-link')?.classList.add('active')
</script>
</body></html>`,
		html.EscapeString(bizName),
		urlencodeFont(fontHeading), urlencodeFont(fontBody),
		primary, secondary, accent, fontHeading, fontBody, radius,
		html.EscapeString(bizName), navHTML.String(),
		pagesHTML.String(),
		footerContent, html.EscapeString(customText))

	return &CodeGenResult{
		Files:  []ProjectFile{{Path: "index.html", Content: htmlContent}},
		Type:   "standalone-html",
		Routes: []string{"/"},
	}, nil
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

func generateHeader(items []navItem, bizName, primary string) string {
	var links strings.Builder
	for _, item := range items {
		links.WriteString(fmt.Sprintf(`<NavLink to="%s" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>{'%s'}</NavLink>`, item.href, item.label))
	}
	safe := html.EscapeString(bizName)
	return fmt.Sprintf(`import { NavLink } from 'react-router-dom';
import './Header.css';
export default function Header() {
  return (
    <nav className="header">
      <div className="header-logo" style={{fontWeight:700,fontSize:20,color:'%s'}}>%s</div>
      <div className="header-links">%s</div>
    </nav>
  );
}`, primary, safe, links.String())
}

func generateFooter(data map[string]any, bizName string) string {
	customText, _ := data["customText"].(string)
	if customText == "" {
		customText = fmt.Sprintf("© 2026 %s. All rights reserved.", bizName)
	}
	return fmt.Sprintf(`export default function Footer() {
  return (
    <footer style={{background:'#1a1a2e',color:'#fff',textAlign:'center',padding:'40px 20px'}}>
      <p style={{fontSize:14,opacity:.7}}>%s</p>
    </footer>
  );
}`, html.EscapeString(customText))
}

func generateSectionRenderer(primary, secondary, accent, fontHeading string) string {
	return fmt.Sprintf(`import { ArrowRight, Star, ChevronRight, Check, Phone, Mail, MapPin } from 'lucide-react';
const vars = {primary:'%s',secondary:'%s',accent:'%s',fontHeading:'%s'};
export default function SectionRenderer({ section }) {
  const p = section.props || {};
  switch (section.type) {
    case 'hero':
      return <section className="section" style={{background:'linear-gradient(135deg,'+vars.primary+','+vars.secondary+')',color:'#fff',padding:'120px 0'}}>
        <div className="container text-center">
          {p.logo && <img src={p.logo} alt="" style={{height:64,marginBottom:16}}/>}
          <h1 className="heading" style={{fontSize:48,marginBottom:16}}>{p.headline||'Welcome'}</h1>
          <p style={{fontSize:20,opacity:.9,marginBottom:32,maxWidth:600,margin:'0 auto 32px'}}>{p.subheadline||''}</p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            {p.ctaPrimary && <a className="btn btn-primary" style={{background:'#fff',color:vars.primary}} href="#contact">{p.ctaPrimary} <ArrowRight size={18}/></a>}
            {p.secondaryCta && <a className="btn btn-secondary" style={{borderColor:'#fff',color:'#fff'}} href="#about">{p.secondaryCta}</a>}
          </div>
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
          {p.showCompany && <div style={{display:'flex',alignItems:'center',gap:8,color:'#475569'}}><MapPin size={18}/> Main Office</div>}
          <div style={{display:'flex',alignItems:'center',gap:8,color:'#475569'}}><Mail size={18}/> contact@example.com</div>
          <div style={{display:'flex',alignItems:'center',gap:8,color:'#475569'}}><Phone size={18}/> +1 (555) 000-0000</div>
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
            {item.image && <img src={item.image} alt="" style={{width:'100%%',height:160,objectFit:'cover',borderRadius:8,marginBottom:12}}/>}
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
    default:
      return <section className="section"><div className="container text-center">
        <h2 className="heading">{p.title||section.type}</h2>
        {p.content && <p style={{color:'#475569'}}>{p.content}</p>}
      </div></section>;
  }
}`, primary, secondary, accent, fontHeading)
}

func generateAppJSX(pages []pageDraft, bizName string) string {
	var routes strings.Builder

	for _, p := range pages {
		slug := p.Slug
		if slug == "" {
			slug = "/"
		}
		isHome := p.IsHome
		for _, s := range p.Sections {
			propsJSON, _ := json.Marshal(s.Props)
			slugSafe := strings.ReplaceAll(strings.TrimLeft(slug, "/"), "/", "_")
			if slugSafe == "" {
				slugSafe = "home"
			}
			routes.WriteString(fmt.Sprintf(`          {
            slug: '%s',
            isHome: %v,
            sections: [
              {id: '%s', type: '%s', props: %s, order: %d, visible: %v},
            ],
          },
`, slug, isHome, s.ID, s.Type, string(propsJSON), s.Order, s.Visible))
		}
	}

	return fmt.Sprintf(`import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import SectionRenderer from './components/SectionRenderer';
import './styles/index.css';

const pages = [%s];

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
                {page.sections.filter(s => s.visible).sort((a,b) => a.order - b.order).map((s, j) => (
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
}`, routes.String())
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

func renderSectionHTML(s sectionDraft, primary, secondary, accent string) string {
	p := s.Props
	switch s.Type {
	case "hero":
		return fmt.Sprintf(`<section class="section" style="background:linear-gradient(135deg,%s,%s);color:#fff;padding:120px 0"><div class="container tac"><h1 class="h1" style="font-size:48px">%s</h1><p style="font-size:20px;opacity:.9;margin-bottom:32px">%s</p><a class="btn btn-p" href="#contact">%s</a></div></section>`,
			primary, secondary, html.EscapeString(propString(p, "headline", "Welcome")), html.EscapeString(propString(p, "subheadline", "")), html.EscapeString(propString(p, "ctaPrimary", "Get Started")))
	case "features":
		features, _ := p["features"].([]interface{})
		var items strings.Builder
		for _, f := range features {
			if fm, ok := f.(map[string]interface{}); ok {
				items.WriteString(fmt.Sprintf(`<div style="padding:24;border-radius:16;border:1px solid #e2e8f0;text-align:left"><h3 style="margin-bottom:8">%s</h3><p style="color:#64748b;font-size:14">%s</p></div>`,
					html.EscapeString(propString(fm, "title", "")), html.EscapeString(propString(fm, "description", ""))))
			}
		}
		return fmt.Sprintf(`<section class="section" id="features"><div class="container tac"><h2 class="h1">%s</h2><div class="grid">%s</div></div></section>`,
			html.EscapeString(propString(p, "title", "Features")), items.String())
	case "cta":
		return fmt.Sprintf(`<section class="section" style="background:linear-gradient(135deg,%s,%s);color:#fff"><div class="container tac"><h2 class="h1" style="font-size:32px">%s</h2><a class="btn" style="background:#fff;color:%s" href="%s">%s</a></div></section>`,
			primary, secondary, html.EscapeString(propString(p, "headline", "")), primary, html.EscapeString(propString(p, "href", "#")), html.EscapeString(propString(p, "cta", "Get in touch")))
	case "stats":
		stats, _ := p["stats"].([]interface{})
		var items strings.Builder
		for _, st := range stats {
			if sm, ok := st.(map[string]interface{}); ok {
				items.WriteString(fmt.Sprintf(`<div><div style="font-size:40px;font-weight:800;color:%s">%s</div><p style="color:#64748b">%s</p></div>`,
					primary, html.EscapeString(propString(sm, "value", "")), html.EscapeString(propString(sm, "label", ""))))
			}
		}
		return fmt.Sprintf(`<section class="section section-alt"><div class="container tac"><h2 class="h1">%s</h2><div class="grid">%s</div></div></section>`,
			html.EscapeString(propString(p, "title", "Stats")), items.String())
	case "contact":
		return fmt.Sprintf(`<section class="section section-alt" id="contact"><div class="container tac"><h2 class="h1">%s</h2><p style="color:#64748b;margin-bottom:24">%s</p></div></section>`,
			html.EscapeString(propString(p, "title", "Contact")), html.EscapeString(propString(p, "subtitle", "")))
	case "faq":
		items, _ := p["items"].([]interface{})
		var faqs strings.Builder
		for _, f := range items {
			if fm, ok := f.(map[string]interface{}); ok {
				faqs.WriteString(fmt.Sprintf(`<details style="padding:16;border-bottom:1px solid #e2e8f0"><summary style="font-weight:600">%s</summary><p style="color:#64748b;padding-left:16;margin-top:8">%s</p></details>`,
					html.EscapeString(propString(fm, "question", "")), html.EscapeString(propString(fm, "answer", ""))))
			}
		}
		return fmt.Sprintf(`<section class="section"><div class="container" style="max-width:800px"><h2 class="h1 tac">%s</h2>%s</div></section>`,
			html.EscapeString(propString(p, "title", "FAQ")), faqs.String())
	default:
		content, _ := p["content"].(string)
		title, _ := p["title"].(string)
		if title == "" {
			title = s.Type
		}
		return fmt.Sprintf(`<section class="section"><div class="container tac"><h2 class="h1">%s</h2><p style="color:#475569">%s</p></div></section>`,
			html.EscapeString(title), html.EscapeString(content))
	}
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
