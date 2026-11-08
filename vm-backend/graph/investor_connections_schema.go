package graph

import (
	"context"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/investors"
)

var investorConnectionStatusType = graphql.NewObject(graphql.ObjectConfig{
	Name: "InvestorConnectionStatus",
	Fields: graphql.Fields{
		"investorId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"status":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var adminInvestorConnectionType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AdminInvestorConnection",
	Fields: graphql.Fields{
		"id":                  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"investorId":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"investorName":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"investorLogo":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"investorEmail":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"investorPhone":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"businessId":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"businessName":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"businessDescription": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"businessIndustry":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"founderName":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"fundingStage":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"fundingAmount":       &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"fundingCurrency":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"userId":              &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"userName":            &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"userEmail":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"userPhone":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":              &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"adminNotes":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"createdAt":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func connectionStatusMap(request investors.ConnectionStatus) map[string]interface{} {
	return map[string]interface{}{
		"investorId": request.InvestorID,
		"status":     request.Status,
		"updatedAt":  request.UpdatedAt.Format(time.RFC3339),
	}
}

func adminConnectionMap(request investors.ConnectionRequest) map[string]interface{} {
	return map[string]interface{}{
		"id": request.ID, "investorId": request.InvestorID,
		"investorName": request.InvestorName, "investorLogo": request.InvestorLogo,
		"investorEmail": request.InvestorEmail, "investorPhone": request.InvestorPhone,
		"businessId": request.BusinessID, "businessName": request.BusinessName,
		"businessDescription": request.BusinessDescription, "businessIndustry": request.BusinessIndustry,
		"founderName": request.FounderName, "fundingStage": request.FundingStage,
		"fundingAmount": request.FundingAmount, "fundingCurrency": request.FundingCurrency,
		"userId": request.UserID, "userName": request.UserName,
		"userEmail": request.UserEmail, "userPhone": request.UserPhone,
		"status": request.Status, "adminNotes": request.AdminNotes,
		"createdAt": request.CreatedAt.Format(time.RFC3339),
		"updatedAt": request.UpdatedAt.Format(time.RFC3339),
	}
}

func connectionStatusValid(status string) bool {
	switch status {
	case "pending", "in_review", "connected", "declined":
		return true
	default:
		return false
	}
}

func init() {
	rootQuery.AddFieldConfig("myInvestorConnections", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(investorConnectionStatusType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			userID, err := requireOwnedBusiness(p, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			requests, err := AppContainer.InvestorRepo.ListConnectionStatuses(p.Context, userID, p.Args["businessId"].(string))
			if err != nil {
				return nil, err
			}
			result := make([]map[string]interface{}, len(requests))
			for index, request := range requests {
				result[index] = connectionStatusMap(request)
			}
			return result, nil
		},
	})

	rootQuery.AddFieldConfig("adminInvestorConnections", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(adminInvestorConnectionType))),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return []map[string]interface{}{}, nil
			}
			requests, err := AppContainer.InvestorRepo.ListConnectionRequests(p.Context)
			if err != nil {
				return nil, err
			}
			result := make([]map[string]interface{}, len(requests))
			for index, request := range requests {
				result[index] = adminConnectionMap(request)
			}
			return result, nil
		},
	})

	rootMutation.AddFieldConfig("requestInvestorConnection", &graphql.Field{
		Type: graphql.NewNonNull(investorConnectionStatusType),
		Args: graphql.FieldConfigArgument{
			"investorId":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessId":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"founderName":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"businessName":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"industry":        &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"fundingStage":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"fundingAmount":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.Float)},
			"fundingCurrency": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			businessID := p.Args["businessId"].(string)
			userID, err := requireOwnedBusiness(p, businessID)
			if err != nil {
				return nil, err
			}
			investorID := p.Args["investorId"].(string)
			investor, err := AppContainer.InvestorRepo.GetByID(p.Context, investorID)
			if err != nil {
				return nil, err
			}
			if investor == nil || !investor.IsActive {
				return nil, fmt.Errorf("investor is unavailable")
			}
			founderName := strings.TrimSpace(p.Args["founderName"].(string))
			businessName := strings.TrimSpace(p.Args["businessName"].(string))
			industry := strings.TrimSpace(p.Args["industry"].(string))
			fundingStage := strings.TrimSpace(p.Args["fundingStage"].(string))
			fundingAmount := p.Args["fundingAmount"].(float64)
			fundingCurrency := strings.ToUpper(strings.TrimSpace(p.Args["fundingCurrency"].(string)))
			currencyCodeValid := len(fundingCurrency) == 3
			for _, character := range fundingCurrency {
				if character < 'A' || character > 'Z' {
					currencyCodeValid = false
				}
			}
			if founderName == "" || businessName == "" || industry == "" || fundingStage == "" ||
				math.IsNaN(fundingAmount) || math.IsInf(fundingAmount, 0) || fundingAmount <= 0 || !currencyCodeValid {
				return nil, fmt.Errorf("founder, business, industry, funding stage, a positive funding amount, and a three-letter currency are required")
			}
			input := investors.ConnectionRequestInput{
				FounderName: founderName, BusinessName: businessName, Industry: industry,
				FundingStage: fundingStage, FundingAmount: fundingAmount, FundingCurrency: fundingCurrency,
			}
			request, created, err := AppContainer.InvestorRepo.RequestConnection(p.Context, investorID, businessID, userID, input)
			if err != nil {
				return nil, err
			}
			if created {
				notifyInvestorConnectionRequested(p.Context, request)
			}
			return connectionStatusMap(investors.ConnectionStatus{InvestorID: request.InvestorID, Status: request.Status, UpdatedAt: request.UpdatedAt}), nil
		},
	})

	rootMutation.AddFieldConfig("adminUpdateInvestorConnectionStatus", &graphql.Field{
		Type: graphql.NewNonNull(adminInvestorConnectionType),
		Args: graphql.FieldConfigArgument{
			"id":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"status": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if err := adminOnly(p); err != nil {
				return nil, err
			}
			requestID := p.Args["id"].(string)
			status := p.Args["status"].(string)
			if !connectionStatusValid(status) {
				return nil, fmt.Errorf("unsupported investor connection status %q", status)
			}
			before, err := AppContainer.InvestorRepo.GetConnectionRequest(p.Context, requestID)
			if err != nil {
				return nil, err
			}
			if err := AppContainer.InvestorRepo.UpdateConnectionStatus(p.Context, requestID, status); err != nil {
				return nil, err
			}
			updated, err := AppContainer.InvestorRepo.GetConnectionRequest(p.Context, requestID)
			if err != nil {
				return nil, err
			}
			if before.Status != updated.Status {
				notifyInvestorConnectionStatusChanged(p.Context, updated)
			}
			return adminConnectionMap(*updated), nil
		},
	})
}

