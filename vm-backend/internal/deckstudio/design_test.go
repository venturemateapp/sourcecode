package deckstudio

import "testing"

func TestApplyBackgroundDesign(t *testing.T) {
	tests := []struct {
		name, previous, want string
		fresh                bool
	}{
		{"new deck", "", "midnight", true},
		{"preserve choice", `{"metadata":{"backgroundDesign":"ocean"}}`, "ocean", false},
		{"preserve original", `{"metadata":{"backgroundDesign":"original"}}`, "original", false},
		{"existing deck", `{}`, "midnight", false},
		{"existing deck without choice", `{"title":"Existing"}`, "original", false},
		{"start over", `{"metadata":{"backgroundDesign":"ocean"}}`, "midnight", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			doc := Document{}
			applyBackgroundDesign(&doc, tt.previous, tt.fresh)
			if got := doc.Metadata["backgroundDesign"]; got != tt.want {
				t.Fatalf("got %v, want %s", got, tt.want)
			}
		})
	}
}
