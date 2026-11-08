package graph

import (
	"bytes"
	"fmt"
	"html/template"
	"log"

	"github.com/venturemate/vmbackend/internal/marketplace"
)

type bookingEmailRow struct {
	Label string
	Value string
}

type bookingEmailContent struct {
	Eyebrow string
	Heading string
	Intro   string
	Rows    []bookingEmailRow
}

var bookingEmailTemplate = template.Must(template.New("booking-email").Parse(`
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#334155">
  <tr><td style="padding:4px 0 24px">
    <p style="margin:0 0 10px;color:#059669;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">{{.Eyebrow}}</p>
    <h1 style="margin:0 0 12px;color:#0f172a;font-size:25px;line-height:1.25">{{.Heading}}</h1>
    <p style="margin:0;color:#475569;font-size:15px;line-height:1.65">{{.Intro}}</p>
  </td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden">
      {{range .Rows}}<tr>
        <td style="width:34%;padding:12px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;vertical-align:top">{{.Label}}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;line-height:1.55;vertical-align:top;word-break:break-word">{{.Value}}</td>
      </tr>{{end}}
    </table>
  </td></tr>
  <tr><td style="padding-top:22px;color:#64748b;font-size:13px;line-height:1.6">This is an automated update from VentureMate Marketplace. Please reply to this email if you need assistance.</td></tr>
</table>`))

func renderBookingEmail(eyebrow, heading, intro string, rows []bookingEmailRow) (string, error) {
	var body bytes.Buffer
	err := bookingEmailTemplate.Execute(&body, bookingEmailContent{Eyebrow: eyebrow, Heading: heading, Intro: intro, Rows: rows})
	return body.String(), err
}

func bookingSummaryRows(details *marketplace.BookingNotificationDetails) []bookingEmailRow {
	return []bookingEmailRow{
		{Label: "Booking reference", Value: details.ID},
		{Label: "Project", Value: details.ProjectTitle},
		{Label: "Customer", Value: details.UserName},
		{Label: "Provider", Value: details.ProviderName},
		{Label: "Submitted", Value: details.CreatedAt.Format("Jan 2, 2006 at 3:04 PM MST")},
		{Label: "Project details", Value: details.Description},
	}
}

func sendBookingEmail(to []string, subject, eyebrow, heading, intro string, rows []bookingEmailRow) {
	if AppContainer == nil || AppContainer.Email == nil || len(to) == 0 {
		return
	}
	body, err := renderBookingEmail(eyebrow, heading, intro, rows)
	if err != nil {
		log.Printf("render booking email: %v", err)
		return
	}
	if err := AppContainer.Email.SendTemplatedEmail(to, subject, body); err != nil {
		log.Printf("send booking email to %v: %v", to, err)
	}
}

func notifyAdminsOfNewBooking(details *marketplace.BookingNotificationDetails, adminEmails []string) {
	if details == nil || len(adminEmails) == 0 {
		return
	}
	rows := bookingSummaryRows(details)
	rows = append(rows,
		bookingEmailRow{Label: "Customer email", Value: details.UserEmail},
		bookingEmailRow{Label: "Provider email", Value: details.ProviderEmail},
		bookingEmailRow{Label: "Provider phone", Value: details.ProviderPhone},
	)
	// Send individually so administrators do not see each other's addresses.
	for _, adminEmail := range adminEmails {
		recipient := adminEmail
		go sendBookingEmail([]string{recipient}, "New Marketplace booking request", "Marketplace booking", "A new booking needs review", "A customer has submitted a booking request. Review the details below and approve or decline it in the admin dashboard.", rows)
	}
}

func notifyProviderOfApprovedBooking(details *marketplace.BookingNotificationDetails) {
	if details == nil || details.ProviderEmail == "" {
		return
	}
	rows := bookingSummaryRows(details)
	rows = append(rows, bookingEmailRow{Label: "Customer email", Value: details.UserEmail})
	go sendBookingEmail([]string{details.ProviderEmail}, "Marketplace booking approved", "Booking approved", "You have a confirmed booking", fmt.Sprintf("Hi %s, the booking request below has been approved. Please use the customer contact details to coordinate next steps.", details.ProviderName), rows)
}

func notifyCustomerOfBookingDecision(details *marketplace.BookingNotificationDetails, status, adminNotes string) {
	if details == nil || details.UserEmail == "" {
		return
	}
	approved := status == "approved"
	heading := "Your booking was declined"
	intro := fmt.Sprintf("Hi %s, your booking request for %s was declined by the VentureMate team.", details.UserName, details.ProjectTitle)
	eyebrow := "Booking update"
	if approved {
		heading = "Your booking was approved"
		intro = fmt.Sprintf("Hi %s, your booking request for %s has been approved. The VentureMate team will help coordinate the next steps.", details.UserName, details.ProjectTitle)
	}
	rows := []bookingEmailRow{
		{Label: "Booking reference", Value: details.ID},
		{Label: "Project", Value: details.ProjectTitle},
		{Label: "Provider", Value: details.ProviderName},
		{Label: "Status", Value: status},
		{Label: "Project details", Value: details.Description},
	}
	if adminNotes != "" {
		rows = append(rows, bookingEmailRow{Label: "Team note", Value: adminNotes})
	}
	subjectStatus := "declined"
	if approved {
		subjectStatus = "approved"
	}
	go sendBookingEmail([]string{details.UserEmail}, "Marketplace booking "+subjectStatus, eyebrow, heading, intro, rows)
}