func notifyInvestorConnectionRequested(ctx context.Context, request *investors.ConnectionRequest) {
	if request == nil {
		return
	}
	sendFounderInvestorConnectionEmail(request, "pending")
	if AppContainer == nil || AppContainer.UserRepo == nil {
		return
	}
	admins, err := AppContainer.UserRepo.ListAdminEmails(ctx)
	if err != nil {
		log.Printf("load admin recipients for investor connection %s: %v", request.ID, err)
		return
	}
	for _, email := range admins {
		recipient := email
		sendAdminInvestorConnectionEmail(request, recipient)
	}
}

func notifyInvestorConnectionStatusChanged(ctx context.Context, request *investors.ConnectionRequest) {
	if request == nil {
		return
	}
	sendFounderInvestorConnectionEmail(request, request.Status)
	if request.Status == "in_review" || request.Status == "connected" {
		sendInvestorConnectionInvestorEmail(request)
	}
	if AppContainer == nil || AppContainer.UserRepo == nil {
		return
	}
	admins, err := AppContainer.UserRepo.ListAdminEmails(ctx)
	if err != nil {
		log.Printf("load admin recipients for investor connection %s status %s: %v", request.ID, request.Status, err)
		return
	}
	for _, email := range admins {
		recipient := email
		sendAdminInvestorConnectionEmail(request, recipient)
	}
}
