package assetstudio

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/venturemate/vmbackend/internal/aistudio"
	"github.com/venturemate/vmbackend/internal/recraft"
	storage "github.com/venturemate/vmbackend/internal/s3"
)

const maxGeneratedAssetBytes = 25 << 20

type Service struct {
	recraft *recraft.Client
	storage *storage.Service
	repo    *aistudio.Repository
	http    *http.Client
}

type GenerateInput struct {
	UserID         string
	BusinessID     string
	ProjectID      string
	Kind           string
	Subject        string
	Purpose        string
	Style          string
	Size           string
	BusinessName   string
	Industry       string
	Region         string
	BrandColors    []string
	Pro            bool
	Vector         bool
	Variants       int
	ReferenceImage string
}

func NewService(client *recraft.Client, store *storage.Service, repo *aistudio.Repository) *Service {
	return &Service{recraft: client, storage: store, repo: repo, http: &http.Client{Timeout: 90 * time.Second}}
}

func BuildPrompt(input GenerateInput) string {
	parts := []string{strings.TrimSpace(input.Subject)}
	if input.BusinessName != "" {
		parts = append(parts, "for the business "+input.BusinessName)
	}
	if input.Industry != "" {
		parts = append(parts, "industry: "+input.Industry)
	}
	if input.Purpose != "" {
		parts = append(parts, "visual purpose: "+input.Purpose)
	}
	if input.Style != "" {
		parts = append(parts, "style: "+input.Style)
	}
	if len(input.BrandColors) > 0 {
		parts = append(parts, "brand palette: "+strings.Join(input.BrandColors, ", "))
	}
	if input.Region != "" {
		parts = append(parts, "context: culturally accurate for "+input.Region+" without stereotypes")
	}
	if input.Kind != "logo" {
		parts = append(parts, "no text, no lettering, no watermark")
	}
	parts = append(parts, "professional commercial quality, clean composition, suitable for a modern business product")
	return strings.Join(parts, ". ")
}

func (s *Service) Generate(ctx context.Context, input GenerateInput) (*aistudio.Asset, error) {
	if s == nil || s.recraft == nil || !s.recraft.Available() {
		return nil, fmt.Errorf("image generation is not configured")
	}
	if s.storage == nil || s.repo == nil {
		return nil, fmt.Errorf("asset storage is unavailable")
	}
	if input.ProjectID != "" {
		project, err := s.repo.GetProject(ctx, input.UserID, input.ProjectID)
		if err != nil {
			return nil, err
		}
		if project == nil {
			return nil, fmt.Errorf("project not found or access denied")
		}
	}
	kind := strings.ToLower(strings.TrimSpace(input.Kind))
	if kind == "" {
		kind = "image"
	}
	switch kind {
	case "image", "vector", "logo", "icon", "background", "mockup", "chart":
	default:
		return nil, fmt.Errorf("unsupported asset kind %q", kind)
	}
	if kind == "vector" || kind == "logo" || kind == "icon" {
		input.Vector = true
	}
	prompt := BuildPrompt(input)
	if strings.TrimSpace(input.Subject) == "" {
		return nil, fmt.Errorf("asset subject is required")
	}
	count := input.Variants
	if count < 1 {
		count = 1
	}
	if count > 4 {
		count = 4
	}
	var refs []string
	if ref := strings.TrimSpace(input.ReferenceImage); ref != "" {
		refs = []string{ref}
	}
	response, err := s.recraft.Generate(ctx, recraft.GenerateOptions{
		Prompt: prompt, Size: input.Size, Style: input.Style,
		Model: s.recraft.RasterModel(), Count: count, ReferenceImages: refs,
	})
	if err != nil {
		return nil, err
	}
	urls := response.AllURLs()
	if len(urls) == 0 {
		return nil, fmt.Errorf("image provider returned no images")
	}
	model := s.recraft.RasterModel()
	var first *aistudio.Asset
	for _, remoteURL := range urls {
		data, mimeType, width, height, derr := s.download(ctx, remoteURL)
		if derr != nil {
			if first != nil {
				break // keep whatever variants already succeeded
			}
			return nil, derr
		}
		ext := extensionForMime(mimeType)
		key := storage.GenerateKey("ai-assets/"+input.UserID, kind+ext)
		durableURL, uerr := s.storage.Upload(ctx, key, data, mimeType)
		if uerr != nil {
			if first != nil {
				break
			}
			return nil, uerr
		}
		asset, cerr := s.repo.CreateAsset(ctx, aistudio.Asset{
			UserID: input.UserID, BusinessID: input.BusinessID, ProjectID: input.ProjectID,
			Source: "opper", Kind: kind, Prompt: prompt, Model: model, Style: input.Style,
			MimeType: mimeType, Width: width, Height: height, SizeBytes: int64(len(data)), StorageKey: key,
			URL: durableURL, ThumbnailURL: durableURL, Metadata: `{"durable":true}`,
		})
		if cerr != nil {
			_, _ = s.storage.Delete(ctx, key)
			if first != nil {
				break
			}
			return nil, cerr
		}
		if first == nil {
			first = asset
		}
	}
	if first == nil {
		return nil, fmt.Errorf("image provider returned no usable images")
	}
	return first, nil
}

