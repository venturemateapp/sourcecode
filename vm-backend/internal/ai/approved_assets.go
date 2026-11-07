package ai

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"strings"
)

const maxApprovedLogoBytes = 15 << 20

// ApprovedAssetStore is the small part of object storage needed at the creative
// approval boundary. Keeping it as an interface makes the durability rule
// independently testable.
type ApprovedAssetStore interface {
	Upload(ctx context.Context, key string, data []byte, contentType string) (string, error)
	IsManagedURL(rawURL string) bool
}

func persistApprovedBrandKit(ctx context.Context, store ApprovedAssetStore, businessID, raw string) (string, error) {
	var brand map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &brand); err != nil {
		return "", fmt.Errorf("invalid brand kit: %w", err)
	}

	// These are the image fields consumed by websites, brand guides and mockups.
	fields := []string{"logo", "logoIcon", "logoWhite"}
	persisted := make(map[string]string)
	for _, field := range fields {
		source, _ := brand[field].(string)
		source = strings.TrimSpace(source)
		if !isApprovedImageSource(source) {
			if options, ok := brand["logos"].([]interface{}); ok && len(options) > 0 {
				selected := 0
				if n, ok := brand["selectedLogo"].(float64); ok && int(n) >= 0 && int(n) < len(options) {
					selected = int(n)
				}
				if option, ok := options[selected].(map[string]interface{}); ok {
					for _, key := range []string{"image", "url", "src", "svg"} {
						if candidate, ok := option[key].(string); ok && strings.TrimSpace(candidate) != "" {
							source = strings.TrimSpace(candidate)
							break
						}
					}
				}
			}
		}
		if source == "" || (store != nil && store.IsManagedURL(source)) {
			continue
		}
		if durable, ok := persisted[source]; ok {
			brand[field] = durable
			continue
		}
		if store == nil {
			return "", fmt.Errorf("asset storage is unavailable")
		}
		// The AI produces raw <svg>…</svg> strings for logo fields. Wrap them
		// into a data URL so they can flow through the same durability path
		// (upload to S3) and render in <img> tags everywhere.
		trimmedSource := strings.TrimSpace(source)
		if strings.HasPrefix(trimmedSource, "<svg") || strings.HasPrefix(trimmedSource, "<?xml") {
			source = trimmedSource
			source = "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(source))
		}
		data, contentType, err := fetchApprovedImage(ctx, source)
		if err != nil {
			return "", fmt.Errorf("%s: %w", field, err)
		}
		sum := sha256.Sum256(data)
		key := fmt.Sprintf("businesses/%s/brand/logos/%s%s", businessID, hex.EncodeToString(sum[:]), imageExtension(contentType))
		durable, err := store.Upload(ctx, key, data, contentType)
		if err != nil {
			return "", fmt.Errorf("%s upload: %w", field, err)
		}
		brand[field] = durable
		persisted[source] = durable
	}

	out, err := json.Marshal(brand)
	if err != nil {
		return "", fmt.Errorf("encode persisted brand kit: %w", err)
	}
	return persistProposalImageReferences(ctx, store, businessID, string(out))
}

// persistProposalImageReferences copies image references into managed object
// storage before a proposal is shown for approval. Provider URLs can be
// short-lived, so keeping them in a pending proposal risks a broken preview or
// an approval that can no longer retrieve the image.
func persistProposalImageReferences(ctx context.Context, store ApprovedAssetStore, businessID, raw string) (string, error) {
	if store == nil {
		return raw, nil
	}
	var document interface{}
	if err := json.Unmarshal([]byte(raw), &document); err != nil {
		return "", fmt.Errorf("invalid proposal JSON while securing images: %w", err)
	}
	cache := make(map[string]string)
	var persist func(value interface{}, key, parentKey string, parent map[string]interface{}, path string) error
	persist = func(value interface{}, key, parentKey string, parent map[string]interface{}, path string) error {
		switch typed := value.(type) {
		case map[string]interface{}:
			for childKey, child := range typed {
				if err := persist(child, childKey, key, typed, path+"."+childKey); err != nil {
					return err
				}
			}
		case []interface{}:
			for index, child := range typed {
				if err := persist(child, "", key, nil, fmt.Sprintf("%s[%d]", path, index)); err != nil {
					return err
				}
			}
		case string:
			if !proposalImageField(key, parentKey, parent) || !isApprovedImageSource(typed) {
				return nil
			}
			source := strings.TrimSpace(typed)
			if store.IsManagedURL(source) {
				return nil
			}
			if durable, ok := cache[source]; ok {
				parent[key] = durable
				return nil
			}
			fetchSource := source
			if strings.HasPrefix(fetchSource, "<svg") || strings.HasPrefix(fetchSource, "<?xml") {
				fetchSource = "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(fetchSource))
			}
			data, contentType, err := fetchApprovedImage(ctx, fetchSource)
			if err != nil {
				return fmt.Errorf("persist proposal image at %s: %w", path, err)
			}
			sum := sha256.Sum256(data)
			keyPath := fmt.Sprintf("businesses/%s/approved-assets/%s%s", businessID, hex.EncodeToString(sum[:]), imageExtension(contentType))
			durable, err := store.Upload(ctx, keyPath, data, contentType)
			if err != nil {
				return fmt.Errorf("upload proposal image at %s: %w", path, err)
			}
			parent[key] = durable
			cache[source] = durable
		}
		return nil
	}
	if err := persist(document, "", "", nil, "proposal"); err != nil {
		return "", err
	}
	encoded, err := json.Marshal(document)
	if err != nil {
		return "", fmt.Errorf("encode proposal with managed images: %w", err)
	}
	return string(encoded), nil
}

