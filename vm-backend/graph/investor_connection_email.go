package graph

import (
	"log"

	"github.com/venturemate/vmbackend/internal/investors"
)

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
		{Label: "Investor", Value: request.InvestorName},
		{Label: "Founder", Value: request.UserName},
		{Label: "Status", Value: request.Status},
	}
}

func sendFounderInvestorConnectionEmail(request *investors.ConnectionRequest, status string) {
	if request == nil || request.UserEmail == "" {
		return
	}
	headings := map[string]string{
		"pending":   "Your investor connection request is pending",
		"approved":  "Your investor connection request was approved",
		"connected": "You are connected with this investor",
		"declined":  "Your investor connection request was declined",
	}
	intros := map[string]string{
		"pending":   "Hi " + request.UserName + ", we received your request to connect " + request.BusinessName + " with " + request.InvestorName + ". Our team is reviewing it and will email you when its status changes.",
		"approved":  "Hi " + request.UserName + ", your request to connect " + request.BusinessName + " with " + request.InvestorName + " has been approved. We will update you when the introduction is confirmed.",
		"connected": "Hi " + request.UserName + ", your connection between " + request.BusinessName + " and " + request.InvestorName + " is confirmed. You can now follow up directly using the investor contact details below.",
		"declined":  "Hi " + request.UserName + ", your request to connect " + request.BusinessName + " with " + request.InvestorName + " was declined. Contact VentureMate support if you need help or would like to discuss next steps.",
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
		"Investor connection update: "+status,
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
	intro := "A user investor connection request has changed to " + request.Status + ". Review the request in the admin dashboard."
	if request.Status == "pending" {
		intro = "A user has requested an investor connection. Review the request in the admin dashboard."
	}
	go sendInvestorConnectionEmail(
		[]string{adminEmail},
		"Investor connection "+request.Status+": "+request.BusinessName,
		"Investor connection request",
		"Investor request status: "+request.Status,
		intro,
		rows,
	)
}

func sendInvestorContactIntroductionEmail(request *investors.ConnectionRequest) {
	if request == nil || request.InvestorEmail == "" {
		return
	}
	rows := investorConnectionRows(request)
	rows = append(rows,
		bookingEmailRow{Label: "Founder email", Value: request.UserEmail},
		bookingEmailRow{Label: "Founder phone", Value: request.UserPhone},
		bookingEmailRow{Label: "Startup details", Value: request.BusinessDescription},
	)
	heading := "An investor connection request was approved"
	intro := request.BusinessName + " has been approved to connect with " + request.InvestorName + ". The founder's contact information is below so you can review the opportunity and coordinate next steps."
	if request.Status == "connected" {
		heading = "Your connection with " + request.BusinessName + " is confirmed"
		intro = "The VentureMate team has confirmed your connection with " + request.BusinessName + ". You can now coordinate directly with the founder using the contact information below."
	}
	go sendInvestorConnectionEmail(
		[]string{request.InvestorEmail},
		"Investor connection "+request.Status+": "+request.BusinessName,
		"Investor introduction",
		heading,
		intro,
		rows,
	)
}
