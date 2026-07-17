package crmcalendar

import "time"

type CalendarAccount struct {
	ID             string     `json:"id"`
	UserID         string     `json:"userId"`
	BusinessID     string     `json:"businessId"`
	Email          string     `json:"email"`
	Provider       string     `json:"provider"`
	CalDAVURL      string     `json:"caldavUrl"`
	CalDAVUsername string     `json:"-"`
	CalDAVPassword string     `json:"-"`
	SyncEnabled    bool       `json:"syncEnabled"`
	LastSyncedAt   *time.Time `json:"lastSyncedAt"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type CalendarEvent struct {
	ID          string    `json:"id"`
	AccountID   string    `json:"accountId"`
	BusinessID  string    `json:"businessId"`
	UID         string    `json:"uid"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Location    string    `json:"location"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	IsAllDay    bool      `json:"isAllDay"`
	Status      string    `json:"status"`
	ICalData    string    `json:"-"`
	ContactID   *string   `json:"contactId"`
	CompanyID   *string   `json:"companyId"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
