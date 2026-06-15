package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Message struct {
	Role        string `json:"role"`
	Content     string `json:"content"`
	ToolCallID  string `json:"toolCallId,omitempty"`
}

type ToolDef struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `json:"parameters"`
}

type ToolCall struct {
	ID      string                 `json:"id"`
	Name    string                 `json:"name"`
	Args    map[string]interface{} `json:"args"`
}

type ProviderResponse struct {
	Content   string     `json:"content"`
	ToolCalls []ToolCall `json:"toolCalls,omitempty"`
}

type Provider interface {
	Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error)
}

type geminiProvider struct {
	apiKey string
	client *http.Client
}

func newGeminiProvider(apiKey string) *geminiProvider {
	return &geminiProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

type geminiReq struct {
	SystemInstruction *geminiContent       `json:"system_instruction,omitempty"`
	Contents          []geminiContent      `json:"contents"`
	Tools             []geminiTool         `json:"tools,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text         string              `json:"text,omitempty"`
	FunctionCall *geminiFunctionCall `json:"functionCall,omitempty"`
	FunctionResp *geminiFunctionResp `json:"functionResponse,omitempty"`
}

type geminiFunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

type geminiFunctionResp struct {
	Name     string              `json:"name"`
	Response geminiRespContent   `json:"response"`
}

type geminiRespContent struct {
	Content string `json:"content"`
}

type geminiTool struct {
	FunctionDeclarations []geminiFuncDecl `json:"functionDeclarations"`
}

type geminiFuncDecl struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `json:"parameters"`
}

type geminiResp struct {
	Candidates []geminiCandidate `json:"candidates"`
}

type geminiCandidate struct {
	Content geminiContent `json:"content"`
}

func (p *geminiProvider) Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", p.apiKey)

	var geminiTools []geminiTool
	if len(tools) > 0 {
		var decls []geminiFuncDecl
		for _, t := range tools {
			decls = append(decls, geminiFuncDecl{
				Name:        t.Name,
				Description: t.Description,
				Parameters:  t.Parameters,
			})
		}
		geminiTools = append(geminiTools, geminiTool{FunctionDeclarations: decls})
	}

	var contents []geminiContent
	for _, m := range messages {
		var parts []geminiPart
		switch m.Role {
		case "user":
			parts = append(parts, geminiPart{Text: m.Content})
		case "assistant":
			if m.Content != "" {
				parts = append(parts, geminiPart{Text: m.Content})
			}
		case "tool":
			parts = append(parts, geminiPart{
				FunctionResp: &geminiFunctionResp{
					Name: m.ToolCallID,
					Response: geminiRespContent{Content: m.Content},
				},
			})
		}
		if len(parts) > 0 {
			geminiRole := "user"
			if m.Role == "assistant" || m.Role == "model" {
				geminiRole = "model"
			}
			contents = append(contents, geminiContent{Role: geminiRole, Parts: parts})
		}
	}

	req := geminiReq{
		Contents: contents,
		Tools:    geminiTools,
	}
	if systemPrompt != "" {
		req.SystemInstruction = &geminiContent{Parts: []geminiPart{{Text: systemPrompt}}}
	}

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gemini request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("gemini API error %d: %s", resp.StatusCode, string(respBody))
	}

	var geminiResp geminiResp
	if err := json.Unmarshal(respBody, &geminiResp); err != nil {
		return nil, fmt.Errorf("gemini response parse: %w", err)
	}

	if len(geminiResp.Candidates) == 0 {
		return &ProviderResponse{Content: "No response from model"}, nil
	}

	pr := &ProviderResponse{}
	parts := geminiResp.Candidates[0].Content.Parts
	for _, part := range parts {
		if part.Text != "" {
			pr.Content = part.Text
		}
		if part.FunctionCall != nil {
			pr.ToolCalls = append(pr.ToolCalls, ToolCall{
				ID:   part.FunctionCall.Name,
				Name: part.FunctionCall.Name,
				Args: part.FunctionCall.Args,
			})
		}
	}
	return pr, nil
}

type openAIProvider struct {
	apiKey string
	client *http.Client
}

func newOpenAIProvider(apiKey string) *openAIProvider {
	return &openAIProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

type openAITool struct {
	Type     string          `json:"type"`
	Function json.RawMessage `json:"function"`
}

type openAIMessage struct {
	Role         string            `json:"role"`
	Content      string            `json:"content,omitempty"`
	ToolCallID   string            `json:"tool_call_id,omitempty"`
	ToolCalls    []openAIToolCall  `json:"tool_calls,omitempty"`
}

type openAIToolCall struct {
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Function openAIFuncCall  `json:"function"`
}

type openAIFuncCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type openAIReq struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Tools       []openAITool    `json:"tools,omitempty"`
	System      string          `json:"system,omitempty"`
}

type openAIRespChoice struct {
	Message openAIMessage `json:"message"`
}

type openAIResp struct {
	Choices []openAIRespChoice `json:"choices"`
}

func (p *openAIProvider) Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error) {
	var openAIMsgs []openAIMessage
	for _, m := range messages {
		msg := openAIMessage{Role: m.Role, Content: m.Content}
		if m.Role == "tool" {
			msg.Role = "tool"
			msg.ToolCallID = m.ToolCallID
		}
		openAIMsgs = append(openAIMsgs, msg)
	}

	var openAITools []openAITool
	for _, t := range tools {
		fn := map[string]interface{}{
			"name":        t.Name,
			"description": t.Description,
			"parameters":  t.Parameters,
		}
		fnBytes, _ := json.Marshal(fn)
		openAITools = append(openAITools, openAITool{
			Type:     "function",
			Function: fnBytes,
		})
	}

	req := openAIReq{
		Model:    "gpt-4o-mini",
		Messages: openAIMsgs,
		Tools:    openAITools,
		System:   systemPrompt,
	}

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("openai API error %d: %s", resp.StatusCode, string(respBody))
	}

	var openAIResp openAIResp
	if err := json.Unmarshal(respBody, &openAIResp); err != nil {
		return nil, fmt.Errorf("openai response parse: %w", err)
	}

	if len(openAIResp.Choices) == 0 {
		return &ProviderResponse{Content: "No response from model"}, nil
	}

	pr := &ProviderResponse{Content: openAIResp.Choices[0].Message.Content}
	for _, tc := range openAIResp.Choices[0].Message.ToolCalls {
		var args map[string]interface{}
		json.Unmarshal([]byte(tc.Function.Arguments), &args)
		pr.ToolCalls = append(pr.ToolCalls, ToolCall{
			ID:   tc.ID,
			Name: tc.Function.Name,
			Args: args,
		})
	}
	return pr, nil
}

type claudeProvider struct {
	apiKey string
	client *http.Client
}

func newClaudeProvider(apiKey string) *claudeProvider {
	return &claudeProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

type claudeReq struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	System    string          `json:"system,omitempty"`
	Messages  []claudeMsg     `json:"messages"`
	Tools     []claudeToolDef `json:"tools,omitempty"`
}

type claudeMsg struct {
	Role    string            `json:"role"`
	Content []claudeContent   `json:"content"`
}

type claudeContent struct {
	Type      string                 `json:"type"`
	Text      string                 `json:"text,omitempty"`
	ID        string                 `json:"id,omitempty"`
	Name      string                 `json:"name,omitempty"`
	Input     map[string]interface{} `json:"input,omitempty"`
	Content   string                 `json:"content,omitempty"`
	ToolUseID string                 `json:"tool_use_id,omitempty"`
}

type claudeToolDef struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"input_schema"`
}

type claudeResp struct {
	Content []claudeRespContent `json:"content"`
}

type claudeRespContent struct {
	Type  string                 `json:"type"`
	Text  string                 `json:"text,omitempty"`
	ID    string                 `json:"id,omitempty"`
	Name  string                 `json:"name,omitempty"`
	Input map[string]interface{} `json:"input,omitempty"`
}

func (p *claudeProvider) Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error) {
	var claudeTools []claudeToolDef
	for _, t := range tools {
		var params map[string]interface{}
		json.Unmarshal(t.Parameters, &params)
		claudeTools = append(claudeTools, claudeToolDef{
			Name:        t.Name,
			Description: t.Description,
			InputSchema: t.Parameters,
		})
	}

	var claudeMsgs []claudeMsg
	for _, m := range messages {
		var contents []claudeContent
		switch m.Role {
		case "user", "tool":
			if m.Role == "tool" {
				contents = append(contents, claudeContent{
					Type:      "tool_result",
					ToolUseID: m.ToolCallID,
					Content:   m.Content,
				})
				claudeMsgs = append(claudeMsgs, claudeMsg{Role: "user", Content: contents})
				continue
			}
			contents = append(contents, claudeContent{Type: "text", Text: m.Content})
		case "assistant":
			contents = append(contents, claudeContent{Type: "text", Text: m.Content})
		}
		if len(contents) > 0 {
			claudeMsgs = append(claudeMsgs, claudeMsg{Role: m.Role, Content: contents})
		}
	}

	req := claudeReq{
		Model:     "claude-sonnet-4-20250514",
		MaxTokens: 4096,
		System:    systemPrompt,
		Messages:  claudeMsgs,
		Tools:     claudeTools,
	}

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("claude request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("claude API error %d: %s", resp.StatusCode, string(respBody))
	}

	var claudeResp claudeResp
	if err := json.Unmarshal(respBody, &claudeResp); err != nil {
		return nil, fmt.Errorf("claude response parse: %w", err)
	}

	pr := &ProviderResponse{}
	for _, block := range claudeResp.Content {
		switch block.Type {
		case "text":
			pr.Content = block.Text
		case "tool_use":
			pr.ToolCalls = append(pr.ToolCalls, ToolCall{
				ID:   block.ID,
				Name: block.Name,
				Args: block.Input,
			})
		}
	}
	return pr, nil
}

func NewProvider(providerName, apiKey string) (Provider, error) {
	switch providerName {
	case "gemini":
		return newGeminiProvider(apiKey), nil
	case "openai":
		return newOpenAIProvider(apiKey), nil
	case "claude":
		return newClaudeProvider(apiKey), nil
	default:
		return nil, fmt.Errorf("unknown provider: %s", providerName)
	}
}
