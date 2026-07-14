package ai

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

type LogoVariants struct {
	LightBackground string `json:"lightBackground"`
	DarkBackground  string `json:"darkBackground"`
	Monochrome      string `json:"monochrome"`
}

type colorTransform struct {
	hex     string
	r, g, b float64
	l       float64 // OKLCH lightness
	c       float64 // OKLCH chroma
	h       float64 // OKLCH hue
}

func GenerateLogoVariants(svg string, primaryHex, secondaryHex string) *LogoVariants {
	if svg == "" {
		return nil
	}

	iconSVG := extractIconOnly(svg)
	colors := extractColors(iconSVG, primaryHex, secondaryHex)

	lightSVG := applyColorTransform(iconSVG, colors, "light")
	darkSVG := applyColorTransform(iconSVG, colors, "dark")
	monoSVG := applyColorTransform(iconSVG, colors, "mono")

	return &LogoVariants{
		LightBackground: lightSVG,
		DarkBackground:  darkSVG,
		Monochrome:      monoSVG,
	}
}

func extractIconOnly(svg string) string {
	// Remove <text> and <tspan> elements (wordmark)
	textTag := regexp.MustCompile(`(?s)<text[^>]*>.*?</text>`)
	svg = textTag.ReplaceAllString(svg, "")
	tspanTag := regexp.MustCompile(`(?s)<tspan[^>]*>.*?</tspan>`)
	svg = tspanTag.ReplaceAllString(svg, "")

	// Wrap in 80x80 viewBox with centering
	svg = regexp.MustCompile(`viewBox="[^"]*"`).ReplaceAllString(svg, `viewBox="0 0 80 80"`)
	return svg
}

var colorRegex = regexp.MustCompile(`(fill|stroke|stop-color)\s*=\s*"(#[0-9a-fA-F]{3,8}|[a-z]+)"`)

func extractColors(svg, primaryHex, secondaryHex string) []colorTransform {
	seen := map[string]bool{}
	var colors []colorTransform

	// Always include brand colors first
	for _, h := range []string{primaryHex, secondaryHex} {
		if h != "" && !seen[h] {
			seen[h] = true
			colors = append(colors, hexToColor(h))
		}
	}

	matches := colorRegex.FindAllStringSubmatch(svg, -1)
	for _, m := range matches {
		hex := normalizeHex(m[2])
		if hex == "" || seen[hex] {
			continue
		}
		seen[hex] = true
		colors = append(colors, hexToColor(hex))
	}

	// Always include white and near-black as reference
	for _, h := range []string{"#ffffff", "#111827"} {
		if !seen[h] {
			seen[h] = true
			colors = append(colors, hexToColor(h))
		}
	}
	return colors
}

func hexToColor(hex string) colorTransform {
	r, g, b := parseHex(hex)
	l, c, h := srgbToOklch(r, g, b)
	return colorTransform{hex: hex, r: r, g: g, b: b, l: l, c: c, h: h}
}

func parseHex(hex string) (float64, float64, float64) {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) == 3 {
		hex = string(hex[0]) + string(hex[0]) + string(hex[1]) + string(hex[1]) + string(hex[2]) + string(hex[2])
	}
	if len(hex) >= 6 {
		r, _ := strconv.ParseInt(hex[0:2], 16, 64)
		g, _ := strconv.ParseInt(hex[2:4], 16, 64)
		b, _ := strconv.ParseInt(hex[4:6], 16, 64)
		return float64(r) / 255, float64(g) / 255, float64(b) / 255
	}
	return 0, 0, 0
}

func normalizeHex(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	if v == "" || v == "none" || v == "transparent" || v == "currentcolor" {
		return ""
	}
	if named, ok := namedColors[v]; ok {
		return named
	}
	if v[0] != '#' {
		return ""
	}
	return v[:7]
}

func srgbToOklch(r, g, b float64) (float64, float64, float64) {
	// sRGB to Linear
	lin := func(c float64) float64 {
		if c <= 0.04045 {
			return c / 12.92
		}
		return math.Pow((c+0.055)/1.055, 2.4)
	}
	lr, lg, lb := lin(r), lin(g), lin(b)

	// Linear to LMS
	l := 0.4122214708*lr + 0.5363325363*lg + 0.0514459929*lb
	m := 0.2119034982*lr + 0.6806995451*lg + 0.1073969566*lb
	s := 0.0883024619*lr + 0.2817188376*lg + 0.6299787005*lb

	// LMS to OKLab
	l = math.Cbrt(l)
	m = math.Cbrt(m)
	s = math.Cbrt(s)

	okl := 0.2104542553*l + 0.7936177850*m - 0.0040720468*s
	oka := 1.9779984951*l - 2.4285922050*m + 0.4505937099*s
	okb := 0.0259040371*l + 0.7827717662*m - 0.8086757660*s

	// OKLab to OKLCH
	oc := math.Sqrt(oka*oka + okb*okb)
	oh := math.Atan2(okb, oka) * 180 / math.Pi
	if oh < 0 {
		oh += 360
	}
	return okl, oc, oh
}

