package graph

import (
	"context"
	"encoding/json"
	"log"

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
		"summary":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"currentValue": &graphql.Field{Type: graphql.String},
		"newValue":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var agentResponseType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AgentResponse",
	Fields: graphql.Fields{
		"message":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"proposals": &graphql.Field{Type: graphql.NewList(proposedChangeType)},
	},
})

var proposalResponseType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ProposalResponse",
	Fields: graphql.Fields{
		"message":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"proposals": &graphql.Field{Type: graphql.NewList(proposedChangeType)},
	},
})

var applyResultType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ApplyResult",
	Fields: graphql.Fields{
		"success": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"message": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func getProviderForUser(ctx context.Context, userID string) (ai.Provider, *ai.AIKeySet, string, error) {
	_, plan, err := AppContainer.SubscriptionRepo.GetUserSubscription(ctx, userID)
	planName := subscriptions.PlanFree
	if err == nil && plan != nil {
		planName = plan.Name
	}

	aiKeys := &ai.AIKeySet{
		GeminiAPIKey: AppContainer.GeminiAPIKey,
		OpenAIAPIKey: AppContainer.OpenAIAPIKey,
		ClaudeAPIKey: AppContainer.ClaudeAPIKey,
	}

	provider, err := ai.ProviderForPlan(planName, aiKeys)
	if err != nil {
		return nil, nil, "", err
	}
	return provider, aiKeys, planName, nil
}

func init() {
	rootMutation.AddFieldConfig("executeAgentQuery", &graphql.Field{
		Type: agentResponseType,
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"prompt":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return map[string]interface{}{"message": "Server not initialized"}, nil
			}

			userID := p.Args["userId"].(string)
			businessID := p.Args["businessId"].(string)
			prompt := p.Args["prompt"].(string)

			biz, err := AppContainer.BusinessRepo.GetByIDAndUser(p.Context, businessID, userID)
			if err != nil {
				return map[string]interface{}{"message": "Business not found or access denied"}, nil
			}
			if biz == nil {
				return map[string]interface{}{"message": "Business not found"}, nil
			}

			provider, keys, _, err := getProviderForUser(p.Context, userID)
			if err != nil {
				log.Printf("Agent provider error for user %s: %v", userID, err)
				return map[string]interface{}{
					"message": "AI service not available for your plan.",
				}, nil
			}
			_ = keys

			tools := ai.NewToolRegistry(AppContainer.BusinessRepo, AppContainer.FileHandler)
			agent := ai.NewAgent(provider, tools, userID, businessID)
			response, err := agent.Execute(p.Context, prompt)
			if err != nil {
				log.Printf("Agent execution error for user %s: %v", userID, err)
				return map[string]interface{}{
					"message": "I encountered an error processing your request. Please try again.",
				}, nil
			}

			return map[string]interface{}{"message": response, "proposals": nil}, nil
		},
	})

	rootMutation.AddFieldConfig("proposeAgentAction", &graphql.Field{
		Type: proposalResponseType,
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"prompt":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"domain":     &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return map[string]interface{}{"message": "Server not initialized", "proposals": nil}, nil
			}

			userID := p.Args["userId"].(string)
			businessID := p.Args["businessId"].(string)
			prompt := p.Args["prompt"].(string)
			domain, _ := p.Args["domain"].(string)

			biz, err := AppContainer.BusinessRepo.GetByIDAndUser(p.Context, businessID, userID)
			if err != nil {
				return map[string]interface{}{"message": "Business not found or access denied", "proposals": nil}, nil
			}
			if biz == nil {
				return map[string]interface{}{"message": "Business not found", "proposals": nil}, nil
			}

			provider, _, _, err := getProviderForUser(p.Context, userID)
			if err != nil {
				log.Printf("Propose provider error for user %s: %v", userID, err)
				return map[string]interface{}{
					"message": "AI service not available for your plan.",
					"proposals": nil,
				}, nil
			}

			extraCtx := map[string]string{}
			if domain == "website" && AppContainer.WebsiteRepo != nil {
				website, _ := AppContainer.WebsiteRepo.GetWebsiteByBusiness(p.Context, businessID)
				if website != nil {
					extraCtx["websiteData"] = website.Pages
				}
				templates, _ := AppContainer.WebsiteRepo.ListTemplates(p.Context)
				if len(templates) > 0 {
					tplJSON, _ := json.Marshal(templates)
					extraCtx["websiteTemplates"] = string(tplJSON)
				}
			}

			proposal, err := ai.ProposeChanges(p.Context, provider, biz, prompt, domain, extraCtx)
			if err != nil {
				log.Printf("Propose error for user %s: %v", userID, err)
				return map[string]interface{}{
					"message": "I encountered an error processing your request.",
					"proposals": nil,
				}, nil
			}

			return map[string]interface{}{
				"message":   proposal.Message,
				"proposals": proposal.Changes,
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
			changesJSON := p.Args["changes"].(string)

			var changes []ai.ProposedChange
			if err := json.Unmarshal([]byte(changesJSON), &changes); err != nil {
				return map[string]interface{}{"success": false, "message": "Invalid changes format"}, nil
			}

			msg, err := ai.ApplyChanges(p.Context, AppContainer.BusinessRepo, userID, businessID, changes)
			if err != nil {
				log.Printf("Apply error for user %s: %v", userID, err)
				return map[string]interface{}{"success": false, "message": err.Error()}, nil
			}

			return map[string]interface{}{"success": true, "message": msg}, nil
		},
	})
}
