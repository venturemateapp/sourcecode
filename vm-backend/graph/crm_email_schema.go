package graph

import (
	"context"
	"log"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/crmemail"
)

var emailAccountType = graphql.NewObject(graphql.ObjectConfig{
	Name: "EmailAccount",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"email":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"provider":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"imapHost":     &graphql.Field{Type: graphql.String},
		"imapPort":     &graphql.Field{Type: graphql.Int},
		"smtpHost":     &graphql.Field{Type: graphql.String},
		"smtpPort":     &graphql.Field{Type: graphql.Int},
		"syncEnabled":  &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"lastSyncedAt": &graphql.Field{Type: graphql.String},
		"createdAt":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var emailType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CrmEmail",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"accountId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"messageId":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"subject":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"fromAddress": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"fromName":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"toAddresses": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"bodyText":    &graphql.Field{Type: graphql.String},
		"sentAt":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"receivedAt":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isRead":      &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"isStarred":   &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"folder":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"threadId":    &graphql.Field{Type: graphql.String},
		"contactId":   &graphql.Field{Type: graphql.ID},
		"companyId":   &graphql.Field{Type: graphql.ID},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("emailAccounts", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(emailAccountType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.EmailSyncRepo == nil {
				return []interface{}{}, nil
			}
			accts, err := AppContainer.EmailSyncRepo.ListAccounts(p.Context, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(accts))
			for i, a := range accts {
				result[i] = map[string]interface{}{
					"id": a.ID, "userId": a.UserID, "businessId": a.BusinessID,
					"email": a.Email, "provider": a.Provider,
					"imapHost": a.ImapHost, "imapPort": a.ImapPort,
					"smtpHost": a.SmtpHost, "smtpPort": a.SmtpPort,
					"syncEnabled": a.SyncEnabled,
					"lastSyncedAt": formatTimePtr(a.LastSyncedAt),
					"createdAt": a.CreatedAt.Format(time.RFC3339),
					"updatedAt": a.UpdatedAt.Format(time.RFC3339),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("crmEmails", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(emailType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"folder":     &graphql.ArgumentConfig{Type: graphql.String},
			"limit":      &graphql.ArgumentConfig{Type: graphql.Int},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.EmailSyncRepo == nil {
				return []interface{}{}, nil
			}
			folder, _ := p.Args["folder"].(string)
			limit, _ := p.Args["limit"].(int)
			emails, err := AppContainer.EmailSyncRepo.ListEmails(p.Context, p.Args["businessId"].(string), folder, limit)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(emails))
			for i, e := range emails {
				result[i] = map[string]interface{}{
					"id": e.ID, "accountId": e.AccountID, "businessId": e.BusinessID,
					"messageId": e.MessageID, "subject": e.Subject,
					"fromAddress": e.FromAddress, "fromName": e.FromName,
					"toAddresses": e.ToAddresses, "bodyText": e.BodyText,
					"sentAt": e.SentAt.Format(time.RFC3339),
					"receivedAt": e.ReceivedAt.Format(time.RFC3339),
					"isRead": e.IsRead, "isStarred": e.IsStarred,
					"folder": e.Folder, "threadId": e.ThreadID,
					"contactId": e.ContactID, "companyId": e.CompanyID,
					"createdAt": e.CreatedAt.Format(time.RFC3339),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("crmEmailsByContact", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(emailType))),
		Args: graphql.FieldConfigArgument{
			"contactId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"limit":     &graphql.ArgumentConfig{Type: graphql.Int},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.EmailSyncRepo == nil {
				return []interface{}{}, nil
			}
			limit, _ := p.Args["limit"].(int)
			emails, err := AppContainer.EmailSyncRepo.ListEmailsByContact(p.Context, p.Args["contactId"].(string), limit)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(emails))
			for i, e := range emails {
				result[i] = map[string]interface{}{
					"id": e.ID, "accountId": e.AccountID, "businessId": e.BusinessID,
					"messageId": e.MessageID, "subject": e.Subject,
					"fromAddress": e.FromAddress, "fromName": e.FromName,
					"toAddresses": e.ToAddresses, "bodyText": e.BodyText,
					"sentAt": e.SentAt.Format(time.RFC3339),
					"receivedAt": e.ReceivedAt.Format(time.RFC3339),
					"isRead": e.IsRead, "isStarred": e.IsStarred,
					"folder": e.Folder, "threadId": e.ThreadID,
					"contactId": e.ContactID, "companyId": e.CompanyID,
					"createdAt": e.CreatedAt.Format(time.RFC3339),
				}
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("createEmailAccount", &graphql.Field{
		Type: emailAccountType,
		Args: graphql.FieldConfigArgument{
			"userId":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"email":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"provider":     &graphql.ArgumentConfig{Type: graphql.String},
			"imapHost":     &graphql.ArgumentConfig{Type: graphql.String},
			"imapPort":     &graphql.ArgumentConfig{Type: graphql.Int},
			"imapUsername": &graphql.ArgumentConfig{Type: graphql.String},
			"imapPassword": &graphql.ArgumentConfig{Type: graphql.String},
			"smtpHost":     &graphql.ArgumentConfig{Type: graphql.String},
			"smtpPort":     &graphql.ArgumentConfig{Type: graphql.Int},
			"smtpUsername": &graphql.ArgumentConfig{Type: graphql.String},
			"smtpPassword": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.EmailSyncRepo == nil {
				return nil, nil
			}
			a := &crmemail.EmailAccount{
				UserID:       p.Args["userId"].(string),
				BusinessID:   p.Args["businessId"].(string),
				Email:        p.Args["email"].(string),
				Provider:     getStringArg(p.Args, "provider"),
				ImapHost:     getStringArg(p.Args, "imapHost"),
				ImapPort:     getIntArg(p.Args, "imapPort"),
				ImapUsername: getStringArg(p.Args, "imapUsername"),
				ImapPassword: getStringArg(p.Args, "imapPassword"),
				SmtpHost:     getStringArg(p.Args, "smtpHost"),
				SmtpPort:     getIntArg(p.Args, "smtpPort"),
				SmtpUsername: getStringArg(p.Args, "smtpUsername"),
				SmtpPassword: getStringArg(p.Args, "smtpPassword"),
				SyncEnabled:  true,
			}
			if a.Provider == "" {
				a.Provider = "imap"
			}
			if err := AppContainer.EmailSyncRepo.CreateAccount(p.Context, a); err != nil {
				return nil, err
			}

			// Trigger initial sync in background
			go func() {
				syncer := crmemail.NewSyncService(AppContainer.EmailSyncRepo)
				if err := syncer.SyncAccount(context.Background(), a); err != nil {
					log.Printf("Initial email sync failed for %s: %v", a.Email, err)
				}
			}()

			return map[string]interface{}{
				"id": a.ID, "userId": a.UserID, "businessId": a.BusinessID,
				"email": a.Email, "provider": a.Provider,
				"imapHost": a.ImapHost, "imapPort": a.ImapPort,
				"smtpHost": a.SmtpHost, "smtpPort": a.SmtpPort,
				"syncEnabled": a.SyncEnabled,
				"lastSyncedAt": nil,
				"createdAt": a.CreatedAt.Format(time.RFC3339),
				"updatedAt": a.UpdatedAt.Format(time.RFC3339),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("deleteEmailAccount", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.EmailSyncRepo == nil {
				return false, nil
			}
			err := AppContainer.EmailSyncRepo.DeleteAccount(p.Context, p.Args["id"].(string), p.Args["userId"].(string))
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("syncEmailAccount", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.EmailSyncRepo == nil || AppContainer.EmailSyncService == nil {
				return false, nil
			}
			go func() {
				acct, err := AppContainer.EmailSyncRepo.GetByID(context.Background(), p.Args["id"].(string))
				if err == nil && acct != nil {
					AppContainer.EmailSyncService.SyncAccount(context.Background(), acct)
				}
			}()
			return true, nil
		},
	})
}

func formatTimePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}
