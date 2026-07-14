package graph

import (
	"context"
	"fmt"

	"github.com/graphql-go/graphql"
)

var adminUserDetailType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminUserDetail",
	Fields: graphql.Fields{
		"id":                &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"firstName":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"surname":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"email":             &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isAdmin":           &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"onboarded":         &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"preferredCurrency": &graphql.Field{Type: graphql.String},
		"createdAt":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var adminBusinessDetailType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminBusinessDetail",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"industry":    &graphql.Field{Type: graphql.String},
		"stage":       &graphql.Field{Type: graphql.String},
		"location":    &graphql.Field{Type: graphql.String},
		"status":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerName":   &graphql.Field{Type: graphql.String},
		"ownerEmail":  &graphql.Field{Type: graphql.String},
		"createdAt":   &graphql.Field{Type: graphql.String},
	},
})

func adminOnly(p graphql.ResolveParams) error {
	if !isAdmin(p.Context) {
		return fmt.Errorf("admin access required")
	}
	return nil
}

func init() {
	// ─── User Management ─────────────────────────────────────────────────
	rootMutation.AddFieldConfig("adminUpdateUserStatus", &graphql.Field{
		Type: adminUserDetailType,
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"status": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			userID := p.Args["userId"].(string)
			status := p.Args["status"].(string)
			err := AppContainer.UserRepo.UpdateStatus(p.Context, userID, status)
			if err != nil {
				return nil, err
			}
			return fetchAdminUser(p.Context, userID)
		},
	})

	rootMutation.AddFieldConfig("adminSetAdmin", &graphql.Field{
		Type: adminUserDetailType,
		Args: graphql.FieldConfigArgument{
			"userId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"isAdmin": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Boolean)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			userID := p.Args["userId"].(string)
			isAdmin := p.Args["isAdmin"].(bool)
			if err := AppContainer.UserRepo.UpdateIsAdmin(p.Context, userID, isAdmin); err != nil {
				return nil, err
			}
			return fetchAdminUser(p.Context, userID)
		},
	})

	rootMutation.AddFieldConfig("adminDeleteUser", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			return true, AppContainer.UserRepo.Delete(p.Context, p.Args["userId"].(string))
		},
	})

	// ─── Business Management ─────────────────────────────────────────────
	rootMutation.AddFieldConfig("adminUpdateBusiness", &graphql.Field{
		Type: adminBusinessDetailType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":       &graphql.ArgumentConfig{Type: graphql.String},
			"industry":   &graphql.ArgumentConfig{Type: graphql.String},
			"stage":      &graphql.ArgumentConfig{Type: graphql.String},
			"status":     &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			id := p.Args["businessId"].(string)
			biz, err := AppContainer.BusinessRepo.GetByID(p.Context, id)
			if err != nil || biz == nil {
				return nil, fmt.Errorf("business not found")
			}
			if v, ok := p.Args["name"].(string); ok && v != "" {
				biz.Name = v
			}
			if v, ok := p.Args["industry"].(string); ok && v != "" {
				biz.Industry = v
			}
			if v, ok := p.Args["stage"].(string); ok && v != "" {
				biz.Stage = v
			}
			if v, ok := p.Args["status"].(string); ok && v != "" {
				biz.Status = v
			}
			if err := AppContainer.BusinessRepo.Update(p.Context, biz); err != nil {
				return nil, err
			}
			return fetchAdminBusiness(p.Context, id)
		},
	})

	rootMutation.AddFieldConfig("adminDeleteBusiness", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			id := p.Args["businessId"].(string)
			return true, AppContainer.BusinessRepo.Delete(p.Context, id, "")
		},
	})

	// ─── Subscription Plan Management ────────────────────────────────────
	rootMutation.AddFieldConfig("adminCreatePlan", &graphql.Field{
		Type: graphql.String,
		Args: graphql.FieldConfigArgument{
			"name":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"displayName": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"priceMonthly": &graphql.ArgumentConfig{Type: graphql.Float},
			"priceYearly":  &graphql.ArgumentConfig{Type: graphql.Float},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return "", err
			}
			return "ok", AppContainer.SubscriptionRepo.CreatePlan(p.Context,
				p.Args["name"].(string),
				p.Args["displayName"].(string),
				p.Args["description"].(string),
				p.Args["priceMonthly"].(float64),
				p.Args["priceYearly"].(float64),
			)
		},
	})

	rootMutation.AddFieldConfig("adminUpdatePlan", &graphql.Field{
		Type: graphql.String,
		Args: graphql.FieldConfigArgument{
			"planId":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"displayName": &graphql.ArgumentConfig{Type: graphql.String},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
			"priceMonthly": &graphql.ArgumentConfig{Type: graphql.Float},
			"priceYearly":  &graphql.ArgumentConfig{Type: graphql.Float},
			"isActive":    &graphql.ArgumentConfig{Type: graphql.Boolean},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return "", err
			}
			return "ok", AppContainer.SubscriptionRepo.UpdatePlan(p.Context, p.Args["planId"].(string), p.Args)
		},
	})

	rootMutation.AddFieldConfig("adminDeletePlan", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"planId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			return true, AppContainer.SubscriptionRepo.DeletePlan(p.Context, p.Args["planId"].(string))
		},
	})

	// ─── User Subscription Management ────────────────────────────────────
	rootMutation.AddFieldConfig("adminSetUserPlan", &graphql.Field{
		Type: graphql.String,
		Args: graphql.FieldConfigArgument{
			"userId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"planName": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return "", err
			}
			_, _, err := AppContainer.SubscriptionRepo.ChangePlan(p.Context, p.Args["userId"].(string), p.Args["planName"].(string))
			if err != nil {
				return "", err
			}
			return "Plan updated", nil
		},
	})

	// ─── Investor Management ─────────────────────────────────────────────
	rootMutation.AddFieldConfig("adminUpsertInvestor", &graphql.Field{
		Type: graphql.String,
		Args: graphql.FieldConfigArgument{
			"id":              &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":            &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"type":            &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"location":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"focusIndustries": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"thesis":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return "", err
			}
			return "ok", AppContainer.InvestorRepo.Upsert(p.Context, p.Args)
		},
	})

	rootMutation.AddFieldConfig("adminDeleteInvestor", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			return true, AppContainer.InvestorRepo.Delete(p.Context, p.Args["id"].(string))
		},
	})

	// ─── Contact Submissions ─────────────────────────────────────────────
	rootQuery.AddFieldConfig("adminContactSubmissions", &graphql.Field{
		Type: graphql.String,
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return "[]", err
			}
			out, err := AppContainer.WebsiteRepo.ListContactSubmissions(p.Context)
			if err != nil {
				return "[]", nil
			}
			return out, nil
		},
	})

	rootMutation.AddFieldConfig("adminDeleteContactSubmission", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			return true, AppContainer.WebsiteRepo.DeleteContactSubmission(p.Context, p.Args["id"].(string))
		},
	})

	// ─── Notifications Broadcast ─────────────────────────────────────────
	rootMutation.AddFieldConfig("adminBroadcastNotification", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"title":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"type":        &graphql.ArgumentConfig{Type: graphql.String},
			"actionUrl":   &graphql.ArgumentConfig{Type: graphql.String},
			"actionLabel": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			notifType, _ := p.Args["type"].(string)
			if notifType == "" {
				notifType = "admin"
			}
			actionURL, _ := p.Args["actionUrl"].(string)
			actionLabel, _ := p.Args["actionLabel"].(string)
			return true, AppContainer.NotificationRepo.Broadcast(p.Context,
				p.Args["title"].(string),
				p.Args["description"].(string),
				notifType, actionURL, actionLabel)
		},
	})
}

