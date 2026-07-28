package ai

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"github.com/deepteams/webp"
	"github.com/venturemate/vmbackend/internal/businesses"
	"golang.org/x/image/draw"
)

const maxGeneratedWebsiteAssets = 4

type websiteImageGenerator interface {
	Available() bool
	GenerateImageURL(prompt, size string) (string, error)
}

// populateWebsiteAssets replaces empty visual slots with Recraft artwork that
// has already been converted to WebP and copied into business-owned storage.
// A temporary provider URL is never returned in the website draft.
func populateWebsiteAssets(ctx context.Context, raw string, biz *businesses.Business, generator websiteImageGenerator, store ApprovedAssetStore) (string, error) {
	if store == nil || biz == nil {
		return raw, nil
	}
	canGenerate := generator != nil && generator.Available()
	var draft map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &draft); err != nil {
		return "", fmt.Errorf("invalid website draft: %w", err)
	}
	pages, _ := draft["pages"].([]interface{})
	generated := 0
	persisted := map[string]string{}
	for _, pageValue := range pages {
		page, _ := pageValue.(map[string]interface{})
		sections, _ := page["sections"].([]interface{})
		for _, sectionValue := range sections {
			if generated >= maxGeneratedWebsiteAssets {
				break
			}
			section, _ := sectionValue.(map[string]interface{})
			props, _ := section["props"].(map[string]interface{})
			switch stringValue(section, "type", "") {
			case "hero":
				if source := stringValue(props, "image", ""); source != "" {
					permanentURL, err := persistWebsiteImageSource(ctx, store, biz.ID, source, persisted)
					if err != nil {
						return "", fmt.Errorf("persist hero website asset: %w", err)
					}
					props["image"] = permanentURL
				} else {
					if !canGenerate {
						continue
					}
					prompt := websiteAssetPrompt(biz, "hero", stringValue(props, "headline", biz.Tagline))
					permanentURL, err := generatePermanentWebP(ctx, generator, store, biz.ID, prompt, "hero")
					if err != nil {
						return "", err
					}
					props["image"] = permanentURL
					generated++
				}
			case "carousel":
				items, _ := props["items"].([]interface{})
				for index, itemValue := range items {
					if generated >= maxGeneratedWebsiteAssets {
						break
					}
					item, _ := itemValue.(map[string]interface{})
					if item == nil {
						continue
					}
					if source := stringValue(item, "image", ""); source != "" {
						permanentURL, err := persistWebsiteImageSource(ctx, store, biz.ID, source, persisted)
						if err != nil {
							return "", fmt.Errorf("persist carousel website asset: %w", err)
						}
						item["image"] = permanentURL
						continue
					}
					if !canGenerate {
						continue
					}
					subject := stringValue(item, "title", stringValue(props, "title", biz.Name))
					prompt := websiteAssetPrompt(biz, "editorial website", subject)
					permanentURL, err := generatePermanentWebP(ctx, generator, store, biz.ID, prompt, fmt.Sprintf("carousel-%d", index+1))
					if err != nil {
						return "", err
					}
					item["image"] = permanentURL
					generated++
				}
			case "image":
				if source := stringValue(props, "src", ""); source != "" {
					permanentURL, err := persistWebsiteImageSource(ctx, store, biz.ID, source, persisted)
					if err != nil {
						return "", fmt.Errorf("persist content website asset: %w", err)
					}
					props["src"] = permanentURL
				} else {
					if !canGenerate {
						continue
					}
					prompt := websiteAssetPrompt(biz, "editorial website", stringValue(props, "caption", biz.Name))
					permanentURL, err := generatePermanentWebP(ctx, generator, store, biz.ID, prompt, "content")
					if err != nil {
						return "", err
					}
					props["src"] = permanentURL
					generated++
				}
			}
		}
	}
	encoded, err := json.Marshal(draft)
	return string(encoded), err
}

func persistWebsiteImageSource(ctx context.Context, store ApprovedAssetStore, businessID, source string, cache map[string]string) (string, error) {
	if store.IsManagedURL(source) {
		return source, nil
	}
	if permanentURL, ok := cache[source]; ok {
		return permanentURL, nil
	}
	data, _, err := fetchApprovedImage(ctx, source)
	if err != nil {
		return "", err
	}
	optimized, err := convertWebsiteAssetToWebP(data)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(optimized)
	key := fmt.Sprintf("businesses/%s/websites/assets/%s.webp", businessID, hex.EncodeToString(sum[:]))
	permanentURL, err := store.Upload(ctx, key, optimized, "image/webp")
	if err != nil {
		return "", err
	}
	cache[source] = permanentURL
	return permanentURL, nil
}

func websiteAssetPrompt(biz *businesses.Business, purpose, subject string) string {
	return fmt.Sprintf(`Create a premium %s image for the website of %q, a %s business.
Subject: %s.
Visual direction: authentic editorial photography, strong composition, natural light, sophisticated, useful negative space, consistent brand mood.
Hard constraints: no text, no letters, no logos, no UI mockups, no watermarks, no fake statistics, no collage.`, purpose, biz.Name, biz.Industry, subject)
}

func generatePermanentWebP(ctx context.Context, generator websiteImageGenerator, store ApprovedAssetStore, businessID, prompt, label string) (string, error) {
	temporaryURL, err := generator.GenerateImageURL(prompt, "1365x1024")
	if err != nil {
		return "", fmt.Errorf("generate %s website asset: %w", label, err)
	}
	source, _, err := fetchApprovedImage(ctx, temporaryURL)
	if err != nil {
		return "", fmt.Errorf("download generated %s asset: %w", label, err)
	}
	optimized, err := convertWebsiteAssetToWebP(source)
	if err != nil {
		return "", fmt.Errorf("convert generated %s asset to WebP: %w", label, err)
	}
	sum := sha256.Sum256(optimized)
	key := fmt.Sprintf("businesses/%s/websites/assets/%s.webp", businessID, hex.EncodeToString(sum[:]))
	permanentURL, err := store.Upload(ctx, key, optimized, "image/webp")
	if err != nil {
		return "", fmt.Errorf("upload generated %s asset: %w", label, err)
	}
	return permanentURL, nil
}

func convertWebsiteAssetToWebP(source []byte) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(source))
	if err != nil {
		return nil, fmt.Errorf("decode source image: %w", err)
	}
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	const maxWidth, maxHeight = 1920, 1280
	if width > maxWidth || height > maxHeight {
		scale := min(float64(maxWidth)/float64(width), float64(maxHeight)/float64(height))
		width, height = max(1, int(float64(width)*scale)), max(1, int(float64(height)*scale))
		resized := image.NewNRGBA(image.Rect(0, 0, width, height))
		draw.CatmullRom.Scale(resized, resized.Bounds(), img, bounds, draw.Over, nil)
		img = resized
	}
	var output bytes.Buffer
	if err := webp.Encode(&output, img, &webp.Options{Quality: 82, Method: 4, Preset: webp.PresetPhoto, UseSharpYUV: true}); err != nil {
		return nil, fmt.Errorf("encode WebP: %w", err)
	}
	if output.Len() == 0 || !bytes.HasPrefix(output.Bytes(), []byte("RIFF")) {
		return nil, fmt.Errorf("encoder returned invalid WebP")
	}
	return output.Bytes(), nil
}
