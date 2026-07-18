package support

import (
	"context"
	"fmt"
	"strings"

	"github.com/venturemate/vmbackend/internal/ai"
	"github.com/venturemate/vmbackend/internal/email"
	"github.com/venturemate/vmbackend/internal/notifications"
)

const supportSystemPrompt = `You are the VentureMate Support Bot. Your job is to answer user questions about VentureMate — an AI-powered startup operating system that helps entrepreneurs build, manage, and grow their businesses.

Key things you can help with:
- Answering questions about VentureMate features (AI assistant, business management, branding, website builder, pitch decks, financial forecasting, CRM, banking, invoicing, investor networks, marketplace, etc.)
- Troubleshooting common issues
- Explaining how to use specific features
- Navigating the app

Guidelines:
1. Be friendly, concise, and helpful.
2. If you don't know the answer, honestly say you don't know.
3. If the user asks a question that requires human intervention (account issues, billing problems, security concerns, data deletion requests, complex technical issues), tell them you'll escalate to the support team.
4. For general questions about features or how-to, answer directly from your knowledge.
5. Keep responses under 300 words.
6. Do NOT make up information about VentureMate features. If unsure, say "Let me connect you with a human support agent who can help with that."
7. Suggest the user reach out to the support team at ops@venturemate.net for anything involving: account deletion, refunds, billing disputes, security issues, API keys, or custom enterprise features.
8. At the end of your response, ask if there's anything else you can help with.

FORMATTING RULES (CRITICAL):
- Use **bold** for important terms, feature names, and key actions.
- For step-by-step instructions, use numbered lists like: 1. First step 2. Second step
- For lists of features or options, use bullet points with * or -
- When comparing options, use markdown tables with | columns |
- Wrap code snippets or commands in backticks for inline code
- Use ## for section headers when explaining multi-step processes
- Keep paragraphs short (1-3 sentences)
- Always be warm and encouraging in tone`

type Service struct {
	repo  *Repository
	aiMgr *ai.ProviderManager
	email *email.Service
	notif *notifications.Service
}

func NewService(repo *Repository, aiMgr *ai.ProviderManager, emailSvc *email.Service, notifSvc *notifications.Service) *Service {
	return &Service{repo: repo, aiMgr: aiMgr, email: emailSvc, notif: notifSvc}
}

type ChatResult struct {
	Message     string `json:"message"`
	SessionID   string `json:"sessionId"`
	IsEscalated bool   `json:"isEscalated"`
}

func (s *Service) Chat(ctx context.Context, userID, name, emailAddr, prompt, sessionID string) (*ChatResult, error) {
	var session *Session
	var err error

	if sessionID == "" {
		subject := extractSubject(prompt)
		session, err = s.repo.CreateSession(ctx, userID, subject, name, emailAddr)
		if err != nil {
			return nil, fmt.Errorf("create session: %w", err)
		}
	} else {
		session, err = s.repo.GetSession(ctx, sessionID)
		if err != nil {
			return nil, fmt.Errorf("get session: %w", err)
		}
	}

	_, _ = s.repo.AddMessage(ctx, session.ID, "user", prompt)

	messages, err := s.repo.GetSessionMessages(ctx, session.ID)
	if err != nil {
		return nil, fmt.Errorf("get messages: %w", err)
	}

	aiMessages := make([]ai.Message, 0, len(messages))
	for _, m := range messages {
		aiMessages = append(aiMessages, ai.Message{Role: m.Role, Content: m.Content})
	}

	provider, err := s.aiMgr.Resolve("")
	if err != nil {
		return nil, fmt.Errorf("resolve ai provider: %w", err)
	}
	resp, err := provider.Chat(ctx, supportSystemPrompt, aiMessages, nil)
	if err != nil {
		return nil, fmt.Errorf("ai chat: %w", err)
	}

	aiReply := resp.Content
	if aiReply == "" {
		aiReply = "I'm not sure how to handle that. Let me connect you with a human support agent who can help."
	}

	_, _ = s.repo.AddMessage(ctx, session.ID, "assistant", aiReply, WithProviderResponse(resp))

	isEscalated := needsEscalation(prompt, aiReply)
	if isEscalated {
		_ = s.repo.UpdateSessionStatus(ctx, session.ID, "escalated")
		summary := buildSummary(prompt, aiReply)
		_ = s.repo.UpdateSessionSummary(ctx, session.ID, summary)
		_ = s.sendEscalationEmail(ctx, session, name, emailAddr, prompt, aiReply, summary)
	}

	return &ChatResult{
		Message:     aiReply,
		SessionID:   session.ID,
		IsEscalated: isEscalated,
	}, nil
}

