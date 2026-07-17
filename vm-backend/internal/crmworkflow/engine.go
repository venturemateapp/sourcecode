package crmworkflow

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/venturemate/vmbackend/internal/email"
)

type Trigger struct {
	ID           string `json:"id"`
	WorkflowID   string `json:"workflowId"`
	TriggerType  string `json:"triggerType"`
	TargetObject string `json:"targetObject"`
	Conditions   string `json:"conditions"`
}

type Action struct {
	ID           string `json:"id"`
	WorkflowID   string `json:"workflowId"`
	ActionType   string `json:"actionType"`
	ActionConfig string `json:"actionConfig"`
	SortOrder    int    `json:"sortOrder"`
}

type ActionConfig struct {
	To       string                 `json:"to,omitempty"`
	Subject  string                 `json:"subject,omitempty"`
	Body     string                 `json:"body,omitempty"`
	ObjectName string               `json:"objectName,omitempty"`
	Fields   map[string]interface{} `json:"fields,omitempty"`
	RecordID string                 `json:"recordId,omitempty"`
	URL      string                 `json:"url,omitempty"`
	Method   string                 `json:"method,omitempty"`
}

type Engine struct {
	repo      *Repository
	db        *pgxpool.Pool
	emailSvc  *email.Service
}

func NewEngine(repo *Repository, db *pgxpool.Pool, emailSvc *email.Service) *Engine {
	return &Engine{repo: repo, db: db, emailSvc: emailSvc}
}

func (e *Engine) Execute(ctx context.Context, workflowID string, triggerData map[string]interface{}) error {
	trigger, err := e.repo.GetTriggerByWorkflow(ctx, workflowID)
	if err != nil {
		return fmt.Errorf("get trigger: %w", err)
	}
	if !e.evaluateConditions(trigger.Conditions, triggerData) {
		return nil
	}
	actions, err := e.repo.ListActions(ctx, workflowID)
	if err != nil {
		return fmt.Errorf("list actions: %w", err)
	}
	for _, action := range actions {
		if err := e.executeAction(ctx, action, triggerData); err != nil {
			log.Printf("Workflow action failed: %v", err)
			e.repo.LogExecution(ctx, workflowID, trigger.ID, "failed", err.Error())
			return err
		}
	}
	e.repo.LogExecution(ctx, workflowID, trigger.ID, "completed", "")
	return nil
}

func (e *Engine) MatchAndExecute(ctx context.Context, businessID, triggerType, targetObject string, data map[string]interface{}) {
	workflows, err := e.repo.List(ctx, businessID)
	if err != nil {
		return
	}
	for _, w := range workflows {
		if !w.IsActive {
			continue
		}
		t, err := e.repo.GetTriggerByWorkflow(ctx, w.ID)
		if err != nil {
			continue
		}
		if t.TriggerType != triggerType || t.TargetObject != targetObject {
			continue
		}
		go func(wfID string) {
			execCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			if err := e.Execute(execCtx, wfID, data); err != nil {
				log.Printf("Workflow %s auto-execution failed: %v", wfID, err)
			}
		}(w.ID)
	}
}

func (e *Engine) executeAction(ctx context.Context, action Action, triggerData map[string]interface{}) error {
	var cfg ActionConfig
	if err := json.Unmarshal([]byte(action.ActionConfig), &cfg); err != nil {
		return fmt.Errorf("parse config: %w", err)
	}
	switch action.ActionType {
	case "send_email":
		return e.sendEmail(ctx, cfg)
	case "update_record":
		return e.updateRecord(ctx, cfg)
	case "webhook":
		return e.callWebhook(ctx, cfg)
	default:
		return nil
	}
}

func (e *Engine) sendEmail(ctx context.Context, cfg ActionConfig) error {
	if e.emailSvc == nil {
		return nil
	}
	body := fmt.Sprintf("<p>%s</p>", strings.ReplaceAll(cfg.Body, "\n", "<br>"))
	return e.emailSvc.SendTemplatedEmail([]string{cfg.To}, cfg.Subject, body)
}

func (e *Engine) updateRecord(ctx context.Context, cfg ActionConfig) error {
	if cfg.ObjectName == "" || cfg.RecordID == "" {
		return nil
	}
	switch cfg.ObjectName {
	case "crm_deals":
		if stage, ok := cfg.Fields["stage"].(string); ok {
			_, err := e.db.Exec(ctx, `UPDATE crm_deals SET stage = $1, updated_at = NOW() WHERE id = $2`, stage, cfg.RecordID)
			return err
		}
	case "crm_tasks":
		if status, ok := cfg.Fields["status"].(string); ok {
			_, err := e.db.Exec(ctx, `UPDATE crm_tasks SET status = $1, updated_at = NOW() WHERE id = $2`, status, cfg.RecordID)
			return err
		}
	}
	return nil
}

func (e *Engine) callWebhook(ctx context.Context, cfg ActionConfig) error {
	method := cfg.Method
	if method == "" {
		method = "POST"
	}
	payload, _ := json.Marshal(cfg.Fields)
	req, err := http.NewRequestWithContext(ctx, method, cfg.URL, strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	return nil
}

func (e *Engine) evaluateConditions(conditionsJSON string, data map[string]interface{}) bool {
	if conditionsJSON == "" || conditionsJSON == "{}" {
		return true
	}
	var cond struct {
		Field    string      `json:"field"`
		Operator string      `json:"operator"`
		Value    interface{} `json:"value"`
	}
	if err := json.Unmarshal([]byte(conditionsJSON), &cond); err != nil {
		return true
	}
	actual, ok := data[cond.Field]
	if !ok {
		return false
	}
	switch cond.Operator {
	case "equals":
		return fmt.Sprintf("%v", actual) == fmt.Sprintf("%v", cond.Value)
	case "contains":
		return strings.Contains(fmt.Sprintf("%v", actual), fmt.Sprintf("%v", cond.Value))
	case "greater_than":
		a, _ := toFloat(actual)
		b, _ := toFloat(cond.Value)
		return a > b
	case "less_than":
		a, _ := toFloat(actual)
		b, _ := toFloat(cond.Value)
		return a < b
	default:
		return true
	}
}

func toFloat(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	}
	return 0, false
}
