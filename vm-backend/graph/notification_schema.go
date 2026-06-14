package graph

import (
	"github.com/graphql-go/graphql"
)

var notificationType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Notification",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"type":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"read":        &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"actionUrl":   &graphql.Field{Type: graphql.String},
		"actionLabel": &graphql.Field{Type: graphql.String},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("notifications", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(notificationType))),
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"unreadOnly": &graphql.ArgumentConfig{Type: graphql.Boolean},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []interface{}{}, nil
			}
			userID := p.Args["userId"].(string)
			unreadOnly, _ := p.Args["unreadOnly"].(bool)
			return AppContainer.NotificationRepo.ListByUser(p.Context, userID, unreadOnly)
		},
	})

	rootQuery.AddFieldConfig("unreadNotificationCount", &graphql.Field{
		Type: graphql.NewNonNull(graphql.Int),
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return 0, nil
			}
			userID := p.Args["userId"].(string)
			return AppContainer.NotificationRepo.UnreadCount(p.Context, userID)
		},
	})

	rootMutation.AddFieldConfig("markNotificationRead", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return false, nil
			}
			id := p.Args["id"].(string)
			userID := p.Args["userId"].(string)
			err := AppContainer.NotificationRepo.MarkRead(p.Context, id, userID)
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("markAllNotificationsRead", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return false, nil
			}
			userID := p.Args["userId"].(string)
			err := AppContainer.NotificationRepo.MarkAllRead(p.Context, userID)
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("deleteNotification", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return false, nil
			}
			id := p.Args["id"].(string)
			userID := p.Args["userId"].(string)
			err := AppContainer.NotificationRepo.Delete(p.Context, id, userID)
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("deleteAllReadNotifications", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return false, nil
			}
			userID := p.Args["userId"].(string)
			err := AppContainer.NotificationRepo.DeleteAllRead(p.Context, userID)
			return err == nil, err
		},
	})
}
