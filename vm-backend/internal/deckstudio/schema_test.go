package deckstudio

import "testing"

func TestDeckValidationRejectsOutOfBoundsElement(t *testing.T) {
	doc := Document{SchemaVersion: SchemaVersion, Title: "Test", Theme: DefaultTheme("modern-dark"), Slides: []Slide{{ID: "s1", Elements: []Element{{ID: "e1", Type: "text", X: 12, Y: 1, W: 2, H: 1, Visible: true}}}}}
	if err := doc.Validate(); err == nil {
		t.Fatal("expected out of bounds validation error")
	}
}

func TestMergeThemeFillsMissingFields(t *testing.T) {
	// The model often returns a partial theme (e.g. only primary). mergeTheme must
	// backfill every empty field from the template default so slides render cleanly.
	partial := Theme{Primary: "#4F8EF7"}
	merged := mergeTheme(partial, DefaultTheme("modern-dark"))
	if merged.Primary != "#4F8EF7" {
		t.Fatalf("expected model primary preserved, got %s", merged.Primary)
	}
	if merged.Background == "" || merged.Text == "" || merged.Surface == "" || merged.MutedText == "" {
		t.Fatalf("expected backfilled colors, got %+v", merged)
	}
	if merged.HeadingFont == "" || merged.BodyFont == "" {
		t.Fatalf("expected backfilled fonts, got %+v", merged)
	}
}

func TestMergeThemeKeepsFullTheme(t *testing.T) {
	full := Theme{Primary: "#111111", Secondary: "#222222", Background: "#333333", Surface: "#444444", Text: "#555555", MutedText: "#666666", HeadingFont: "H", BodyFont: "B"}
	merged := mergeTheme(full, DefaultTheme(""))
	if merged != full {
		t.Fatalf("expected full theme preserved, got %+v", merged)
	}
}
