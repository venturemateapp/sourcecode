package ai

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/subscriptions"
)

type Agent struct {
	provider   Provider
	tools      *ToolRegistry
	userID     string
	businessID string
}

type AIKeySet struct {
	GeminiAPIKey string
	OpenAIAPIKey string
	ClaudeAPIKey string
}

type ProposedChange struct {
	ID           string `json:"id"`
	Type         string `json:"type"`
	Field        string `json:"field,omitempty"`
	Summary      string `json:"summary"`
	CurrentValue string `json:"currentValue,omitempty"`
	NewValue     string `json:"newValue"`
}

type Proposal struct {
	Message string           `json:"message"`
	Changes []ProposedChange `json:"changes"`
}

func ProviderForPlan(planName string, keys *AIKeySet) (Provider, error) {
	switch planName {
	case subscriptions.PlanFree:
		if keys.GeminiAPIKey == "" {
			return nil, fmt.Errorf("Gemini API key not configured for free plan")
		}
		return NewProvider("gemini", keys.GeminiAPIKey)
	case subscriptions.PlanPro:
		if keys.OpenAIAPIKey == "" {
			if keys.GeminiAPIKey != "" {
				return NewProvider("gemini", keys.GeminiAPIKey)
			}
			return nil, fmt.Errorf("OpenAI API key not configured for pro plan")
		}
		return NewProvider("openai", keys.OpenAIAPIKey)
	case subscriptions.PlanProPlus:
		if keys.ClaudeAPIKey == "" {
			if keys.OpenAIAPIKey != "" {
				return NewProvider("openai", keys.OpenAIAPIKey)
			}
			if keys.GeminiAPIKey != "" {
				return NewProvider("gemini", keys.GeminiAPIKey)
			}
			return nil, fmt.Errorf("no AI API keys configured")
		}
		return NewProvider("claude", keys.ClaudeAPIKey)
	default:
		if keys.GeminiAPIKey != "" {
			return NewProvider("gemini", keys.GeminiAPIKey)
		}
		return nil, fmt.Errorf("unknown plan %s and no API keys configured", planName)
	}
}

func NewAgent(provider Provider, tools *ToolRegistry, userID, businessID string) *Agent {
	return &Agent{
		provider:   provider,
		tools:      tools,
		userID:     userID,
		businessID: businessID,
	}
}

func (a *Agent) Execute(ctx context.Context, prompt string) (string, error) {
	systemPrompt := `You are VentureMate AI, a helpful startup assistant integrated into the VentureMate platform.

You have access to tools that can:
- Get business information
- Update business fields (name, description, industry, stage, pitchDeck, businessPlan, brandKit, etc.)
- List businesses

When a user asks you to change or add something, use the appropriate tool.
If you need to know the current state before making changes, use getBusinessInfo first.
Always confirm what you've done to the user.

Current business context: userID=` + a.userID + `, businessID=` + a.businessID

	toolDefs := a.tools.GetDefs()

	var conversation []Message
	conversation = append(conversation, Message{Role: "user", Content: prompt})

	maxIterations := 5
	for i := 0; i < maxIterations; i++ {
		resp, err := a.provider.Chat(ctx, systemPrompt, conversation, toolDefs)
		if err != nil {
			return "", fmt.Errorf("agent chat error: %w", err)
		}

		if len(resp.ToolCalls) == 0 {
			return resp.Content, nil
		}

		assistantMsg := Message{Role: "assistant", Content: resp.Content}
		conversation = append(conversation, assistantMsg)

		for _, tc := range resp.ToolCalls {
			result, err := a.tools.Execute(ctx, a.userID, tc)
			if err != nil {
				result = fmt.Sprintf(`{"error": "tool execution failed: %s"}`, err.Error())
			}
			conversation = append(conversation, Message{
				Role:       "tool",
				ToolCallID: tc.ID,
				Content:    result,
			})
		}
	}

	return "I've completed the requested operations. Is there anything else you'd like me to help with?", nil
}

func UserPlanProvider(planName string, keys *AIKeySet, bizRepo *businesses.Repository, fh *FileHandler) (Provider, *ToolRegistry, error) {
	provider, err := ProviderForPlan(planName, keys)
	if err != nil {
		return nil, nil, err
	}
	tools := NewToolRegistry(bizRepo, fh)
	return provider, tools, nil
}