func fetchAdminUser(ctx context.Context, userID string) (map[string]interface{}, error) {
	u, err := AppContainer.UserRepo.FindByID(ctx, userID)
	if err != nil || u == nil {
		return nil, fmt.Errorf("user not found")
	}
	return map[string]interface{}{
		"id": u.ID, "firstName": u.FirstName, "surname": u.Surname,
		"email": u.Email, "status": u.Status, "isAdmin": u.IsAdmin,
		"onboarded": u.Onboarded, "preferredCurrency": u.PreferredCurrency,
		"createdAt": u.CreatedAt.Format("2006-01-02T15:04:05Z"),
		"updatedAt": u.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}, nil
}

func fetchAdminBusiness(ctx context.Context, bizID string) (map[string]interface{}, error) {
	b, err := AppContainer.BusinessRepo.GetByID(ctx, bizID)
	if err != nil || b == nil {
		return nil, fmt.Errorf("business not found")
	}
	ownerName := ""
	ownerEmail := ""
	if u, uErr := AppContainer.UserRepo.FindByID(ctx, b.UserID); uErr == nil && u != nil {
		ownerName = u.FirstName + " " + u.Surname
		ownerEmail = u.Email
	}
	return map[string]interface{}{
		"id": b.ID, "userId": b.UserID, "name": b.Name,
		"industry": b.Industry, "stage": b.Stage, "location": b.Location,
		"status": b.Status, "ownerName": ownerName, "ownerEmail": ownerEmail,
		"createdAt": b.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}, nil
}
