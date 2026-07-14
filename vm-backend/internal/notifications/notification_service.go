package notifications

import (
	"context"
	"fmt"

	"github.com/venturemate/vmbackend/internal/email"
)

type Service struct {
	repo  *Repository
	email *email.Service
}

func NewService(repo *Repository, emailSvc *email.Service) *Service {
	return &Service{repo: repo, email: emailSvc}
}

type NotifyInput struct {
	UserID      string
	Email       string
	Type        string
	Title       string
	Description string
	ActionURL   *string
	ActionLabel *string
}

func (s *Service) Broadcast(ctx context.Context, title, description, notifType, actionURL, actionLabel string) error {
	return s.repo.Broadcast(ctx, title, description, notifType, actionURL, actionLabel)
}

func (s *Service) BroadcastWithEmail(ctx context.Context, title, description, notifType, actionURL, actionLabel string, userEmails []string) error {
	if err := s.repo.Broadcast(ctx, title, description, notifType, actionURL, actionLabel); err != nil {
		return err
	}
	if s.email != nil && len(userEmails) > 0 {
		body := fmt.Sprintf(`
			<table style="width:100%%;max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
				<tr><td style="padding:32px 24px;text-align:center">
					<h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px">%s</h2>
					<p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6">%s</p>
					%s
				</td></tr>
			</table>`, title, description, actionTag(actionURL, actionLabel))
		var emails []string
		for _, e := range userEmails {
			if e != "" {
				emails = append(emails, e)
			}
		}
		if len(emails) > 0 {
			_ = s.email.SendTemplatedEmail(emails, "🔔 "+title, body)
		}
	}
	return nil
}

func actionTag(url, label string) string {
	if url == "" {
		return ""
	}
	if label == "" {
		label = "View"
	}
	return fmt.Sprintf(`<a href="%s" style="display:inline-block;padding:10px 24px;background:#10b981;color:#fff;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px">%s</a>`, url, label)
}

func (s *Service) Notify(ctx context.Context, input NotifyInput) (*Notification, error) {
	n := &Notification{
		UserID:      input.UserID,
		Type:        input.Type,
		Title:       input.Title,
		Description: input.Description,
		Read:        false,
		ActionURL:   input.ActionURL,
		ActionLabel: input.ActionLabel,
	}
	if err := s.repo.Create(ctx, n); err != nil {
		return nil, err
	}

	if s.email != nil && input.Email != "" {
		body := fmt.Sprintf(`
			<table style="width:100%%;max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
				<tr><td style="padding:32px 24px;text-align:center">
					<h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px">%s</h2>
					<p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6">%s</p>
				</td></tr>
			</table>`, input.Title, input.Description)

		_ = s.email.SendTemplatedEmail([]string{input.Email}, input.Title, body)
	}

	return n, nil
}
