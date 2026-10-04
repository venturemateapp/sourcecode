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

	rootMutation.AddFieldConfig("generateLogoVariants", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(logoResultType))),
		Args: graphql.FieldConfigArgument{
			"prompt": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"count":  &graphql.ArgumentConfig{Type: graphql.Int},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.RecraftClient == nil {
				return nil, nil
			}
			prompt := p.Args["prompt"].(string)
			count := 3
			if raw, ok := p.Args["count"]; ok {
				switch v := raw.(type) {
				case int:
					count = v
				case float64:
					count = int(v)
				}
			}
			if count < 1 {
				count = 1
			}
			if count > 4 {
				count = 4
			}
			genResult, err := AppContainer.RecraftClient.GenerateLogoVariants(prompt, count)
			if err != nil {
				return nil, err
			}
			out := make([]map[string]interface{}, 0, count)
			for _, url := range genResult.AllURLs() {
				out = append(out, map[string]interface{}{"url": url, "svgUrl": nil})
			}
			return out, nil
		},
	})
}
