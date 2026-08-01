package assetstudio

import (
	"bytes"
	"context"
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
	UserID       string
	BusinessID   string
	ProjectID    string
	Kind         string
	Subject      string
	Purpose      string
	Style        string
	Size         string
	BusinessName string
	Industry     string
	Region       string
	BrandColors  []string
	Pro          bool
	Vector       bool
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
		return nil, fmt.Errorf("Recraft is not configured")
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
	var response *recraft.GenerateResponse
	var err error
	if input.Pro {
		response, err = s.recraft.GeneratePro(ctx, prompt, input.Size, input.Style, input.Vector)
	} else if input.Vector {
		response, err = s.recraft.GenerateVector(ctx, prompt, input.Size, input.Style)
	} else {
		response, err = s.recraft.Generate(ctx, recraft.GenerateOptions{Prompt: prompt, Size: input.Size, Style: input.Style, Model: s.recraft.RasterModel()})
	}
	if err != nil {
		return nil, err
	}
	remoteURL := response.GetFirstURL()
	data, mimeType, width, height, err := s.download(ctx, remoteURL)
	if err != nil {
		return nil, err
	}
	ext := extensionForMime(mimeType)
	model := s.recraft.RasterModel()
	if input.Pro && input.Vector {
		model = s.recraft.ProVectorModel()
	} else if input.Pro {
		model = s.recraft.ProModel()
	} else if input.Vector {
		model = s.recraft.VectorModel()
	}
	key := storage.GenerateKey("ai-assets/"+input.UserID, kind+ext)
	durableURL, err := s.storage.Upload(ctx, key, data, mimeType)
	if err != nil {
		return nil, err
	}
	asset, err := s.repo.CreateAsset(ctx, aistudio.Asset{
		UserID: input.UserID, BusinessID: input.BusinessID, ProjectID: input.ProjectID,
		Source: "recraft", Kind: kind, Prompt: prompt, Model: model, Style: input.Style,
		MimeType: mimeType, Width: width, Height: height, SizeBytes: int64(len(data)), StorageKey: key,
		URL: durableURL, ThumbnailURL: durableURL, Metadata: `{"durable":true}`,
	})
	if err != nil {
		_, _ = s.storage.Delete(ctx, key)
		return nil, err
	}
	return asset, nil
}

func (s *Service) download(ctx context.Context, rawURL string) ([]byte, string, int, int, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return nil, "", 0, 0, fmt.Errorf("Recraft returned an invalid asset URL")
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
