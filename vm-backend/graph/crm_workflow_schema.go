package graph

import (
	"encoding/json"
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
		"triggerType": &graphql.Field{Type: graphql.String},
		"targetObject": &graphql.Field{Type: graphql.String},
		"conditions":  &graphql.Field{Type: graphql.String},
		"actionType":  &graphql.Field{Type: graphql.String},
		"actionConfig": &graphql.Field{Type: graphql.String},
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
			for i, w := range wfs {
				triggerType := ""
				targetObject := ""
				conditions := ""
				actionType := ""
				actionConfig := ""
				if t, err := AppContainer.WorkflowRepo.GetTriggerByWorkflow(p.Context, w.ID); err == nil {
					triggerType = t.TriggerType
					targetObject = t.TargetObject
					conditions = t.Conditions
				}
				if actions, err := AppContainer.WorkflowRepo.ListActions(p.Context, w.ID); err == nil && len(actions) > 0 {
					actionType = actions[0].ActionType
					actionConfig = actions[0].ActionConfig
				}
				result[i] = map[string]interface{}{
					"id": w.ID, "businessId": w.BusinessID, "name": w.Name, "description": w.Description,
					"triggerType": triggerType, "targetObject": targetObject, "conditions": conditions,
					"actionType": actionType, "actionConfig": actionConfig,
					"isActive": w.IsActive,
					"createdAt": w.CreatedAt.Format(time.RFC3339),
					"updatedAt": w.UpdatedAt.Format(time.RFC3339),
				}
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("createWorkflow", &graphql.Field{
		Type: workflowType,
		Args: graphql.FieldConfigArgument{
			"businessId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.ArgumentConfig{Type: graphql.String},
			"triggerType": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"targetObject": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"conditions":  &graphql.ArgumentConfig{Type: graphql.String},
			"actionType":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"actionConfig": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WorkflowRepo == nil { return nil, nil }
			w := &crmworkflow.Workflow{BusinessID: p.Args["businessId"].(string), Name: p.Args["name"].(string), Description: getStringArg(p.Args, "description")}
			if err := AppContainer.WorkflowRepo.Create(p.Context, w); err != nil { return nil, err }

			// Save trigger
			t := &crmworkflow.Trigger{WorkflowID: w.ID, TriggerType: p.Args["triggerType"].(string), TargetObject: p.Args["targetObject"].(string), Conditions: getStringArg(p.Args, "conditions")}
			AppContainer.WorkflowRepo.SaveTrigger(p.Context, t)

			// Save action
			ac := &crmworkflow.Action{WorkflowID: w.ID, ActionType: p.Args["actionType"].(string), ActionConfig: p.Args["actionConfig"].(string), SortOrder: 0}
			AppContainer.WorkflowRepo.SaveAction(p.Context, ac)

			return map[string]interface{}{
				"id": w.ID, "businessId": w.BusinessID, "name": w.Name, "description": w.Description,
				"triggerType": t.TriggerType, "targetObject": t.TargetObject, "conditions": t.Conditions,
				"actionType": ac.ActionType, "actionConfig": ac.ActionConfig,
				"isActive": w.IsActive,
				"createdAt": w.CreatedAt.Format(time.RFC3339),
				"updatedAt": w.UpdatedAt.Format(time.RFC3339),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("toggleWorkflow", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "active": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Boolean)}},
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

	rootMutation.AddFieldConfig("executeWorkflow", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"workflowId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"triggerData": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.WorkflowEngine == nil { return false, nil }
			var data map[string]interface{}
			json.Unmarshal([]byte(p.Args["triggerData"].(string)), &data)
			err := AppContainer.WorkflowEngine.Execute(p.Context, p.Args["workflowId"].(string), data)
			return err == nil, err
		},
	})
}
