package graph

import (
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/crmworkflow"
)

var workflowType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Workflow",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isActive":    &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootQuery.AddFieldConfig("workflows", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(workflowType))),
		Args: graphql.FieldConfigArgument{"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WorkflowRepo == nil { return []interface{}{}, nil }
			wfs, err := AppContainer.WorkflowRepo.List(p.Context, p.Args["businessId"].(string))
			if err != nil { return nil, err }
			result := make([]interface{}, len(wfs))
			for i, w := range wfs { result[i] = map[string]interface{}{"id": w.ID, "businessId": w.BusinessID, "name": w.Name, "description": w.Description, "isActive": w.IsActive, "createdAt": w.CreatedAt.Format(time.RFC3339), "updatedAt": w.UpdatedAt.Format(time.RFC3339)} }
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("createWorkflow", &graphql.Field{
		Type: workflowType,
		Args: graphql.FieldConfigArgument{
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WorkflowRepo == nil { return nil, nil }
			w := &crmworkflow.Workflow{BusinessID: p.Args["businessId"].(string), Name: p.Args["name"].(string), Description: getStringArg(p.Args, "description")}
			if err := AppContainer.WorkflowRepo.Create(p.Context, w); err != nil { return nil, err }
			return map[string]interface{}{"id": w.ID, "businessId": w.BusinessID, "name": w.Name, "description": w.Description, "isActive": w.IsActive, "createdAt": w.CreatedAt.Format(time.RFC3339), "updatedAt": w.UpdatedAt.Format(time.RFC3339)}, nil
		},
	})

	rootMutation.AddFieldConfig("toggleWorkflow", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"active": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Boolean)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WorkflowRepo == nil { return false, nil }
			err := AppContainer.WorkflowRepo.ToggleActive(p.Context, p.Args["id"].(string), p.Args["active"].(bool))
			return err == nil, err
		},
	})

	rootMutation.AddFieldConfig("deleteWorkflow", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WorkflowRepo == nil { return false, nil }
			err := AppContainer.WorkflowRepo.Delete(p.Context, p.Args["id"].(string))
			return err == nil, err
		},
	})
}
