package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

type fakeApprovedAssetStore struct {
	uploads []fakeApprovedUpload
	err     error
}

type fakeApprovedUpload struct {
	key, contentType string
	data             []byte
}

func (f *fakeApprovedAssetStore) Upload(_ context.Context, key string, data []byte, contentType string) (string, error) {
	if f.err != nil {
		return "", f.err
	}
	f.uploads = append(f.uploads, fakeApprovedUpload{key: key, data: data, contentType: contentType})
	return "https://assets.example/" + key, nil
}

func (f *fakeApprovedAssetStore) IsManagedURL(rawURL string) bool {
	return strings.HasPrefix(rawURL, "https://assets.example/")
}

func TestPersistApprovedBrandKitUploadsDuplicateLogoOnce(t *testing.T) {
	png := []byte("\x89PNG\r\n\x1a\napproved-logo")
	source := "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)
	raw, _ := json.Marshal(map[string]interface{}{
		"logo": source, "logoIcon": source, "logoWhite": source, "primaryColor": "#123456",
	})
	store := &fakeApprovedAssetStore{}

	got, err := persistApprovedBrandKit(context.Background(), store, "business-42", string(raw))
	if err != nil {
		t.Fatal(err)
	}
	if len(store.uploads) != 1 {
		t.Fatalf("uploads = %d, want 1", len(store.uploads))
	}
	if !strings.HasPrefix(store.uploads[0].key, "businesses/business-42/brand/logos/") ||
		!strings.HasSuffix(store.uploads[0].key, ".png") {
		t.Fatalf("unexpected key %q", store.uploads[0].key)
	}
	var brand map[string]interface{}
	if err := json.Unmarshal([]byte(got), &brand); err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"logo", "logoIcon", "logoWhite"} {
		if brand[field] != "https://assets.example/"+store.uploads[0].key {
			t.Errorf("%s was not replaced with durable URL", field)
		}
	}
}

func TestPersistApprovedBrandKitLeavesManagedURLsAlone(t *testing.T) {
	raw := `{"logo":"https://assets.example/businesses/b/brand/logos/a.png"}`
	store := &fakeApprovedAssetStore{}
	if _, err := persistApprovedBrandKit(context.Background(), store, "b", raw); err != nil {
		t.Fatal(err)
	}
	if len(store.uploads) != 0 {
		t.Fatalf("uploads = %d, want 0", len(store.uploads))
	}
}

func TestPersistApprovedBrandKitFailsClosedWhenUploadFails(t *testing.T) {
	png := []byte("\x89PNG\r\n\x1a\napproved-logo")
	source := "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)
	raw, _ := json.Marshal(map[string]interface{}{"logo": source})
	store := &fakeApprovedAssetStore{err: errors.New("S3 unavailable")}

	if _, err := persistApprovedBrandKit(context.Background(), store, "b", string(raw)); err == nil {
		t.Fatal("expected upload error")
	}
}

func TestPersistApprovedBrandKitRejectsNonImage(t *testing.T) {
	source := "data:text/html;base64," + base64.StdEncoding.EncodeToString([]byte("<html>not a logo</html>"))
	raw, _ := json.Marshal(map[string]interface{}{"logo": source})

	if _, err := persistApprovedBrandKit(context.Background(), &fakeApprovedAssetStore{}, "b", string(raw)); err == nil {
		t.Fatal("expected non-image error")
	}
}
