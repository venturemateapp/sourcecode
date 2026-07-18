package email

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
	"strconv"
	"time"

	"github.com/jordan-wright/email"
)

type Service struct {
	host     string
	port     int
	username string
	password string
	from     string // e.g. "VentureMate <support@venturemate.com>"
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
	// Fall back to embedded base64 if EMAIL_LOGO_URL is not set
	logo := os.Getenv("EMAIL_LOGO_URL")
	if logo == "" {
		logoBytes, err := os.ReadFile("internal/email/assets/VentureMate-logo-email.png")
		if err != nil {
			return nil, fmt.Errorf("failed to load logo: %w", err)
		}
		logoBase64 := base64.StdEncoding.EncodeToString(logoBytes)
		logo = "data:image/png;base64," + logoBase64
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

// Send sends a raw HTML email.
func (s *Service) Send(to []string, subject, body string) error {
	e := email.NewEmail()
	e.From = s.from
	e.To = to
	e.Subject = subject
	e.HTML = []byte(body)

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
