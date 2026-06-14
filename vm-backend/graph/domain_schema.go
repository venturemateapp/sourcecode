package graph

import (
	"github.com/graphql-go/graphql"
)

var domainDataType = graphql.NewObject(graphql.ObjectConfig{
	Name: "DomainData",
	Fields: graphql.Fields{
		"id":         &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"domain":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"data":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("domainData", &graphql.Field{
		Type: domainDataType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"domain":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			businessID, _ := p.Args["businessId"].(string)
			domain, _ := p.Args["domain"].(string)
			if AppContainer == nil {
				return nil, nil
			}
			return AppContainer.DomainRepo.Get(p.Context, businessID, domain)
		},
	})

	rootMutation.AddFieldConfig("updateDomainData", &graphql.Field{
		Type: domainDataType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"domain":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"data":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			businessID, _ := p.Args["businessId"].(string)
			domain, _ := p.Args["domain"].(string)
			data, _ := p.Args["data"].(string)
			if AppContainer == nil {
				return nil, nil
			}
			d, err := AppContainer.DomainRepo.Upsert(p.Context, businessID, domain, data)
			if err != nil {
				return nil, err
			}
			return d, nil
		},
	})
}
