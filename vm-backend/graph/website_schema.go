package graph

import (
	"fmt"
	"os"
	"strings"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/auth"
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

func publicSiteBaseDomain() string {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("PUBLIC_SITE_BASE_DOMAIN")))
	if value == "" {
		return "venturemate.net"
	}
	return value
}

func publicSiteCNAMETarget() string {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("PUBLIC_SITE_CNAME_TARGET")))
	if value == "" {
		return "sites." + publicSiteBaseDomain()
	}
	return value
}

func websiteFromSource(source interface{}) *websites.UserWebsite {
	switch value := source.(type) {
	case *websites.UserWebsite:
		return value
	case websites.UserWebsite:
		return &value
	default:
		return nil
	}
}

var userWebsiteType = graphql.NewObject(graphql.ObjectConfig{
	Name: "UserWebsite",
	Fields: graphql.Fields{
		"id":                            &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":                    &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"templateId":                    &graphql.Field{Type: graphql.String},
		"subdomain":                     &graphql.Field{Type: graphql.String},
		"customDomain":                  &graphql.Field{Type: graphql.String},
		"pages":                         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"globalStyles":                  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"navigation":                    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"footer":                        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":                        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"publishedAt":                   &graphql.Field{Type: graphql.String},
		"lastModified":                  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"publishedSubdomain":            &graphql.Field{Type: graphql.String},
		"publishedCustomDomain":         &graphql.Field{Type: graphql.String},
		"draftRevision":                 &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"publishedRevision":             &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"customDomainStatus":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"customDomainVerificationToken": &graphql.Field{Type: graphql.String},
		"customDomainVerifiedAt":        &graphql.Field{Type: graphql.String},
		"hasUnpublishedChanges": &graphql.Field{
			Type: graphql.NewNonNull(graphql.Boolean),
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				website := websiteFromSource(p.Source)
				return website == nil || website.HasUnpublishedChanges(), nil
			},
		},
		"publicUrl": &graphql.Field{
			Type: graphql.String,
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				website := websiteFromSource(p.Source)
				if website == nil || website.Status != websites.StatusPublished {
					return "", nil
				}
				if website.PublishedCustomDomain != "" {
					return "https://" + website.PublishedCustomDomain, nil
				}
				if website.PublishedSubdomain != "" {
					return "https://" + website.PublishedSubdomain + "." + publicSiteBaseDomain(), nil
				}
				return "", nil
			},
		},
	},
})

func requireWebsiteUser(p graphql.ResolveParams) (string, error) {
	userID, ok := auth.UserIDFromContext(p.Context)
	if !ok {
		return "", fmt.Errorf("authentication required")
	}
	return userID, nil
}

