package graph

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/ai"
	"github.com/venturemate/vmbackend/internal/subscriptions"
)

var proposedChangeType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ProposedChange",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"type":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"field":        &graphql.Field{Type: graphql.String},
		"domain":       &graphql.Field{Type: graphql.String},
		"summary":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"currentValue": &graphql.Field{Type: graphql.String},
		"newValue":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var agentOperationType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AgentOperation",
	Fields: graphql.Fields{
		"tool":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"success": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"result":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var agentResponseType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AgentResponse",
	Fields: graphql.Fields{
		"message":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"provider":     &graphql.Field{Type: graphql.String},
		"model":        &graphql.Field{Type: graphql.String},
		"operations":   &graphql.Field{Type: graphql.NewList(agentOperationType)},
		"proposals":    &graphql.Field{Type: graphql.NewList(proposedChangeType)},
		"inputTokens":  &graphql.Field{Type: graphql.Int},
		"outputTokens": &graphql.Field{Type: graphql.Int},
		"totalTokens":  &graphql.Field{Type: graphql.Int},
	},
})

var proposalResponseType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ProposalResponse",
	Fields: graphql.Fields{
		"message":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"provider":     &graphql.Field{Type: graphql.String},
		"model":        &graphql.Field{Type: graphql.String},
		"proposals":    &graphql.Field{Type: graphql.NewList(proposedChangeType)},
		"inputTokens":  &graphql.Field{Type: graphql.Int},
		"outputTokens": &graphql.Field{Type: graphql.Int},
		"totalTokens":  &graphql.Field{Type: graphql.Int},
	},
})

var applyResultType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ApplyResult",
	Fields: graphql.Fields{
		"success": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"message": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var aiProviderInfoType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AIProviderInfo",
	Fields: graphql.Fields{
		"name":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"model":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"endpoint":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"configured": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"available":  &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"isDefault":  &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"message":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var aiProviderStatusType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AIProviderStatus",
	Fields: graphql.Fields{
		"activeProvider": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"allowOverride":  &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"providers":      &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiProviderInfoType)))},
	},
})

func providerManager() *ai.ProviderManager {
	if AppContainer != nil && AppContainer.AIManager != nil {
		return AppContainer.AIManager
	}
	return ai.NewProviderManagerFromEnv()
}

func getProviderForUser(_ context.Context, _ string, requested string) (ai.Provider, error) {
	return providerManager().Resolve(requested)
}

func fullAgentTools() *ai.ToolRegistry {
	return ai.NewFullToolRegistry(ai.ToolDependencies{
		BusinessRepo:    AppContainer.BusinessRepo,
		DomainRepo:      AppContainer.DomainRepo,
		WebsiteRepo:     AppContainer.WebsiteRepo,
		BankAccountRepo: AppContainer.BankAccountRepo,
		InvoiceRepo:     AppContainer.InvoiceRepo,
		InvestorRepo:    AppContainer.InvestorRepo,
		FileHandler:     AppContainer.FileHandler,
		RecraftClient:   AppContainer.RecraftClient,
	})
}

func parseAgentHistory(raw string) []ai.Message {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	var history []ai.Message
	if err := json.Unmarshal([]byte(raw), &history); err != nil {
		return nil
	}
	if len(history) > 20 {
		history = history[len(history)-20:]
	}
	return history
}

var generationStatusType = graphql.NewObject(graphql.ObjectConfig{
	Name: "GenerationStatus",
	Fields: graphql.Fields{
		"step":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"message":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"progress":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"error":     &graphql.Field{Type: graphql.String},
		"updatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"done":      &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
	},
})

