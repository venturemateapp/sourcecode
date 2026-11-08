package graph

import (
	"bytes"
	"fmt"
	"html/template"
	"log"

	"github.com/venturemate/vmbackend/internal/investors"
)

type investorEmailContent struct {
	Greeting   string
	Paragraphs []string
	Rows       []bookingEmailRow
}

var investorProfessionalEmailTemplate = template.Must(template.New("investor-connection-email").Parse(`
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#334155">
  <tr><td>
    <h1 style="margin:0 0 22px;color:#0f172a;font-size:23px;line-height:1.3">Investor connection update</h1>
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65">Dear {{.Greeting}},</p>
    {{range .Paragraphs}}<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7">{{.}}</p>{{end}}
    {{if .Rows}}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 22px;border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden">
      {{range .Rows}}<tr><td style="width:36%;padding:11px 13px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;vertical-align:top">{{.Label}}</td><td style="padding:11px 13px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;line-height:1.55;vertical-align:top;word-break:break-word">{{.Value}}</td></tr>{{end}}
    </table>{{end}}
    <p style="margin:22px 0 0;color:#475569;font-size:14px;line-height:1.65">Kind regards,<br><strong>The VentureMate Team</strong><br><a href="https://venturemate.net" style="color:#059669;text-decoration:none">venturemate.net</a></p>
  </td></tr>
</table>`))

func investorConnectionStatusLabel(status string) string {
	switch status {
	case "pending":
		return "Pending"
	case "in_review":
		return "In review"
	case "connected":
		return "Connected"
	case "declined":
		return "Declined"
	default:
		return status
	}
}

func sendInvestorConnectionEmail(to []string, subject, eyebrow, heading, intro string, rows []bookingEmailRow) {
	if AppContainer == nil || AppContainer.Email == nil || len(to) == 0 {
		return
	}
	body, err := renderBookingEmail(eyebrow, heading, intro, rows)
	if err != nil {
		log.Printf("render investor connection email: %v", err)
		return
	}
	if err := AppContainer.Email.SendTemplatedEmail(to, subject, body); err != nil {
		log.Printf("send investor connection email: %v", err)
	}
}

func sendProfessionalInvestorEmail(to []string, subject, greeting string, paragraphs []string, rows []bookingEmailRow) {
	if AppContainer == nil || AppContainer.Email == nil || len(to) == 0 {
		return
	}
	var body bytes.Buffer
	err := investorProfessionalEmailTemplate.Execute(&body, investorEmailContent{Greeting: greeting, Paragraphs: paragraphs, Rows: rows})
	if err != nil {
		log.Printf("render investor connection email: %v", err)
		return
	}
	if err := AppContainer.Email.SendTemplatedEmail(to, subject, body.String()); err != nil {
		log.Printf("send investor connection email: %v", err)
	}
}

func investorConnectionRows(request *investors.ConnectionRequest) []bookingEmailRow {
	return []bookingEmailRow{
		{Label: "Request reference", Value: request.ID},
		{Label: "Startup", Value: request.BusinessName},
		{Label: "Industry", Value: request.BusinessIndustry},
		{Label: "Founder", Value: request.FounderName},
		{Label: "Funding stage", Value: request.FundingStage},
		{Label: "Funding amount required", Value: fmt.Sprintf("%.2f %s", request.FundingAmount, request.FundingCurrency)},
		{Label: "Investor", Value: request.InvestorName},
		{Label: "Status", Value: investorConnectionStatusLabel(request.Status)},
	}
}

