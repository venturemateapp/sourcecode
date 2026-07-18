package graph

import (
	"context"
	"fmt"
	"time"

	"github.com/graphql-go/graphql"
)

var adminAiUsageRowType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminAiUsageRow",
	Fields: graphql.Fields{
		"userId":        &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"email":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"userName":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"businessId":    &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessName":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"domain":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"source":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"callCount":     &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"inputTokens":   &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"outputTokens":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"totalTokens":   &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"durationMs":    &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"firstCall":     &graphql.Field{Type: graphql.String},
		"lastCall":      &graphql.Field{Type: graphql.String},
		"model":         &graphql.Field{Type: graphql.String},
		"provider":      &graphql.Field{Type: graphql.String},
	},
})

var adminAiUsageSummaryType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminAiUsageSummary",
	Fields: graphql.Fields{
		"totalInteractions":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"totalInputTokens":   &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"totalOutputTokens":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"totalTokens":        &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"totalDurationMs":    &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"totalUsers":         &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"totalBusinesses":    &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
	},
})

var adminAiUsageResponseType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminAiUsageResponse",
	Fields: graphql.Fields{
		"rows":    &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(adminAiUsageRowType)))},
		"summary": &graphql.Field{Type: graphql.NewNonNull(adminAiUsageSummaryType)},
	},
})

type aiUsageRow struct {
	UserID       string
	Email        string
	UserName     string
	BusinessID   string
	BusinessName string
	Domain       string
	Source       string
	CallCount    int
	InputTokens  int
	OutputTokens int
	TotalTokens  int
	DurationMs   int64
	FirstCall    *time.Time
	LastCall     *time.Time
	Model        string
	Provider     string
}

func init() {
	rootQuery.AddFieldConfig("adminAiUsage", &graphql.Field{
		Type: adminAiUsageResponseType,
		Args: graphql.FieldConfigArgument{
			"userId":     &graphql.ArgumentConfig{Type: graphql.String},
			"businessId": &graphql.ArgumentConfig{Type: graphql.String},
			"domain":     &graphql.ArgumentConfig{Type: graphql.String},
			"source":     &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if ok, _ := adminGuard(p.Context); !ok {
				return nil, nil
			}
			if AppContainer == nil || AppContainer.DB == nil {
				return nil, nil
			}

			rows := []aiUsageRow{}

			// Query AI chat usage
			aiRows, err := queryAiChatUsage(p.Context, p.Args)
			if err != nil {
				return nil, err
			}
			rows = append(rows, aiRows...)

			// Query support bot usage
			supportRows, err := querySupportUsage(p.Context, p.Args)
			if err != nil {
				return nil, err
			}
			rows = append(rows, supportRows...)

			// Build summary
			summary := buildSummary(rows)

			// Format rows for GraphQL
			resultRows := make([]interface{}, len(rows))
			for i, r := range rows {
				m := map[string]interface{}{
					"userId":       r.UserID,
					"email":        r.Email,
					"userName":     r.UserName,
					"businessId":   r.BusinessID,
					"businessName": r.BusinessName,
					"domain":       r.Domain,
					"source":       r.Source,
					"callCount":    r.CallCount,
					"inputTokens":  r.InputTokens,
					"outputTokens": r.OutputTokens,
					"totalTokens":  r.TotalTokens,
					"durationMs":   int(r.DurationMs),
					"model":        r.Model,
					"provider":     r.Provider,
				}
				if r.FirstCall != nil {
					m["firstCall"] = r.FirstCall.Format("2006-01-02T15:04:05Z")
				}
				if r.LastCall != nil {
					m["lastCall"] = r.LastCall.Format("2006-01-02T15:04:05Z")
				}
				resultRows[i] = m
			}

			return map[string]interface{}{
				"rows":    resultRows,
				"summary": summary,
			}, nil
		},
	})
}

