package graph

import (
	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/websites"
)

var websiteTemplateType = graphql.NewObject(graphql.ObjectConfig{
	Name: "WebsiteTemplate",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description":  &graphql.Field{Type: graphql.String},
		"thumbnail":    &graphql.Field{Type: graphql.String},
		"category":     &graphql.Field{Type: graphql.String},
		"templateData": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isActive":     &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
	},
})

var userWebsiteType = graphql.NewObject(graphql.ObjectConfig{
	Name: "UserWebsite",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"templateId":   &graphql.Field{Type: graphql.String},
		"subdomain":    &graphql.Field{Type: graphql.String},
		"customDomain": &graphql.Field{Type: graphql.String},
		"pages":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"globalStyles": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"navigation":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"footer":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"publishedAt":  &graphql.Field{Type: graphql.String},
		"lastModified": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("websiteTemplates", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(websiteTemplateType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return []*websites.WebsiteTemplate{}, nil
			}
			return AppContainer.WebsiteRepo.ListTemplates(p.Context)
		},
	})

	rootQuery.AddFieldConfig("myWebsite", &graphql.Field{
		Type: userWebsiteType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, nil
			}
			businessID := p.Args["businessId"].(string)
			return AppContainer.WebsiteRepo.GetWebsiteByBusiness(p.Context, businessID)
		},
	})

	rootMutation.AddFieldConfig("createWebsite", &graphql.Field{
		Type: userWebsiteType,
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"templateId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"subdomain":  &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, nil
			}
			businessID := p.Args["businessId"].(string)
			templateID := p.Args["templateId"].(string)
			subdomain, _ := p.Args["subdomain"].(string)

			tpl, err := AppContainer.WebsiteRepo.GetTemplateByID(p.Context, templateID)
			if err != nil || tpl == nil {
				return nil, nil
			}

			w := &websites.UserWebsite{
				BusinessID: businessID,
				TemplateID: templateID,
				Subdomain:  subdomain,
				Pages:      `[]`,
				GlobalStyles: `{"primaryColor":"#10b981","secondaryColor":"#059669","fontHeading":"Inter","fontBody":"Inter"}`,
				Navigation: `{"items":[],"style":"horizontal","position":"top"}`,
				Footer:     `{"showLogo":true,"showSocial":true,"customText":""}`,
				Status:     websites.StatusDraft,
			}

			if err := AppContainer.WebsiteRepo.CreateWebsite(p.Context, w); err != nil {
				return nil, err
			}
			return w, nil
		},
	})

	rootMutation.AddFieldConfig("updateWebsite", &graphql.Field{
		Type: userWebsiteType,
		Args: graphql.FieldConfigArgument{
			"id":           &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"templateId":   &graphql.ArgumentConfig{Type: graphql.String},
			"subdomain":    &graphql.ArgumentConfig{Type: graphql.String},
			"customDomain": &graphql.ArgumentConfig{Type: graphql.String},
			"pages":        &graphql.ArgumentConfig{Type: graphql.String},
			"globalStyles": &graphql.ArgumentConfig{Type: graphql.String},
			"navigation":   &graphql.ArgumentConfig{Type: graphql.String},
			"footer":       &graphql.ArgumentConfig{Type: graphql.String},
			"status":       &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, nil
			}
			id := p.Args["id"].(string)
			businessID := p.Args["businessId"].(string)

			existing, err := AppContainer.WebsiteRepo.GetWebsiteByBusiness(p.Context, businessID)
			if err != nil || existing == nil || existing.ID != id {
				return nil, nil
			}

			if v, ok := p.Args["templateId"]; ok && v != nil { existing.TemplateID = v.(string) }
			if v, ok := p.Args["subdomain"]; ok && v != nil { existing.Subdomain = v.(string) }
			if v, ok := p.Args["customDomain"]; ok && v != nil { existing.CustomDomain = v.(string) }
			if v, ok := p.Args["pages"]; ok && v != nil { existing.Pages = v.(string) }
			if v, ok := p.Args["globalStyles"]; ok && v != nil { existing.GlobalStyles = v.(string) }
			if v, ok := p.Args["navigation"]; ok && v != nil { existing.Navigation = v.(string) }
			if v, ok := p.Args["footer"]; ok && v != nil { existing.Footer = v.(string) }
			if v, ok := p.Args["status"]; ok && v != nil { existing.Status = v.(string) }

			if err := AppContainer.WebsiteRepo.UpdateWebsite(p.Context, existing); err != nil {
				return nil, err
			}
			return existing, nil
		},
	})

	rootMutation.AddFieldConfig("publishWebsite", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return false, nil
			}
			id := p.Args["id"].(string)
			businessID := p.Args["businessId"].(string)
			err := AppContainer.WebsiteRepo.PublishWebsite(p.Context, id, businessID)
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("deleteWebsite", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return false, nil
			}
			id := p.Args["id"].(string)
			businessID := p.Args["businessId"].(string)
			err := AppContainer.WebsiteRepo.DeleteWebsite(p.Context, id, businessID)
			return err == nil, err
		},
	})
}