func sendFounderInvestorConnectionEmail(request *investors.ConnectionRequest, status string) {
	if request == nil || request.UserEmail == "" {
		return
	}
	paragraphs := []string{}
	rows := []bookingEmailRow{}
	subject := "Your Investor Connection Request Has Been Received"
	switch status {
	case "pending":
		paragraphs = []string{
			fmt.Sprintf("We received your request to connect %s with %s. Your request is pending review by the VentureMate team.", request.BusinessName, request.InvestorName),
			"We will email you when the request status changes.",
		}
	case "in_review":
		subject = "Your Investor Connection Request Has Been Approved"
		paragraphs = []string{
			fmt.Sprintf("Good news! Your request to connect with %s has been approved by the VentureMate team, and your profile and business information have been submitted to the investor for review.", request.InvestorName),
			"Your request is currently Under Review.",
			"The investor will review your business and decide whether they would like to proceed with a conversation or investment discussion. If the investor responds, we will notify you through VentureMate.",
			"In the meantime, you can continue updating your business profile, pitch deck, business plan, and other information to ensure your business is investor-ready.",
			"Thank you for using VentureMate.",
			"Your idea. Our AI. Your startup.",
		}
	case "connected":
		subject = "Your Investor Connection Is Confirmed"
		paragraphs = []string{
			fmt.Sprintf("The VentureMate team has confirmed your connection with %s. You can now follow up directly with the investor.", request.InvestorName),
			"The investor's contact details are included below. You can continue updating your profile and business materials as you prepare for the conversation.",
			"Thank you for using VentureMate.",
			"Your idea. Our AI. Your startup.",
		}
		rows = append(rows,
			bookingEmailRow{Label: "Investor", Value: request.InvestorName},
			bookingEmailRow{Label: "Business", Value: request.BusinessName},
			bookingEmailRow{Label: "Investor email", Value: request.InvestorEmail},
			bookingEmailRow{Label: "Investor phone", Value: request.InvestorPhone},
		)
	case "declined":
		subject = "Update on Your Investor Connection Request"
		paragraphs = []string{
			fmt.Sprintf("The VentureMate team is unable to proceed with your request to connect %s with %s at this time.", request.BusinessName, request.InvestorName),
			"Contact VentureMate support if you need help or would like to discuss next steps.",
		}
	}
	go sendProfessionalInvestorEmail([]string{request.UserEmail}, subject, request.FounderName, paragraphs, rows)
}

func sendAdminInvestorConnectionEmail(request *investors.ConnectionRequest, adminEmail string) {
	if request == nil || adminEmail == "" {
		return
	}
	rows := investorConnectionRows(request)
	rows = append(rows,
		bookingEmailRow{Label: "Founder email", Value: request.UserEmail},
		bookingEmailRow{Label: "Founder phone", Value: request.UserPhone},
		bookingEmailRow{Label: "Investor email", Value: request.InvestorEmail},
		bookingEmailRow{Label: "Investor phone", Value: request.InvestorPhone},
	)
	statusLabel := investorConnectionStatusLabel(request.Status)
	intro := "A user investor connection request has changed to " + statusLabel + ". Review the request in the admin dashboard."
	if request.Status == "pending" {
		intro = "A user has requested an investor connection. Review the request in the admin dashboard."
	}
	go sendInvestorConnectionEmail(
		[]string{adminEmail},
		"Investor connection "+statusLabel+": "+request.BusinessName,
		"Investor connection request",
		"Investor request status: "+statusLabel,
		intro,
		rows,
	)
}

func sendInvestorConnectionInvestorEmail(request *investors.ConnectionRequest) {
	if request == nil || request.InvestorEmail == "" {
		return
	}
	rows := []bookingEmailRow{}
	paragraphs := []string{}
	subject := "New Investor Connection Request on VentureMate"
	if request.Status == "in_review" {
		paragraphs = []string{
			fmt.Sprintf("We are pleased to inform you that %s has requested to connect with you regarding a potential investment opportunity.", request.FounderName),
			"The request has been reviewed and approved by the VentureMate team for your consideration.",
			"You can review the founder's profile and business information on your VentureMate dashboard and decide whether you would like to engage further.",
			"Thank you for being part of the VentureMate investor network.",
		}
		rows = append(rows,
			bookingEmailRow{Label: "Founder", Value: request.FounderName},
			bookingEmailRow{Label: "Business", Value: request.BusinessName},
			bookingEmailRow{Label: "Industry", Value: request.BusinessIndustry},
			bookingEmailRow{Label: "Funding stage", Value: request.FundingStage},
			bookingEmailRow{Label: "Funding requirement", Value: fmt.Sprintf("%.2f %s", request.FundingAmount, request.FundingCurrency)},
		)
	} else {
		subject = "Investor Connection Confirmed on VentureMate"
		paragraphs = []string{
			fmt.Sprintf("The VentureMate team has confirmed your connection with %s. You can now coordinate directly with the founder.", request.BusinessName),
			"Thank you for being part of the VentureMate investor network.",
		}
	}
	if request.Status == "connected" {
		rows = append(rows,
			bookingEmailRow{Label: "Founder", Value: request.FounderName},
			bookingEmailRow{Label: "Founder email", Value: request.UserEmail},
			bookingEmailRow{Label: "Founder phone", Value: request.UserPhone},
			bookingEmailRow{Label: "Business", Value: request.BusinessName},
			bookingEmailRow{Label: "Industry", Value: request.BusinessIndustry},
		)
	}
	go sendProfessionalInvestorEmail([]string{request.InvestorEmail}, subject, request.InvestorName, paragraphs, rows)
}
