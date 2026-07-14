package graph

import (
	"fmt"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/auth"
	"github.com/venturemate/vmbackend/internal/marketplace"
)

var spType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ServiceProvider",
	Fields: graphql.Fields{
		"id":              &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"title":           &graphql.Field{Type: graphql.String},
		"category":        &graphql.Field{Type: graphql.String},
		"bio":             &graphql.Field{Type: graphql.String},
		"picture":         &graphql.Field{Type: graphql.String},
		"rateHourly":      &graphql.Field{Type: graphql.Float},
		"yearsExperience": &graphql.Field{Type: graphql.Int},
		"skills":          &graphql.Field{Type: graphql.String},
		"portfolio":       &graphql.Field{Type: graphql.String},
		"isActive":        &graphql.Field{Type: graphql.Boolean},
	},
})

var bookingType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Booking",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"providerId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"providerName": &graphql.Field{Type: graphql.String},
		"userId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userName":     &graphql.Field{Type: graphql.String},
		"projectTitle": &graphql.Field{Type: graphql.String},
		"description":  &graphql.Field{Type: graphql.String},
		"status":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"adminNotes":   &graphql.Field{Type: graphql.String},
		"createdAt":    &graphql.Field{Type: graphql.String},
	},
})

func init() {
	rootQuery.AddFieldConfig("serviceProviders", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(spType))),
		Args: graphql.FieldConfigArgument{
			"activeOnly": &graphql.ArgumentConfig{Type: graphql.Boolean, DefaultValue: true},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MarketplaceRepo == nil {
				return []interface{}{}, nil
			}
			activeOnly, _ := p.Args["activeOnly"].(bool)
			providers, err := AppContainer.MarketplaceRepo.ListProviders(p.Context, activeOnly)
			if err != nil {
				return []interface{}{}, nil
			}
			out := make([]map[string]interface{}, len(providers))
			for i, sp := range providers {
				out[i] = providerToMap(sp)
			}
			return out, nil
		},
	})

	rootQuery.AddFieldConfig("myBookings", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(bookingType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MarketplaceRepo == nil {
				return []interface{}{}, nil
			}
			userID, _ := auth.UserIDFromContext(p.Context)
			if userID == "" {
				return []interface{}{}, nil
			}
			isAdm := isAdmin(p.Context)
			bookings, err := AppContainer.MarketplaceRepo.ListBookings(p.Context, userID, isAdm)
			if err != nil {
				return []interface{}{}, nil
			}
			out := make([]map[string]interface{}, len(bookings))
			for i, b := range bookings {
				out[i] = bookingToMap(b)
			}
			return out, nil
		},
	})

	rootMutation.AddFieldConfig("createBooking", &graphql.Field{
		Type: bookingType,
		Args: graphql.FieldConfigArgument{
			"providerId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"projectTitle": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description":  &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MarketplaceRepo == nil {
				return nil, fmt.Errorf("marketplace unavailable")
			}
			userID, _ := auth.UserIDFromContext(p.Context)
			if userID == "" {
				return nil, fmt.Errorf("auth required")
			}
			b := &marketplace.Booking{
				ProviderID:   p.Args["providerId"].(string),
				UserID:       userID,
				ProjectTitle: p.Args["projectTitle"].(string),
				Description:  p.Args["description"].(string),
			}
			if err := AppContainer.MarketplaceRepo.CreateBooking(p.Context, b); err != nil {
				return nil, err
			}
			return bookingToMap(*b), nil
		},
	})

	rootMutation.AddFieldConfig("adminUpdateBooking", &graphql.Field{
		Type: bookingType,
		Args: graphql.FieldConfigArgument{
			"bookingId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"status":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"adminNotes": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			notes, _ := p.Args["adminNotes"].(string)
			if err := AppContainer.MarketplaceRepo.UpdateBookingStatus(p.Context, p.Args["bookingId"].(string), p.Args["status"].(string), notes); err != nil {
				return nil, err
			}
			return map[string]interface{}{"id": p.Args["bookingId"]}, nil
		},
	})

	rootMutation.AddFieldConfig("adminUpsertProvider", &graphql.Field{
		Type: spType,
		Args: graphql.FieldConfigArgument{
			"id":             &graphql.ArgumentConfig{Type: graphql.ID},
			"name":           &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"title":          &graphql.ArgumentConfig{Type: graphql.String},
			"category":       &graphql.ArgumentConfig{Type: graphql.String},
			"bio":            &graphql.ArgumentConfig{Type: graphql.String},
			"picture":        &graphql.ArgumentConfig{Type: graphql.String},
			"rateHourly":     &graphql.ArgumentConfig{Type: graphql.Float},
			"yearsExperience": &graphql.ArgumentConfig{Type: graphql.Int},
			"skills":         &graphql.ArgumentConfig{Type: graphql.String},
			"portfolio":      &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			id, _ := p.Args["id"].(string)
			sp := &marketplace.ServiceProvider{
				ID: id, Name: p.Args["name"].(string),
				Title:    p.Args["title"].(string),
				Category: p.Args["category"].(string),
				Bio:      p.Args["bio"].(string), Picture: p.Args["picture"].(string),
				Skills:    p.Args["skills"].(string),
				Portfolio: p.Args["portfolio"].(string),
			}
			if v, ok := p.Args["rateHourly"].(float64); ok {
				sp.RateHourly = v
			}
			if v, ok := p.Args["yearsExperience"].(int); ok {
				sp.YearsExp = v
			}
			sp.IsActive = true
			if err := AppContainer.MarketplaceRepo.UpsertProvider(p.Context, sp); err != nil {
				return nil, err
			}
			return providerToMap(*sp), nil
		},
	})

	rootMutation.AddFieldConfig("adminDeleteProvider", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			return true, AppContainer.MarketplaceRepo.DeleteProvider(p.Context, p.Args["id"].(string))
		},
	})
}

func providerToMap(sp marketplace.ServiceProvider) map[string]interface{} {
	return map[string]interface{}{
		"id": sp.ID, "name": sp.Name, "title": sp.Title, "category": sp.Category,
		"bio": sp.Bio, "picture": sp.Picture, "rateHourly": sp.RateHourly,
		"yearsExperience": sp.YearsExp, "skills": sp.Skills, "portfolio": sp.Portfolio,
		"isActive": sp.IsActive,
	}
}

func bookingToMap(b marketplace.Booking) map[string]interface{} {
	return map[string]interface{}{
		"id": b.ID, "providerId": b.ProviderID, "providerName": b.ProviderName,
		"userId": b.UserID, "userName": b.UserName,
		"projectTitle": b.ProjectTitle, "description": b.Description,
		"status": b.Status, "adminNotes": b.AdminNotes,
		"createdAt": b.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
