package deckstudio

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
)

const SchemaVersion = "2.0"

type Theme struct {
	Primary     string `json:"primary"`
	Secondary   string `json:"secondary"`
	Background  string `json:"background"`
	Surface     string `json:"surface"`
	Text        string `json:"text"`
	MutedText   string `json:"mutedText"`
	HeadingFont string `json:"headingFont"`
	BodyFont    string `json:"bodyFont"`
}

type Background struct {
	Type    string `json:"type"`
	Color   string `json:"color,omitempty"`
	AssetID string `json:"assetId,omitempty"`
	URL     string `json:"url,omitempty"`
}

type TextRun struct {
	Text       string  `json:"text"`
	FontFamily string  `json:"fontFamily,omitempty"`
	FontSize   float64 `json:"fontSize,omitempty"`
	FontWeight int     `json:"fontWeight,omitempty"`
	Color      string  `json:"color,omitempty"`
	Italic     bool    `json:"italic,omitempty"`
	Underline  bool    `json:"underline,omitempty"`
	Link       string  `json:"link,omitempty"`
}

type Element struct {
	ID          string         `json:"id"`
	Type        string         `json:"type"`
	X           float64        `json:"x"`
	Y           float64        `json:"y"`
	W           float64        `json:"w"`
	H           float64        `json:"h"`
	Rotation    float64        `json:"rotation,omitempty"`
	ZIndex      int            `json:"zIndex"`
	Visible     bool           `json:"visible"`
	Locked      bool           `json:"locked"`
	AltText     string         `json:"altText,omitempty"`
	Link        string         `json:"link,omitempty"`
	Text        string         `json:"text,omitempty"`
	Runs        []TextRun      `json:"runs,omitempty"`
	AssetID     string         `json:"assetId,omitempty"`
	URL         string         `json:"url,omitempty"`
	Shape       string         `json:"shape,omitempty"`
	Chart       map[string]any `json:"chart,omitempty"`
	Table       map[string]any `json:"table,omitempty"`
	Children    []Element      `json:"children,omitempty"`
	Style       map[string]any `json:"style,omitempty"`
	Constraints map[string]any `json:"constraints,omitempty"`
}

type Slide struct {
	ID         string     `json:"id"`
	Type       string     `json:"type"`
	Title      string     `json:"title"`
	Background Background `json:"background"`
	Elements   []Element  `json:"elements"`
	Notes      string     `json:"notes"`
	Order      int        `json:"order"`
	Locked     bool       `json:"locked,omitempty"`
	LayoutID   string     `json:"layoutId,omitempty"`
}

type Document struct {
	SchemaVersion string         `json:"schemaVersion"`
	Title         string         `json:"title"`
	Template      string         `json:"template"`
	Theme         Theme          `json:"theme"`
	Slides        []Slide        `json:"slides"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

var allowedElementTypes = map[string]bool{
	"text": true, "image": true, "shape": true, "icon": true, "chart": true,
	"table": true, "line": true, "group": true,
}

func (d *Document) Validate() error {
	if d == nil {
		return errors.New("deck document is required")
	}
	if d.SchemaVersion == "" {
		d.SchemaVersion = SchemaVersion
	}
	if d.SchemaVersion != SchemaVersion {
		return fmt.Errorf("unsupported deck schema version %q", d.SchemaVersion)
	}
	d.Title = strings.TrimSpace(d.Title)
	if d.Title == "" {
		return errors.New("deck title is required")
	}
	if len(d.Slides) == 0 || len(d.Slides) > 80 {
		return errors.New("deck must contain between 1 and 80 slides")
	}
	seenSlides := map[string]bool{}
	seenElements := map[string]bool{}
	for i := range d.Slides {
		s := &d.Slides[i]
		s.ID = strings.TrimSpace(s.ID)
		if s.ID == "" || seenSlides[s.ID] {
			return fmt.Errorf("slide %d has a missing or duplicate id", i+1)
		}
		seenSlides[s.ID] = true
		s.Order = i
		if s.Background.Type == "" {
			s.Background = Background{Type: "solid", Color: d.Theme.Background}
		}
		if s.Background.Type != "solid" && s.Background.Type != "image" && s.Background.Type != "gradient" {
			return fmt.Errorf("slide %s has unsupported background type", s.ID)
		}
		for j := range s.Elements {
			if err := validateElement(&s.Elements[j], seenElements, 0); err != nil {
				return fmt.Errorf("slide %s: %w", s.ID, err)
			}
		}
		sort.SliceStable(s.Elements, func(a, b int) bool { return s.Elements[a].ZIndex < s.Elements[b].ZIndex })
	}
	return nil
}

func validateElement(e *Element, seen map[string]bool, depth int) error {
	if depth > 4 {
		return errors.New("element group nesting is too deep")
	}
	e.ID = strings.TrimSpace(e.ID)
	if e.ID == "" || seen[e.ID] {
		return errors.New("element has a missing or duplicate id")
	}
	seen[e.ID] = true
	if !allowedElementTypes[e.Type] {
		return fmt.Errorf("element %s has unsupported type %q", e.ID, e.Type)
	}
	if e.X < 0 || e.Y < 0 || e.W <= 0 || e.H <= 0 || e.X+e.W > 13.34 || e.Y+e.H > 7.51 {
		return fmt.Errorf("element %s is outside the 16:9 canvas", e.ID)
	}
	if e.Type == "image" && strings.TrimSpace(e.URL) == "" && strings.TrimSpace(e.AssetID) == "" {
		return fmt.Errorf("image element %s needs an asset", e.ID)
	}
	for i := range e.Children {
		if err := validateElement(&e.Children[i], seen, depth+1); err != nil {
			return err
		}
	}
	return nil
}

func Parse(value string) (*Document, error) {
	var document Document
	decoder := json.NewDecoder(strings.NewReader(value))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&document); err != nil {
		return nil, err
	}
	if err := document.Validate(); err != nil {
		return nil, err
	}
	return &document, nil
}

func DefaultTheme(template string) Theme {
	switch strings.ToLower(strings.TrimSpace(template)) {
	case "clean-light":
		return Theme{Primary: "#2563eb", Secondary: "#7c3aed", Background: "#f8fafc", Surface: "#ffffff", Text: "#0f172a", MutedText: "#64748b", HeadingFont: "Aptos Display", BodyFont: "Aptos"}
	case "bold-gradient":
		return Theme{Primary: "#ec4899", Secondary: "#8b5cf6", Background: "#120c2d", Surface: "#24164f", Text: "#ffffff", MutedText: "#d8b4fe", HeadingFont: "Aptos Display", BodyFont: "Aptos"}
	case "corporate-minimal":
		return Theme{Primary: "#0f766e", Secondary: "#334155", Background: "#ffffff", Surface: "#f1f5f9", Text: "#0f172a", MutedText: "#475569", HeadingFont: "Aptos Display", BodyFont: "Aptos"}
	case "editorial":
		return Theme{Primary: "#be123c", Secondary: "#a16207", Background: "#fffaf0", Surface: "#ffffff", Text: "#1c1917", MutedText: "#78716c", HeadingFont: "Georgia", BodyFont: "Aptos"}
	default:
		return Theme{Primary: "#10b981", Secondary: "#6366f1", Background: "#080b12", Surface: "#111827", Text: "#f8fafc", MutedText: "#94a3b8", HeadingFont: "Aptos Display", BodyFont: "Aptos"}
	}
}
