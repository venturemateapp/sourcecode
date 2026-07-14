package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

const (
	DefaultOllamaEndpoint = "https://llm.edspike.com/api/chat"
	DefaultOllamaModel    = "qwen2.5:3b"

	requestTimeout    = 90 * time.Second
	connectTimeout    = 10 * time.Second
	keepAliveIdle     = 30 * time.Second
	keepAliveInterval = 15 * time.Second

	maxRetries     = 2
	retryBaseDelay = 500 * time.Millisecond
	retryMaxDelay  = 5 * time.Second

	maxContextTokens       = 4096
	maxResponseTokens      = 512
	creativeResponseTokens = 1280
	systemPromptTokens     = 200
	tokenEstimateRatio     = 3.5
)

type Message struct {
	Role       string     `json:"role"`
	Content    string     `json:"content"`
	ToolCallID string     `json:"toolCallId,omitempty"`
	ToolName   string     `json:"toolName,omitempty"`
	ToolCalls  []ToolCall `json:"toolCalls,omitempty"`
}

type ToolDef struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `json:"parameters"`
}

type ToolCall struct {
	ID   string                 `json:"id"`
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

type ProviderResponse struct {
	Content   string     `json:"content"`
	ToolCalls []ToolCall `json:"toolCalls,omitempty"`
	Provider  string     `json:"provider,omitempty"`
	Model     string     `json:"model,omitempty"`
}

type Provider interface {
	Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error)
	Name() string
	Model() string
	Health(ctx context.Context) error
}

type ProviderConfig struct {
	Name     string
	APIKey   string
	Endpoint string
	Model    string
}

func newHTTPClient() *http.Client {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   connectTimeout,
			KeepAlive: keepAliveInterval,
		}).DialContext,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   20,
		IdleConnTimeout:       keepAliveIdle,
		TLSHandshakeTimeout:   connectTimeout,
		ExpectContinueTimeout: time.Second,
	}
	return &http.Client{Transport: transport, Timeout: requestTimeout}
}

func doJSONWithRetry(ctx context.Context, client *http.Client, reqFactory func() (*http.Request, error)) ([]byte, int, error) {
	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		req, err := reqFactory()
		if err != nil {
			return nil, 0, err
		}
		resp, err := client.Do(req)
		if err == nil {
			body, readErr := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
			resp.Body.Close()
			if readErr != nil {
				return nil, resp.StatusCode, readErr
			}
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				return body, resp.StatusCode, nil
			}
			lastErr = fmt.Errorf("provider returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
			if resp.StatusCode < 500 && resp.StatusCode != http.StatusTooManyRequests {
				return body, resp.StatusCode, lastErr
			}
		} else {
			lastErr = err
		}

		if attempt < maxRetries {
			delay := retryBaseDelay * time.Duration(1<<attempt)
			if delay > retryMaxDelay {
				delay = retryMaxDelay
			}
			select {
			case <-ctx.Done():
				return nil, 0, ctx.Err()
			case <-time.After(delay):
			}
		}
	}
	return nil, 0, lastErr
}

type responseTokenLimitContextKey struct{}

func withResponseTokenLimit(ctx context.Context, limit int) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	minLimit := 128
	maxLimit := maxContextTokens - systemPromptTokens - 256
	if limit < minLimit {
		limit = minLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return context.WithValue(ctx, responseTokenLimitContextKey{}, limit)
}

func responseTokenLimit(ctx context.Context) int {
	if ctx != nil {
		if limit, ok := ctx.Value(responseTokenLimitContextKey{}).(int); ok && limit > 0 {
			return limit
		}
	}
	return maxResponseTokens
}

func trimMessages(systemPrompt string, messages []Message, outputTokens int) []Message {
	if outputTokens <= 0 {
		outputTokens = maxResponseTokens
	}
	usableTokens := maxContextTokens - outputTokens - systemPromptTokens
	usableChars := int(float64(usableTokens)*tokenEstimateRatio) - len(systemPrompt)
	if usableChars < 1000 {
		usableChars = 1000
	}

	total := 0
	start := len(messages)
	for i := len(messages) - 1; i >= 0; i-- {
		sz := len(messages[i].Content)
		for _, tc := range messages[i].ToolCalls {
			b, _ := json.Marshal(tc.Args)
			sz += len(tc.Name) + len(b)
		}
		if total+sz > usableChars && start < len(messages) {
			break
		}
		total += sz
		start = i
	}
	if start < 0 || start >= len(messages) {
		return messages
	}
	return append([]Message(nil), messages[start:]...)
}

