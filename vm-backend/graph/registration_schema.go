package graph

import (
	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/registrations"
)

var businessRegistrationType = graphql.NewObject(graphql.ObjectConfig{
	Name: "BusinessRegistration",
	Fields: graphql.Fields{
		"id":               &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"registrationType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"legalName":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"taxId":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerName":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerDob":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerSsn":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerEmail":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"ownerPhone":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressStreet":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressCity":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressState":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressZip":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"addressCountry":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"documents":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"adminNotes":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("businessRegistrations", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(businessRegistrationType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.ID},
			"userId":     &graphql.ArgumentConfig{Type: graphql.ID},
			"status":     &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []*registrations.BusinessRegistration{}, nil
			}
			businessID, _ := p.Args["businessId"].(string)
			userID, _ := p.Args["userId"].(string)
			status, _ := p.Args["status"].(string)

			if businessID != "" {
				return AppContainer.RegistrationRepo.ListByBusiness(p.Context, businessID)
			}
			if status != "" {
				return AppContainer.RegistrationRepo.ListByStatus(p.Context, status)
			}
			if userID != "" {
				return AppContainer.RegistrationRepo.ListByUser(p.Context, userID)
			}
			return AppContainer.RegistrationRepo.ListAll(p.Context)
		},
	})

	rootMutation.AddFieldConfig("registerBusiness", &graphql.Field{
		Type: businessRegistrationType,
		Args: graphql.FieldConfigArgument{
			"businessId":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"userId":           &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"registrationType": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"legalName":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"taxId":            &graphql.ArgumentConfig{Type: graphql.String},
			"ownerName":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"ownerDob":         &graphql.ArgumentConfig{Type: graphql.String},
			"ownerSsn":         &graphql.ArgumentConfig{Type: graphql.String},
			"ownerEmail":       &graphql.ArgumentConfig{Type: graphql.String},
			"ownerPhone":       &graphql.ArgumentConfig{Type: graphql.String},
			"addressStreet":    &graphql.ArgumentConfig{Type: graphql.String},
			"addressCity":      &graphql.ArgumentConfig{Type: graphql.String},
			"addressState":     &graphql.ArgumentConfig{Type: graphql.String},
			"addressZip":       &graphql.ArgumentConfig{Type: graphql.String},
			"addressCountry":   &graphql.ArgumentConfig{Type: graphql.String},
			"documents":        &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			businessID := p.Args["businessId"].(string)
			userID := p.Args["userId"].(string)

			reg := &registrations.BusinessRegistration{
				BusinessID:       businessID,
				UserID:           userID,
				RegistrationType: p.Args["registrationType"].(string),
				LegalName:        p.Args["legalName"].(string),
				Status:           "pending",
			}
			if v, ok := p.Args["taxId"].(string); ok {
				reg.TaxID = v
			}
			if v, ok := p.Args["ownerName"].(string); ok {
				reg.OwnerName = v
			}
			if v, ok := p.Args["ownerDob"].(string); ok {
				reg.OwnerDOB = v
			}
			if v, ok := p.Args["ownerSsn"].(string); ok {
				reg.OwnerSSN = v
			}
			if v, ok := p.Args["ownerEmail"].(string); ok {
				reg.OwnerEmail = v
			}
			if v, ok := p.Args["ownerPhone"].(string); ok {
				reg.OwnerPhone = v
			}
			if v, ok := p.Args["addressStreet"].(string); ok {
				reg.AddressStreet = v
			}
			if v, ok := p.Args["addressCity"].(string); ok {
				reg.AddressCity = v
			}
			if v, ok := p.Args["addressState"].(string); ok {
				reg.AddressState = v
			}
			if v, ok := p.Args["addressZip"].(string); ok {
				reg.AddressZip = v
			}
			if v, ok := p.Args["addressCountry"].(string); ok {
				reg.AddressCountry = v
			}
			if v, ok := p.Args["documents"].(string); ok {
				reg.Documents = v
			}

			if err := AppContainer.RegistrationRepo.Create(p.Context, reg); err != nil {
				return nil, err
			}
			return reg, nil
		},
	})

	rootMutation.AddFieldConfig("approveBusinessRegistration", &graphql.Field{
		Type: businessRegistrationType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"adminNotes": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			id := p.Args["id"].(string)
			adminNotes, _ := p.Args["adminNotes"].(string)
			if err := AppContainer.RegistrationRepo.UpdateStatus(p.Context, id, "approved", adminNotes); err != nil {
				return nil, err
			}
			return AppContainer.RegistrationRepo.GetByID(p.Context, id)
		},
	})

	rootMutation.AddFieldConfig("rejectBusinessRegistration", &graphql.Field{
		Type: businessRegistrationType,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"adminNotes": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			id := p.Args["id"].(string)
			adminNotes, _ := p.Args["adminNotes"].(string)
			if err := AppContainer.RegistrationRepo.UpdateStatus(p.Context, id, "rejected", adminNotes); err != nil {
				return nil, err
			}
			return AppContainer.RegistrationRepo.GetByID(p.Context, id)
		},
	})
}
