package planstudio

import (
	"encoding/json"
	"testing"
)

func TestNormalizePlanShapeCoercesStructuredExecutiveSummary(t *testing.T) {
	raw := `{"schemaVersion":"2.0","title":"Plan","executiveSummary":{"summary":"A verified summary.","highlights":["One"]},"metadata":{"currency":"GHS"},"sections":[{"id":"s1","title":"Summary","order":0,"blocks":[]}],"theme":"minimal"}`
	normalized := normalizePlanShape(raw)
	var document Document
	if err := json.Unmarshal([]byte(normalized), &document); err != nil {
		t.Fatalf("normalized plan should decode: %v", err)
	}
	if document.ExecutiveSummary != "A verified summary." {
		t.Fatalf("unexpected executive summary: %q", document.ExecutiveSummary)
	}
	if document.Theme["style"] != "minimal" {
		t.Fatalf("expected normalized theme style, got %#v", document.Theme)
	}
}

func TestNormalizePlanShapeKeepsStructuredSummaryWhenNoTextKey(t *testing.T) {
	raw := `{"executiveSummary":{"highlights":["Verified"]}}`
	normalized := normalizePlanShape(raw)
	var envelope map[string]any
	if err := json.Unmarshal([]byte(normalized), &envelope); err != nil {
		t.Fatalf("normalized plan should decode: %v", err)
	}
	if _, ok := envelope["executiveSummary"].(string); !ok {
		t.Fatalf("expected executiveSummary to become string, got %#v", envelope["executiveSummary"])
	}
}
