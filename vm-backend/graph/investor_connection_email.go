package graph

import (
	"fmt"
	"log"

	"github.com/venturemate/vmbackend/internal/investors"
)

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
	headings := map[string]string{
		"pending":   "Your investor connection request is pending",
		"in_review": "Your investor connection request is in review",
		"connected": "You are connected with this investor",
		"declined":  "Your investor connection request was declined",
	}
	intros := map[string]string{
		"pending":   "Hi " + request.FounderName + ", we received your request to connect " + request.BusinessName + " with " + request.InvestorName + ". Our team is reviewing it and will email you when its status changes.",
		"in_review": "Hi " + request.FounderName + ", your request to connect " + request.BusinessName + " with " + request.InvestorName + " is now being reviewed by the VentureMate team. We will email you when its status changes.",
		"connected": "Hi " + request.FounderName + ", your connection between " + request.BusinessName + " and " + request.InvestorName + " is confirmed. You can now follow up directly using the investor contact details below.",
		"declined":  "Hi " + request.FounderName + ", your request to connect " + request.BusinessName + " with " + request.InvestorName + " was declined. Contact VentureMate support if you need help or would like to discuss next steps.",
	}
	rows := investorConnectionRows(request)
	if status == "connected" {
		rows = append(rows,
			bookingEmailRow{Label: "Investor email", Value: request.InvestorEmail},
			bookingEmailRow{Label: "Investor phone", Value: request.InvestorPhone},
		)
	}
	go sendInvestorConnectionEmail(
		[]string{request.UserEmail},
		"Investor connection update: "+investorConnectionStatusLabel(status),
		"Investor connection update",
		headings[status],
		intros[status],
		rows,
	)
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
	rows := investorConnectionRows(request)
	heading := "An investor connection request is in review"
	intro := request.BusinessName + " has requested an introduction to " + request.InvestorName + ". The VentureMate team is reviewing the request and will share contact details if the connection is confirmed."
	if request.Status == "connected" {
		rows = append(rows,
			bookingEmailRow{Label: "Founder email", Value: request.UserEmail},
			bookingEmailRow{Label: "Founder phone", Value: request.UserPhone},
			bookingEmailRow{Label: "Startup details", Value: request.BusinessDescription},
		)
		heading = "Your connection with " + request.BusinessName + " is confirmed"
		intro = "The VentureMate team has confirmed your connection with " + request.BusinessName + ". You can now coordinate directly with the founder using the contact information below."
	}
	go sendInvestorConnectionEmail(
		[]string{request.InvestorEmail},
		"Investor connection "+investorConnectionStatusLabel(request.Status)+": "+request.BusinessName,
		"Investor introduction",
		heading,
		intro,
		rows,
	)
}
