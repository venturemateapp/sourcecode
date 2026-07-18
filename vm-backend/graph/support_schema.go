package graph

import (
	"github.com/graphql-go/graphql"
)

var supportMessageType = graphql.NewObject(graphql.ObjectConfig{
	Name: "SupportMessage",
	Fields: graphql.Fields{
		"id":        &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"sessionId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"role":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"content":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var supportSessionType = graphql.NewObject(graphql.ObjectConfig{
	Name: "SupportSession",
	Fields: graphql.Fields{
		"id":             &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":         &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"subject":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdByName":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdByEmail": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"summary":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var supportChatResultType = graphql.NewObject(graphql.ObjectConfig{
	Name: "SupportChatResult",
	Fields: graphql.Fields{
		"message":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"sessionId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"isEscalated": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
	},
})

func init() {
	rootQuery.AddFieldConfig("supportSessions", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(supportSessionType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.SupportService == nil {
				return []interface{}{}, nil
			}
			sessions, err := AppContainer.SupportService.GetSessions(p.Context)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(sessions))
			for i, s := range sessions {
				result[i] = map[string]interface{}{
					"id":             s.ID,
					"userId":         s.UserID,
					"subject":        s.Subject,
					"status":         s.Status,
					"createdByName":  s.CreatedByName,
					"createdByEmail": s.CreatedByEmail,
					"summary":        s.Summary,
					"createdAt":      s.CreatedAt.Format("2006-01-02T15:04:05Z"),
					"updatedAt":      s.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("supportSessionMessages", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(supportMessageType))),
		Args: graphql.FieldConfigArgument{
			"sessionId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.SupportService == nil {
				return []interface{}{}, nil
			}
			sessionID := p.Args["sessionId"].(string)
			messages, err := AppContainer.SupportService.GetMessages(p.Context, sessionID)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(messages))
			for i, m := range messages {
				result[i] = map[string]interface{}{
					"id":        m.ID,
					"sessionId": m.SessionID,
					"role":      m.Role,
					"content":   m.Content,
					"createdAt": m.CreatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("mySupportSessions", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(supportSessionType))),
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.SupportService == nil {
				return []interface{}{}, nil
			}
			userID := p.Args["userId"].(string)
			sessions, err := AppContainer.SupportService.GetUserSessions(p.Context, userID)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(sessions))
			for i, s := range sessions {
				result[i] = map[string]interface{}{
					"id":             s.ID,
					"userId":         s.UserID,
					"subject":        s.Subject,
					"status":         s.Status,
					"createdByName":  s.CreatedByName,
					"createdByEmail": s.CreatedByEmail,
					"summary":        s.Summary,
					"createdAt":      s.CreatedAt.Format("2006-01-02T15:04:05Z"),
					"updatedAt":      s.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("supportChat", &graphql.Field{
		Type: supportChatResultType,
		Args: graphql.FieldConfigArgument{
			"userId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"email":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"prompt":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"sessionId": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.SupportService == nil {
				return nil, nil
			}
			userID := p.Args["userId"].(string)
			name, _ := p.Args["name"].(string)
			emailAddr, _ := p.Args["email"].(string)
			prompt, _ := p.Args["prompt"].(string)
			sessionID, _ := p.Args["sessionId"].(string)

			result, err := AppContainer.SupportService.Chat(p.Context, userID, name, emailAddr, prompt, sessionID)
			if err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"message":    result.Message,
				"sessionId":  result.SessionID,
				"isEscalated": result.IsEscalated,
			}, nil
		},
	})

	rootMutation.AddFieldConfig("supportEscalate", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"userId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"sessionId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.SupportService == nil {
				return false, nil
			}
			userID := p.Args["userId"].(string)
			sessionID := p.Args["sessionId"].(string)
			err := AppContainer.SupportService.Escalate(p.Context, sessionID, userID)
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("adminSupportReply", &graphql.Field{
		Type: supportMessageType,
		Args: graphql.FieldConfigArgument{
			"sessionId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"content":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.SupportService == nil {
				return nil, nil
			}
			sessionID := p.Args["sessionId"].(string)
			content := p.Args["content"].(string)

			msg, err := AppContainer.SupportService.AdminReply(p.Context, sessionID, content)
			if err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id":        msg.ID,
				"sessionId": msg.SessionID,
				"role":      msg.Role,
				"content":   msg.Content,
				"createdAt": msg.CreatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})
}