func queryAiChatUsage(ctx context.Context, args map[string]interface{}) ([]aiUsageRow, error) {
	where := "WHERE acm.role = 'assistant'"
	params := []interface{}{}
	pidx := 1

	if uid, ok := args["userId"].(string); ok && uid != "" {
		where += fmt.Sprintf(" AND u.id = $%d", pidx)
		params = append(params, uid)
		pidx++
	}
	if bid, ok := args["businessId"].(string); ok && bid != "" {
		where += fmt.Sprintf(" AND b.id = $%d", pidx)
		params = append(params, bid)
		pidx++
	}
	if domain, ok := args["domain"].(string); ok && domain != "" {
		where += fmt.Sprintf(" AND acs.domain = $%d", pidx)
		params = append(params, domain)
		pidx++
	}

	query := fmt.Sprintf(`
		SELECT
			u.id AS user_id,
			u.email,
			COALESCE(u.first_name, '') || ' ' || COALESCE(u.surname, '') AS user_name,
			b.id AS business_id,
			b.name AS business_name,
			acs.domain,
			'chat' AS source,
			COUNT(*) AS call_count,
			COALESCE(SUM(acm.input_tokens), 0) AS input_tokens,
			COALESCE(SUM(acm.output_tokens), 0) AS output_tokens,
			COALESCE(SUM(acm.total_tokens), 0) AS total_tokens,
			COALESCE(SUM(acm.duration_ms), 0) AS duration_ms,
			MIN(acm.created_at) AS first_call,
			MAX(acm.created_at) AS last_call,
			MAX(acm.model) AS model,
			MAX(acm.provider) AS provider
		FROM ai_chat_messages acm
		JOIN ai_chat_sessions acs ON acs.id = acm.session_id
		JOIN businesses b ON b.id = acs.business_id
		JOIN users u ON u.id = acs.user_id
		%s
		GROUP BY u.id, u.email, u.first_name, u.surname, b.id, b.name, acs.domain
		ORDER BY total_tokens DESC
	`, where)

	rows, err := AppContainer.DB.Query(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []aiUsageRow
	for rows.Next() {
		var r aiUsageRow
		r.Source = "chat"
		if err := rows.Scan(&r.UserID, &r.Email, &r.UserName, &r.BusinessID, &r.BusinessName,
			&r.Domain, &r.Source, &r.CallCount, &r.InputTokens, &r.OutputTokens,
			&r.TotalTokens, &r.DurationMs, &r.FirstCall, &r.LastCall, &r.Model, &r.Provider); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, nil
}

func querySupportUsage(ctx context.Context, args map[string]interface{}) ([]aiUsageRow, error) {
	where := "WHERE sm.role = 'assistant'"
	params := []interface{}{}
	pidx := 1

	if uid, ok := args["userId"].(string); ok && uid != "" {
		where += fmt.Sprintf(" AND u.id = $%d", pidx)
		params = append(params, uid)
		pidx++
	}
	if domain, ok := args["domain"].(string); ok && domain != "" {
		where += fmt.Sprintf(" AND $%d = 'support'", pidx)
		params = append(params, domain)
		pidx++
	}

	query := fmt.Sprintf(`
		SELECT
			u.id AS user_id,
			u.email,
			COALESCE(u.first_name, '') || ' ' || COALESCE(u.surname, '') AS user_name,
			'' AS business_id,
			'support' AS business_name,
			'support' AS domain,
			'support' AS source,
			COUNT(*) AS call_count,
			COALESCE(SUM(sm.input_tokens), 0) AS input_tokens,
			COALESCE(SUM(sm.output_tokens), 0) AS output_tokens,
			COALESCE(SUM(sm.total_tokens), 0) AS total_tokens,
			COALESCE(SUM(sm.duration_ms), 0) AS duration_ms,
			MIN(sm.created_at) AS first_call,
			MAX(sm.created_at) AS last_call,
			MAX(sm.model) AS model,
			MAX(sm.provider) AS provider
		FROM support_messages sm
		JOIN support_sessions ss ON ss.id = sm.session_id
		JOIN users u ON u.id = ss.user_id
		%s
		GROUP BY u.id, u.email, u.first_name, u.surname
		ORDER BY total_tokens DESC
	`, where)

	rows, err := AppContainer.DB.Query(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []aiUsageRow
	for rows.Next() {
		var r aiUsageRow
		r.Domain = "support"
		r.Source = "support"
		if err := rows.Scan(&r.UserID, &r.Email, &r.UserName, &r.BusinessID, &r.BusinessName,
			&r.Domain, &r.Source, &r.CallCount, &r.InputTokens, &r.OutputTokens,
			&r.TotalTokens, &r.DurationMs, &r.FirstCall, &r.LastCall, &r.Model, &r.Provider); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, nil
}

func buildSummary(rows []aiUsageRow) map[string]interface{} {
	summary := map[string]interface{}{
		"totalInteractions": 0,
		"totalInputTokens":  0,
		"totalOutputTokens": 0,
		"totalTokens":       0,
		"totalDurationMs":   0,
		"totalUsers":        0,
		"totalBusinesses":   0,
	}
	userSet := map[string]bool{}
	bizSet := map[string]bool{}

	for _, r := range rows {
		summary["totalInteractions"] = summary["totalInteractions"].(int) + r.CallCount
		summary["totalInputTokens"] = summary["totalInputTokens"].(int) + r.InputTokens
		summary["totalOutputTokens"] = summary["totalOutputTokens"].(int) + r.OutputTokens
		summary["totalTokens"] = summary["totalTokens"].(int) + r.TotalTokens
		summary["totalDurationMs"] = summary["totalDurationMs"].(int) + int(r.DurationMs)
		userSet[r.UserID] = true
		if r.BusinessID != "" {
			bizSet[r.BusinessID] = true
		}
	}

	summary["totalUsers"] = len(userSet)
	summary["totalBusinesses"] = len(bizSet)
	return summary
}
