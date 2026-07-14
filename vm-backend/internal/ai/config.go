package ai

import (
	"context"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

type ProviderInfo struct {
	Name       string `json:"name"`
	Model      string `json:"model"`
	Endpoint   string `json:"endpoint"`
	Configured bool   `json:"configured"`
	Available  bool   `json:"available"`
	IsDefault  bool   `json:"isDefault"`
	Message    string `json:"message"`
}

type ProviderManager struct {
	activeProvider string
	allowOverride  bool
	fallbackOrder  []string
	configs        map[string]ProviderConfig
}

func NewProviderManagerFromEnv() *ProviderManager {
	active := normalizeProviderName(envOr("AI_PROVIDER", "openrouter"))
	fallback := splitCSV(envOr("AI_FALLBACK_PROVIDERS", "openrouter,gemini,openai,claude,grok,deepseek"))
	if len(fallback) == 0 {
		fallback = []string{"openrouter"}
	}

	return &ProviderManager{
		activeProvider: active,
		allowOverride:  envBool("AI_ALLOW_PROVIDER_OVERRIDE", true),
		fallbackOrder:  fallback,
		configs: map[string]ProviderConfig{
			"openrouter": {
				Name:     "openrouter",
				APIKey:   strings.TrimSpace(envOr("OPENROUTER_API_KEY", "")),
				Endpoint: envOr("OPENROUTER_ENDPOINT", "https://openrouter.ai/api/v1/chat/completions"),
				Model:    envOr("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
			},
			"gemini": {
				Name:     "gemini",
				APIKey:   strings.TrimSpace(os.Getenv("GEMINI_API_KEY")),
				Endpoint: envOr("GEMINI_ENDPOINT", "https://generativelanguage.googleapis.com/v1beta"),
				Model:    envOr("GEMINI_MODEL", "gemini-2.5-flash"),
			},
			"openai": {
				Name:     "openai",
				APIKey:   strings.TrimSpace(os.Getenv("OPENAI_API_KEY")),
				Endpoint: envOr("OPENAI_ENDPOINT", "https://api.openai.com/v1/chat/completions"),
				Model:    envOr("OPENAI_MODEL", "gpt-4o-mini"),
			},
			"claude": {
				Name:     "claude",
				APIKey:   strings.TrimSpace(os.Getenv("CLAUDE_API_KEY")),
				Endpoint: envOr("CLAUDE_ENDPOINT", "https://api.anthropic.com/v1/messages"),
				Model:    envOr("CLAUDE_MODEL", "claude-sonnet-4-6"),
			},
			"grok": {
				Name:     "grok",
				APIKey:   strings.TrimSpace(os.Getenv("GROK_API_KEY")),
				Endpoint: envOr("GROK_ENDPOINT", "https://api.x.ai/v1/chat/completions"),
				Model:    envOr("GROK_MODEL", "grok-4.3"),
			},
			"deepseek": {
				Name:     "deepseek",
				APIKey:   strings.TrimSpace(os.Getenv("DEEPSEEK_API_KEY")),
				Endpoint: envOr("DEEPSEEK_ENDPOINT", "https://api.deepseek.com/v1/chat/completions"),
				Model:    envOr("DEEPSEEK_MODEL", "deepseek-chat"),
			},
		},
	}
}

func (m *ProviderManager) ActiveProvider() string {
	if m == nil || m.activeProvider == "" {
		return "openrouter"
	}
	return m.activeProvider
}

func (m *ProviderManager) AllowOverride() bool {
	return m != nil && m.allowOverride
}

func (m *ProviderManager) Resolve(requested string) (Provider, error) {
	if m == nil {
		m = NewProviderManagerFromEnv()
	}

	requested = normalizeProviderName(requested)
	if requested == "" || !m.allowOverride {
		requested = m.ActiveProvider()
	}

	order := uniqueProviders(append([]string{requested, m.ActiveProvider()}, m.fallbackOrder...))
	providers := make([]Provider, 0, len(order))
	var configErrors []string
	for _, name := range order {
		cfg, ok := m.configs[name]
		if !ok {
			continue
		}
		if strings.TrimSpace(cfg.APIKey) == "" {
			continue
		}
		provider, err := NewProviderFromConfig(cfg)
		if err != nil {
			configErrors = append(configErrors, name+": "+err.Error())
			continue
		}
		providers = append(providers, provider)
	}
	if len(providers) == 0 {
		if len(configErrors) > 0 {
			return nil, fmt.Errorf("no usable AI provider: %s", strings.Join(configErrors, "; "))
		}
		return nil, fmt.Errorf("no AI provider is configured; ensure OPENROUTER_API_KEY is set")
	}
	return newCascadeProvider(providers), nil
}

func (m *ProviderManager) Status(ctx context.Context, checkHealth bool) []ProviderInfo {
	if m == nil {
		m = NewProviderManagerFromEnv()
	}
	order := []string{"openrouter", "gemini", "openai", "claude", "grok", "deepseek"}
	infos := make([]ProviderInfo, 0, len(order))
	for _, name := range order {
		cfg := m.configs[name]
		configured := strings.TrimSpace(cfg.APIKey) != ""
		info := ProviderInfo{
			Name:       name,
			Model:      cfg.Model,
			Endpoint:   redactEndpoint(cfg.Endpoint),
			Configured: configured,
			Available:  configured,
			IsDefault:  name == m.ActiveProvider(),
		}
		if !configured {
			info.Message = "API key not configured"
			infos = append(infos, info)
			continue
		}
		if checkHealth {
			provider, err := NewProviderFromConfig(cfg)
			if err != nil {
				info.Available = false
				info.Message = err.Error()
			} else {
				healthCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
				err = provider.Health(healthCtx)
				cancel()
				if err != nil {
					info.Available = false
					info.Message = err.Error()
				} else {
					info.Message = "Ready"
				}
			}
		} else if configured {
			info.Message = "Configured"
		}
		infos = append(infos, info)
	}
	return infos
}

func (m *ProviderManager) TextProvider(requested string) (Provider, error) {
	return m.Resolve(requested)
}

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = normalizeProviderName(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return uniqueProviders(out)
}

func normalizeProviderName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	switch name {
	case "local":
		return "openrouter"
	case "anthropic":
		return "claude"
	case "xai":
		return "grok"
	default:
		return name
	}
}

func uniqueProviders(names []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(names))
	for _, name := range names {
		name = normalizeProviderName(name)
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		out = append(out, name)
	}
	return out
}

func redactEndpoint(endpoint string) string {
	if strings.Contains(endpoint, "?") {
		return strings.Split(endpoint, "?")[0]
	}
	return endpoint
}

func SortedProviderNames(infos []ProviderInfo) []string {
	names := make([]string, 0, len(infos))
	for _, info := range infos {
		if info.Configured {
			names = append(names, info.Name)
		}
	}
	sort.Strings(names)
	return names
}
