package ai

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

// fakeStore records uploads and returns a durable URL for each key.
type fakeStore struct {
	uploads []fakeUpload
}

func (f *fakeStore) Upload(_ context.Context, key string, data []byte, contentType string) (string, error) {
	f.uploads = append(f.uploads, fakeUpload{key: key, contentType: contentType, data: data})
	return "https://cdn.venturemate.net/" + key, nil
}

func (f *fakeStore) IsManagedURL(rawURL string) bool {
	return strings.HasPrefix(rawURL, "https://cdn.venturemate.net/")
}

// TestPersistBrandKitRawSVG proves the exact AI scenario: the model returns a
// raw <svg>…</svg> string for logo/logoIcon/logoWhite and persistence must
// succeed, upload to storage, and return durable URLs.
func TestPersistBrandKitRawSVG(t *testing.T) {
	svg := `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#1a73e8"/><text x="8" y="42" font-size="36" fill="#fff">VM</text></svg>`
	escaped := strings.ReplaceAll(svg, `"`, `\"`)
	raw := `{"logo":"` + escaped + `","logoIcon":"` + escaped + `","logoWhite":"` + escaped + `","colors":["#1a73e8","#ffffff"]}`
	store := &fakeStore{}
	out, err := persistApprovedBrandKit(context.Background(), store, "biz-123", raw)
	if err != nil {
		t.Fatalf("persistApprovedBrandKit returned error: %v", err)
	}
	var brand map[string]interface{}
	if err := json.Unmarshal([]byte(out), &brand); err != nil {
		t.Fatalf("output not valid JSON: %v", err)
	}
	for _, field := range []string{"logo", "logoIcon", "logoWhite"} {
		v, _ := brand[field].(string)
		if !strings.HasPrefix(v, "https://cdn.venturemate.net/") {
			t.Errorf("%s = %q, want managed https URL", field, v)
		}
	}
	if len(store.uploads) == 0 {
		t.Fatal("expected uploads to storage")
	}
	for _, up := range store.uploads {
		if !strings.HasSuffix(up.key, ".svg") {
			t.Errorf("key %q should end .svg (got %s content type)", up.key, up.contentType)
		}
		if len(up.data) == 0 {
			t.Errorf("key %q uploaded empty data", up.key)
		}
	}
}

// TestPersistBrandKitRejectsUnmanagedHTTP proves https-only enforcement stays.
func TestPersistBrandKitRejectsUnmanagedHTTP(t *testing.T) {
	raw := `{"logo":"http://insecure.example/logo.png"}`
	store := &fakeStore{}
	if _, err := persistApprovedBrandKit(context.Background(), store, "biz-123", raw); err == nil {
		t.Fatal("expected error for http:// logo source")
	}
}