func (s *Service) GetSessions(ctx context.Context) ([]Session, error) {
	return s.repo.GetAllSessions(ctx)
}

func (s *Service) GetSession(ctx context.Context, sessionID string) (*Session, error) {
	return s.repo.GetSession(ctx, sessionID)
}

func (s *Service) GetUserSessions(ctx context.Context, userID string) ([]Session, error) {
	return s.repo.GetUserSessions(ctx, userID)
}

func (s *Service) GetMessages(ctx context.Context, sessionID string) ([]Message, error) {
	return s.repo.GetSessionMessages(ctx, sessionID)
}

func (s *Service) Escalate(ctx context.Context, sessionID string, userID string) error {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return err
	}
	if session.UserID != userID {
		return fmt.Errorf("unauthorized")
	}
	_ = s.repo.UpdateSessionStatus(ctx, sessionID, "escalated")
	summary := session.Summary
	if summary == "" {
		summary = "User requested human support."
	}
	_ = s.repo.UpdateSessionSummary(ctx, sessionID, summary)
	return s.sendEscalationEmail(ctx, session, session.CreatedByName, session.CreatedByEmail, "", "User requested escalation.", summary)
}

func (s *Service) AdminReply(ctx context.Context, sessionID, content string) (*Message, error) {
	msg, err := s.repo.AddMessage(ctx, sessionID, "assistant", content)
	if err != nil {
		return nil, err
	}
	_ = s.repo.UpdateSessionStatus(ctx, sessionID, "active")

	session, err := s.repo.GetSession(ctx, sessionID)
	if err == nil && session != nil && s.notif != nil {
	url := fmt.Sprintf("/vm/messages?conv=%s", sessionID)
	_, _ = s.notif.Notify(ctx, notifications.NotifyInput{
		UserID:      session.UserID,
		Type:        "support_reply",
		Title:       "New support reply",
		Description: truncateText(content, 120),
		ActionURL:   &url,
			ActionLabel: strPtr("View Reply"),
		})
	}
	return msg, nil
}

func (s *Service) sendEscalationEmail(ctx context.Context, session *Session, name, emailAddr, prompt, aiReply, summary string) error {
	body := fmt.Sprintf(`
<h2>Support Chat Escalation</h2>
<p><strong>User:</strong> %s (%s)</p>
<p><strong>Session ID:</strong> %s</p>
<p><strong>Subject:</strong> %s</p>
<p><strong>Status:</strong> %s</p>
<hr>
<h3>Summary</h3>
<p>%s</p>
<hr>
<h3>User's Message</h3>
<p>%s</p>
<hr>
<h3>AI Response</h3>
<p>%s</p>
<hr>
<p style="color:#64748b;font-size:12px;">This is an automated escalation from the VentureMate Support Bot.</p>
`, name, emailAddr, session.ID, session.Subject, session.Status, summary, prompt, aiReply)

	return s.email.SendTemplatedEmail(
		[]string{"ops@venturemate.net"},
		fmt.Sprintf("[Support Escalation] %s - %s", session.Subject, name),
		body,
	)
}

func needsEscalation(prompt, reply string) bool {
	lower := strings.ToLower(prompt + " " + reply)
	escalationKeywords := []string{
		"speak to a human", "talk to a person", "contact support", "human agent",
		"account deletion", "delete my account", "refund", "billing dispute",
		"security issue", "data breach", "api key", "enterprise",
		"cannot help", "unable to", "don't know", "not sure",
		"connect you with", "human support", "escalate",
	}
	for _, kw := range escalationKeywords {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

func buildSummary(prompt, reply string) string {
	summary := prompt
	if len(summary) > 200 {
		summary = summary[:200] + "..."
	}
	return summary
}

func extractSubject(prompt string) string {
	parts := strings.SplitN(prompt, "\n", 2)
	subject := strings.TrimSpace(parts[0])
	if len(subject) > 100 {
		subject = subject[:100] + "..."
	}
	return subject
}

func truncateText(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "..."
}

func strPtr(s string) *string {
	return &s
}
