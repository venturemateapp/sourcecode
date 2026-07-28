package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"

	"github.com/venturemate/vmbackend/internal/businesses"
)

type fakeWebsiteImageGenerator struct {
	source string
	calls  int
}

func (f *fakeWebsiteImageGenerator) Available() bool { return true }
func (f *fakeWebsiteImageGenerator) GenerateImageURL(_, _ string) (string, error) {
	f.calls++
	return f.source, nil
}

func TestConvertWebsiteAssetToWebP(t *testing.T) {
	source := testPNG(t, 48, 32)
	converted, err := convertWebsiteAssetToWebP(source)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(converted, []byte("RIFF")) || !bytes.Contains(converted[:min(len(converted), 16)], []byte("WEBP")) {
		t.Fatal("converted output is not WebP")
	}
	config, format, err := image.DecodeConfig(bytes.NewReader(converted))
	if err != nil {
		t.Fatal(err)
	}
	if format != "webp" || config.Width != 48 || config.Height != 32 {
		t.Fatalf("format=%s dimensions=%dx%d", format, config.Width, config.Height)
	}
}

func TestPopulateWebsiteAssetsStoresOnlyPermanentWebPURLs(t *testing.T) {
	pngBytes := testPNG(t, 64, 40)
	generator := &fakeWebsiteImageGenerator{
		source: "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBytes),
	}
	store := &fakeApprovedAssetStore{}
	raw := `{"pages":[{"slug":"/","sections":[
		{"type":"hero","props":{"headline":"Durable hero","image":""}},
		{"type":"carousel","props":{"items":[{"title":"One","image":""},{"title":"Two","image":""}]}},
		{"type":"image","props":{"caption":"Story","src":""}}
	]}]}`

	result, err := populateWebsiteAssets(context.Background(), raw, &businesses.Business{
		ID: "biz-7", Name: "Acme", Industry: "Technology", Tagline: "Build better",
	}, generator, store)
	if err != nil {
		t.Fatal(err)
	}
	if generator.calls != 4 || len(store.uploads) != 4 {
		t.Fatalf("generation calls=%d uploads=%d, want 4", generator.calls, len(store.uploads))
	}
	if strings.Contains(result, "data:image") || strings.Contains(result, "recraft") {
		t.Fatalf("draft contains a temporary source: %s", result)
	}
	var draft map[string]interface{}
	if err := json.Unmarshal([]byte(result), &draft); err != nil {
		t.Fatal(err)
	}
	for _, upload := range store.uploads {
		if upload.contentType != "image/webp" || !strings.HasSuffix(upload.key, ".webp") {
			t.Fatalf("non-WebP upload: %#v", upload)
		}
		if !strings.HasPrefix(upload.key, "businesses/biz-7/websites/assets/") {
			t.Fatalf("asset is not business-scoped: %s", upload.key)
		}
	}
}

func TestPopulateWebsiteAssetsSkipsGenerationWhenUnavailable(t *testing.T) {
	generator := &fakeWebsiteImageGenerator{source: "unused"}
	// A nil store represents an environment where website asset persistence is
	// not configured; generation must keep working without temporary URLs.
	raw := `{"pages":[{"sections":[{"type":"hero","props":{"image":""}}]}]}`
	result, err := populateWebsiteAssets(context.Background(), raw, &businesses.Business{ID: "b"}, generator, nil)
	if err != nil {
		t.Fatal(err)
	}
	if result != raw || generator.calls != 0 {
		t.Fatal("asset generation should be skipped when durable storage is unavailable")
	}
}

func TestPopulateWebsiteAssetsPersistsExistingTemporaryURLWithoutGenerator(t *testing.T) {
	pngBytes := testPNG(t, 32, 24)
	source := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBytes)
	raw := `{"pages":[{"sections":[{"type":"hero","props":{"image":"` + source + `"}}]}]}`
	store := &fakeApprovedAssetStore{}

	result, err := populateWebsiteAssets(context.Background(), raw, &businesses.Business{ID: "biz-9"}, nil, store)
	if err != nil {
		t.Fatal(err)
	}
	if len(store.uploads) != 1 || !strings.Contains(result, "https://assets.example/") || strings.Contains(result, "data:image") {
		t.Fatalf("temporary asset was not replaced: uploads=%d result=%s", len(store.uploads), result)
	}
}

func testPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.NRGBA{R: uint8(x * 3), G: uint8(y * 5), B: 180, A: 255})
		}
	}
	var output bytes.Buffer
	if err := png.Encode(&output, img); err != nil {
		t.Fatal(err)
	}
	return output.Bytes()
}