func (s *Service) download(ctx context.Context, rawURL string) ([]byte, string, int, int, error) {
	rawURL = strings.TrimSpace(rawURL)
	if strings.HasPrefix(rawURL, "data:") {
		return decodeDataURL(rawURL)
	}
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return nil, "", 0, 0, fmt.Errorf("image provider returned an invalid asset URL")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return nil, "", 0, 0, err
	}
	resp, err := s.http.Do(req)
	if err != nil {
		return nil, "", 0, 0, fmt.Errorf("download generated asset: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", 0, 0, fmt.Errorf("generated asset download returned HTTP %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxGeneratedAssetBytes+1))
	if err != nil {
		return nil, "", 0, 0, err
	}
	if len(data) > maxGeneratedAssetBytes {
		return nil, "", 0, 0, fmt.Errorf("generated asset is too large")
	}
	mimeType := strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0])
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = http.DetectContentType(data)
	}
	trimmed := bytes.TrimSpace(data)
	if bytes.HasPrefix(trimmed, []byte("<svg")) || bytes.HasPrefix(trimmed, []byte("<?xml")) && bytes.Contains(trimmed, []byte("<svg")) {
		mimeType = "image/svg+xml"
	}
	if !strings.HasPrefix(mimeType, "image/") {
		return nil, "", 0, 0, fmt.Errorf("generated response is not an image (%s)", mimeType)
	}
	width, height := 0, 0
	if mimeType != "image/svg+xml" {
		if cfg, _, decodeErr := image.DecodeConfig(bytes.NewReader(data)); decodeErr == nil {
			width, height = cfg.Width, cfg.Height
		}
	}
	return data, mimeType, width, height, nil
}

func decodeDataURL(source string) ([]byte, string, int, int, error) {
	header, payload, ok := strings.Cut(source, ",")
	if !ok || !strings.HasSuffix(header, ";base64") {
		return nil, "", 0, 0, fmt.Errorf("unsupported image data URL")
	}
	mimeType := strings.TrimPrefix(strings.TrimSuffix(header, ";base64"), "data:")
	data, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return nil, "", 0, 0, fmt.Errorf("decode image data URL: %w", err)
	}
	if len(data) == 0 {
		return nil, "", 0, 0, fmt.Errorf("generated image is empty")
	}
	if len(data) > maxGeneratedAssetBytes {
		return nil, "", 0, 0, fmt.Errorf("generated asset is too large")
	}
	if strings.TrimSpace(mimeType) == "" || mimeType == "application/octet-stream" {
		mimeType = http.DetectContentType(data)
	}
	trimmed := bytes.TrimSpace(data)
	if bytes.HasPrefix(trimmed, []byte("<svg")) || (bytes.HasPrefix(trimmed, []byte("<?xml")) && bytes.Contains(trimmed, []byte("<svg"))) {
		mimeType = "image/svg+xml"
	}
	if !strings.HasPrefix(mimeType, "image/") {
		return nil, "", 0, 0, fmt.Errorf("generated response is not an image (%s)", mimeType)
	}
	width, height := 0, 0
	if mimeType != "image/svg+xml" {
		if cfg, _, decodeErr := image.DecodeConfig(bytes.NewReader(data)); decodeErr == nil {
			width, height = cfg.Width, cfg.Height
		}
	}
	return data, mimeType, width, height, nil
}

func extensionForMime(mimeType string) string {
	switch mimeType {
	case "image/png":
		return ".png"
	case "image/jpeg":
		return ".jpg"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "image/svg+xml":
		return ".svg"
	default:
		ext := filepath.Ext(mimeType)
		if ext == "" {
			return ".bin"
		}
		return ext
	}
}
