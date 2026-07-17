package graph

import (
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/crmobjects"
)

var customObjectType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CustomObject",
	Fields: graphql.Fields{
		"id":            &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessId":    &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"nameSingular":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"namePlural":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"labelSingular": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"labelPlural":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"icon":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var customFieldType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CustomField",
	Fields: graphql.Fields{
		"id":           &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"objectId":     &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"label":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"fieldType":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"isRequired":   &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"defaultValue": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"options":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"sortOrder":    &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
	},
})

func init() {
	rootQuery.AddFieldConfig("customObjects", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(customObjectType))),
		Args: graphql.FieldConfigArgument{"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CustomObjectsRepo == nil { return []interface{}{}, nil }
			objs, err := AppContainer.CustomObjectsRepo.ListObjects(p.Context, p.Args["businessId"].(string))
			if err != nil { return nil, err }
			result := make([]interface{}, len(objs))
			for i, o := range objs { result[i] = map[string]interface{}{"id": o.ID, "businessId": o.BusinessID, "nameSingular": o.NameSingular, "namePlural": o.NamePlural, "labelSingular": o.LabelSingular, "labelPlural": o.LabelPlural, "icon": o.Icon, "description": o.Description, "createdAt": o.CreatedAt.Format(time.RFC3339)} }
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("customFields", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(customFieldType))),
		Args: graphql.FieldConfigArgument{"objectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CustomObjectsRepo == nil { return []interface{}{}, nil }
			fields, err := AppContainer.CustomObjectsRepo.ListFields(p.Context, p.Args["objectId"].(string))
			if err != nil { return nil, err }
			result := make([]interface{}, len(fields))
			for i, f := range fields { result[i] = map[string]interface{}{"id": f.ID, "objectId": f.ObjectID, "name": f.Name, "label": f.Label, "fieldType": f.FieldType, "isRequired": f.IsRequired, "defaultValue": f.DefaultValue, "options": f.Options, "sortOrder": f.SortOrder} }
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("createCustomObject", &graphql.Field{
		Type: customObjectType,
		Args: graphql.FieldConfigArgument{
			"businessId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"nameSingular":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"namePlural":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"labelSingular": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"labelPlural":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"icon":          &graphql.ArgumentConfig{Type: graphql.String},
			"description":   &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CustomObjectsRepo == nil { return nil, nil }
			o := &crmobjects.ObjectDef{BusinessID: p.Args["businessId"].(string), NameSingular: p.Args["nameSingular"].(string), NamePlural: p.Args["namePlural"].(string), LabelSingular: p.Args["labelSingular"].(string), LabelPlural: p.Args["labelPlural"].(string), Icon: getStringArg(p.Args, "icon"), Description: getStringArg(p.Args, "description"), IsActive: true}
			if err := AppContainer.CustomObjectsRepo.CreateObject(p.Context, o); err != nil { return nil, err }
			return map[string]interface{}{"id": o.ID, "businessId": o.BusinessID, "nameSingular": o.NameSingular, "namePlural": o.NamePlural, "labelSingular": o.LabelSingular, "labelPlural": o.LabelPlural, "icon": o.Icon, "description": o.Description, "createdAt": o.CreatedAt.Format(time.RFC3339)}, nil
		},
	})

	rootMutation.AddFieldConfig("createCustomField", &graphql.Field{
		Type: customFieldType,
		Args: graphql.FieldConfigArgument{
			"objectId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"name":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"label":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"fieldType": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"isRequired": &graphql.ArgumentConfig{Type: graphql.Boolean},
			"options":   &graphql.ArgumentConfig{Type: graphql.String},
			"sortOrder": &graphql.ArgumentConfig{Type: graphql.Int},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.CustomObjectsRepo == nil { return nil, nil }
			f := &crmobjects.FieldDef{ObjectID: p.Args["objectId"].(string), Name: p.Args["name"].(string), Label: p.Args["label"].(string), FieldType: p.Args["fieldType"].(string), IsRequired: getBoolArg(p.Args, "isRequired"), Options: getStringArg(p.Args, "options"), SortOrder: getIntArg(p.Args, "sortOrder"), IsActive: true}
			if err := AppContainer.CustomObjectsRepo.CreateField(p.Context, f); err != nil { return nil, err }
			return map[string]interface{}{"id": f.ID, "objectId": f.ObjectID, "name": f.Name, "label": f.Label, "fieldType": f.FieldType, "isRequired": f.IsRequired, "defaultValue": f.DefaultValue, "options": f.Options, "sortOrder": f.SortOrder}, nil
		},
	})
}
