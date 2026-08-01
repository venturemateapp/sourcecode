package subscriptions

import (
	"context"
	"encoding/json"
	"fmt"
)

type Enforcer struct {
	repo  *Repository
	usage *UsageRepository
}

func NewEnforcer(repo *Repository, usage *UsageRepository) *Enforcer {
	return &Enforcer{repo: repo, usage: usage}
}

func parseLimits(raw string) (map[string]interface{}, error) {
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return nil, err
	}
	return m, nil
}

func limitAsInt(m map[string]interface{}, key string) int {
	v, ok := m[key]
	if !ok {
		return -1
	}
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	}
	return -1
}

func limitAsBool(m map[string]interface{}, key string) bool {
	v, ok := m[key]
	if !ok {
		return false
	}
	b, _ := v.(bool)
	return b
}

// Unlimited returns true when a limit value of -1 indicates no restriction.
func Unlimited(val int) bool {
	return val == -1
}

func (e *Enforcer) GetPlanLimits(ctx context.Context, planName string) (map[string]interface{}, error) {
	plan, err := e.repo.GetPlanByName(ctx, planName)
	if err != nil {
		return nil, err
	}
	return parseLimits(plan.Limits)
}

func (e *Enforcer) CheckBusinessLimit(ctx context.Context, planName string, currentCount int) error {
	limits, err := e.GetPlanLimits(ctx, planName)
	if err != nil {
		return err
	}
	maxBiz := limitAsInt(limits, "max_businesses")
	if Unlimited(maxBiz) {
		return nil
	}
	if currentCount >= maxBiz {
		return fmt.Errorf("plan limit reached: maximum %d businesses allowed on %s plan", maxBiz, planName)
	}
	return nil
}

func (e *Enforcer) CheckTeamMemberLimit(ctx context.Context, planName string, currentCount int) error {
	limits, err := e.GetPlanLimits(ctx, planName)
	if err != nil {
		return err
	}
	maxTeam := limitAsInt(limits, "max_team_members")
	if Unlimited(maxTeam) {
		return nil
	}
	if currentCount >= maxTeam {
		return fmt.Errorf("plan limit reached: maximum %d team members allowed on %s plan", maxTeam, planName)
	}
	return nil
}

func (e *Enforcer) CheckPitchDeckLimit(ctx context.Context, planName string, currentCount int) error {
	limits, err := e.GetPlanLimits(ctx, planName)
	if err != nil {
		return err
	}
	max := limitAsInt(limits, "max_pitch_decks")
	if Unlimited(max) {
		return nil
	}
	if currentCount >= max {
		return fmt.Errorf("plan limit reached: maximum %d pitch decks allowed on %s plan", max, planName)
	}
	return nil
}

func (e *Enforcer) CheckAITokenQuota(ctx context.Context, userID, planName string, period string, requestedTokens int64) error {
	limits, err := e.GetPlanLimits(ctx, planName)
	if err != nil {
		return err
	}
	monthlyLimit := limitAsInt(limits, "ai_tokens_monthly")
	if Unlimited(monthlyLimit) {
		return nil
	}

	usage, err := e.usage.GetUsage(ctx, userID, period)
	tokensUsed := int64(0)
	if err == nil && usage != nil {
		tokensUsed = usage.AITokensUsed
	}

	if tokensUsed+requestedTokens > int64(monthlyLimit) {
		return fmt.Errorf("AI token quota exceeded: %d/%d tokens used this month", tokensUsed, monthlyLimit)
	}
	return nil
}

func (e *Enforcer) HasFeature(ctx context.Context, planName string, feature string) (bool, error) {
	plan, err := e.repo.GetPlanByName(ctx, planName)
	if err != nil {
		return false, err
	}
	var features []map[string]interface{}
	if err := json.Unmarshal([]byte(plan.Features), &features); err != nil {
		return false, nil
	}
	for _, f := range features {
		if text, ok := f["text"].(string); ok && text == feature {
			if included, ok := f["included"].(bool); ok {
				return included, nil
			}
		}
	}
	return false, nil
}

func (e *Enforcer) CheckAIStudioOperation(ctx context.Context, userID, planName, period, metric string) error {
	limits, err := e.GetPlanLimits(ctx, planName)
	if err != nil {
		return err
	}
	limitKey := map[string]string{
		"recraft_images": "recraft_images_monthly",
		"ai_builds":      "ai_builds_monthly",
		"ai_exports":     "ai_exports_monthly",
		"ai_deployments": "ai_deployments_monthly",
	}[metric]
	if limitKey == "" {
		return nil
	}
	limit := limitAsInt(limits, limitKey)
	if Unlimited(limit) {
		return nil
	}
	usage, err := e.usage.GetUsage(ctx, userID, period)
	if err != nil || usage == nil {
		return nil
	}
	used := int64(0)
	switch metric {
	case "recraft_images":
		used = usage.RecraftImagesUsed
	case "ai_builds":
		used = usage.AIBuildsUsed
	case "ai_exports":
		used = usage.AIExportsUsed
	case "ai_deployments":
		used = usage.AIDeploymentsUsed
	}
	if used >= int64(limit) {
		return fmt.Errorf("plan limit reached: %s allowance is %d per month", metric, limit)
	}
	return nil
}

func (e *Enforcer) CheckAIProjectLimit(ctx context.Context, planName string, currentCount int) error {
	limits, err := e.GetPlanLimits(ctx, planName)
	if err != nil {
		return err
	}
	limit := limitAsInt(limits, "max_ai_projects")
	if Unlimited(limit) {
		return nil
	}
	if currentCount >= limit {
		return fmt.Errorf("plan limit reached: maximum %d active AI projects", limit)
	}
	return nil
}

// CheckAIProjectStorage applies the plan's existing storage_gb allowance to
// document-vault and AI Studio storage together. Missing or -1 limits remain unlimited.
func (e *Enforcer) CheckAIProjectStorage(ctx context.Context, userID, planName, period string) error {
	limits, err := e.GetPlanLimits(ctx, planName)
	if err != nil {
		return err
	}
	storageGB := limitAsInt(limits, "storage_gb")
	if Unlimited(storageGB) {
		return nil
	}
	usage, err := e.usage.GetUsage(ctx, userID, period)
	if err != nil || usage == nil {
		return nil
	}
	const gib = int64(1024 * 1024 * 1024)
	limitBytes := int64(storageGB) * gib
	used := usage.StorageBytes + usage.AIProjectBytes
	if used >= limitBytes {
		return fmt.Errorf("storage quota reached: %.2f/%.2f GB used", float64(used)/float64(gib), float64(limitBytes)/float64(gib))
	}
	return nil
}
