package recraft

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type Client struct {
	apiKey  string
	baseURL string
	http    *http.Client
}

func NewClient() *Client {
	apiKey := os.Getenv("RECRAFT_API_KEY")
	return &Client{
		apiKey:  apiKey,
		baseURL: "https://external.api.recraft.ai/v1",
		http:    &http.Client{Timeout: 60 * time.Second},
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
}

func (c *Client) GenerateLogo(prompt string) (*GenerateResponse, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("RECRAFT_API_KEY not set")
	}
	body := GenerateRequest{
		Prompt: prompt,
		Model:  "recraftv4_1",
		N:      1,
		Size:   "1024x1024",
	}
	b, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", c.baseURL+"/images/generations", bytes.NewReader(b))
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

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("recraft API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result GenerateResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("recraft parse: %w", err)
	}
	return &result, nil
}

func (c *Client) VectorizeImage(imageURL string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("RECRAFT_API_KEY not set")
	}
	body := map[string]string{"image_url": imageURL}
	b, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", c.baseURL+"/images/vectorize", bytes.NewReader(b))
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

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("recraft vectorize error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Image struct {
			URL string `json:"url"`
		} `json:"image"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("recraft vectorize parse: %w", err)
	}
	return result.Image.URL, nil
}
