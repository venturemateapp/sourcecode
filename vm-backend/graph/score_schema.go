package graph

import (
	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/scores"
)

var businessScoreType = graphql.NewObject(graphql.ObjectConfig{
	Name: "BusinessScore",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"scoreType":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"scoreData":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"calculatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var financingOfferType = graphql.NewObject(graphql.ObjectConfig{
	Name: "FinancingOffer",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"lenderName":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"productType":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"minAmount":    &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"maxAmount":    &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"minRate":      &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"maxRate":      &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"termMonths":   &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"requirements": &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(graphql.String)))},
		"preQualified": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"expiresAt":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var creditScoreHistoryType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CreditScoreHistory",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"score":        &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"calculatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("businessScore", &graphql.Field{
		Type: businessScoreType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"scoreType":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			businessID := p.Args["businessId"].(string)
			scoreType := p.Args["scoreType"].(string)
			return AppContainer.ScoreRepo.GetByBusinessAndType(p.Context, businessID, scoreType)
		},
	})

	rootQuery.AddFieldConfig("financingOffers", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(financingOfferType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []scores.FinancingOffer{}, nil
			}
			businessID := p.Args["businessId"].(string)
			score, err := AppContainer.ScoreRepo.GetByBusinessAndType(p.Context, businessID, "credit")
			if err != nil {
				return []scores.FinancingOffer{}, nil
			}
			scoreVal := 50
			if score != nil {
				var data scores.CreditScoreData
				if err := jsonUnmarshal(score.ScoreData, &data); err == nil {
					scoreVal = data.Score
				}
			}
			return AppContainer.ScoreEngine.GetOffers(scoreVal), nil
		},
	})

	rootQuery.AddFieldConfig("creditHistory", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(creditScoreHistoryType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"limit":      &graphql.ArgumentConfig{Type: graphql.Int},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []map[string]interface{}{}, nil
			}
			businessID := p.Args["businessId"].(string)
			limit := 10
			if l, ok := p.Args["limit"].(int); ok && l > 0 {
				limit = l
			}
			scoresList, err := AppContainer.ScoreRepo.ListHistory(p.Context, businessID, limit)
			if err != nil {
				return []map[string]interface{}{}, nil
			}
			var result []map[string]interface{}
			for _, s := range scoresList {
				var cd scores.CreditScoreData
				scoreVal := 0
				if err := jsonUnmarshal(s.ScoreData, &cd); err == nil {
					scoreVal = cd.Score
				}
				result = append(result, map[string]interface{}{
					"id":           s.ID,
					"score":        scoreVal,
					"calculatedAt": s.CalculatedAt.Format("2006-01-02T15:04:05Z"),
				})
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("recalculateCreditScore", &graphql.Field{
		Type: businessScoreType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			businessID := p.Args["businessId"].(string)
			_, err := AppContainer.ScoreEngine.CalculateAndStore(p.Context, businessID)
			if err != nil {
				return nil, err
			}
			return AppContainer.ScoreRepo.GetByBusinessAndType(p.Context, businessID, "credit")
		},
	})

	rootMutation.AddFieldConfig("recalculateHealthScore", &graphql.Field{
		Type: businessScoreType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			businessID := p.Args["businessId"].(string)
			_, err := AppContainer.HealthEngine.CalculateAndStore(p.Context, businessID)
			if err != nil {
				return nil, err
			}
			return AppContainer.ScoreRepo.GetByBusinessAndType(p.Context, businessID, "health")
		},
	})
}
