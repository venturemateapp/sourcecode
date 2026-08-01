package deckstudio

import "testing"

func TestDeckValidationRejectsOutOfBoundsElement(t *testing.T) {
	doc := Document{SchemaVersion: SchemaVersion, Title: "Test", Theme: DefaultTheme("modern-dark"), Slides: []Slide{{ID: "s1", Elements: []Element{{ID: "e1", Type: "text", X: 12, Y: 1, W: 2, H: 1, Visible: true}}}}}
	if err := doc.Validate(); err == nil {
		t.Fatal("expected out of bounds validation error")
	}
}
