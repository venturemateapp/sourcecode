package graph

import (
	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/investors"
)

var investorType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Investor",
	Fields: graphql.Fields{
		"id":              &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"type":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"logo":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"location":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"focusIndustries": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"stages":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"checkSize":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"aum": &graphql.Field{
			Type: graphql.Float,
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				switch v := p.Source.(type) {
				case *investors.Investor:
					if v.Aum == nil {
						return nil, nil
					}
					return float64(*v.Aum), nil
				case investors.Investor:
					if v.Aum == nil {
						return nil, nil
					}
					return float64(*v.Aum), nil
				}
				return nil, nil
			},
		},
		"portfolio": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"team":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"thesis":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"criteria":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"matchScore": &graphql.Field{
			Type: graphql.Int,
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				switch v := p.Source.(type) {
				case *investors.Investor:
					if v.MatchScore == nil {
						return nil, nil
					}
					return *v.MatchScore, nil
				case investors.Investor:
					if v.MatchScore == nil {
						return nil, nil
					}
					return *v.MatchScore, nil
				}
				return nil, nil
			},
		},
		"status":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"connectedAt": &graphql.Field{Type: graphql.String},
	},
})

func init() {
	rootQuery.AddFieldConfig("investors", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(investorType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []interface{}{}, nil
			}
			return AppContainer.InvestorRepo.List(p.Context)
		},
	})
}
