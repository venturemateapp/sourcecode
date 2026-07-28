package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
	"strconv"
	"time"

	"github.com/jordan-wright/email"
	"github.com/venturemate/vmbackend/internal/crmemail"
)

type Service struct {
	host     string
	port     int
	username string
	password string
	from     string // e.g. "VentureMate <ops@venturemate.net>"
	logo     string // either https:// public URL or data:image/png;base64,...
}

type TemplateData struct {
	Logo string
	Body template.HTML
	Year int
}

func New() (*Service, error) {
	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	username := os.Getenv("SMTP_USER")
	password := os.Getenv("SMTP_PASSWORD")

	port, _ := strconv.Atoi(portStr)
	if port == 0 {
		port = 587
	}

	if username == "" {
		return nil, fmt.Errorf("SMTP_USER not set")
	}

	// Sender display name (default to "VentureMate")
	fromName := os.Getenv("EMAIL_FROM_NAME")
	if fromName == "" {
		fromName = "VentureMate"
	}
	fromAddress := fmt.Sprintf("%s <%s>", fromName, username)

	// Logo: prefer public HTTPS URL (reliable across all email clients)
	// Fall back to embedded base64 from local file
	logo := os.Getenv("EMAIL_LOGO_URL")
	if logo == "" {
		// Try multiple filenames in order of preference
		for _, name := range []string{"ventureMate-logo2.png", "VentureMate-logo-email.png", "VentureMate-logo.png"} {
			logoBytes, err := os.ReadFile("internal/email/assets/" + name)
			if err == nil {
				logoBase64 := base64.StdEncoding.EncodeToString(logoBytes)
				logo = "data:image/png;base64," + logoBase64
				break
			}
		}
		// If still no logo, use an inline SVG fallback so emails don't break
		if logo == "" {
			logo = "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"><text x="10" y="35" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#10b981">VentureMate</text></svg>`))
		}
	}

	return &Service{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     fromAddress,
		logo:     logo,
	}, nil
}

// Attach represents an email attachment
type Attach struct {
	Filename string
	Data     []byte
	MimeType string
}

// Send sends a raw HTML email.
func (s *Service) Send(to []string, subject, body string) error {
	return s.SendWithAttachments(to, subject, body, nil)
}

// SendWithAttachments sends an HTML email with optional file attachments.
func (s *Service) SendWithAttachments(to []string, subject, body string, attachments []Attach) error {
	e := email.NewEmail()
	e.From = s.from
	e.To = to
	e.Subject = subject
	e.HTML = []byte(body)

	for _, a := range attachments {
		mime := a.MimeType
		if mime == "" {
			mime = "application/octet-stream"
		}
		e.Attach(bytes.NewReader(a.Data), a.Filename, mime)
	}

	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	auth := smtp.PlainAuth("", s.username, s.password, s.host)

	if s.port == 465 {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: false,
			ServerName:         s.host,
		}
		return e.SendWithTLS(addr, auth, tlsConfig)
	}

	return e.SendWithStartTLS(addr, auth, &tls.Config{
		ServerName: s.host,
	})
}

// SendForBusiness sends through the first usable SMTP account connected to the
// business. If no connected account can send, it falls back to the platform
// mailer so transactional delivery is not lost.
func (s *Service) SendForBusiness(ctx context.Context, accounts *crmemail.Repository, businessID string, to []string, subject, body string, attachments []Attach) error {
	if accounts != nil && businessID != "" {
		if linked, err := accounts.ListAccounts(ctx, businessID); err == nil {
			for _, summary := range linked {
				if summary.SmtpHost == "" || summary.SmtpUsername == "" {
					continue
				}
				account, err := accounts.GetByID(ctx, summary.ID)
				if err != nil || account == nil || account.SmtpPassword == "" {
					continue
				}
				message := email.NewEmail()
				message.From = fmt.Sprintf("%s <%s>", account.Email, account.Email)
				message.To = to
				message.Subject = subject
				message.HTML = []byte(body)
				for _, attachment := range attachments {
					mimeType := attachment.MimeType
					if mimeType == "" {
						mimeType = "application/octet-stream"
					}
					if _, err := message.Attach(bytes.NewReader(attachment.Data), attachment.Filename, mimeType); err != nil {
						continue
					}
				}
				port := account.SmtpPort
				if port == 0 {
					port = 587
				}
				address := fmt.Sprintf("%s:%d", account.SmtpHost, port)
				auth := smtp.PlainAuth("", account.SmtpUsername, account.SmtpPassword, account.SmtpHost)
				tlsConfig := &tls.Config{ServerName: account.SmtpHost}
				if port == 465 {
					err = message.SendWithTLS(address, auth, tlsConfig)
				} else {
					err = message.SendWithStartTLS(address, auth, tlsConfig)
				}
				if err == nil {
					return nil
				}
			}
		}
	}
	return s.SendWithAttachments(to, subject, body, attachments)
}

// SendTemplatedEmail sends an email using the standard VentureMate template.
func (s *Service) SendTemplatedEmail(to []string, subject, body string) error {
	tmpl, err := template.ParseFiles("internal/email/templates/base.html")
	if err != nil {
		return fmt.Errorf("failed to parse email template: %w", err)
	}

	data := TemplateData{
		Logo: s.logo,
		Body: template.HTML(body),
		Year: time.Now().Year(),
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	return s.Send(to, subject, buf.String())
}
