package graph

import (
	"encoding/json"

	"github.com/graphql-go/graphql"
)

var logoResultType = graphql.NewObject(graphql.ObjectConfig{
	Name: "LogoResult",
	Fields: graphql.Fields{
		"url":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"svgUrl": &graphql.Field{Type: graphql.String},
	},
})

func init() {
	rootMutation.AddFieldConfig("generateLogo", &graphql.Field{
		Type: logoResultType,
		Args: graphql.FieldConfigArgument{
			"prompt": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.RecraftClient == nil {
				return nil, nil
			}
			prompt := p.Args["prompt"].(string)

			// Generate the logo via Recraft
			genResult, err := AppContainer.RecraftClient.GenerateLogo(prompt)
			if err != nil {
				return nil, err
			}
			if len(genResult.Data) == 0 {
				return map[string]interface{}{"url": "", "svgUrl": nil}, nil
			}
			rasterURL := genResult.Data[0].URL

			// Try to vectorize for SVG
			result := map[string]interface{}{"url": rasterURL, "svgUrl": nil}
			if svgURL, err := AppContainer.RecraftClient.VectorizeImage(rasterURL); err == nil {
				result["svgUrl"] = svgURL
			}

			b, _ := json.Marshal(result)
			var out map[string]interface{}
			json.Unmarshal(b, &out)
			return out, nil
		},
	})
}
