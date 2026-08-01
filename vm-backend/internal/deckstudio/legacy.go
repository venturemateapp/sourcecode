package deckstudio

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type legacyDeck struct {
	ID            string        `json:"id"`
	Title         string        `json:"title"`
	Slides        []legacySlide `json:"slides"`
	Template      string        `json:"template"`
	LastModified  string        `json:"lastModified"`
	ExportFormats []string      `json:"exportFormats"`
	ShareLink     string        `json:"shareLink,omitempty"`
	Views         int           `json:"views"`
}

type legacySlide struct {
	ID      string         `json:"id"`
	Type    string         `json:"type"`
	Title   string         `json:"title"`
	Content string         `json:"content"`
	Bullets []string       `json:"bullets,omitempty"`
	Image   string         `json:"image,omitempty"`
	Chart   map[string]any `json:"chart,omitempty"`
	Order   int            `json:"order"`
	Layout  string         `json:"layout"`
}

// FromLegacy converts the original VentureMate slide schema into the versioned,
// element-level deck document. It never mutates or deletes the source JSON.
func FromLegacy(raw, fallbackTitle string) (*Document, bool, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "{}" || raw == "null" {
		return nil, false, nil
	}
	if current, err := Parse(raw); err == nil {
		return current, true, nil
	}

	var old legacyDeck
	if err := json.Unmarshal([]byte(raw), &old); err != nil {
		return nil, false, fmt.Errorf("parse legacy pitch deck: %w", err)
	}
	if len(old.Slides) == 0 {
		return nil, false, nil
	}
	title := strings.TrimSpace(old.Title)
	if title == "" {
		title = strings.TrimSpace(fallbackTitle)
	}
	if title == "" {
		title = "Pitch Deck"
	}
	template := normalizeLegacyTemplate(old.Template)
	doc := &Document{
		SchemaVersion: SchemaVersion,
		Title:         title,
		Template:      template,
		Theme:         DefaultTheme(template),
		Metadata: map[string]any{
			"legacyId":           old.ID,
			"legacyLastModified": old.LastModified,
			"migratedFrom":       "venturemate-pitch-deck-v1",
		},
	}
	for i, oldSlide := range old.Slides {
		slideID := stableLegacyID(oldSlide.ID, "slide", i)
		slideTitle := strings.TrimSpace(oldSlide.Title)
		if slideTitle == "" {
			slideTitle = fmt.Sprintf("Slide %d", i+1)
		}
		slide := Slide{
			ID:         slideID,
			Type:       normalizeLegacySlideType(oldSlide.Type),
			Title:      slideTitle,
			Background: Background{Type: "solid", Color: doc.Theme.Background},
			Notes:      "Imported from the original VentureMate pitch deck editor.",
			Order:      i,
			LayoutID:   oldSlide.Layout,
		}
		slide.Elements = append(slide.Elements, Element{
			ID: slideID + "-title", Type: "text", X: .7, Y: .45, W: 11.9, H: .85,
			ZIndex: 10, Visible: true, Text: slideTitle,
			Style: map[string]any{"fontSize": 30, "fontWeight": 700, "color": doc.Theme.Text},
		})

		body := strings.TrimSpace(oldSlide.Content)
		if len(oldSlide.Bullets) > 0 {
			parts := make([]string, 0, len(oldSlide.Bullets))
			for _, bullet := range oldSlide.Bullets {
				if value := strings.TrimSpace(bullet); value != "" {
					parts = append(parts, "• "+value)
				}
			}
			if len(parts) > 0 {
				if body != "" {
					body += "\n\n"
				}
				body += strings.Join(parts, "\n")
			}
		}
		bodyWidth := 11.8
		if strings.TrimSpace(oldSlide.Image) != "" || oldSlide.Chart != nil {
			bodyWidth = 6.15
		}
		if body != "" {
			slide.Elements = append(slide.Elements, Element{
				ID: slideID + "-body", Type: "text", X: .75, Y: 1.55, W: bodyWidth, H: 5.25,
				ZIndex: 20, Visible: true, Text: body,
				Style: map[string]any{"fontSize": 17, "lineHeight": 1.35, "color": doc.Theme.Text},
			})
		}
		if imageURL := strings.TrimSpace(oldSlide.Image); imageURL != "" {
			slide.Elements = append(slide.Elements, Element{
				ID: slideID + "-image", Type: "image", X: 7.25, Y: 1.55, W: 5.25, H: 5.25,
				ZIndex: 15, Visible: true, URL: imageURL, AltText: slideTitle,
				Style: map[string]any{"fit": "cover", "radius": 18},
			})
		} else if oldSlide.Chart != nil {
			slide.Elements = append(slide.Elements, Element{
				ID: slideID + "-chart", Type: "chart", X: 7.25, Y: 1.55, W: 5.25, H: 5.25,
				ZIndex: 15, Visible: true, Chart: oldSlide.Chart,
			})
		}
		doc.Slides = append(doc.Slides, slide)
	}
	if err := doc.Validate(); err != nil {
		return nil, false, fmt.Errorf("convert legacy pitch deck: %w", err)
	}
	return doc, true, nil
}

// LegacySummaryJSON creates the small compatibility representation consumed by
// existing dashboard and pitch-deck screens while AI Studio remains authoritative.
func LegacySummaryJSON(raw string) (string, error) {
	doc, err := Parse(raw)
	if err != nil {
		return "", err
	}
	old := legacyDeck{
		ID:            metadataString(doc.Metadata, "legacyId", "ai-studio-deck"),
		Title:         doc.Title,
		Template:      doc.Template,
		LastModified:  time.Now().UTC().Format(time.RFC3339Nano),
		ExportFormats: []string{"pdf", "pptx"},
	}
	for i, slide := range doc.Slides {
		legacy := legacySlide{ID: slide.ID, Type: normalizeLegacySlideType(slide.Type), Title: slide.Title, Order: i, Layout: slide.LayoutID}
		var textParts []string
		for _, element := range slide.Elements {
			if !element.Visible {
				continue
			}
			switch element.Type {
			case "text":
				value := strings.TrimSpace(element.Text)
				if value != "" && !strings.EqualFold(value, slide.Title) {
					textParts = append(textParts, value)
				}
			case "image":
				if legacy.Image == "" {
					legacy.Image = element.URL
				}
			case "chart":
				if legacy.Chart == nil {
					legacy.Chart = element.Chart
				}
			}
		}
		legacy.Content = strings.Join(textParts, "\n\n")
		old.Slides = append(old.Slides, legacy)
	}
	encoded, err := json.Marshal(old)
	return string(encoded), err
}

func normalizeLegacyTemplate(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "clean", "minimal", "light", "clean-light":
		return "clean-light"
	case "gradient", "bold", "bold-gradient":
		return "bold-gradient"
	case "corporate", "corporate-minimal":
		return "corporate-minimal"
	case "editorial":
		return "editorial"
	default:
		return "modern-dark"
	}
}

func normalizeLegacySlideType(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "title" {
		return "cover"
	}
	if value == "" {
		return "custom"
	}
	return value
}

func stableLegacyID(value, prefix string, index int) string {
	value = strings.TrimSpace(value)
	if value != "" {
		return value
	}
	return fmt.Sprintf("%s-%d", prefix, index+1)
}

func metadataString(metadata map[string]any, key, fallback string) string {
	if value, ok := metadata[key].(string); ok && strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}
