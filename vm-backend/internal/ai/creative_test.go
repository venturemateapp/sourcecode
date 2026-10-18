package ai

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/venturemate/vmbackend/internal/businesses"
)

func TestNormalizeBrandKitProposalReplacesLogoPlaceholders(t *testing.T) {
	raw := `{"logos":[{"svg":"  <svg xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"1\" height=\"1\"/></svg>  "}],"selectedLogo":0,"logoIcon":"generated from logo SVG","logoWhite":"generated from logo SVG"}`
	biz := &businesses.Business{BrandKit: `{}`}
	out, err := normalizeBrandKitProposal(raw, biz, nil)
	if err != nil {
		t.Fatal(err)
	}
	var brand map[string]interface{}
	if err := json.Unmarshal([]byte(out), &brand); err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"logo", "logoIcon", "logoWhite"} {
		value, _ := brand[field].(string)
		if !strings.HasPrefix(value, "data:image/svg+xml;base64,") {
			t.Fatalf("%s = %q, expected generated SVG data URL", field, value)
		}
	}
}