func init() {
	rootQuery.AddFieldConfig("generationStatus", &graphql.Field{
		Type: generationStatusType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			businessID := p.Args["businessId"].(string)
			s := ai.GetGenerationStatus(businessID)
			if s == nil {
				return map[string]interface{}{"step": "idle", "message": "No active generation", "progress": 0, "done": false, "updatedAt": ""}, nil
			}
			return map[string]interface{}{
				"step": s.Step, "message": s.Message, "progress": s.Progress,
				"error": s.Error, "done": s.Done, "updatedAt": s.UpdatedAt.Format(time.RFC3339),
			}, nil
		},
	})

	rootQuery.AddFieldConfig("aiProviderStatus", &graphql.Field{
		Type: aiProviderStatusType,
		Args: graphql.FieldConfigArgument{
			"checkHealth": &graphql.ArgumentConfig{Type: graphql.Boolean, DefaultValue: false},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			manager := providerManager()
			checkHealth, _ := p.Args["checkHealth"].(bool)
			return map[string]interface{}{
				"activeProvider": manager.ActiveProvider(),
				"allowOverride":  manager.AllowOverride(),
				"providers":      manager.Status(p.Context, checkHealth),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("executeAgentQuery", &graphql.Field{
		Type: agentResponseType,
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"prompt":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"domain":     &graphql.ArgumentConfig{Type: graphql.String},
			"provider":   &graphql.ArgumentConfig{Type: graphql.String},
			"history":    &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return map[string]interface{}{"message": "Server not initialized"}, nil
			}
			userID := p.Args["userId"].(string)
			businessID := p.Args["businessId"].(string)
			prompt := p.Args["prompt"].(string)
			domain, _ := p.Args["domain"].(string)
			requestedProvider, _ := p.Args["provider"].(string)
			historyRaw, _ := p.Args["history"].(string)

			biz, err := AppContainer.BusinessRepo.GetByIDAndUser(p.Context, businessID, userID)
			if err != nil || biz == nil {
				return map[string]interface{}{"message": "Business not found or access denied"}, nil
			}

			// Check AI token quota
			sub, _, err := AppContainer.SubscriptionRepo.GetUserSubscription(p.Context, userID)
			if sub != nil && sub.Plan != nil {
				period := subscriptions.BillingPeriod(time.Now())
				if quotaErr := AppContainer.PlanEnforcer.CheckAITokenQuota(p.Context, userID, sub.Plan.Name, period, 1); quotaErr != nil {
					return map[string]interface{}{"message": fmt.Sprintf("AI token quota exceeded. %v", quotaErr)}, nil
				}
			}

			provider, err := getProviderForUser(p.Context, userID, requestedProvider)
			if err != nil {
				log.Printf("AI provider error for user %s: %v", userID, err)
				return map[string]interface{}{"message": "AI service is unavailable. Verify your OpenRouter API key and try again."}, nil
			}
			userName := biz.UserID
			if user, uErr := AppContainer.UserRepo.FindByID(p.Context, userID); uErr == nil && user != nil {
				userName = user.FirstName + " " + user.Surname
			}
			agent := ai.NewDomainAgentWithContext(provider, fullAgentTools(), userID, businessID, biz.Name, userName, domain)
			result, err := agent.ExecuteWithHistory(p.Context, prompt, parseAgentHistory(historyRaw))
			if err != nil {
				log.Printf("Agent execution error for user %s: %v", userID, err)
				return map[string]interface{}{"message": "I could not complete that request. Check the AI provider connection and try again."}, nil
			}
			// Track token usage
			if sub != nil && sub.Plan != nil && result != nil && result.TotalTokens > 0 {
				period := subscriptions.BillingPeriod(time.Now())
				_ = AppContainer.UsageRepo.IncrementAITokens(p.Context, userID, period, int64(result.TotalTokens))
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("proposeAgentAction", &graphql.Field{
		Type: proposalResponseType,
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"prompt":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"domain":     &graphql.ArgumentConfig{Type: graphql.String},
			"provider":   &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return map[string]interface{}{"message": "Server not initialized", "proposals": nil}, nil
			}
			userID := p.Args["userId"].(string)
			businessID := p.Args["businessId"].(string)
			prompt := p.Args["prompt"].(string)
			domain, _ := p.Args["domain"].(string)
			requestedProvider, _ := p.Args["provider"].(string)

			biz, err := AppContainer.BusinessRepo.GetByIDAndUser(p.Context, businessID, userID)
			if err != nil || biz == nil {
				return map[string]interface{}{"message": "Business not found or access denied", "proposals": nil}, nil
			}

			// Check AI token quota
			sub, _, err := AppContainer.SubscriptionRepo.GetUserSubscription(p.Context, userID)
			if sub != nil && sub.Plan != nil {
				period := subscriptions.BillingPeriod(time.Now())
				if quotaErr := AppContainer.PlanEnforcer.CheckAITokenQuota(p.Context, userID, sub.Plan.Name, period, 1); quotaErr != nil {
					return map[string]interface{}{"message": fmt.Sprintf("AI token quota exceeded. %v", quotaErr), "proposals": nil}, nil
				}
			}

			provider, err := getProviderForUser(p.Context, userID, requestedProvider)
			if err != nil {
				return map[string]interface{}{"message": "AI service is unavailable.", "proposals": nil}, nil
			}

			extraCtx := map[string]string{}
			if AppContainer.DomainRepo != nil && strings.TrimSpace(domain) != "" {
				if data, _ := AppContainer.DomainRepo.Get(p.Context, businessID, aiDomainName(domain)); data != nil {
					extraCtx["current module data"] = data.Data
				}
			}
			if aiDomainName(domain) == "website" && AppContainer.WebsiteRepo != nil {
				if website, _ := AppContainer.WebsiteRepo.GetWebsiteByBusiness(p.Context, businessID); website != nil {
					b, _ := json.Marshal(website)
					extraCtx["website data"] = string(b)
				}
				if templates, _ := AppContainer.WebsiteRepo.ListTemplates(p.Context); len(templates) > 0 {
					b, _ := json.Marshal(templates)
					extraCtx["available website templates"] = string(b)
				}
			}

			proposal, err := ai.ProposeChanges(p.Context, provider, biz, prompt, domain, extraCtx, AppContainer.RecraftClient)
			if err != nil {
				log.Printf("Propose error for user %s: %v", userID, err)
				return map[string]interface{}{"message": "I encountered an error processing your request.", "proposals": nil}, nil
			}
			// Track token usage
			if sub != nil && sub.Plan != nil && proposal != nil && proposal.TotalTokens > 0 {
				period := subscriptions.BillingPeriod(time.Now())
				_ = AppContainer.UsageRepo.IncrementAITokens(p.Context, userID, period, int64(proposal.TotalTokens))
			}
			return map[string]interface{}{
				"message":      proposal.Message,
				"provider":     proposal.Provider,
				"model":        proposal.Model,
				"proposals":    proposal.Changes,
				"inputTokens":  proposal.InputTokens,
				"outputTokens": proposal.OutputTokens,
				"totalTokens":  proposal.TotalTokens,
			}, nil
		},
	})

	rootMutation.AddFieldConfig("applyAgentProposal", &graphql.Field{
		Type: applyResultType,
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"changes":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return map[string]interface{}{"success": false, "message": "Server not initialized"}, nil
			}
			userID := p.Args["userId"].(string)
			businessID := p.Args["businessId"].(string)
			var changes []ai.ProposedChange
			if err := json.Unmarshal([]byte(p.Args["changes"].(string)), &changes); err != nil {
				return map[string]interface{}{"success": false, "message": "Invalid changes format"}, nil
			}
			msg, err := ai.ApplyChangesWithDependencies(p.Context, ai.ApplyDependencies{BusinessRepo: AppContainer.BusinessRepo, DomainRepo: AppContainer.DomainRepo, WebsiteRepo: AppContainer.WebsiteRepo}, userID, businessID, changes)
			if err != nil {
				log.Printf("Apply error for user %s: %v", userID, err)
				return map[string]interface{}{"success": false, "message": err.Error()}, nil
			}
			return map[string]interface{}{"success": true, "message": msg}, nil
		},
	})
}

func aiDomainName(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "_", "-")
	value = strings.ReplaceAll(value, " ", "-")
	if value == "website-builder" || value == "websites" {
		return "website"
	}
	return value
}
