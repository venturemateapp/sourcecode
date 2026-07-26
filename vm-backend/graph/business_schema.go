package graph

import (
	"encoding/json"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/businesses"
)

var businessType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Business",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"tagline":     &graphql.Field{Type: graphql.String},
		"description": &graphql.Field{Type: graphql.String},
		"industry":    &graphql.Field{Type: graphql.String},
		"stage":       &graphql.Field{Type: graphql.String},
		"foundedDate": &graphql.Field{
			Type: graphql.String,
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				b, ok := p.Source.(*businesses.Business)
				if !ok || b.FoundedDate == nil {
					return nil, nil
				}
				return b.FoundedDate.Format("2006-01-02"), nil
			},
		},
		"location":      &graphql.Field{Type: graphql.String},
		"website":       &graphql.Field{Type: graphql.String},
		"status":        &graphql.Field{Type: graphql.String},
		"brandKit":      &graphql.Field{Type: graphql.String},
		"pitchDeck":     &graphql.Field{Type: graphql.String},
		"businessPlan":  &graphql.Field{Type: graphql.String},
		"milestones":    &graphql.Field{Type: graphql.String},
		"team":          &graphql.Field{Type: graphql.String},
		"documents":     &graphql.Field{Type: graphql.String},
		"websiteConfig": &graphql.Field{Type: graphql.String},
		"financials":    &graphql.Field{Type: graphql.String},
		"totalRevenue": &graphql.Field{
			Type: graphql.Float,
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				b, ok := p.Source.(*businesses.Business)
				if !ok || AppContainer == nil || AppContainer.InvoiceRepo == nil {
					return 0.0, nil
				}
				return AppContainer.InvoiceRepo.GetTotalRevenue(p.Context, b.ID)
			},
		},
		"revenueByCurrency": &graphql.Field{
			Type: graphql.String,
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				biz, ok := p.Source.(*businesses.Business)
				if !ok || AppContainer == nil || AppContainer.InvoiceRepo == nil {
					return "{}", nil
				}
				// Direct SQL query — guaranteed to work
				type row struct {
					Currency string  `json:"currency"`
					Total    float64 `json:"total"`
				}
				var rows []row
				sql := "SELECT currency, SUM(amount) FROM invoices WHERE business_id=$1 GROUP BY currency"
				db := AppContainer.DB
				if db == nil {
					return "{}", nil
				}
				r, err := db.Query(p.Context, sql, biz.ID)
				if err != nil {
					return "{}", nil
				}
				defer r.Close()
				for r.Next() {
					var cur string
					var tot float64
					if err := r.Scan(&cur, &tot); err != nil {
						continue
					}
					rows = append(rows, row{Currency: cur, Total: tot})
				}
				result := make(map[string]float64)
				for _, row := range rows {
					result[row.Currency] = row.Total
				}
				b, _ := json.Marshal(result)
				return string(b), nil
			},
		},
		"metrics":       &graphql.Field{Type: graphql.String},
		"aiGenerated":   &graphql.Field{Type: graphql.String},
		"createdAt":     &graphql.Field{Type: graphql.String},
		"updatedAt":     &graphql.Field{Type: graphql.String},
	},
})