func oklchToSrgb(l, c, h float64) (float64, float64, float64) {
	hr := h * math.Pi / 180
	oka := c * math.Cos(hr)
	okb := c * math.Sin(hr)

	// OKLab to LMS
	lP := l + 0.3963377774*oka + 0.2158037573*okb
	mP := l - 0.1055613458*oka - 0.0638541728*okb
	sP := l - 0.0894841775*oka - 1.2914855480*okb

	// Cube back
	lP = lP * lP * lP
	mP = mP * mP * mP
	sP = sP * sP * sP

	// LMS to Linear sRGB
	lr := +4.0767416621*lP - 3.3077115913*mP + 0.2309699292*sP
	lg := -1.2684380046*lP + 2.6097574011*mP - 0.3413193965*sP
	lb := -0.0041960863*lP - 0.7034186147*mP + 1.7076147010*sP

	// Clamp and gamma
	gam := func(c float64) float64 {
		if c <= 0.0031308 {
			return math.Max(0, c*12.92)
		}
		return math.Max(0, 1.055*math.Pow(c, 1/2.4)-0.055)
	}
	return gam(lr), gam(lg), gam(lb)
}

func luminance(r, g, b float64) float64 {
	return 0.2126*r + 0.7152*g + 0.0722*b
}

func relativeLuminance(hex string) float64 {
	r, g, b := parseHex(hex)
	return luminance(r, g, b)
}

func applyColorTransform(svg string, colors []colorTransform, variant string) string {
	result := svg
	for _, c := range colors {
		if c.hex == "#none" || c.hex == "" {
			continue
		}
		newHex := c.hex
		switch variant {
		case "light":
			newHex = transformLight(c)
		case "dark":
			newHex = transformDark(c)
		case "mono":
			newHex = transformMono(c)
		}
		// Replace fill, stroke, and stop-color attributes
		for _, attr := range []string{"fill", "stroke", "stop-color"} {
			pattern := regexp.MustCompile(fmt.Sprintf(`(%s)\s*=\s*"%s"`, attr, regexp.QuoteMeta(c.hex)))
			result = pattern.ReplaceAllString(result, fmt.Sprintf(`${1}="%s"`, newHex))
		}
	}
	return result
}

func transformLight(c colorTransform) string {
	if c.hex == "#ffffff" || c.hex == "#fff" || relativeLuminance(c.hex) > 0.85 {
		return lighten(c, 0.95)
	}
	lum := relativeLuminance(c.hex)
	if lum < 0.4 {
		return c.hex // already dark enough
	}
	// Darken until contrast ≥ 4.5 on white
	lNew := c.l * 0.65
	if lNew < 0.1 {
		lNew = 0.1
	}
	r, g, b := oklchToSrgb(lNew, c.c*0.8, c.h)
	return fmt.Sprintf("#%02x%02x%02x", clamp(r), clamp(g), clamp(b))
}

func transformDark(c colorTransform) string {
	if c.hex == "#000000" || c.hex == "#111827" || relativeLuminance(c.hex) < 0.1 {
		return lighten(c, 0.85)
	}
	lum := relativeLuminance(c.hex)
	if lum > 0.6 {
		return c.hex // already light enough
	}
	// Lighten until contrast ≥ 4.5 on dark
	lNew := c.l*1.4 + 0.15
	if lNew > 0.95 {
		lNew = 0.95
	}
	r, g, b := oklchToSrgb(lNew, c.c*0.85, c.h)
	if c.c < 0.02 {
		r, g, b = lNew, lNew, lNew
	}
	return fmt.Sprintf("#%02x%02x%02x", clamp(r), clamp(g), clamp(b))
}

func transformMono(c colorTransform) string {
	if c.hex == "#ffffff" || c.hex == "#fff" {
		return "#f3f4f6"
	}
	if c.hex == "#000000" || c.hex == "#111827" || relativeLuminance(c.hex) < 0.05 {
		return "#111827"
	}
	lum := relativeLuminance(c.hex)
	switch {
	case lum > 0.75:
		return "#f3f4f6"
	case lum > 0.55:
		return "#9ca3af"
	case lum > 0.35:
		return "#6b7280"
	case lum > 0.15:
		return "#374151"
	default:
		return "#111827"
	}
}

func lighten(c colorTransform, factor float64) string {
	r, g, b := oklchToSrgb(math.Min(c.l+0.15, 0.95), c.c*0.3, c.h)
	return fmt.Sprintf("#%02x%02x%02x", clamp(r), clamp(g), clamp(b))
}

func clamp(v float64) int {
	if v < 0 {
		return 0
	}
	if v > 255 {
		return 255
	}
	return int(math.Round(v))
}

var namedColors = map[string]string{
	"black": "#000000", "white": "#ffffff", "red": "#ff0000", "blue": "#0000ff",
	"green": "#008000", "yellow": "#ffff00", "gray": "#808080", "silver": "#c0c0c0",
	"navy": "#000080", "teal": "#008080", "aqua": "#00ffff", "fuchsia": "#ff00ff",
	"lime": "#00ff00", "maroon": "#800000", "olive": "#808000", "purple": "#800080",
	"orange": "#ffa500", "pink": "#ffc0cb", "gold": "#ffd700", "coral": "#ff7f50",
	"tomato": "#ff6347", "crimson": "#dc143c", "indigo": "#4b0082", "violet": "#ee82ee",
	"cyan": "#00ffff", "magenta": "#ff00ff", "transparent": "", "none": "",
}
