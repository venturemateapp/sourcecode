package graph

import (
	"github.com/graphql-go/graphql"
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
}
