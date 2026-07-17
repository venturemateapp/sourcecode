package graph

import (
	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/financing"
)

var adminFinancingOfferType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminFinancingOffer",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"lenderName":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"productType":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"minAmount":    &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"maxAmount":    &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"minRate":      &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"maxRate":      &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"termMonths":   &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"requirements": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isActive":     &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"createdAt":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("adminFinancingOffers", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(adminFinancingOfferType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if ok, _ := adminGuard(p.Context); !ok {
				return []interface{}{}, nil
			}
			offers, err := AppContainer.FinancingRepo.ListAll(p.Context)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(offers))
			for i, o := range offers {
				result[i] = map[string]interface{}{
					"id": o.ID, "lenderName": o.LenderName, "productType": o.ProductType,
					"minAmount": o.MinAmount, "maxAmount": o.MaxAmount,
					"minRate": o.MinRate, "maxRate": o.MaxRate,
					"termMonths": o.TermMonths, "requirements": o.Requirements,
					"isActive": o.IsActive,
					"createdAt": o.CreatedAt.Format("2006-01-02T15:04:05Z"),
					"updatedAt": o.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				}
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("adminCreateFinancingOffer", &graphql.Field{
		Type: adminFinancingOfferType,
		Args: graphql.FieldConfigArgument{
			"lenderName":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"productType": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"minAmount":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"maxAmount":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"minRate":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"maxRate":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"termMonths":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Int)},
			"requirements": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			o := &financing.Offer{
				LenderName:   p.Args["lenderName"].(string),
				ProductType:  p.Args["productType"].(string),
				MinAmount:    p.Args["minAmount"].(float64),
				MaxAmount:    p.Args["maxAmount"].(float64),
				MinRate:      p.Args["minRate"].(float64),
				MaxRate:      p.Args["maxRate"].(float64),
				TermMonths:   p.Args["termMonths"].(int),
				Requirements: p.Args["requirements"].(string),
				IsActive:     true,
			}
			if err := AppContainer.FinancingRepo.Create(p.Context, o); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": o.ID, "lenderName": o.LenderName, "productType": o.ProductType,
				"minAmount": o.MinAmount, "maxAmount": o.MaxAmount,
				"minRate": o.MinRate, "maxRate": o.MaxRate,
				"termMonths": o.TermMonths, "requirements": o.Requirements,
				"isActive": o.IsActive,
				"createdAt": o.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": o.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("adminUpdateFinancingOffer", &graphql.Field{
		Type: adminFinancingOfferType,
		Args: graphql.FieldConfigArgument{
			"id":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"lenderName":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"productType": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"minAmount":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"maxAmount":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"minRate":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"maxRate":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"termMonths":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Int)},
			"requirements": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"isActive":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Boolean)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			o := &financing.Offer{
				ID:           p.Args["id"].(string),
				LenderName:   p.Args["lenderName"].(string),
				ProductType:  p.Args["productType"].(string),
				MinAmount:    p.Args["minAmount"].(float64),
				MaxAmount:    p.Args["maxAmount"].(float64),
				MinRate:      p.Args["minRate"].(float64),
				MaxRate:      p.Args["maxRate"].(float64),
				TermMonths:   p.Args["termMonths"].(int),
				Requirements: p.Args["requirements"].(string),
				IsActive:     p.Args["isActive"].(bool),
			}
			if err := AppContainer.FinancingRepo.Update(p.Context, o); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": o.ID, "lenderName": o.LenderName, "productType": o.ProductType,
				"minAmount": o.MinAmount, "maxAmount": o.MaxAmount,
				"minRate": o.MinRate, "maxRate": o.MaxRate,
				"termMonths": o.TermMonths, "requirements": o.Requirements,
				"isActive": o.IsActive,
				"createdAt": o.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt": o.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("adminDeleteFinancingOffer", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return false, err
			}
			err := AppContainer.FinancingRepo.Delete(p.Context, p.Args["id"].(string))
			return err == nil, err
		},
	})
}