// PersistProposalImageReferences is shared by proposal and AI Studio revision
// creation so pending review documents never depend on temporary image URLs.
func PersistProposalImageReferences(ctx context.Context, store ApprovedAssetStore, businessID, raw string) (string, error) {
	return persistProposalImageReferences(ctx, store, businessID, raw)
}

func proposalImageField(key, parentKey string, parent map[string]interface{}) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "logo", "logourl", "logo_url", "logoicon", "logowhite", "image", "imagesrc", "image_src", "imageurl", "image_url", "src", "thumbnail", "thumbnailurl", "thumbnail_url", "coverimage", "coverurl", "cover_url", "heroimage", "heroimageurl", "backgroundimage", "assetimage":
		return true
	case "url":
		if parent == nil {
			return false
		}
		typeName := strings.ToLower(strings.TrimSpace(fmt.Sprint(parent["type"])))
		kind := strings.ToLower(strings.TrimSpace(fmt.Sprint(parent["kind"])))
		collection := strings.ToLower(strings.TrimSpace(parentKey))
		return typeName == "image" || typeName == "logo" || typeName == "asset" || kind == "image" || kind == "logo" || kind == "asset" || collection == "images" || collection == "logos" || collection == "assets" || parent["altText"] != nil || parent["alt"] != nil
	default:
		return false
	}
}

func isApprovedImageSource(source string) bool {
	trimmed := strings.TrimSpace(source)
	return strings.HasPrefix(trimmed, "data:image/") || strings.HasPrefix(trimmed, "https://") || strings.HasPrefix(trimmed, "<svg") || strings.HasPrefix(trimmed, "<?xml")
}

func fetchApprovedImage(ctx context.Context, source string) ([]byte, string, error) {
	if strings.HasPrefix(source, "data:") {
		return decodeImageDataURL(source)
	}
	parsed, err := url.Parse(source)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return nil, "", fmt.Errorf("logo source must be a valid HTTPS or data URL")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
	if err != nil {
		return nil, "", fmt.Errorf("create download request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("download approved image: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("download approved image: HTTP %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxApprovedLogoBytes+1))
	if err != nil {
		return nil, "", fmt.Errorf("read approved image: %w", err)
	}
	if len(data) > maxApprovedLogoBytes {
		return nil, "", fmt.Errorf("approved image exceeds 15 MiB")
	}
	contentType := strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0])
	return validateApprovedImage(data, contentType)
}

func decodeImageDataURL(source string) ([]byte, string, error) {
	header, payload, ok := strings.Cut(source, ",")
	if !ok || !strings.HasSuffix(header, ";base64") {
		return nil, "", fmt.Errorf("unsupported image data URL")
	}
	contentType := strings.TrimPrefix(strings.TrimSuffix(header, ";base64"), "data:")
	data, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return nil, "", fmt.Errorf("decode image data URL: %w", err)
	}
	if len(data) > maxApprovedLogoBytes {
		return nil, "", fmt.Errorf("approved image exceeds 15 MiB")
	}
	return validateApprovedImage(data, contentType)
}

func validateApprovedImage(data []byte, _ string) ([]byte, string, error) {
	detected := http.DetectContentType(data)
	trimmed := bytes.TrimSpace(data)
	lowerTrimmed := bytes.ToLower(trimmed)
	if bytes.HasPrefix(lowerTrimmed, []byte("<svg")) ||
		(bytes.HasPrefix(lowerTrimmed, []byte("<?xml")) && bytes.Contains(lowerTrimmed[:min(len(lowerTrimmed), 1024)], []byte("<svg"))) {
		detected = "image/svg+xml"
	}
	if !strings.HasPrefix(detected, "image/") {
		return nil, "", fmt.Errorf("approved asset is not an image")
	}
	return data, detected, nil
}

func imageExtension(contentType string) string {
	switch contentType {
	case "image/svg+xml":
		return ".svg"
	case "image/jpeg":
		return ".jpg"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "image/png":
		return ".png"
	}
	if extensions, _ := mime.ExtensionsByType(contentType); len(extensions) > 0 {
		return extensions[0]
	}
	return ".img"
}
