package planstudio

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type legacyPlan struct {
	ID               string          `json:"id"`
	Title            string          `json:"title"`
	Sections         []legacySection `json:"sections"`
	ExecutiveSummary string          `json:"executiveSummary,omitempty"`
	RevenueCurrency  string          `json:"revenueByCurrency,omitempty"`
	CreatedAt        string          `json:"createdAt,omitempty"`
	UpdatedAt        string          `json:"updatedAt,omitempty"`
	LastModified     string          `json:"lastModified,omitempty"`
	Version          string          `json:"version,omitempty"`
	ExportFormats    []string        `json:"exportFormats,omitempty"`
}

type legacySection struct {
	ID          string          `json:"id"`
	Title       string          `json:"title"`
	Content     string          `json:"content"`
	Subsections []legacySection `json:"subsections,omitempty"`
	AIGenerated bool            `json:"aiGenerated"`
	Order       int             `json:"order"`
}

// FromLegacy converts the original VentureMate plan-section schema into the
// editable block document without overwriting the source business field.
func FromLegacy(raw, fallbackTitle, businessID string) (*Document, bool, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "{}" || raw == "null" {
		return nil, false, nil
	}
	if current, err := Parse(raw); err == nil {
		return current, true, nil
	}
	var old legacyPlan
	if err := json.Unmarshal([]byte(raw), &old); err != nil {
		return nil, false, fmt.Errorf("parse legacy business plan: %w", err)
	}
	if len(old.Sections) == 0 && strings.TrimSpace(old.ExecutiveSummary) == "" {
		return nil, false, nil
	}
	title := strings.TrimSpace(old.Title)
	if title == "" {
		title = strings.TrimSpace(fallbackTitle)
	}
	if title == "" {
		title = "Business Plan"
	}
	currency := strings.TrimSpace(old.RevenueCurrency)
	if currency == "" || strings.HasPrefix(currency, "{") {
		currency = "GHS"
	}
	doc := &Document{
		SchemaVersion:    SchemaVersion,
		Title:            title,
		ExecutiveSummary: strings.TrimSpace(old.ExecutiveSummary),
		Metadata: Metadata{
			BusinessID: businessID, VersionLabel: firstNonEmpty(old.Version, "1.0"),
			Currency: currency, PreparedAt: firstNonEmpty(old.UpdatedAt, old.LastModified, old.CreatedAt, time.Now().UTC().Format(time.RFC3339)),
		},
		Theme: map[string]any{"template": "professional-light", "migratedFrom": "venturemate-business-plan-v1", "legacyId": old.ID},
	}
	for _, oldSection := range old.Sections {
		appendLegacySection(doc, oldSection, "", len(doc.Sections))
	}
	if len(doc.Sections) == 0 {
		doc.Sections = append(doc.Sections, Section{ID: "executive-summary", Title: "Executive Summary", Order: 0, Blocks: []Block{{ID: "executive-summary-text", Type: "paragraph", Text: doc.ExecutiveSummary}}})
	}
	if err := doc.Validate(); err != nil {
		return nil, false, fmt.Errorf("convert legacy business plan: %w", err)
	}
	return doc, true, nil
}

func appendLegacySection(doc *Document, old legacySection, parentTitle string, index int) {
	title := strings.TrimSpace(old.Title)
	if title == "" {
		title = fmt.Sprintf("Section %d", index+1)
	}
	if parentTitle != "" {
		title = parentTitle + " — " + title
	}
	sectionID := strings.TrimSpace(old.ID)
	if sectionID == "" {
		sectionID = fmt.Sprintf("section-%d", len(doc.Sections)+1)
	}
	section := Section{ID: sectionID, Title: title, Order: len(doc.Sections)}
	if content := strings.TrimSpace(old.Content); content != "" {
		section.Blocks = append(section.Blocks, Block{ID: sectionID + "-content", Type: "paragraph", Text: content})
	}
	if len(section.Blocks) == 0 {
		section.Blocks = append(section.Blocks, Block{ID: sectionID + "-content", Type: "paragraph", Text: ""})
	}
	doc.Sections = append(doc.Sections, section)
	for _, subsection := range old.Subsections {
		appendLegacySection(doc, subsection, title, len(doc.Sections))
	}
}

// LegacySummaryJSON keeps the original business-plan page operational while
// AI Studio stores the full versioned document as its source of truth.
func LegacySummaryJSON(raw string) (string, error) {
	doc, err := Parse(raw)
	if err != nil {
		return "", err
	}
	old := legacyPlan{
		ID:               themeString(doc.Theme, "legacyId", "ai-studio-business-plan"),
		Title:            doc.Title,
		ExecutiveSummary: doc.ExecutiveSummary,
		RevenueCurrency:  doc.Metadata.Currency,
		UpdatedAt:        time.Now().UTC().Format(time.RFC3339Nano),
		LastModified:     time.Now().UTC().Format(time.RFC3339Nano),
		Version:          doc.Metadata.VersionLabel,
		ExportFormats:    []string{"pdf", "docx", "md"},
	}
	for i, section := range doc.Sections {
		var parts []string
		for _, block := range section.Blocks {
			switch block.Type {
			case "paragraph", "callout", "quote", "heading":
				if value := strings.TrimSpace(block.Text); value != "" {
					parts = append(parts, value)
				}
			case "bullet_list":
				for _, item := range block.Items {
					if value := strings.TrimSpace(item); value != "" {
						parts = append(parts, "• "+value)
					}
				}
			case "numbered_list":
				for itemIndex, item := range block.Items {
					if value := strings.TrimSpace(item); value != "" {
						parts = append(parts, fmt.Sprintf("%d. %s", itemIndex+1, value))
					}
				}
			}
		}
		old.Sections = append(old.Sections, legacySection{ID: section.ID, Title: section.Title, Content: strings.Join(parts, "\n\n"), AIGenerated: true, Order: i})
	}
	encoded, err := json.Marshal(old)
	return string(encoded), err
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func themeString(theme map[string]any, key, fallback string) string {
	if value, ok := theme[key].(string); ok && strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}
