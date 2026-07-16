package graph

import (
	"github.com/graphql-go/graphql"
)

var chatConversationType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ChatConversation",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":  &graphql.Field{Type: graphql.ID},
		"userId":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"subject":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"senderName":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"senderEmail": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"lastMessage": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var chatMessageType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ChatMessage",
	Fields: graphql.Fields{
		"id":             &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"conversationId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"senderId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"content":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("chatConversations", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(chatConversationType))),
		Args: graphql.FieldConfigArgument{
			"userId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"isAdmin": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Boolean)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.ChatRepo == nil {
				return []interface{}{}, nil
			}
			convos, err := AppContainer.ChatRepo.GetConversations(p.Context, p.Args["userId"].(string), p.Args["isAdmin"].(bool))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(convos))
			for i, cv := range convos {
				bizID := &cv.BusinessID
				result[i] = map[string]interface{}{
					"id":          cv.ID,
					"businessId":  bizID,
					"userId":      cv.UserID,
					"subject":     cv.Subject,
					"status":      cv.Status,
					"senderName":  cv.SenderName,
					"senderEmail": cv.SenderEmail,
					"lastMessage": cv.LastMessage,
					"createdAt":   cv.CreatedAt.Format("2006-01-02T15:04:05Z"),
					"updatedAt":   cv.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("chatMessages", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(chatMessageType))),
		Args: graphql.FieldConfigArgument{
			"conversationId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.ChatRepo == nil {
				return []interface{}{}, nil
			}
			messages, err := AppContainer.ChatRepo.GetMessages(p.Context, p.Args["conversationId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(messages))
			for i, m := range messages {
				result[i] = map[string]interface{}{
					"id":             m.ID,
					"conversationId": m.ConversationID,
					"senderId":       m.SenderID,
					"content":        m.Content,
					"createdAt":      m.CreatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})
}
