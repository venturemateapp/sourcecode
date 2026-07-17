package crmemail

import "time"

type EmailAccount struct {
	ID              string     `json:"id"`
	UserID          string     `json:"userId"`
	BusinessID      string     `json:"businessId"`
	Email           string     `json:"email"`
	Provider        string     `json:"provider"`
	ImapHost        string     `json:"imapHost"`
	ImapPort        int        `json:"imapPort"`
	ImapUsername    string     `json:"imapUsername"`
	ImapPassword    string     `json:"-"` // never expose
	SmtpHost        string     `json:"smtpHost"`
	SmtpPort        int        `json:"smtpPort"`
	SmtpUsername    string     `json:"smtpUsername"`
	SmtpPassword    string     `json:"-"` // never expose
	OAuthToken      string     `json:"-"`
	OAuthRefreshToken string   `json:"-"`
	OAuthExpiresAt  *time.Time `json:"-"`
	SyncEnabled     bool       `json:"syncEnabled"`
	LastSyncedAt    *time.Time `json:"lastSyncedAt"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type Email struct {
	ID            string    `json:"id"`
	AccountID     string    `json:"accountId"`
	BusinessID    string    `json:"businessId"`
	MessageID     string    `json:"messageId"`
	InReplyTo     string    `json:"inReplyTo"`
	References    string    `json:"references"`
	Subject       string    `json:"subject"`
	FromAddress   string    `json:"fromAddress"`
	FromName      string    `json:"fromName"`
	ToAddresses   string    `json:"toAddresses"`
	CcAddresses   string    `json:"ccAddresses"`
	BccAddresses  string    `json:"bccAddresses"`
	BodyText      string    `json:"bodyText"`
	BodyHTML      string    `json:"bodyHtml"`
	SentAt        time.Time `json:"sentAt"`
	ReceivedAt    time.Time `json:"receivedAt"`
	IsRead        bool      `json:"isRead"`
	IsStarred     bool      `json:"isStarred"`
	Folder        string    `json:"folder"`
	ThreadID      string    `json:"threadId"`
	ContactID     *string   `json:"contactId"`
	CompanyID     *string   `json:"companyId"`
	CreatedAt     time.Time `json:"createdAt"`
}

type EmailAttachment struct {
	ID         string    `json:"id"`
	EmailID    string    `json:"emailId"`
	Filename   string    `json:"filename"`
	MimeType   string    `json:"mimeType"`
	SizeBytes  int       `json:"sizeBytes"`
	StorageURL string    `json:"storageUrl"`
	CreatedAt  time.Time `json:"createdAt"`
}
