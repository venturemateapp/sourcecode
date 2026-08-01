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

const defaultBaseURL = "https://external.api.recraft.ai/v1"

type Client struct {
	apiKey         string
	baseURL        string
	rasterModel    string
	vectorModel    string
	proModel       string
	proVectorModel string
	http           *http.Client
}

func (c *Client) Available() bool { return c != nil && strings.TrimSpace(c.apiKey) != "" }
func (c *Client) RasterModel() string {
	if c == nil {
		return ""
	}
	return c.rasterModel
}
func (c *Client) VectorModel() string {
	if c == nil {
		return ""
	}
	return c.vectorModel
}
func (c *Client) ProModel() string {
	if c == nil {
		return ""
	}
	return c.proModel
}
func (c *Client) ProVectorModel() string {
	if c == nil {
		return ""
	}
	return c.proVectorModel
}

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func NewClient() *Client {
	timeoutSeconds := 120
	if value, err := strconv.Atoi(strings.TrimSpace(os.Getenv("RECRAFT_TIMEOUT_SECONDS"))); err == nil && value >= 10 && value <= 600 {
		timeoutSeconds = value
	}
	return &Client{
		apiKey:         strings.TrimSpace(os.Getenv("RECRAFT_API_KEY")),
		baseURL:        strings.TrimRight(envOr("RECRAFT_BASE_URL", defaultBaseURL), "/"),
		rasterModel:    envOr("RECRAFT_MODEL", "recraftv4_1"),
		vectorModel:    envOr("RECRAFT_VECTOR_MODEL", "recraftv4_1_vector"),
		proModel:       envOr("RECRAFT_PRO_MODEL", "recraftv4_1_pro"),
		proVectorModel: envOr("RECRAFT_PRO_VECTOR_MODEL", "recraftv4_1_pro_vector"),
		http:           &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second},
	}
}

type GenerateRequest struct {
	Prompt string `json:"prompt"`
	Model  string `json:"model,omitempty"`
	Style  string `json:"style,omitempty"`
	N      int    `json:"n,omitempty"`
	Size   string `json:"size,omitempty"`
}

type GenerateResponse struct {
	Data []struct {
		URL string `json:"url"`
	} `json:"data"`
	Image *struct {
		URL string `json:"url"`
	} `json:"image,omitempty"`
}

type GenerateOptions struct {
	Prompt string
	Size   string
	Style  string
	Model  string
	Count  int
}

func (c *Client) GenerateLogo(prompt string) (*GenerateResponse, error) {
	return c.Generate(context.Background(), GenerateOptions{Prompt: prompt, Size: "1024x1024", Model: c.vectorModel})
}

func (c *Client) GenerateImage(prompt, size string) (*GenerateResponse, error) {
	return c.Generate(context.Background(), GenerateOptions{Prompt: prompt, Size: size, Model: c.rasterModel})
}

func (c *Client) GenerateVector(ctx context.Context, prompt, size, style string) (*GenerateResponse, error) {
	return c.Generate(ctx, GenerateOptions{Prompt: prompt, Size: size, Style: style, Model: c.vectorModel})
}

func (c *Client) GeneratePro(ctx context.Context, prompt, size, style string, vector bool) (*GenerateResponse, error) {
	model := c.proModel
	if vector {
		model = c.proVectorModel
	}
	return c.Generate(ctx, GenerateOptions{Prompt: prompt, Size: size, Style: style, Model: model})
}

func (c *Client) Generate(ctx context.Context, options GenerateOptions) (*GenerateResponse, error) {
	if c == nil || c.apiKey == "" {
		return nil, fmt.Errorf("RECRAFT_API_KEY not set")
	}
	options.Prompt = strings.TrimSpace(options.Prompt)
	if options.Prompt == "" {
		return nil, fmt.Errorf("recraft prompt is required")
	}
	if len(options.Prompt) > 4000 {
		return nil, fmt.Errorf("recraft prompt is too long")
	}
	if options.Size == "" {
		options.Size = "1365x1024"
	}
	if options.Model == "" {
		options.Model = c.rasterModel
	}
	if options.Count <= 0 || options.Count > 4 {
		options.Count = 1
	}
	body := GenerateRequest{Prompt: options.Prompt, Model: options.Model, Style: options.Style, N: options.Count, Size: options.Size}
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/images/generations", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("recraft request: %w", err)
	}
	defer resp.Body.Close()
	respBody, readErr := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if readErr != nil {
		return nil, readErr
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("recraft API error %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	var result GenerateResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("recraft parse: %w", err)
	}
	if result.GetFirstURL() == "" {
		return nil, fmt.Errorf("recraft returned no image URL")
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
	if r.Image != nil && r.Image.URL != "" {
		return r.Image.URL
	}
	return ""
}

func (c *Client) VectorizeImage(imageURL string) (string, error) {
	return c.Vectorize(context.Background(), imageURL)
}

func (c *Client) Vectorize(ctx context.Context, imageURL string) (string, error) {
	if c == nil || c.apiKey == "" {
		return "", fmt.Errorf("RECRAFT_API_KEY not set")
	}
	if !strings.HasPrefix(strings.TrimSpace(imageURL), "https://") {
		return "", fmt.Errorf("a secure image URL is required")
	}
	payload, _ := json.Marshal(map[string]string{"image_url": imageURL})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/images/vectorize", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("recraft vectorize: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("recraft vectorize error %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	var result GenerateResponse
	if err := json.Unmarshal(respBody, &result); err == nil && result.GetFirstURL() != "" {
		return result.GetFirstURL(), nil
	}
	var legacy struct {
		Image struct {
			URL string `json:"url"`
		} `json:"image"`
	}
	if err := json.Unmarshal(respBody, &legacy); err != nil {
		return "", fmt.Errorf("recraft vectorize parse: %w", err)
	}
	if legacy.Image.URL == "" {
		return "", fmt.Errorf("recraft vectorize returned no image URL")
	}
	return legacy.Image.URL, nil
}