func requireOwnedBusiness(p graphql.ResolveParams, businessID string) (string, error) {
	userID, err := requireWebsiteUser(p)
	if err != nil {
		return "", err
	}
	if AppContainer == nil || AppContainer.BusinessRepo == nil {
		return "", fmt.Errorf("business service unavailable")
	}
	business, err := AppContainer.BusinessRepo.GetByIDAndUser(p.Context, businessID, userID)
	if err != nil || business == nil {
		return "", fmt.Errorf("business not found or access denied")
	}
	return userID, nil
}

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
			if _, err := requireOwnedBusiness(p, businessID); err != nil {
				return nil, err
			}
			return AppContainer.WebsiteRepo.GetWebsiteByBusiness(p.Context, businessID)
		},
	})

	rootQuery.AddFieldConfig("websiteSubdomainAvailability", &graphql.Field{
		Type: graphql.NewNonNull(graphql.String),
		Args: graphql.FieldConfigArgument{
			"subdomain": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"websiteId": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if _, err := requireWebsiteUser(p); err != nil {
				return nil, err
			}
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, fmt.Errorf("website service unavailable")
			}
			websiteID, _ := p.Args["websiteId"].(string)
			available, normalized, err := AppContainer.WebsiteRepo.IsSubdomainAvailable(p.Context, p.Args["subdomain"].(string), websiteID)
			if err != nil {
				return nil, err
			}
			return fmt.Sprintf(`{"available":%t,"normalized":%q,"url":%q}`, available, normalized, "https://"+normalized+"."+publicSiteBaseDomain()), nil
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
				return nil, fmt.Errorf("website service unavailable")
			}
			businessID := p.Args["businessId"].(string)
			if _, err := requireOwnedBusiness(p, businessID); err != nil {
				return nil, err
			}
			templateID := p.Args["templateId"].(string)
			subdomain, _ := p.Args["subdomain"].(string)

			tpl, err := AppContainer.WebsiteRepo.GetTemplateByID(p.Context, templateID)
			if err != nil || tpl == nil {
				return nil, fmt.Errorf("website template not found")
			}

			w := &websites.UserWebsite{
				BusinessID:   businessID,
				TemplateID:   templateID,
				Subdomain:    subdomain,
				Pages:        `[]`,
				GlobalStyles: `{"primaryColor":"#10b981","secondaryColor":"#059669","fontHeading":"Inter","fontBody":"Inter"}`,
				Navigation:   `{"items":[],"style":"horizontal","position":"top"}`,
				Footer:       `{"showLogo":true,"showSocial":true,"customText":""}`,
				Status:       websites.StatusDraft,
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
			"pages":        &graphql.ArgumentConfig{Type: graphql.String},
			"globalStyles": &graphql.ArgumentConfig{Type: graphql.String},
			"navigation":   &graphql.ArgumentConfig{Type: graphql.String},
			"footer":       &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, fmt.Errorf("website service unavailable")
			}
			id := p.Args["id"].(string)
			businessID := p.Args["businessId"].(string)
			if _, err := requireOwnedBusiness(p, businessID); err != nil {
				return nil, err
			}
			existing, err := AppContainer.WebsiteRepo.GetWebsiteByIDAndBusiness(p.Context, id, businessID)
			if err != nil || existing == nil {
				return nil, fmt.Errorf("website not found")
			}
			if v, ok := p.Args["templateId"]; ok && v != nil {
				existing.TemplateID = v.(string)
			}
			if v, ok := p.Args["subdomain"]; ok && v != nil {
				existing.Subdomain = v.(string)
			}
			if v, ok := p.Args["pages"]; ok && v != nil {
				existing.Pages = v.(string)
			}
			if v, ok := p.Args["globalStyles"]; ok && v != nil {
				existing.GlobalStyles = v.(string)
			}
			if v, ok := p.Args["navigation"]; ok && v != nil {
				existing.Navigation = v.(string)
			}
			if v, ok := p.Args["footer"]; ok && v != nil {
				existing.Footer = v.(string)
			}
			if err := AppContainer.WebsiteRepo.UpdateWebsite(p.Context, existing); err != nil {
				return nil, err
			}
			return AppContainer.WebsiteRepo.GetWebsiteByIDAndBusiness(p.Context, id, businessID)
		},
	})

	rootMutation.AddFieldConfig("publishWebsite", &graphql.Field{
		Type: userWebsiteType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, fmt.Errorf("website service unavailable")
			}
			businessID := p.Args["businessId"].(string)
			if _, err := requireOwnedBusiness(p, businessID); err != nil {
				return nil, err
			}
			return AppContainer.WebsiteRepo.PublishWebsite(p.Context, p.Args["id"].(string), businessID)
		},
	})

	rootMutation.AddFieldConfig("unpublishWebsite", &graphql.Field{
		Type: userWebsiteType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, fmt.Errorf("website service unavailable")
			}
			businessID := p.Args["businessId"].(string)
			if _, err := requireOwnedBusiness(p, businessID); err != nil {
				return nil, err
			}
			return AppContainer.WebsiteRepo.UnpublishWebsite(p.Context, p.Args["id"].(string), businessID)
		},
	})

	rootMutation.AddFieldConfig("setWebsiteCustomDomain", &graphql.Field{
		Type: userWebsiteType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"domain":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, fmt.Errorf("website service unavailable")
			}
			businessID := p.Args["businessId"].(string)
			if _, err := requireOwnedBusiness(p, businessID); err != nil {
				return nil, err
			}
			return AppContainer.WebsiteRepo.SetCustomDomain(p.Context, p.Args["id"].(string), businessID, p.Args["domain"].(string), publicSiteBaseDomain())
		},
	})

	rootMutation.AddFieldConfig("verifyWebsiteCustomDomain", &graphql.Field{
		Type: userWebsiteType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WebsiteRepo == nil {
				return nil, fmt.Errorf("website service unavailable")
			}
			businessID := p.Args["businessId"].(string)
			if _, err := requireOwnedBusiness(p, businessID); err != nil {
				return nil, err
			}
			return AppContainer.WebsiteRepo.VerifyCustomDomain(p.Context, p.Args["id"].(string), businessID, publicSiteCNAMETarget())
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
				return false, fmt.Errorf("website service unavailable")
			}
			businessID := p.Args["businessId"].(string)
			if _, err := requireOwnedBusiness(p, businessID); err != nil {
				return false, err
			}
			err := AppContainer.WebsiteRepo.DeleteWebsite(p.Context, p.Args["id"].(string), businessID)
			return err == nil, err
		},
	})
}
