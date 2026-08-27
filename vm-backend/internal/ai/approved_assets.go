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
		if strings.HasPrefix(source, "<svg") {
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
	return string(out), nil
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

func validateApprovedImage(data []byte, declaredType string) ([]byte, string, error) {
	detected := http.DetectContentType(data)
	if bytes.Contains(bytes.ToLower(data[:min(len(data), 512)]), []byte("<svg")) {
		detected = "image/svg+xml"
	}
	if !strings.HasPrefix(detected, "image/") {
		return nil, "", fmt.Errorf("approved asset is not an image")
	}
	contentType := detected
	if strings.HasPrefix(declaredType, "image/") && detected != "image/svg+xml" {
		contentType = declaredType
	}
	return data, contentType, nil
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