// Ollama provider ------------------------------------------------------------

type ollamaProvider struct {
	endpoint string
	model    string
	client   *http.Client
}

func newOllamaProvider(endpoint, model string) *ollamaProvider {
	if strings.TrimSpace(endpoint) == "" {
		endpoint = DefaultOllamaEndpoint
	}
	if strings.TrimSpace(model) == "" {
		model = DefaultOllamaModel
	}
	return &ollamaProvider{endpoint: strings.TrimRight(endpoint, "/"), model: model, client: newHTTPClient()}
}

func (p *ollamaProvider) Name() string  { return "ollama" }
func (p *ollamaProvider) Model() string { return p.model }

func (p *ollamaProvider) Health(ctx context.Context) error {
	base := strings.TrimSuffix(p.endpoint, "/api/chat")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/api/tags", nil)
	if err != nil {
		return err
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("ollama health check returned HTTP %d", resp.StatusCode)
	}
	return nil
}

type ollamaFunction struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	Parameters  json.RawMessage `json:"parameters"`
}

type ollamaTool struct {
	Type     string         `json:"type"`
	Function ollamaFunction `json:"function"`
}

type ollamaToolCall struct {
	Function struct {
		Name      string                 `json:"name"`
		Arguments map[string]interface{} `json:"arguments"`
	} `json:"function"`
}

type ollamaMessage struct {
	Role      string           `json:"role"`
	Content   string           `json:"content,omitempty"`
	ToolCalls []ollamaToolCall `json:"tool_calls,omitempty"`
}

type ollamaRequest struct {
	Model     string                 `json:"model"`
	Messages  []ollamaMessage        `json:"messages"`
	Tools     []ollamaTool           `json:"tools,omitempty"`
	Stream    bool                   `json:"stream"`
	KeepAlive string                 `json:"keep_alive,omitempty"`
	Options   map[string]interface{} `json:"options,omitempty"`
}

type ollamaResponse struct {
	Message ollamaMessage `json:"message"`
	Error   string        `json:"error,omitempty"`
}

func (p *ollamaProvider) Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error) {
	outputTokens := responseTokenLimit(ctx)
	trimmed := trimMessages(systemPrompt, messages, outputTokens)
	outMessages := make([]ollamaMessage, 0, len(trimmed)+1)
	if strings.TrimSpace(systemPrompt) != "" {
		outMessages = append(outMessages, ollamaMessage{Role: "system", Content: systemPrompt})
	}
	for _, m := range trimmed {
		om := ollamaMessage{Role: m.Role, Content: m.Content}
		if m.Role == "tool" {
			om.Role = "tool"
		}
		for _, call := range m.ToolCalls {
			oc := ollamaToolCall{}
			oc.Function.Name = call.Name
			oc.Function.Arguments = call.Args
			om.ToolCalls = append(om.ToolCalls, oc)
		}
		outMessages = append(outMessages, om)
	}

	outTools := make([]ollamaTool, 0, len(tools))
	for _, tool := range tools {
		outTools = append(outTools, ollamaTool{Type: "function", Function: ollamaFunction{
			Name: tool.Name, Description: tool.Description, Parameters: tool.Parameters,
		}})
	}

	payload := ollamaRequest{
		Model: p.model, Messages: outMessages, Tools: outTools, Stream: false, KeepAlive: "5m",
		Options: map[string]interface{}{
			"num_ctx":     maxContextTokens,
			"num_predict": outputTokens,
			"temperature": 0.2,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	respBody, _, err := doJSONWithRetry(ctx, p.client, func() (*http.Request, error) {
		req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
		if reqErr == nil {
			req.Header.Set("Content-Type", "application/json")
		}
		return req, reqErr
	})
	if err != nil {
		return nil, fmt.Errorf("ollama request failed: %w", err)
	}

	var decoded ollamaResponse
	if err := json.Unmarshal(respBody, &decoded); err != nil {
		return nil, fmt.Errorf("ollama response parse failed: %w", err)
	}
	if decoded.Error != "" {
		return nil, errors.New(decoded.Error)
	}

	result := &ProviderResponse{Content: decoded.Message.Content, Provider: p.Name(), Model: p.Model()}
	for i, tc := range decoded.Message.ToolCalls {
		result.ToolCalls = append(result.ToolCalls, ToolCall{
			ID: fmt.Sprintf("ollama_call_%d_%d", time.Now().UnixNano(), i), Name: tc.Function.Name, Args: tc.Function.Arguments,
		})
	}
	return result, nil
}

// OpenAI-compatible provider (OpenAI and Grok) -------------------------------

type openAICompatibleProvider struct {
	name     string
	apiKey   string
	endpoint string
	model    string
	client   *http.Client
}

func newOpenAICompatibleProvider(name, apiKey, endpoint, model string) *openAICompatibleProvider {
	return &openAICompatibleProvider{name: name, apiKey: apiKey, endpoint: endpoint, model: model, client: newHTTPClient()}
}

func (p *openAICompatibleProvider) Name() string  { return p.name }
func (p *openAICompatibleProvider) Model() string { return p.model }
func (p *openAICompatibleProvider) Health(ctx context.Context) error {
	if strings.TrimSpace(p.apiKey) == "" {
		return fmt.Errorf("%s API key is not configured", p.name)
	}
	return nil
}

type openAIFunction struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	Parameters  json.RawMessage `json:"parameters"`
}

type openAITool struct {
	Type     string         `json:"type"`
	Function openAIFunction `json:"function"`
}

type openAIFuncCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type openAIToolCall struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Function openAIFuncCall `json:"function"`
}

