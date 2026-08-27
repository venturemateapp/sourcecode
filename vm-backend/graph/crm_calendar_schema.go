package graph

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/crmcalendar"
)

var calendarAccountType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CalendarAccount",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"email":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"provider":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"caldavUrl":    &graphql.Field{Type: graphql.String},
		"syncEnabled":  &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"lastSyncedAt": &graphql.Field{Type: graphql.String},
		"createdAt":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var calendarEventType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CalendarEvent",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"accountId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"uid":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.String},
		"location":    &graphql.Field{Type: graphql.String},
		"startTime":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"endTime":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isAllDay":    &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"status":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"contactId":   &graphql.Field{Type: graphql.ID},
		"companyId":   &graphql.Field{Type: graphql.ID},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("calendarAccounts", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(calendarAccountType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CalendarRepo == nil {
				return []interface{}{}, nil
			}
			accts, err := AppContainer.CalendarRepo.ListAccounts(p.Context, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(accts))
			for i, a := range accts {
				result[i] = map[string]interface{}{
					"id": a.ID, "userId": a.UserID, "businessId": a.BusinessID,
					"email": a.Email, "provider": a.Provider, "caldavUrl": a.CalDAVURL,
					"syncEnabled":  a.SyncEnabled,
					"lastSyncedAt": formatTimePtr(a.LastSyncedAt),
					"createdAt":    a.CreatedAt.Format(time.RFC3339),
					"updatedAt":    a.UpdatedAt.Format(time.RFC3339),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("calendarEvents", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(calendarEventType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"from":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"to":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CalendarRepo == nil {
				return []interface{}{}, nil
			}
			from, _ := time.Parse(time.RFC3339, p.Args["from"].(string))
			to, _ := time.Parse(time.RFC3339, p.Args["to"].(string))
			if from.IsZero() {
				from = time.Now().AddDate(0, -1, 0)
			}
			if to.IsZero() {
				to = time.Now().AddDate(0, 3, 0)
			}
			events, err := AppContainer.CalendarRepo.ListEvents(p.Context, p.Args["businessId"].(string), from, to)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(events))
			for i, e := range events {
				result[i] = map[string]interface{}{
					"id": e.ID, "accountId": e.AccountID, "businessId": e.BusinessID,
					"uid": e.UID, "title": e.Title, "description": e.Description,
					"location": e.Location, "startTime": e.StartTime.Format(time.RFC3339),
					"endTime": e.EndTime.Format(time.RFC3339), "isAllDay": e.IsAllDay,
					"status": e.Status, "contactId": e.ContactID, "companyId": e.CompanyID,
					"createdAt": e.CreatedAt.Format(time.RFC3339),
					"updatedAt": e.UpdatedAt.Format(time.RFC3339),
				}
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("createCalendarAccount", &graphql.Field{
		Type: calendarAccountType,
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"email":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"provider":   &graphql.ArgumentConfig{Type: graphql.String},
			"caldavUrl":  &graphql.ArgumentConfig{Type: graphql.String},
			"username":   &graphql.ArgumentConfig{Type: graphql.String},
			"password":   &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CalendarRepo == nil {
				return nil, nil
			}
			a := &crmcalendar.CalendarAccount{
				UserID:         p.Args["userId"].(string),
				BusinessID:     p.Args["businessId"].(string),
				Email:          p.Args["email"].(string),
				Provider:       getStringArg(p.Args, "provider"),
				CalDAVURL:      getStringArg(p.Args, "caldavUrl"),
				CalDAVUsername: getStringArg(p.Args, "username"),
				CalDAVPassword: getStringArg(p.Args, "password"),
				SyncEnabled:    true,
			}
			if a.Provider == "" {
				a.Provider = "caldav"
			}
			if err := AppContainer.CalendarRepo.CreateAccount(p.Context, a); err != nil {
				return nil, err
			}
			// Trigger initial sync
			go func() {
				syncer := crmcalendar.NewSyncService(AppContainer.CalendarRepo)
				if err := syncer.SyncAccount(context.Background(), a); err != nil {
					log.Printf("Initial calendar sync failed for %s: %v", a.Email, err)
				}
			}()
			return map[string]interface{}{
				"id": a.ID, "userId": a.UserID, "businessId": a.BusinessID,
				"email": a.Email, "provider": a.Provider, "caldavUrl": a.CalDAVURL,
				"syncEnabled": a.SyncEnabled, "lastSyncedAt": nil,
				"createdAt": a.CreatedAt.Format(time.RFC3339),
				"updatedAt": a.UpdatedAt.Format(time.RFC3339),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("deleteCalendarAccount", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CalendarRepo == nil {
				return false, nil
			}
			err := AppContainer.CalendarRepo.DeleteAccount(p.Context, p.Args["id"].(string), p.Args["userId"].(string))
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("syncCalendarAccount", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CalendarRepo == nil || AppContainer.CalendarSyncService == nil {
				return false, nil
			}
			go func() {
				acct, err := AppContainer.CalendarRepo.GetByID(context.Background(), p.Args["id"].(string))
				if err != nil {
					log.Printf("syncCalendarAccount: failed to fetch account: %v", err)
					return
				}
				if acct != nil {
					if err := AppContainer.CalendarSyncService.SyncAccount(context.Background(), acct); err != nil {
						log.Printf("syncCalendarAccount: sync failed: %v", err)
					}
				}
			}()
			return true, nil
		},
	})

	rootMutation.AddFieldConfig("createCalendarEvent", &graphql.Field{
		Type: calendarEventType,
		Args: graphql.FieldConfigArgument{
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"accountId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
			"location":    &graphql.ArgumentConfig{Type: graphql.String},
			"startTime":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"endTime":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"isAllDay":    &graphql.ArgumentConfig{Type: graphql.Boolean},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CalendarRepo == nil {
				return nil, nil
			}
			st, _ := time.Parse(time.RFC3339, p.Args["startTime"].(string))
			et, _ := time.Parse(time.RFC3339, p.Args["endTime"].(string))
			e := &crmcalendar.CalendarEvent{
				AccountID:   p.Args["accountId"].(string),
				BusinessID:  p.Args["businessId"].(string),
				UID:         fmt.Sprintf("vm-%d", time.Now().UnixNano()),
				Title:       p.Args["title"].(string),
				Description: getStringArg(p.Args, "description"),
				Location:    getStringArg(p.Args, "location"),
				StartTime:   st,
				EndTime:     et,
				IsAllDay:    getBoolArg(p.Args, "isAllDay"),
				Status:      "confirmed",
			}
			if err := AppContainer.CalendarRepo.UpsertEvent(p.Context, e); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": e.ID, "accountId": e.AccountID, "businessId": e.BusinessID,
				"uid": e.UID, "title": e.Title, "description": e.Description,
				"location": e.Location, "startTime": e.StartTime.Format(time.RFC3339),
				"endTime": e.EndTime.Format(time.RFC3339), "isAllDay": e.IsAllDay,
				"status":    e.Status,
				"createdAt": e.CreatedAt.Format(time.RFC3339),
				"updatedAt": e.UpdatedAt.Format(time.RFC3339),
			}, nil
		},
	})
}

func getBoolArg(args map[string]interface{}, key string) bool {
	if v, ok := args[key].(bool); ok {
		return v
	}
	return false
}

// getBoolArgDefault returns the given default when the argument is absent.
func getBoolArgDefault(args map[string]interface{}, key string, def bool) bool {
	if v, ok := args[key].(bool); ok {
		return v
	}
	return def
}
