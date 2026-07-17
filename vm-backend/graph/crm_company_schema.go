package graph

import (
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/crm"
)

var crmCompanyType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CrmCompany",
	Fields: graphql.Fields{
		"id":             &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":     &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"domain":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"industry":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"employeeCount":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"revenue":        &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"website":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"phone":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"email":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressStreet":  &graphql.Field{Type: graphql.String},
		"addressCity":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressState":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressZip":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressCountry": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"logoUrl":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("crmCompanies", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(crmCompanyType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return []interface{}{}, nil
			}
			companies, err := AppContainer.CrmRepo.ListCompanies(p.Context, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(companies))
			for i, c := range companies {
				result[i] = map[string]interface{}{
					"id": c.ID, "businessId": c.BusinessID, "name": c.Name,
					"domain": c.Domain, "industry": c.Industry, "employeeCount": c.EmployeeCount,
					"revenue": c.Revenue, "website": c.Website, "phone": c.Phone, "email": c.Email,
					"addressStreet": c.AddressStreet, "addressCity": c.AddressCity,
					"addressState": c.AddressState, "addressZip": c.AddressZip,
					"addressCountry": c.AddressCountry, "description": c.Description, "logoUrl": c.LogoURL,
					"createdAt": c.CreatedAt.Format(time.RFC3339),
					"updatedAt": c.UpdatedAt.Format(time.RFC3339),
				}
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("createCrmCompany", &graphql.Field{
		Type: crmCompanyType,
		Args: graphql.FieldConfigArgument{
			"businessId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"domain":        &graphql.ArgumentConfig{Type: graphql.String},
			"industry":      &graphql.ArgumentConfig{Type: graphql.String},
			"employeeCount": &graphql.ArgumentConfig{Type: graphql.Int},
			"revenue":       &graphql.ArgumentConfig{Type: graphql.Float},
			"website":       &graphql.ArgumentConfig{Type: graphql.String},
			"phone":         &graphql.ArgumentConfig{Type: graphql.String},
			"email":         &graphql.ArgumentConfig{Type: graphql.String},
			"addressStreet": &graphql.ArgumentConfig{Type: graphql.String},
			"addressCity":   &graphql.ArgumentConfig{Type: graphql.String},
			"addressState":  &graphql.ArgumentConfig{Type: graphql.String},
			"addressZip":    &graphql.ArgumentConfig{Type: graphql.String},
			"addressCountry": &graphql.ArgumentConfig{Type: graphql.String},
			"description":   &graphql.ArgumentConfig{Type: graphql.String},
			"logoUrl":       &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			c := &crm.Company{
				BusinessID:    p.Args["businessId"].(string),
				Name:          p.Args["name"].(string),
				Domain:        getStringArg(p.Args, "domain"),
				Industry:      getStringArg(p.Args, "industry"),
				EmployeeCount: getIntArg(p.Args, "employeeCount"),
				Revenue:       getFloatArg(p.Args, "revenue"),
				Website:       getStringArg(p.Args, "website"),
				Phone:         getStringArg(p.Args, "phone"),
				Email:         getStringArg(p.Args, "email"),
				AddressStreet: getStringArg(p.Args, "addressStreet"),
				AddressCity:   getStringArg(p.Args, "addressCity"),
				AddressState:  getStringArg(p.Args, "addressState"),
				AddressZip:    getStringArg(p.Args, "addressZip"),
				AddressCountry: getStringArg(p.Args, "addressCountry"),
				Description:   getStringArg(p.Args, "description"),
				LogoURL:       getStringArg(p.Args, "logoUrl"),
			}
			if err := AppContainer.CrmRepo.CreateCompany(p.Context, c); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": c.ID, "businessId": c.BusinessID, "name": c.Name,
				"domain": c.Domain, "industry": c.Industry, "employeeCount": c.EmployeeCount,
				"revenue": c.Revenue, "website": c.Website, "phone": c.Phone, "email": c.Email,
				"addressStreet": c.AddressStreet, "addressCity": c.AddressCity,
				"addressState": c.AddressState, "addressZip": c.AddressZip,
				"addressCountry": c.AddressCountry, "description": c.Description, "logoUrl": c.LogoURL,
				"createdAt": c.CreatedAt.Format(time.RFC3339),
				"updatedAt": c.UpdatedAt.Format(time.RFC3339),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("updateCrmCompany", &graphql.Field{
		Type: crmCompanyType,
		Args: graphql.FieldConfigArgument{
			"id":            &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"domain":        &graphql.ArgumentConfig{Type: graphql.String},
			"industry":      &graphql.ArgumentConfig{Type: graphql.String},
			"employeeCount": &graphql.ArgumentConfig{Type: graphql.Int},
			"revenue":       &graphql.ArgumentConfig{Type: graphql.Float},
			"website":       &graphql.ArgumentConfig{Type: graphql.String},
			"phone":         &graphql.ArgumentConfig{Type: graphql.String},
			"email":         &graphql.ArgumentConfig{Type: graphql.String},
			"addressStreet": &graphql.ArgumentConfig{Type: graphql.String},
			"addressCity":   &graphql.ArgumentConfig{Type: graphql.String},
			"addressState":  &graphql.ArgumentConfig{Type: graphql.String},
			"addressZip":    &graphql.ArgumentConfig{Type: graphql.String},
			"addressCountry": &graphql.ArgumentConfig{Type: graphql.String},
			"description":   &graphql.ArgumentConfig{Type: graphql.String},
			"logoUrl":       &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			existing, err := AppContainer.CrmRepo.GetCompany(p.Context, p.Args["id"].(string))
			if err != nil {
				return nil, err
			}
			c := &crm.Company{
				ID:            existing.ID,
				BusinessID:    p.Args["businessId"].(string),
				Name:          p.Args["name"].(string),
				Domain:        getStringArgDef(p.Args, "domain", existing.Domain),
				Industry:      getStringArgDef(p.Args, "industry", existing.Industry),
				EmployeeCount: getIntArgDef(p.Args, "employeeCount", existing.EmployeeCount),
				Revenue:       getFloatArgDef(p.Args, "revenue", existing.Revenue),
				Website:       getStringArgDef(p.Args, "website", existing.Website),
				Phone:         getStringArgDef(p.Args, "phone", existing.Phone),
				Email:         getStringArgDef(p.Args, "email", existing.Email),
				AddressStreet: getStringArgDef(p.Args, "addressStreet", existing.AddressStreet),
				AddressCity:   getStringArgDef(p.Args, "addressCity", existing.AddressCity),
				AddressState:  getStringArgDef(p.Args, "addressState", existing.AddressState),
				AddressZip:    getStringArgDef(p.Args, "addressZip", existing.AddressZip),
				AddressCountry: getStringArgDef(p.Args, "addressCountry", existing.AddressCountry),
				Description:   getStringArgDef(p.Args, "description", existing.Description),
				LogoURL:       getStringArgDef(p.Args, "logoUrl", existing.LogoURL),
				CreatedAt:     existing.CreatedAt,
			}
			if err := AppContainer.CrmRepo.UpdateCompany(p.Context, c); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": c.ID, "businessId": c.BusinessID, "name": c.Name,
				"domain": c.Domain, "industry": c.Industry, "employeeCount": c.EmployeeCount,
				"revenue": c.Revenue, "website": c.Website, "phone": c.Phone, "email": c.Email,
				"addressStreet": c.AddressStreet, "addressCity": c.AddressCity,
				"addressState": c.AddressState, "addressZip": c.AddressZip,
				"addressCountry": c.AddressCountry, "description": c.Description, "logoUrl": c.LogoURL,
				"createdAt": c.CreatedAt.Format(time.RFC3339),
				"updatedAt": c.UpdatedAt.Format(time.RFC3339),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("deleteCrmCompany", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return false, nil
			}
			err := AppContainer.CrmRepo.DeleteCompany(p.Context, p.Args["id"].(string), p.Args["businessId"].(string))
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("updateCrmContactCompany", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"contactId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"companyId": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return false, nil
			}
			cid, _ := p.Args["companyId"].(string)
			var cidPtr *string
			if cid != "" {
				cidPtr = &cid
			}
			err := AppContainer.CrmRepo.UpdateContactCompany(p.Context, p.Args["contactId"].(string), cidPtr)
			return err == nil, err
		},
	})
}