type openAIMessage struct {
	Role       string           `json:"role"`
	Content    string           `json:"content,omitempty"`
	ToolCallID string           `json:"tool_call_id,omitempty"`
	Name       string           `json:"name,omitempty"`
	ToolCalls  []openAIToolCall `json:"tool_calls,omitempty"`
}

type openAIRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Tools       []openAITool    `json:"tools,omitempty"`
	Temperature float64         `json:"temperature,omitempty"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
}

type openAIResponse struct {
	Choices []struct {
		Message openAIMessage `json:"message"`
	} `json:"choices"`
	Error interface{} `json:"error,omitempty"`
}

func (p *openAICompatibleProvider) Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error) {
	if err := p.Health(ctx); err != nil {
		return nil, err
	}
	outputTokens := responseTokenLimit(ctx)
	trimmed := trimMessages(systemPrompt, messages, outputTokens)
	apiMessages := make([]openAIMessage, 0, len(trimmed)+1)
	if strings.TrimSpace(systemPrompt) != "" {
		apiMessages = append(apiMessages, openAIMessage{Role: "system", Content: systemPrompt})
	}
	for _, m := range trimmed {
		om := openAIMessage{Role: m.Role, Content: m.Content}
		if m.Role == "tool" {
			om.ToolCallID = m.ToolCallID
			om.Name = m.ToolName
		}
		for _, call := range m.ToolCalls {
			args, _ := json.Marshal(call.Args)
			om.ToolCalls = append(om.ToolCalls, openAIToolCall{ID: call.ID, Type: "function", Function: openAIFuncCall{Name: call.Name, Arguments: string(args)}})
		}
		apiMessages = append(apiMessages, om)
	}

	apiTools := make([]openAITool, 0, len(tools))
	for _, t := range tools {
		apiTools = append(apiTools, openAITool{Type: "function", Function: openAIFunction{Name: t.Name, Description: t.Description, Parameters: t.Parameters}})
	}
	payload := openAIRequest{Model: p.model, Messages: apiMessages, Tools: apiTools, Temperature: 0.2, MaxTokens: outputTokens}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	respBody, _, err := doJSONWithRetry(ctx, p.client, func() (*http.Request, error) {
		req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
		if reqErr == nil {
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+p.apiKey)
		}
		return req, reqErr
	})
	if err != nil {
		return nil, fmt.Errorf("%s request failed: %w", p.name, err)
	}

	var decoded openAIResponse
	if err := json.Unmarshal(respBody, &decoded); err != nil {
		return nil, fmt.Errorf("%s response parse failed: %w", p.name, err)
	}
	if len(decoded.Choices) == 0 {
		return nil, fmt.Errorf("%s returned no choices", p.name)
	}
	result := &ProviderResponse{Content: decoded.Choices[0].Message.Content, Provider: p.Name(), Model: p.Model()}
	for _, tc := range decoded.Choices[0].Message.ToolCalls {
		args := map[string]interface{}{}
		if strings.TrimSpace(tc.Function.Arguments) != "" {
			_ = json.Unmarshal([]byte(tc.Function.Arguments), &args)
		}
		result.ToolCalls = append(result.ToolCalls, ToolCall{ID: tc.ID, Name: tc.Function.Name, Args: args})
	}
	return result, nil
}

// Gemini provider ------------------------------------------------------------

type geminiProvider struct {
	apiKey   string
	endpoint string
	model    string
	client   *http.Client
}

func newGeminiProvider(apiKey, endpoint, model string) *geminiProvider {
	if endpoint == "" {
		endpoint = "https://generativelanguage.googleapis.com/v1beta"
	}
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &geminiProvider{apiKey: apiKey, endpoint: strings.TrimRight(endpoint, "/"), model: model, client: newHTTPClient()}
}
func (p *geminiProvider) Name() string  { return "gemini" }
func (p *geminiProvider) Model() string { return p.model }
func (p *geminiProvider) Health(ctx context.Context) error {
	if strings.TrimSpace(p.apiKey) == "" {
		return errors.New("gemini API key is not configured")
	}
	return nil
}

type geminiFunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}
type geminiFunctionResponse struct {
	Name     string                 `json:"name"`
	Response map[string]interface{} `json:"response"`
}
type geminiPart struct {
	Text             string                  `json:"text,omitempty"`
	FunctionCall     *geminiFunctionCall     `json:"functionCall,omitempty"`
	FunctionResponse *geminiFunctionResponse `json:"functionResponse,omitempty"`
}
type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}
type geminiTool struct {
	FunctionDeclarations []struct {
		Name        string          `json:"name"`
		Description string          `json:"description,omitempty"`
		Parameters  json.RawMessage `json:"parameters"`
	} `json:"functionDeclarations"`
}
type geminiRequest struct {
	SystemInstruction *geminiContent         `json:"system_instruction,omitempty"`
	Contents          []geminiContent        `json:"contents"`
	Tools             []geminiTool           `json:"tools,omitempty"`
	GenerationConfig  map[string]interface{} `json:"generationConfig,omitempty"`
}
type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
	Error interface{} `json:"error,omitempty"`
}

func (p *geminiProvider) Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error) {
	if err := p.Health(ctx); err != nil {
		return nil, err
	}
	outputTokens := responseTokenLimit(ctx)
	contents := make([]geminiContent, 0, len(messages))
	for _, m := range trimMessages(systemPrompt, messages, outputTokens) {
		role := "user"
		if m.Role == "assistant" || m.Role == "model" {
			role = "model"
		}
		parts := []geminiPart{}
		if m.Content != "" {
			parts = append(parts, geminiPart{Text: m.Content})
		}
		for _, call := range m.ToolCalls {
			parts = append(parts, geminiPart{FunctionCall: &geminiFunctionCall{Name: call.Name, Args: call.Args}})
		}
		if m.Role == "tool" {
			var result interface{}
			if err := json.Unmarshal([]byte(m.Content), &result); err != nil {
				result = m.Content
			}
			parts = []geminiPart{{FunctionResponse: &geminiFunctionResponse{Name: firstNonEmpty(m.ToolName, m.ToolCallID), Response: map[string]interface{}{"result": result}}}}
			role = "user"
		}
		if len(parts) > 0 {
			contents = append(contents, geminiContent{Role: role, Parts: parts})
		}
	}

	gt := geminiTool{}
	for _, t := range tools {
		gt.FunctionDeclarations = append(gt.FunctionDeclarations, struct {
			Name        string          `json:"name"`
			Description string          `json:"description,omitempty"`
			Parameters  json.RawMessage `json:"parameters"`
		}{Name: t.Name, Description: t.Description, Parameters: t.Parameters})
	}
	payload := geminiRequest{Contents: contents, GenerationConfig: map[string]interface{}{"maxOutputTokens": outputTokens, "temperature": 0.2}}
	if systemPrompt != "" {
		payload.SystemInstruction = &geminiContent{Parts: []geminiPart{{Text: systemPrompt}}}
	}
	if len(gt.FunctionDeclarations) > 0 {
		payload.Tools = []geminiTool{gt}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	url := fmt.Sprintf("%s/models/%s:generateContent?key=%s", p.endpoint, p.model, p.apiKey)
	respBody, _, err := doJSONWithRetry(ctx, p.client, func() (*http.Request, error) {
		req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
		if reqErr == nil {
			req.Header.Set("Content-Type", "application/json")
		}
		return req, reqErr
	})
	if err != nil {
		return nil, fmt.Errorf("gemini request failed: %w", err)
	}
	var decoded geminiResponse
	if err := json.Unmarshal(respBody, &decoded); err != nil {
		return nil, fmt.Errorf("gemini response parse failed: %w", err)
	}
	if len(decoded.Candidates) == 0 {
		return nil, errors.New("gemini returned no candidates")
	}
	result := &ProviderResponse{Provider: p.Name(), Model: p.Model()}
	for i, part := range decoded.Candidates[0].Content.Parts {
		if part.Text != "" {
			if result.Content != "" {
				result.Content += "\n"
			}
			result.Content += part.Text
		}
		if part.FunctionCall != nil {
			result.ToolCalls = append(result.ToolCalls, ToolCall{ID: fmt.Sprintf("gemini_call_%d", i), Name: part.FunctionCall.Name, Args: part.FunctionCall.Args})
		}
	}
	return result, nil
}

// Claude provider ------------------------------------------------------------

type claudeProvider struct {
	apiKey   string
	endpoint string
	model    string
	client   *http.Client
}

func newClaudeProvider(apiKey, endpoint, model string) *claudeProvider {
	if endpoint == "" {
		endpoint = "https://api.anthropic.com/v1/messages"
	}
	if model == "" {
		model = "claude-sonnet-4-6"
	}
	return &claudeProvider{apiKey: apiKey, endpoint: endpoint, model: model, client: newHTTPClient()}
}
func (p *claudeProvider) Name() string  { return "claude" }
func (p *claudeProvider) Model() string { return p.model }
func (p *claudeProvider) Health(ctx context.Context) error {
	if strings.TrimSpace(p.apiKey) == "" {
		return errors.New("claude API key is not configured")
	}
	return nil
}

type claudeTool struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	InputSchema json.RawMessage `json:"input_schema"`
}
type claudeBlock struct {
	Type      string                 `json:"type"`
	Text      string                 `json:"text,omitempty"`
	ID        string                 `json:"id,omitempty"`
	Name      string                 `json:"name,omitempty"`
	Input     map[string]interface{} `json:"input,omitempty"`
	ToolUseID string                 `json:"tool_use_id,omitempty"`
	Content   interface{}            `json:"content,omitempty"`
}
type claudeMessage struct {
	Role    string        `json:"role"`
	Content []claudeBlock `json:"content"`
}
type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	System    string          `json:"system,omitempty"`
	Messages  []claudeMessage `json:"messages"`
	Tools     []claudeTool    `json:"tools,omitempty"`
}
type claudeResponse struct {
	Content []claudeBlock `json:"content"`
}

func (p *claudeProvider) Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error) {
	if err := p.Health(ctx); err != nil {
		return nil, err
	}
	outputTokens := responseTokenLimit(ctx)
	claudeMessages := []claudeMessage{}
	for _, m := range trimMessages(systemPrompt, messages, outputTokens) {
		role := m.Role
		if role == "tool" {
			role = "user"
			claudeMessages = append(claudeMessages, claudeMessage{Role: role, Content: []claudeBlock{{Type: "tool_result", ToolUseID: m.ToolCallID, Content: m.Content}}})
			continue
		}
		blocks := []claudeBlock{}
		if m.Content != "" {
			blocks = append(blocks, claudeBlock{Type: "text", Text: m.Content})
		}
		for _, call := range m.ToolCalls {
			blocks = append(blocks, claudeBlock{Type: "tool_use", ID: call.ID, Name: call.Name, Input: call.Args})
		}
		if len(blocks) > 0 {
			claudeMessages = append(claudeMessages, claudeMessage{Role: role, Content: blocks})
		}
	}
	claudeTools := make([]claudeTool, 0, len(tools))
	for _, t := range tools {
		claudeTools = append(claudeTools, claudeTool{Name: t.Name, Description: t.Description, InputSchema: t.Parameters})
	}
	payload := claudeRequest{Model: p.model, MaxTokens: outputTokens, System: systemPrompt, Messages: claudeMessages, Tools: claudeTools}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	respBody, _, err := doJSONWithRetry(ctx, p.client, func() (*http.Request, error) {
		req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
		if reqErr == nil {
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("x-api-key", p.apiKey)
			req.Header.Set("anthropic-version", "2023-06-01")
		}
		return req, reqErr
	})
	if err != nil {
		return nil, fmt.Errorf("claude request failed: %w", err)
	}
	var decoded claudeResponse
	if err := json.Unmarshal(respBody, &decoded); err != nil {
		return nil, fmt.Errorf("claude response parse failed: %w", err)
	}
	result := &ProviderResponse{Provider: p.Name(), Model: p.Model()}
	for _, block := range decoded.Content {
		switch block.Type {
		case "text":
			if result.Content != "" {
				result.Content += "\n"
			}
			result.Content += block.Text
		case "tool_use":
			result.ToolCalls = append(result.ToolCalls, ToolCall{ID: block.ID, Name: block.Name, Args: block.Input})
		}
	}
	return result, nil
}

// Provider cascade -----------------------------------------------------------

type cascadeProvider struct {
	providers []Provider
}

func newCascadeProvider(providers []Provider) Provider {
	if len(providers) == 1 {
		return providers[0]
	}
	return &cascadeProvider{providers: providers}
}
func (p *cascadeProvider) Name() string {
	if len(p.providers) == 0 {
		return "none"
	}
	return p.providers[0].Name()
}
func (p *cascadeProvider) Model() string {
	if len(p.providers) == 0 {
		return ""
	}
	return p.providers[0].Model()
}
func (p *cascadeProvider) Health(ctx context.Context) error {
	var errs []string
	for _, provider := range p.providers {
		if err := provider.Health(ctx); err == nil {
			return nil
		} else {
			errs = append(errs, provider.Name()+": "+err.Error())
		}
	}
	return errors.New(strings.Join(errs, "; "))
}
func (p *cascadeProvider) Chat(ctx context.Context, systemPrompt string, messages []Message, tools []ToolDef) (*ProviderResponse, error) {
	var errs []string
	for _, provider := range p.providers {
		resp, err := provider.Chat(ctx, systemPrompt, messages, tools)
		if err == nil {
			return resp, nil
		}
		errs = append(errs, provider.Name()+": "+err.Error())
	}
	return nil, fmt.Errorf("all configured AI providers failed: %s", strings.Join(errs, " | "))
}

func NewProviderFromConfig(cfg ProviderConfig) (Provider, error) {
	name := strings.ToLower(strings.TrimSpace(cfg.Name))
	switch name {
	case "openrouter", "local":
		if cfg.Endpoint == "" {
			cfg.Endpoint = "https://openrouter.ai/api/v1/chat/completions"
		}
		if cfg.Model == "" {
			cfg.Model = "google/gemini-2.5-flash"
		}
		return newOpenAICompatibleProvider("openrouter", cfg.APIKey, cfg.Endpoint, cfg.Model), nil
	case "openai":
		if cfg.Endpoint == "" {
			cfg.Endpoint = "https://api.openai.com/v1/chat/completions"
		}
		if cfg.Model == "" {
			cfg.Model = "gpt-4o-mini"
		}
		return newOpenAICompatibleProvider("openai", cfg.APIKey, cfg.Endpoint, cfg.Model), nil
	case "grok", "xai":
		if cfg.Endpoint == "" {
			cfg.Endpoint = "https://api.x.ai/v1/chat/completions"
		}
		if cfg.Model == "" {
			cfg.Model = "grok-4.3"
		}
		return newOpenAICompatibleProvider("grok", cfg.APIKey, cfg.Endpoint, cfg.Model), nil
	case "deepseek":
		if cfg.Endpoint == "" {
			cfg.Endpoint = "https://api.deepseek.com/v1/chat/completions"
		}
		if cfg.Model == "" {
			cfg.Model = "deepseek-chat"
		}
		return newOpenAICompatibleProvider("deepseek", cfg.APIKey, cfg.Endpoint, cfg.Model), nil
	case "gemini":
		return newGeminiProvider(cfg.APIKey, cfg.Endpoint, cfg.Model), nil
	case "claude", "anthropic":
		return newClaudeProvider(cfg.APIKey, cfg.Endpoint, cfg.Model), nil
	default:
		return nil, fmt.Errorf("unknown AI provider: %s", cfg.Name)
	}
}

// Backwards-compatible constructor retained for older call sites.
func NewProvider(providerName, apiKey string) (Provider, error) {
	return NewProviderFromConfig(ProviderConfig{Name: providerName, APIKey: apiKey})
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return "tool"
}
