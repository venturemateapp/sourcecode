// Package recraft historically wrapped Recraft's image API. It now routes every
// image and logo generation through the Opper AI gateway (POST /v3/images) so a
// single OPPER_API_KEY powers both text and image generation. The exported type
// and method surface is kept stable so existing call sites compile unchanged.
package recraft

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const defaultBaseURL = "https://api.opper.ai/v3"

type Client struct {
	apiKey  string
	baseURL string
	model   string
	quality string
	http    *http.Client
}

func (c *Client) Available() bool { return c != nil && strings.TrimSpace(c.apiKey) != "" }

func (c *Client) model_() string {
	if c == nil || strings.TrimSpace(c.model) == "" {
		return "openai/gpt-image-2.5-flare"
	}
	return c.model
}

// The former Recraft client exposed distinct raster/vector/pro model names.
// Opper's GPT Image produces raster output only, so every variant now maps to
// the single configured Opper image model.
func (c *Client) RasterModel() string    { return c.model_() }
func (c *Client) VectorModel() string    { return c.model_() }
func (c *Client) ProModel() string       { return c.model_() }
func (c *Client) ProVectorModel() string { return c.model_() }

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func NewClient() *Client {
	timeoutSeconds := 180
	if value, err := strconv.Atoi(strings.TrimSpace(os.Getenv("OPPER_IMAGE_TIMEOUT_SECONDS"))); err == nil && value >= 10 && value <= 600 {
		timeoutSeconds = value
	}
	return &Client{
		apiKey:  strings.TrimSpace(os.Getenv("OPPER_API_KEY")),
		baseURL: strings.TrimRight(envOr("OPPER_BASE_URL", defaultBaseURL), "/"),
		model:   envOr("OPPER_IMAGE_MODEL", "openai/gpt-image-2.5-flare"),
		quality: strings.TrimSpace(os.Getenv("OPPER_IMAGE_QUALITY")),
		http:    &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second},
	}
}

// opperImageRequest mirrors the Opper POST /v3/images body. The project runs
// with zero-day retention, so outputs cannot be stored server-side; images come
// back inline as base64 (the default response_format).
type opperImageRequest struct {
	Model   string `json:"model"`
	Prompt  string `json:"prompt"`
	Size    string `json:"size,omitempty"`
	N       int    `json:"n,omitempty"`
	Quality string `json:"quality,omitempty"`
}

type GenerateResponse struct {
	Data []struct {
		URL      string `json:"url"`
		B64JSON  string `json:"b64_json"`
		MimeType string `json:"mime_type"`
	} `json:"data"`
}

type GenerateOptions struct {
	Prompt string
	Size   string
	Style  string
	Model  string
	Count  int
}

func (c *Client) GenerateLogo(prompt string) (*GenerateResponse, error) {
	return c.Generate(context.Background(), GenerateOptions{Prompt: prompt, Size: "1024x1024"})
}

func (c *Client) GenerateImage(prompt, size string) (*GenerateResponse, error) {
	return c.Generate(context.Background(), GenerateOptions{Prompt: prompt, Size: size})
}

func (c *Client) GenerateVector(ctx context.Context, prompt, size, style string) (*GenerateResponse, error) {
	return c.Generate(ctx, GenerateOptions{Prompt: prompt, Size: size, Style: style})
}

func (c *Client) GeneratePro(ctx context.Context, prompt, size, style string, vector bool) (*GenerateResponse, error) {
	return c.Generate(ctx, GenerateOptions{Prompt: prompt, Size: size, Style: style})
}

// normalizeSize bridges arbitrary WxH hints to the sizes GPT Image accepts.
func normalizeSize(size string) string {
	size = strings.TrimSpace(strings.ToLower(size))
	parts := strings.SplitN(size, "x", 2)
	if len(parts) != 2 {
		return "1024x1024"
	}
	w, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
	h, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err1 != nil || err2 != nil || w <= 0 || h <= 0 {
		return "1024x1024"
	}
	switch {
	case w > h:
		return "1536x1024"
	case h > w:
		return "1024x1536"
	default:
		return "1024x1024"
	}
}

func (c *Client) Generate(ctx context.Context, options GenerateOptions) (*GenerateResponse, error) {
	if c == nil || c.apiKey == "" {
		return nil, fmt.Errorf("OPPER_API_KEY not set")
	}
	options.Prompt = strings.TrimSpace(options.Prompt)
	if options.Prompt == "" {
		return nil, fmt.Errorf("image prompt is required")
	}
	if style := strings.TrimSpace(options.Style); style != "" && !strings.Contains(strings.ToLower(options.Prompt), strings.ToLower(style)) {
		options.Prompt += ". Style: " + style
	}
	if len(options.Prompt) > 4000 {
		options.Prompt = options.Prompt[:4000]
	}
	if options.Count <= 0 || options.Count > 4 {
		options.Count = 1
	}
	model := strings.TrimSpace(options.Model)
	if model == "" {
		model = c.model_()
	}
	body := opperImageRequest{
		Model:   model,
		Prompt:  options.Prompt,
		Size:    normalizeSize(options.Size),
		N:       options.Count,
		Quality: c.quality,
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/images", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("opper image request: %w", err)
	}
	defer resp.Body.Close()
	respBody, readErr := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	if readErr != nil {
		return nil, readErr
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("opper image API error %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	var result GenerateResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("opper image parse: %w", err)
	}
	// ZDR projects return inline base64 only. Wrap it as a data URI so callers
	// that expect a URL (previews, approval persistence, S3 upload) keep working.
	for i := range result.Data {
		if result.Data[i].URL == "" && result.Data[i].B64JSON != "" {
			mime := strings.TrimSpace(result.Data[i].MimeType)
			if mime == "" {
				mime = "image/png"
			}
			result.Data[i].URL = "data:" + mime + ";base64," + result.Data[i].B64JSON
		}
	}
	if result.GetFirstURL() == "" {
		return nil, fmt.Errorf("opper returned no image")
	}
	return &result, nil
}

func (c *Client) GenerateImageURL(prompt, size string) (string, error) {
	result, err := c.GenerateImage(prompt, size)
	if err != nil {
		return "", err
	}
	return result.GetFirstURL(), nil
}

func (r *GenerateResponse) GetFirstURL() string {
	if r == nil {
		return ""
	}
	if len(r.Data) > 0 && r.Data[0].URL != "" {
		return r.Data[0].URL
	}
	return ""
}

// VectorizeImage is retained for API compatibility. Opper's GPT Image pipeline
// produces raster output and offers no raster->SVG vectorization, so callers
// gracefully fall back to the raster image when this returns an error.
func (c *Client) VectorizeImage(imageURL string) (string, error) {
	return c.Vectorize(context.Background(), imageURL)
}

func (c *Client) Vectorize(ctx context.Context, imageURL string) (string, error) {
	return "", fmt.Errorf("vectorization is not supported by the Opper image provider")
}
