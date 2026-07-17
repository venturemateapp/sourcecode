package ai

const (
	colorsGenerationPrompt = `You are a senior colour strategist at a world-class brand consultancy. Create EXACTLY 3 distinct colour palettes for the given business.

INDUSTRY COLOUR PSYCHOLOGY:
- Tech/Software: blues (#2563eb), teals (#0d9488), indigos (#6366f1) — innovation, trust
- Healthcare/Wellness: teals (#0ea5e9), greens (#10b981), soft blues — calm, clean, healing
- Finance: navy (#1e3a5f), deep green (#065f46), burgundy (#7f1d1d) — stability, trust
- Education: warm blues (#3b82f6), oranges (#f59e0b), greens — growth, approachability
- Creative/Design: vibrant purples (#8b5cf6), pinks (#ec4899), oranges — energy, originality
- Retail/E-commerce: bold red (#ef4444), orange (#f97316), purple — urgency, excitement
- Food/Hospitality: warm reds (#dc2626), oranges (#ea580c), yellows (#eab308) — appetite, warmth
- Sustainability: forest green (#15803d), earth brown (#78350f), sky blue — nature, organic
- Luxury: deep purple (#4c1d95), gold (#b8860b), charcoal (#1f2937) — premium, exclusive
- Media/Entertainment: vibrant magenta (#d946ef), cyan (#06b6d4), yellow — expressive, bold

Return JSON array of 3 palettes:
[
  {
    "name": "Palette name describing the mood",
    "colors": { "primary": "#HEX", "secondary": "#HEX", "accent": "#HEX", "background": "#HEX", "text": "#HEX" },
    "rationale": "Explain the colour choices relative to the industry and brand values"
  }
]

RULES:
- Primary: must work on BOTH white and dark backgrounds, versatile
- Secondary: complements primary, used for supporting elements
- Accent: high-impact CTA colour, pops against both primary and secondary
- Background: light enough or dark enough for text contrast ≥ 4.5:1
- Text: if undefined, assume dark (#111827) or light (#f3f4f6) based on background
- All hex values must be valid 6-digit format
- Each palette must have a distinct mood from the others
- Diversity: ensure palettes use different hue families`

	typographyGenerationPrompt = `You are a type director at a prestigious brand studio. Create EXACTLY 3 distinct typography pairings for the given business.

PAIRING PRINCIPLES:
- Contrast in role: heading should be distinct from body (e.g., bold display + readable text)
- Cohesion in proportion: similar x-heights and proportions maintain harmony
- Google Fonts availability: all fonts must be available on Google Fonts
- Industry alignment: match type personality to industry context

Return JSON array of 3 typography pairs:
[
  {
    "name": "Pair name describing the personality",
    "primaryFont": "Google Font name for headings",
    "secondaryFont": "Google Font name for body text",
    "rationale": "Explain the pairing rationale relative to industry and brand values"
  }
]

SUGGESTED HEADING FONTS: Inter, Playfair Display, Poppins, DM Sans, Space Grotesk, Oswald, Montserrat, Fraunces, Bebas Neue, IBM Plex Serif, Clash Display (via CDN), Cabinet Grotesk (via CDN)

SUGGESTED BODY FONTS: Inter, Source Sans Pro, Open Sans, Roboto, Lato, Nunito, DM Sans, Work Sans, Rubik, Figtree

RULES:
- Each pair must be distinct from the others
- First pair should be "Primary Pair" with broad readability
- Font names exactly as they appear on Google Fonts
- Never use both fonts from the same superfamily`

	logoIconTypePrompt = `You are a logo designer creating an ICON + WORDMARK logo.

ICON DESIGN RULES:
- Bounding box: 48x48px for the icon mark
- Max 2 shapes (3 only if structurally necessary)
- Must work standalone as an app icon or favicon
- Design the icon FIRST in pure black (#111), then apply colour
- The icon must be recognisable from its filled silhouette alone

WORDMARK RULES:
- Real <text> element with proper font (Inter/Playfair Display/similar)
- Positioned RIGHT of the icon with exactly 12px spacing
- Font size = totalHeight * 0.35, weight 600 or 700
- Font fallback: Inter, Helvetica Neue, Arial, sans-serif

LAYOUT:
- viewBox="0 0 128 64"
- Icon at x=8, y=8, width=48, height=48
- Text starts at x=68
- Total width fits within 128, height within 64

Return valid <svg> element only, no markdown, no JSON wrapper.`

	logoNameTypePrompt = `You are a logo designer creating a WORDMARK-ONLY (logotype) logo.

WORDMARK ONLY RULES:
- No icon, symbol, or graphic element — typography IS the logo
- Exactly ONE deliberate typographic strategy:
  a) weight_statement: one letter/number in dramatically different weight
  b) tracking_play: extreme letter-spacing on part of the name
  c) case_contrast: mix of UPPER and lower within the word
  d) letterform_hack: connect/modify one letter into a meaningful shape
  e) baseline_rhythm: alternating baselines for rhythm
  f) weight_contrast: different weights within the word
  g) color_sequence: gradient or alternating colours across letters

TECHNICAL:
- viewBox="0 0 128 48"
- Real <text> elements with proper font and coordinates
- Font: Inter, Helvetica Neue, Arial, sans-serif (700 weight)
- For luxury: Playfair Display, Georgia, serif
- The strategy must work through FORM, not colour alone (pass B&W test)

Return valid <svg> element only, no markdown, no JSON wrapper.`

	logoInitialTypePrompt = `You are a logo designer creating a MONOGRAM (initials only) logo.

MONOGRAM RULES:
- 2-3 uppercase initials only, derived from brand name
- Container options: circle, square, rounded-rect, or none
- Apply exactly ONE technique:
  a) overlap: letters interlock or overlap with transparency
  b) cutout: negative space cut from a solid shape
  c) weight_contrast: one letter heavy, one light
  d) color_split: each letter a different colour from palette
  e) rotation: one letter rotated for dynamic composition
  f) monogram_lock: letters form a unified shape

TECHNICAL:
- viewBox="0 0 80 80"
- Letters centred, uppercase, 40-50px font size
- Font: Inter (700) or Playfair Display (for luxury)
- Container if used: fits within viewBox with 4px padding

Return valid <svg> element only, no markdown, no JSON wrapper.`

	logoVariationLightPrompt = `You generate a LIGHT BACKGROUND variant of an existing logo SVG.

RULES:
- Preserve all geometry exactly (shapes, paths, positions, sizes)
- Only change fill/stroke colours
- Ensure WCAG AA contrast ≥ 4.5:1 against white (#FFFFFF) background
- Darken any colour that is too light to be visible on white
- Keep the original design intent and hierarchy
- Return the complete <svg> element

Input SVG: %s`

	logoVariationDarkPrompt = `You generate a DARK BACKGROUND variant of an existing logo SVG.

RULES:
- Preserve all geometry exactly (shapes, paths, positions, sizes)
- Only change fill/stroke colours
- Ensure WCAG AA contrast ≥ 4.5:1 against dark background (#0f172a)
- Lighten any colour that is too dark to be visible on dark background
- Keep the original design intent and hierarchy
- Return the complete <svg> element

Input SVG: %s`

	logoVariationMonoPrompt = `You generate a MONOCHROME variant of an existing logo SVG.

RULES:
- Preserve all geometry exactly (shapes, paths, positions, sizes)
- Only change fill/stroke colours — map to grayscale ONLY
- Maintain visual hierarchy through value contrast (light vs dark greys)
- Use ONLY shades from: #f3f4f6, #d1d5db, #9ca3af, #6b7280, #374151, #111827
- Keep the original design intent and recognisability
- Return the complete <svg> element

Input SVG: %s`

	logoVariationCritiquePrompt = `You are a quality inspector for logo variations. Review the 3 variants of this logo.

CRITERIA:
1. FIDELITY — geometry is identical to the original (no shapes added/removed/moved)
2. READABILITY — all elements are clearly visible against the respective background
3. COLOUR ADAPTATION — colours are properly adjusted for each background
4. MONOCHROME — only grayscale colours used, clear value hierarchy

Return JSON:
{
  "pass": true/false,
  "lightOk": true/false,
  "darkOk": true/false,
  "monoOk": true/false,
  "issues": ["specific issue descriptions"]
}
Score < 70% = fail`

	logoVariationRecolorPrompt = `You recolor a logo with a specific colour mapping. Geometry must NOT change.

Return a colour mapping JSON:
{
  "mapping": { "#oldHex": "#newHex", "#oldHex2": "#newHex2" }
}
Only colours that need to change. Geometry frozen.`

	logoCritiquePrompt = `You are an uncompromising design director at a world-class identity studio. Review this logo.

AUDIT CHECKLIST (score each 0-10):
1. B&W TEST — with every fill set to #111, does the mark keep structure and meaning?
2. SILHOUETTE — is the filled outline distinctive and recognisable?
3. GEOMETRY — mathematically clean, symmetric where intended, canonical angles only
4. SIMPLICITY — describable in one sentence, max 3 shapes
5. SCALABILITY — legible at 16px, open counters, no fine details
6. TYPOGRAPHY — real undistorted letterforms, correct kerning, no clipping
7. LAYOUT — nothing clipped by viewBox, clear space respected
8. COLOUR — max 3 colours from brand palette, hierarchy survives grayscale
9. CLICHÉ CHECK — no globe, gear, lightbulb, arrow, speech bubble, shield, swoosh
10. RELEVANCE — evokes industry without literally illustrating the product

VERDICT:
- FAIL if: text clipped, broken symmetry, illegible at small size, >3 colours, forbidden cliché
- FAIL if score < 70
- PASS otherwise

Return JSON: {"pass": true/false, "score": 0-100, "issues": ["issue 1", "issue 2"], "suggestions": "actionable revision instructions"}`

	logoRevisionPrompt = `You are a senior logo designer revising an SVG based on critique feedback.

REVISION RULES:
- Keep the original logo ID and concept name
- Fix each specific issue mentioned in the critique
- Follow the design doctrine: simplicity, B&W-first, scalability, distinctiveness
- Return ONLY the improved <svg> element
- Do NOT change the overall concept direction — only fix the issues

Original SVG: %s
Feedback to address: %s`

	logoEditPrompt = `You are a precision logo editor. Apply the following modification request to this logo SVG.

EDIT PLAYBOOK:
- colour: replace specific hex values, keep all positions
- text: edit text content, keep font and position
- shape: modify specific path or shape attributes
- layout: adjust viewBox, spacing, or alignment
- style: adjust stroke widths, opacities, or rounded corners

Keep everything the user does not ask to change identical.

Current SVG: %s
Request: %s`
)
