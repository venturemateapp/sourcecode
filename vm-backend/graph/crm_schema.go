package graph

import (
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/crm"
)

func formatTime(t time.Time) string {
	return t.Format("2006-01-02T15:04:05Z")
}

func formatPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

var crmContactType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CrmContact",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"email":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"phone":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"company":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"jobTitle":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"contactType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"source":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"notes":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"avatar":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var crmDealType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CrmDeal",
	Fields: graphql.Fields{
		"id":                &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":        &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"contactId":         &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":             &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"value":             &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"currency":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"stage":             &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"probability":       &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"expectedCloseDate": &graphql.Field{Type: graphql.String},
		"createdAt":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var crmActivityType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CrmActivity",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"contactId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"type":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdBy":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var crmTaskType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CrmTask",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"contactId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"dueDate":     &graphql.Field{Type: graphql.String},
		"status":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"assignedTo":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	// Queries
	rootQuery.AddFieldConfig("crmContacts", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(crmContactType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return []interface{}{}, nil
			}
			contacts, err := AppContainer.CrmRepo.ListContacts(p.Context, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(contacts))
			for i, c := range contacts {
				result[i] = map[string]interface{}{
					"id": c.ID, "businessId": c.BusinessID, "name": c.Name, "email": c.Email,
					"phone": c.Phone, "company": c.Company, "jobTitle": c.JobTitle,
					"contactType": c.ContactType, "source": c.Source, "notes": c.Notes,
					"avatar": c.Avatar, "createdAt": formatTime(c.CreatedAt), "updatedAt": formatTime(c.UpdatedAt),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("crmDeals", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(crmDealType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return []interface{}{}, nil
			}
			deals, err := AppContainer.CrmRepo.ListDeals(p.Context, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(deals))
			for i, d := range deals {
				result[i] = map[string]interface{}{
					"id": d.ID, "businessId": d.BusinessID, "contactId": d.ContactID,
					"title": d.Title, "value": d.Value, "currency": d.Currency,
					"stage": d.Stage, "probability": d.Probability,
					"expectedCloseDate": formatPtr(d.ExpectedCloseDate),
					"createdAt": formatTime(d.CreatedAt), "updatedAt": formatTime(d.UpdatedAt),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("crmActivities", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(crmActivityType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return []interface{}{}, nil
			}
			activities, err := AppContainer.CrmRepo.ListActivities(p.Context, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(activities))
			for i, a := range activities {
				result[i] = map[string]interface{}{
					"id": a.ID, "businessId": a.BusinessID, "contactId": a.ContactID,
					"type": a.Type, "description": a.Description, "createdBy": a.CreatedBy,
					"createdAt": formatTime(a.CreatedAt),
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("crmTasks", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(crmTaskType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return []interface{}{}, nil
			}
			tasks, err := AppContainer.CrmRepo.ListTasks(p.Context, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(tasks))
			for i, t := range tasks {
				result[i] = map[string]interface{}{
					"id": t.ID, "businessId": t.BusinessID, "contactId": t.ContactID,
					"title": t.Title, "description": t.Description, "dueDate": formatPtr(t.DueDate),
					"status": t.Status, "assignedTo": t.AssignedTo,
					"createdAt": formatTime(t.CreatedAt), "updatedAt": formatTime(t.UpdatedAt),
				}
			}
			return result, nil
		},
	})

	// Mutations
	rootMutation.AddFieldConfig("createCrmContact", &graphql.Field{
		Type: crmContactType,
		Args: graphql.FieldConfigArgument{
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"email":       &graphql.ArgumentConfig{Type: graphql.String},
			"phone":       &graphql.ArgumentConfig{Type: graphql.String},
			"company":     &graphql.ArgumentConfig{Type: graphql.String},
			"jobTitle":    &graphql.ArgumentConfig{Type: graphql.String},
			"contactType": &graphql.ArgumentConfig{Type: graphql.String},
			"source":      &graphql.ArgumentConfig{Type: graphql.String},
			"notes":       &graphql.ArgumentConfig{Type: graphql.String},
			"avatar":      &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			c := &crm.Contact{
				BusinessID:  p.Args["businessId"].(string),
				Name:        p.Args["name"].(string),
				Email:       getStringArg(p.Args, "email"),
				Phone:       getStringArg(p.Args, "phone"),
				Company:     getStringArg(p.Args, "company"),
				JobTitle:    getStringArg(p.Args, "jobTitle"),
				ContactType: getStringArg(p.Args, "contactType"),
				Source:      getStringArg(p.Args, "source"),
				Notes:       getStringArg(p.Args, "notes"),
				Avatar:      getStringArg(p.Args, "avatar"),
			}
			if c.ContactType == "" {
				c.ContactType = "lead"
			}
			if err := AppContainer.CrmRepo.CreateContact(p.Context, c); err != nil {
				return nil, err
			}
			if AppContainer.WorkflowEngine != nil {
				AppContainer.WorkflowEngine.MatchAndExecute(p.Context, c.BusinessID, "record_created", "crm_contacts", map[string]interface{}{"contactId": c.ID, "name": c.Name, "email": c.Email, "contactType": c.ContactType})
			}
			return map[string]interface{}{
				"id": c.ID, "businessId": c.BusinessID, "name": c.Name, "email": c.Email,
				"phone": c.Phone, "company": c.Company, "jobTitle": c.JobTitle,
				"contactType": c.ContactType, "source": c.Source, "notes": c.Notes,
				"avatar": c.Avatar, "createdAt": formatTime(c.CreatedAt), "updatedAt": formatTime(c.UpdatedAt),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("updateCrmContact", &graphql.Field{
		Type: crmContactType,
		Args: graphql.FieldConfigArgument{
			"id":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"email":       &graphql.ArgumentConfig{Type: graphql.String},
			"phone":       &graphql.ArgumentConfig{Type: graphql.String},
			"company":     &graphql.ArgumentConfig{Type: graphql.String},
			"jobTitle":    &graphql.ArgumentConfig{Type: graphql.String},
			"contactType": &graphql.ArgumentConfig{Type: graphql.String},
			"source":      &graphql.ArgumentConfig{Type: graphql.String},
			"notes":       &graphql.ArgumentConfig{Type: graphql.String},
			"avatar":      &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			c := &crm.Contact{
				ID:          p.Args["id"].(string),
				BusinessID:  p.Args["businessId"].(string),
				Name:        p.Args["name"].(string),
				Email:       getStringArg(p.Args, "email"),
				Phone:       getStringArg(p.Args, "phone"),
				Company:     getStringArg(p.Args, "company"),
				JobTitle:    getStringArg(p.Args, "jobTitle"),
				ContactType: getStringArg(p.Args, "contactType"),
				Source:      getStringArg(p.Args, "source"),
				Notes:       getStringArg(p.Args, "notes"),
				Avatar:      getStringArg(p.Args, "avatar"),
			}
			if c.ContactType == "" {
				c.ContactType = "lead"
			}
			existing, err := AppContainer.CrmRepo.GetContact(p.Context, c.ID)
			if err != nil {
				return nil, err
			}
			c.CreatedAt = existing.CreatedAt
			if err := AppContainer.CrmRepo.UpdateContact(p.Context, c); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": c.ID, "businessId": c.BusinessID, "name": c.Name, "email": c.Email,
				"phone": c.Phone, "company": c.Company, "jobTitle": c.JobTitle,
				"contactType": c.ContactType, "source": c.Source, "notes": c.Notes,
				"avatar": c.Avatar, "createdAt": formatTime(c.CreatedAt), "updatedAt": formatTime(c.UpdatedAt),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("deleteCrmContact", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return false, nil
			}
			err := AppContainer.CrmRepo.DeleteContact(p.Context, p.Args["id"].(string), p.Args["businessId"].(string))
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("createCrmDeal", &graphql.Field{
		Type: crmDealType,
		Args: graphql.FieldConfigArgument{
			"businessId":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"contactId":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"title":             &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"value":             &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"currency":          &graphql.ArgumentConfig{Type: graphql.String},
			"stage":             &graphql.ArgumentConfig{Type: graphql.String},
			"probability":       &graphql.ArgumentConfig{Type: graphql.Int},
			"expectedCloseDate": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			stage := getStringArg(p.Args, "stage")
			if stage == "" {
				stage = "prospecting"
			}
			prob := getIntArgDef(p.Args, "probability", 10)
			if prob == 0 {
				prob = 10
			}
			ecd := getStringArg(p.Args, "expectedCloseDate")
			d := &crm.Deal{
				BusinessID:        p.Args["businessId"].(string),
				ContactID:         p.Args["contactId"].(string),
				Title:             p.Args["title"].(string),
				Value:             p.Args["value"].(float64),
				Currency:          getStringArg(p.Args, "currency"),
				Stage:             stage,
				Probability:       prob,
				ExpectedCloseDate: strPtr(ecd),
			}
			if d.Currency == "" {
				d.Currency = "USD"
			}
			if err := AppContainer.CrmRepo.CreateDeal(p.Context, d); err != nil {
				return nil, err
			}
			if AppContainer.WorkflowEngine != nil {
				AppContainer.WorkflowEngine.MatchAndExecute(p.Context, d.BusinessID, "record_created", "crm_deals", map[string]interface{}{"dealId": d.ID, "title": d.Title, "value": d.Value, "stage": d.Stage})
			}
			return map[string]interface{}{
				"id": d.ID, "businessId": d.BusinessID, "contactId": d.ContactID,
				"title": d.Title, "value": d.Value, "currency": d.Currency,
				"stage": d.Stage, "probability": d.Probability,
				"expectedCloseDate": formatPtr(d.ExpectedCloseDate),
				"createdAt": formatTime(d.CreatedAt), "updatedAt": formatTime(d.UpdatedAt),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("updateCrmDeal", &graphql.Field{
		Type: crmDealType,
		Args: graphql.FieldConfigArgument{
			"id":                &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"contactId":         &graphql.ArgumentConfig{Type: graphql.String},
			"title":             &graphql.ArgumentConfig{Type: graphql.String},
			"value":             &graphql.ArgumentConfig{Type: graphql.Float},
			"currency":          &graphql.ArgumentConfig{Type: graphql.String},
			"stage":             &graphql.ArgumentConfig{Type: graphql.String},
			"probability":       &graphql.ArgumentConfig{Type: graphql.Int},
			"expectedCloseDate": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			existing, err := AppContainer.CrmRepo.GetDeal(p.Context, p.Args["id"].(string))
			if err != nil {
				return nil, err
			}
			d := &crm.Deal{
				ID:        existing.ID,
				BusinessID: p.Args["businessId"].(string),
				ContactID:  getStringArgDef(p.Args, "contactId", existing.ContactID),
				Title:     getStringArgDef(p.Args, "title", existing.Title),
				Value:     getFloatArgDef(p.Args, "value", existing.Value),
				Currency:  getStringArgDef(p.Args, "currency", existing.Currency),
				Stage:     getStringArgDef(p.Args, "stage", existing.Stage),
				Probability: getIntArgDef(p.Args, "probability", existing.Probability),
				CreatedAt: existing.CreatedAt,
			}
			if ecd, ok := p.Args["expectedCloseDate"].(string); ok {
				d.ExpectedCloseDate = strPtr(ecd)
			} else {
				d.ExpectedCloseDate = existing.ExpectedCloseDate
			}
			if err := AppContainer.CrmRepo.UpdateDeal(p.Context, d); err != nil {
				return nil, err
			}
			if AppContainer.WorkflowEngine != nil && existing.Stage != d.Stage {
				AppContainer.WorkflowEngine.MatchAndExecute(p.Context, d.BusinessID, "deal_stage_changed", "crm_deals", map[string]interface{}{"dealId": d.ID, "title": d.Title, "value": d.Value, "oldStage": existing.Stage, "newStage": d.Stage})
			}
			return map[string]interface{}{
				"id": d.ID, "businessId": d.BusinessID, "contactId": d.ContactID,
				"title": d.Title, "value": d.Value, "currency": d.Currency,
				"stage": d.Stage, "probability": d.Probability,
				"expectedCloseDate": formatPtr(d.ExpectedCloseDate),
				"createdAt": formatTime(d.CreatedAt), "updatedAt": formatTime(d.UpdatedAt),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("deleteCrmDeal", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return false, nil
			}
			err := AppContainer.CrmRepo.DeleteDeal(p.Context, p.Args["id"].(string), p.Args["businessId"].(string))
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("createCrmActivity", &graphql.Field{
		Type: crmActivityType,
		Args: graphql.FieldConfigArgument{
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"contactId":   &graphql.ArgumentConfig{Type: graphql.String},
			"type":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"createdBy":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			a := &crm.Activity{
				BusinessID:  p.Args["businessId"].(string),
				ContactID:   getStringArg(p.Args, "contactId"),
				Type:        p.Args["type"].(string),
				Description: p.Args["description"].(string),
				CreatedBy:   p.Args["createdBy"].(string),
			}
			if err := AppContainer.CrmRepo.CreateActivity(p.Context, a); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": a.ID, "businessId": a.BusinessID, "contactId": a.ContactID,
				"type": a.Type, "description": a.Description, "createdBy": a.CreatedBy,
				"createdAt": formatTime(a.CreatedAt),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("deleteCrmActivity", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return false, nil
			}
			err := AppContainer.CrmRepo.DeleteActivity(p.Context, p.Args["id"].(string), p.Args["businessId"].(string))
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("createCrmTask", &graphql.Field{
		Type: crmTaskType,
		Args: graphql.FieldConfigArgument{
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"contactId":   &graphql.ArgumentConfig{Type: graphql.String},
			"title":       &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
			"dueDate":     &graphql.ArgumentConfig{Type: graphql.String},
			"status":      &graphql.ArgumentConfig{Type: graphql.String},
			"assignedTo":  &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			status := getStringArg(p.Args, "status")
			if status == "" {
				status = "pending"
			}
			t := &crm.Task{
				BusinessID:  p.Args["businessId"].(string),
				ContactID:   getStringArg(p.Args, "contactId"),
				Title:       p.Args["title"].(string),
				Description: getStringArg(p.Args, "description"),
				DueDate:     strPtr(getStringArg(p.Args, "dueDate")),
				Status:      status,
				AssignedTo:  getStringArg(p.Args, "assignedTo"),
			}
			if err := AppContainer.CrmRepo.CreateTask(p.Context, t); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": t.ID, "businessId": t.BusinessID, "contactId": t.ContactID,
				"title": t.Title, "description": t.Description, "dueDate": formatPtr(t.DueDate),
				"status": t.Status, "assignedTo": t.AssignedTo,
				"createdAt": formatTime(t.CreatedAt), "updatedAt": formatTime(t.UpdatedAt),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("updateCrmTask", &graphql.Field{
		Type: crmTaskType,
		Args: graphql.FieldConfigArgument{
			"id":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"contactId":   &graphql.ArgumentConfig{Type: graphql.String},
			"title":       &graphql.ArgumentConfig{Type: graphql.String},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
			"dueDate":     &graphql.ArgumentConfig{Type: graphql.String},
			"status":      &graphql.ArgumentConfig{Type: graphql.String},
			"assignedTo":  &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return nil, nil
			}
			existing, err := AppContainer.CrmRepo.GetTask(p.Context, p.Args["id"].(string))
			if err != nil {
				return nil, err
			}
			t := &crm.Task{
				ID:          existing.ID,
				BusinessID:  p.Args["businessId"].(string),
				ContactID:   getStringArgDef(p.Args, "contactId", existing.ContactID),
				Title:       getStringArgDef(p.Args, "title", existing.Title),
				Description: getStringArgDef(p.Args, "description", existing.Description),
				Status:      getStringArgDef(p.Args, "status", existing.Status),
				AssignedTo:  getStringArgDef(p.Args, "assignedTo", existing.AssignedTo),
				CreatedAt:   existing.CreatedAt,
			}
			if dd, ok := p.Args["dueDate"].(string); ok {
				t.DueDate = strPtr(dd)
			} else {
				t.DueDate = existing.DueDate
			}
			if err := AppContainer.CrmRepo.UpdateTask(p.Context, t); err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": t.ID, "businessId": t.BusinessID, "contactId": t.ContactID,
				"title": t.Title, "description": t.Description, "dueDate": formatPtr(t.DueDate),
				"status": t.Status, "assignedTo": t.AssignedTo,
				"createdAt": formatTime(t.CreatedAt), "updatedAt": formatTime(t.UpdatedAt),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("deleteCrmTask", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":         &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CrmRepo == nil {
				return false, nil
			}
			err := AppContainer.CrmRepo.DeleteTask(p.Context, p.Args["id"].(string), p.Args["businessId"].(string))
			return err == nil, err
		},
	})
}

func getStringArgDef(args map[string]interface{}, key, def string) string {
	if v, ok := args[key].(string); ok && v != "" {
		return v
	}
	return def
}

func getFloatArgDef(args map[string]interface{}, key string, def float64) float64 {
	if v, ok := args[key].(float64); ok {
		return v
	}
	if v, ok := args[key].(int); ok {
		return float64(v)
	}
	return def
}

func getIntArgDef(args map[string]interface{}, key string, def int) int {
	if v, ok := args[key].(int); ok {
		return v
	}
	if v, ok := args[key].(float64); ok {
		return int(v)
	}
	return def
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
