package crmemail

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"strings"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"golang.org/x/text/encoding/charmap"
)

type SyncService struct {
	repo *Repository
}

func NewSyncService(repo *Repository) *SyncService {
	return &SyncService{repo: repo}
}

func (s *SyncService) SyncAccount(ctx context.Context, acct *EmailAccount) error {
	log.Printf("Syncing emails for %s (%s)", acct.Email, acct.Provider)

	var c *client.Client
	var err error

	if acct.ImapPort == 993 {
		tlsConfig := &tls.Config{ServerName: acct.ImapHost, InsecureSkipVerify: false}
		c, err = client.DialTLS(fmt.Sprintf("%s:%d", acct.ImapHost, acct.ImapPort), tlsConfig)
	} else {
		c, err = client.Dial(fmt.Sprintf("%s:%d", acct.ImapHost, acct.ImapPort))
		if err == nil {
			if acct.ImapPort == 587 {
				tlsConfig := &tls.Config{ServerName: acct.ImapHost, InsecureSkipVerify: false}
				if err := c.StartTLS(tlsConfig); err != nil {
					c.Logout()
					return fmt.Errorf("starttls: %w", err)
				}
			}
		}
	}
	if err != nil {
		return fmt.Errorf("dial imap: %w", err)
	}
	defer c.Logout()

	if err := c.Login(acct.ImapUsername, acct.ImapPassword); err != nil {
		return fmt.Errorf("login: %w", err)
	}

	// Sync INBOX
	if err := s.syncFolder(ctx, c, acct, "INBOX"); err != nil {
		log.Printf("Error syncing INBOX for %s: %v", acct.Email, err)
	}

	// Sync Sent folder
	if err := s.syncFolder(ctx, c, acct, "\"[Gmail]/Sent Mail\""); err != nil {
		// Try alternate names
		for _, sent := range []string{"\"Sent\"", "\"Sent Items\"", "\"[Gmail]/Sent\""} {
			if err := s.syncFolder(ctx, c, acct, sent); err == nil {
				break
			}
		}
	}

	s.repo.UpdateLastSync(ctx, acct.ID)
	return nil
}

func (s *SyncService) syncFolder(ctx context.Context, c *client.Client, acct *EmailAccount, folder string) error {
	mbox, err := c.Select(folder, false)
	if err != nil {
		return err
	}
	if mbox.Messages == 0 {
		return nil
	}

	from := uint32(1)
	if mbox.Messages > 50 {
		from = mbox.Messages - 49
	}

	seqSet := new(imap.SeqSet)
	seqSet.AddRange(from, mbox.Messages)

	messages := make(chan *imap.Message, 50)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqSet, []imap.FetchItem{imap.FetchEnvelope, imap.FetchInternalDate, imap.FetchFlags, imap.FetchBodyStructure, imap.FetchUid}, messages)
	}()

	for msg := range messages {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if msg.Envelope == nil {
			continue
		}

		email := &Email{
			AccountID:   acct.ID,
			BusinessID:  acct.BusinessID,
			MessageID:   msg.Envelope.MessageId,
			InReplyTo:   msg.Envelope.InReplyTo,
			Subject:     decodeText(msg.Envelope.Subject),
			FromAddress: formatAddress(msg.Envelope.From),
			FromName:    formatName(msg.Envelope.From),
			ToAddresses: formatAddresses(msg.Envelope.To),
			CcAddresses: formatAddresses(msg.Envelope.Cc),
			SentAt:      msg.Envelope.Date,
			ReceivedAt:  msg.InternalDate,
			IsRead:      !hasFlag(msg.Flags, "\\Seen"),
			IsStarred:   hasFlag(msg.Flags, "\\Flagged"),
			Folder:      folder,
			ThreadID:    msg.Envelope.MessageId,
		}
		email.ContactID = s.findMatchingContact(ctx, acct.BusinessID, email.FromAddress)

		if err := s.repo.UpsertEmail(ctx, email); err != nil {
			log.Printf("Error saving email %s: %v", email.MessageID, err)
		}
	}

	return <-done
}

func (s *SyncService) findMatchingContact(ctx context.Context, businessID, fromAddress string) *string {
	emailAddr := strings.TrimSpace(fromAddress)
	emailAddr = strings.ToLower(emailAddr)
	if emailAddr == "" {
		return nil
	}
	// Extract just the email part if in "Name <email>" format
	if idx := strings.LastIndex(emailAddr, "<"); idx >= 0 {
		emailAddr = strings.Trim(emailAddr[idx+1:], "> ")
	}
	emailAddr = strings.TrimSpace(emailAddr)

	var contactID string
	err := s.repo.db.QueryRow(ctx,
		`SELECT id FROM crm_contacts WHERE business_id = $1 AND LOWER(email) = $2 LIMIT 1`,
		businessID, emailAddr).Scan(&contactID)
	if err != nil {
		return nil
	}
	return &contactID
}

func decodeText(s string) string {
	if s == "" {
		return ""
	}
	decoded, err := charsetDecoder(s)
	if err != nil {
		return s
	}
	return decoded
}

func charsetDecoder(s string) (string, error) {
	// Try UTF-8 first (most common)
	if strings.Contains(s, "=?") {
		// RFC 2047 encoded word - skip complex decoding, return as-is
		return s, nil
	}
	// Try decoding as ISO-8859-1 if contains non-ASCII bytes
	decoded, err := charmap.ISO8859_1.NewDecoder().String(s)
	if err == nil && decoded != s {
		return decoded, nil
	}
	return s, nil
}

func formatAddress(addrs []*imap.Address) string {
	if len(addrs) == 0 {
		return ""
	}
	a := addrs[0]
	if a.MailboxName == "" || a.HostName == "" {
		return ""
	}
	return fmt.Sprintf("%s@%s", a.MailboxName, a.HostName)
}

func formatName(addrs []*imap.Address) string {
	if len(addrs) == 0 {
		return ""
	}
	return addrs[0].PersonalName
}

func formatAddresses(addrs []*imap.Address) string {
	var parts []string
	for _, a := range addrs {
		if a.MailboxName != "" && a.HostName != "" {
			parts = append(parts, fmt.Sprintf("%s@%s", a.MailboxName, a.HostName))
		}
	}
	return strings.Join(parts, ", ")
}

func hasFlag(flags []string, flag string) bool {
	for _, f := range flags {
		if strings.EqualFold(f, flag) {
			return true
		}
	}
	return false
}