func ProposeChanges(ctx context.Context, provider Provider, biz *businesses.Business, prompt, domain string, extraContext map[string]string) (*Proposal, error) {
	bizJSON, _ := json.MarshalIndent(biz, "", "  ")

	extra := ""
	if ec, ok := extraContext["websiteData"]; ok && ec != "" {
		extra = "\n\nWebsite context:\n" + ec
	}
	if ec, ok := extraContext["websiteTemplates"]; ok && ec != "" {
		extra += "\n\nAvailable website templates:\n" + ec
	}

	websiteDomainInstr := ""
	if domain == "website" {
		websiteDomainInstr = `
Website-specific rules:
- You can propose adding, removing, or reordering sections on any page
- Available section types: hero, features, pricing, testimonials, cta, team, faq, stats, contact, text, image, video
- Each section has a "type" and "props" object
- For website changes, field should be "websiteConfig" and newValue should be the full JSON of the entire website structure
- You can suggest picking a template or customizing the existing design
- Users can change colors, fonts, layout, and content
`
	}

	systemPrompt := fmt.Sprintf(`You are VentureMate AI, a startup assistant integrated into the VentureMate platform.
You are currently helping the user on the "%s" page/section.

Below is the current state of this business in JSON format:
%s%s

The user will make a request. Your job is to:
1. Understand what they want
2. Propose specific, concrete changes
3. Return ONLY valid JSON (no markdown, no extra text)

Response format:
{
  "message": "Your friendly response to the user explaining what you propose",
  "changes": [
    {
      "id": "1",
      "type": "update",
      "field": "name",
      "summary": "Change business name from 'OldCo' to 'NewCo'",
      "currentValue": "OldCo",
      "newValue": "NewCo"
    }
  ]
}

Rules:
- type must be one of: "update", "create", "delete"
- For "update": field is the business field name (name, tagline, description, industry, stage, location, website, brandKit, pitchDeck, businessPlan, milestones, team, documents, websiteConfig, financials, metrics)
- For "create" or "delete": field can be empty or describe the entity
- If the user is just asking a question or discussing (not requesting changes), return "changes": []
- Be specific about what you want to change — show current and new values
- For JSON fields (brandKit, pitchDeck, websiteConfig, etc.), newValue should be the full JSON string
- Only propose changes the user explicitly asked for%s`, domain, string(bizJSON), extra, websiteDomainInstr)

	conversation := []Message{
		{Role: "user", Content: prompt},
	}

	resp, err := provider.Chat(ctx, systemPrompt, conversation, nil)
	if err != nil {
		return nil, fmt.Errorf("propose chat error: %w", err)
	}

	var proposal Proposal
	if err := json.Unmarshal([]byte(resp.Content), &proposal); err != nil {
		return &Proposal{
			Message: resp.Content,
			Changes: nil,
		}, nil
	}

	return &proposal, nil
}

func ApplyChanges(ctx context.Context, repo *businesses.Repository, userID, businessID string, changes []ProposedChange) (string, error) {
	biz, err := repo.GetByIDAndUser(ctx, businessID, userID)
	if err != nil {
		return "", fmt.Errorf("business not found or access denied: %w", err)
	}

	applied := 0
	for _, ch := range changes {
		switch ch.Type {
		case "update":
			switch ch.Field {
			case "name":
				biz.Name = ch.NewValue
			case "tagline":
				biz.Tagline = ch.NewValue
			case "description":
				biz.Description = ch.NewValue
			case "industry":
				biz.Industry = ch.NewValue
			case "stage":
				biz.Stage = ch.NewValue
			case "location":
				biz.Location = ch.NewValue
			case "website":
				biz.Website = ch.NewValue
			case "brandKit":
				biz.BrandKit = ch.NewValue
			case "pitchDeck":
				biz.PitchDeck = ch.NewValue
			case "businessPlan":
				biz.BusinessPlan = ch.NewValue
			case "milestones":
				biz.Milestones = ch.NewValue
			case "team":
				biz.Team = ch.NewValue
			case "documents":
				biz.Documents = ch.NewValue
			case "financials":
				biz.Financials = ch.NewValue
			case "metrics":
				biz.Metrics = ch.NewValue
			default:
				return "", fmt.Errorf("unknown field: %s", ch.Field)
			}
			applied++
		case "delete":
			return "", fmt.Errorf("delete operations not yet supported via agent")
		default:
			return "", fmt.Errorf("unknown change type: %s", ch.Type)
		}
	}

	if applied == 0 {
		return "No changes to apply", nil
	}

	if err := repo.Update(ctx, biz); err != nil {
		return "", fmt.Errorf("failed to apply changes: %w", err)
	}

	return fmt.Sprintf("Successfully applied %d change(s)", applied), nil
}
