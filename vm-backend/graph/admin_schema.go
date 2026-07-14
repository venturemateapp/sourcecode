package graph

import (
	"context"
	"encoding/json"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/auth"
)

var planCountType = graphql.NewObject(graphql.ObjectConfig{
	Name: "PlanCount",
	Fields: graphql.Fields{
		"planName": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"count":    &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
	},
})

var adminUserType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminUser",
	Fields: graphql.Fields{
		"id":        &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"firstName": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"surname":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"email":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isAdmin":   &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var adminDashboardType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminDashboard",
	Fields: graphql.Fields{
		"totalUsers":      &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"activeUsers":     &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"totalBusinesses": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"plansBreakdown":  &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(planCountType)))},
		"recentSignups":   &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(adminUserType)))},
	},
})

func isAdmin(ctx context.Context) bool {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok || AppContainer == nil || AppContainer.UserRepo == nil {
		return false
	}
	user, err := AppContainer.UserRepo.FindByID(ctx, userID)
	return err == nil && user != nil && user.IsAdmin
}

func adminGuard(ctx context.Context) (bool, error) {
	if !isAdmin(ctx) {
		return false, nil
	}
	return true, nil
}

func init() {
	rootQuery.AddFieldConfig("adminDashboard", &graphql.Field{
		Type: adminDashboardType,
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if ok, _ := adminGuard(p.Context); !ok {
				return nil, nil
			}
			if AppContainer == nil || AppContainer.UserRepo == nil {
				return nil, nil
			}
			dash, err := AppContainer.UserRepo.GetAdminDashboard(p.Context)
			if err != nil {
				return nil, err
			}
			plans := make([]map[string]interface{}, len(dash.PlansBreakdown))
			for i, p := range dash.PlansBreakdown {
				plans[i] = map[string]interface{}{"planName": p.PlanName, "count": p.Count}
			}
			signups := make([]map[string]interface{}, len(dash.RecentSignups))
			for i, u := range dash.RecentSignups {
				signups[i] = map[string]interface{}{
					"id": u.ID, "firstName": u.FirstName, "surname": u.Surname,
					"email": u.Email, "status": u.Status, "isAdmin": u.IsAdmin,
					"createdAt": u.CreatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return map[string]interface{}{
				"totalUsers":      dash.TotalUsers,
				"activeUsers":     dash.ActiveUsers,
				"totalBusinesses": dash.TotalBusinesses,
				"plansBreakdown":  plans,
				"recentSignups":   signups,
			}, nil
		},
	})

	rootQuery.AddFieldConfig("adminUsers", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(adminUserType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if ok, _ := adminGuard(p.Context); !ok {
				return []interface{}{}, nil
			}
			if AppContainer == nil || AppContainer.UserRepo == nil {
				return []interface{}{}, nil
			}
			users, err := AppContainer.UserRepo.ListAllUsers(p.Context)
			if err != nil {
				return nil, err
			}
			result := make([]map[string]interface{}, len(users))
			for i, u := range users {
				result[i] = map[string]interface{}{
					"id": u.ID, "firstName": u.FirstName, "surname": u.Surname,
					"email": u.Email, "status": u.Status, "isAdmin": u.IsAdmin,
					"createdAt": u.CreatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("adminBusinesses", &graphql.Field{
		Type: graphql.String,
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if ok, _ := adminGuard(p.Context); !ok {
				return "[]", nil
			}
			if AppContainer == nil || AppContainer.BusinessRepo == nil {
				return "[]", nil
			}
			b, err := AppContainer.BusinessRepo.ListAll(p.Context)
			if err != nil {
				return "[]", nil
			}
			d, _ := json.Marshal(b)
			return string(d), nil
		},
	})
}