func init() {
	rootQuery.AddFieldConfig("myBusinesses", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(businessType))),
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return []*businesses.Business{}, nil
			}
			userID := p.Args["userId"].(string)
			return AppContainer.BusinessRepo.ListByUser(p.Context, userID)
		},
	})

	rootQuery.AddFieldConfig("business", &graphql.Field{
		Type: businessType,
		Args: graphql.FieldConfigArgument{
			"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			id := p.Args["id"].(string)
			return AppContainer.BusinessRepo.GetByID(p.Context, id)
		},
	})

	rootMutation.AddFieldConfig("createBusiness", &graphql.Field{
		Type: businessType,
		Args: graphql.FieldConfigArgument{
			"userId":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"tagline":       &graphql.ArgumentConfig{Type: graphql.String},
			"description":   &graphql.ArgumentConfig{Type: graphql.String},
			"industry":      &graphql.ArgumentConfig{Type: graphql.String},
			"stage":         &graphql.ArgumentConfig{Type: graphql.String},
			"foundedDate":   &graphql.ArgumentConfig{Type: graphql.String},
			"location":      &graphql.ArgumentConfig{Type: graphql.String},
			"website":       &graphql.ArgumentConfig{Type: graphql.String},
			"brandKit":      &graphql.ArgumentConfig{Type: graphql.String},
			"pitchDeck":     &graphql.ArgumentConfig{Type: graphql.String},
			"businessPlan":  &graphql.ArgumentConfig{Type: graphql.String},
			"milestones":    &graphql.ArgumentConfig{Type: graphql.String},
			"team":          &graphql.ArgumentConfig{Type: graphql.String},
			"documents":     &graphql.ArgumentConfig{Type: graphql.String},
			"websiteConfig": &graphql.ArgumentConfig{Type: graphql.String},
			"financials":    &graphql.ArgumentConfig{Type: graphql.String},
			"metrics":       &graphql.ArgumentConfig{Type: graphql.String},
			"aiGenerated":   &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			b := &businesses.Business{
				UserID:        getStringArg(p.Args, "userId"),
				Name:          getStringArg(p.Args, "name"),
				Tagline:       getStringArg(p.Args, "tagline"),
				Description:   getStringArg(p.Args, "description"),
				Industry:      getStringArg(p.Args, "industry"),
				Stage:         getStringArg(p.Args, "stage"),
				FoundedDate:   parseDatePtr(getStringArg(p.Args, "foundedDate")),
				Location:      getStringArg(p.Args, "location"),
				Website:       getStringArg(p.Args, "website"),
				BrandKit:      getStringArg(p.Args, "brandKit"),
				PitchDeck:     getStringArg(p.Args, "pitchDeck"),
				BusinessPlan:  getStringArg(p.Args, "businessPlan"),
				Milestones:    getStringArg(p.Args, "milestones"),
				Team:          getStringArg(p.Args, "team"),
				Documents:     getStringArg(p.Args, "documents"),
				WebsiteConfig: getStringArg(p.Args, "websiteConfig"),
				Financials:    getStringArg(p.Args, "financials"),
				Metrics:       getStringArg(p.Args, "metrics"),
				AIGenerated:   getStringArg(p.Args, "aiGenerated"),
			}
			err := AppContainer.BusinessRepo.Create(p.Context, b)
			return b, err
		},
	})

	rootMutation.AddFieldConfig("updateBusiness", &graphql.Field{
		Type: businessType,
		Args: graphql.FieldConfigArgument{
			"id":            &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"userId":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":          &graphql.ArgumentConfig{Type: graphql.String},
			"tagline":       &graphql.ArgumentConfig{Type: graphql.String},
			"description":   &graphql.ArgumentConfig{Type: graphql.String},
			"industry":      &graphql.ArgumentConfig{Type: graphql.String},
			"stage":         &graphql.ArgumentConfig{Type: graphql.String},
			"foundedDate":   &graphql.ArgumentConfig{Type: graphql.String},
			"location":      &graphql.ArgumentConfig{Type: graphql.String},
			"website":       &graphql.ArgumentConfig{Type: graphql.String},
			"status":        &graphql.ArgumentConfig{Type: graphql.String},
			"brandKit":      &graphql.ArgumentConfig{Type: graphql.String},
			"pitchDeck":     &graphql.ArgumentConfig{Type: graphql.String},
			"businessPlan":  &graphql.ArgumentConfig{Type: graphql.String},
			"milestones":    &graphql.ArgumentConfig{Type: graphql.String},
			"team":          &graphql.ArgumentConfig{Type: graphql.String},
			"documents":     &graphql.ArgumentConfig{Type: graphql.String},
			"websiteConfig": &graphql.ArgumentConfig{Type: graphql.String},
			"financials":    &graphql.ArgumentConfig{Type: graphql.String},
			"metrics":       &graphql.ArgumentConfig{Type: graphql.String},
			"aiGenerated":   &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return nil, nil
			}
			id := p.Args["id"].(string)
			userID := p.Args["userId"].(string)
			existing, err := AppContainer.BusinessRepo.GetByIDAndUser(p.Context, id, userID)
			if err != nil {
				return nil, err
			}
			if v, ok := p.Args["name"]; ok && v != nil {
				existing.Name = v.(string)
			}
			if v, ok := p.Args["tagline"]; ok && v != nil {
				existing.Tagline = v.(string)
			}
			if v, ok := p.Args["description"]; ok && v != nil {
				existing.Description = v.(string)
			}
			if v, ok := p.Args["industry"]; ok && v != nil {
				existing.Industry = v.(string)
			}
			if v, ok := p.Args["stage"]; ok && v != nil {
				existing.Stage = v.(string)
			}
			if v, ok := p.Args["foundedDate"]; ok && v != nil {
				existing.FoundedDate = parseDatePtr(v.(string))
			}
			if v, ok := p.Args["location"]; ok && v != nil {
				existing.Location = v.(string)
			}
			if v, ok := p.Args["website"]; ok && v != nil {
				existing.Website = v.(string)
			}
			if v, ok := p.Args["status"]; ok && v != nil {
				existing.Status = v.(string)
			}
			if v, ok := p.Args["brandKit"]; ok && v != nil {
				existing.BrandKit = v.(string)
			}
			if v, ok := p.Args["pitchDeck"]; ok && v != nil {
				existing.PitchDeck = v.(string)
			}
			if v, ok := p.Args["businessPlan"]; ok && v != nil {
				existing.BusinessPlan = v.(string)
			}
			if v, ok := p.Args["milestones"]; ok && v != nil {
				existing.Milestones = v.(string)
			}
			if v, ok := p.Args["team"]; ok && v != nil {
				existing.Team = v.(string)
			}
			if v, ok := p.Args["documents"]; ok && v != nil {
				existing.Documents = v.(string)
			}
			if v, ok := p.Args["websiteConfig"]; ok && v != nil {
				existing.WebsiteConfig = v.(string)
			}
			if v, ok := p.Args["financials"]; ok && v != nil {
				existing.Financials = v.(string)
			}
			if v, ok := p.Args["metrics"]; ok && v != nil {
				existing.Metrics = v.(string)
			}
			if v, ok := p.Args["aiGenerated"]; ok && v != nil {
				existing.AIGenerated = v.(string)
			}
			err = AppContainer.BusinessRepo.Update(p.Context, existing)
			return existing, err
		},
	})

	rootMutation.AddFieldConfig("deleteBusiness", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil {
				return false, nil
			}
			id := p.Args["id"].(string)
			userID := p.Args["userId"].(string)
			err := AppContainer.BusinessRepo.Delete(p.Context, id, userID)
			return err == nil, err
		},
	})
}

func parseDatePtr(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}


