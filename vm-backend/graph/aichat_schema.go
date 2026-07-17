package graph

import "github.com/graphql-go/graphql"

var aiChatSessionType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AiChatSession",
	Fields: graphql.Fields{
		"id":         &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":     &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"domain":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"title":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var aiChatMessageType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AiChatMessage",
	Fields: graphql.Fields{
		"id":        &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"sessionId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"role":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"content":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("aiChatSessions", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiChatSessionType))),
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"domain":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.AiChatRepo == nil {
				return []interface{}{}, nil
			}
			sessions, err := AppContainer.AiChatRepo.ListSessions(p.Context,
				p.Args["userId"].(string),
				p.Args["businessId"].(string),
				p.Args["domain"].(string), 20)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(sessions))
			for i, s := range sessions {
				result[i] = map[string]interface{}{
					"id": s.ID, "userId": s.UserID, "businessId": s.BusinessID,
					"domain": s.Domain, "title": s.Title,
					"createdAt": s.CreatedAt.Format("2006-01-02T15:04:05Z"),
					"updatedAt": s.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("aiChatMessages", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiChatMessageType))),
		Args: graphql.FieldConfigArgument{
			"sessionId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"limit":     &graphql.ArgumentConfig{Type: graphql.Int},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.AiChatRepo == nil {
				return []interface{}{}, nil
			}
			limit, _ := p.Args["limit"].(int)
			messages, err := AppContainer.AiChatRepo.GetMessages(p.Context, p.Args["sessionId"].(string), limit)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(messages))
			for i, m := range messages {
				result[i] = map[string]interface{}{
					"id": m.ID, "sessionId": m.SessionID, "role": m.Role,
					"content": m.Content,
					"createdAt": m.CreatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("createAiChatSession", &graphql.Field{
		Type: aiChatSessionType,
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"domain":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"title":      &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.AiChatRepo == nil {
				return nil, nil
			}
			title, _ := p.Args["title"].(string)
			s, err := AppContainer.AiChatRepo.CreateSession(p.Context,
				p.Args["userId"].(string),
				p.Args["businessId"].(string),
				p.Args["domain"].(string), title)
			if err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": s.ID, "userId": s.UserID, "businessId": s.BusinessID,
				"domain": s.Domain, "title": s.Title,
				"createdAt": s.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": s.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("saveAiChatMessage", &graphql.Field{
		Type: aiChatMessageType,
		Args: graphql.FieldConfigArgument{
			"sessionId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"role":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"content":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.AiChatRepo == nil {
				return nil, nil
			}
			m, err := AppContainer.AiChatRepo.AddMessage(p.Context,
				p.Args["sessionId"].(string),
				p.Args["role"].(string),
				p.Args["content"].(string))
			if err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": m.ID, "sessionId": m.SessionID, "role": m.Role,
				"content": m.Content,
				"createdAt": m.CreatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("updateAiChatSessionTitle", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.AiChatRepo == nil {
				return false, nil
			}
			err := AppContainer.AiChatRepo.UpdateSessionTitle(p.Context, p.Args["id"].(string), p.Args["title"].(string))
			return err == nil, err
		},
	})
}
