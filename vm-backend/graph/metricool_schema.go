package graph

import (
	"github.com/graphql-go/graphql"
)

var metricoolConnectionType = graphql.NewObject(graphql.ObjectConfig{
	Name: "MetricoolConnection",
	Fields: graphql.Fields{
		"id":              &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userId":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"metricoolUserId": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"activeBrandId":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var metricoolBrandType = graphql.NewObject(graphql.ObjectConfig{
	Name: "MetricoolBrand",
	Fields: graphql.Fields{
		"id":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"label":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"userId":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"timezone": &graphql.Field{Type: graphql.String},
	},
})

var metricoolPostType = graphql.NewObject(graphql.ObjectConfig{
	Name: "MetricoolPost",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"text":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"date":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"impressions": &graphql.Field{Type: graphql.Int},
		"engagement":  &graphql.Field{Type: graphql.Int},
		"likes":       &graphql.Field{Type: graphql.Int},
		"comments":    &graphql.Field{Type: graphql.Int},
		"shares":      &graphql.Field{Type: graphql.Int},
		"mediaUrl":    &graphql.Field{Type: graphql.String},
		"permalink":   &graphql.Field{Type: graphql.String},
	},
})

var metricoolScheduledPostType = graphql.NewObject(graphql.ObjectConfig{
	Name: "MetricoolScheduledPost",
	Fields: graphql.Fields{
		"id":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"text":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"date":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"network": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var metricoolAccountMetricsType = graphql.NewObject(graphql.ObjectConfig{
	Name: "MetricoolAccountMetrics",
	Fields: graphql.Fields{
		"followers":  &graphql.Field{Type: graphql.Int},
		"following":  &graphql.Field{Type: graphql.Int},
		"postsCount": &graphql.Field{Type: graphql.Int},
		"engagement": &graphql.Field{Type: graphql.Float},
	},
})

func init() {
	rootQuery.AddFieldConfig("metricoolConnection", &graphql.Field{
		Type: metricoolConnectionType,
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MetricoolService == nil {
				return nil, nil
			}
			conn, err := AppContainer.MetricoolService.GetConnection(p.Context, p.Args["userId"].(string))
			if err != nil {
				return nil, nil
			}
			return map[string]interface{}{
				"id":              conn.ID,
				"userId":          conn.UserID,
				"metricoolUserId": conn.MetricoolUserID,
				"activeBrandId":   conn.ActiveBrandID,
				"createdAt":       conn.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt":       conn.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootQuery.AddFieldConfig("metricoolBrands", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(metricoolBrandType))),
		Args: graphql.FieldConfigArgument{
			"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MetricoolService == nil {
				return []interface{}{}, nil
			}
			conn, err := AppContainer.MetricoolService.GetConnection(p.Context, p.Args["userId"].(string))
			if err != nil {
				return []interface{}{}, nil
			}
			brands, err := AppContainer.MetricoolService.GetBrands(p.Context, conn)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(brands))
			for i, b := range brands {
				result[i] = map[string]interface{}{
					"id": b.ID, "label": b.Label, "userId": b.UserID, "timezone": b.Timezone,
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("metricoolPosts", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(metricoolPostType))),
		Args: graphql.FieldConfigArgument{
			"userId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"brandId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"network":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"postType": &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MetricoolService == nil {
				return []interface{}{}, nil
			}
			conn, err := AppContainer.MetricoolService.GetConnection(p.Context, p.Args["userId"].(string))
			if err != nil {
				return []interface{}{}, nil
			}
			postType, _ := p.Args["postType"].(string)
			posts, err := AppContainer.MetricoolService.GetPosts(p.Context, conn, p.Args["brandId"].(string), p.Args["network"].(string), postType)
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(posts))
			for i, post := range posts {
				result[i] = map[string]interface{}{
					"id": post.ID, "text": post.Text, "date": post.Date,
					"impressions": post.Impressions, "engagement": post.Engagement,
					"likes": post.Likes, "comments": post.Comments, "shares": post.Shares,
					"mediaUrl": post.MediaURL, "permalink": post.Permalink,
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("metricoolScheduledPosts", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(metricoolScheduledPostType))),
		Args: graphql.FieldConfigArgument{
			"userId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"brandId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MetricoolService == nil {
				return []interface{}{}, nil
			}
			conn, err := AppContainer.MetricoolService.GetConnection(p.Context, p.Args["userId"].(string))
			if err != nil {
				return []interface{}{}, nil
			}
			posts, err := AppContainer.MetricoolService.GetScheduledPosts(p.Context, conn, p.Args["brandId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]interface{}, len(posts))
			for i, p := range posts {
				result[i] = map[string]interface{}{
					"id": p.ID, "text": p.Text, "date": p.Date,
					"network": p.Network, "status": p.Status,
				}
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("metricoolAccountMetrics", &graphql.Field{
		Type: metricoolAccountMetricsType,
		Args: graphql.FieldConfigArgument{
			"userId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"brandId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"network": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MetricoolService == nil {
				return nil, nil
			}
			conn, err := AppContainer.MetricoolService.GetConnection(p.Context, p.Args["userId"].(string))
			if err != nil {
				return nil, nil
			}
			m, err := AppContainer.MetricoolService.GetAccountMetrics(p.Context, conn, p.Args["brandId"].(string), p.Args["network"].(string))
			if err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"followers": m.Followers, "following": m.Following,
				"postsCount": m.PostsCount, "engagement": m.Engagement,
			}, nil
		},
	})

	rootMutation.AddFieldConfig("saveMetricoolConnection", &graphql.Field{
		Type: metricoolConnectionType,
		Args: graphql.FieldConfigArgument{
			"userId":          &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"metricoolUserToken": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"metricoolUserId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MetricoolService == nil {
				return nil, nil
			}
			conn, err := AppContainer.MetricoolService.SaveConnection(p.Context,
				p.Args["userId"].(string),
				p.Args["metricoolUserToken"].(string),
				p.Args["metricoolUserId"].(string),
			)
			if err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"id": conn.ID, "userId": conn.UserID,
				"metricoolUserId": conn.MetricoolUserID,
				"activeBrandId":   conn.ActiveBrandID,
				"createdAt":       conn.CreatedAt.Format("2006-01-02T15:04:05Z"),
				"updatedAt":       conn.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			}, nil
		},
	})

	rootMutation.AddFieldConfig("setActiveMetricoolBrand", &graphql.Field{
		Type: graphql.Boolean,
		Args: graphql.FieldConfigArgument{
			"userId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"brandId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.MetricoolService == nil {
				return false, nil
			}
			err := AppContainer.MetricoolService.UpdateActiveBrand(p.Context, p.Args["userId"].(string), p.Args["brandId"].(string))
			return err == nil, err
		},
	})
}
