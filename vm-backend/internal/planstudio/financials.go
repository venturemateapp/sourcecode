package planstudio

import (
	"errors"
	"math"
	"strings"
	"time"
)

func CalculateProjection(input ProjectionInput) (*Projection, error) {
	if input.Years <= 0 {
		input.Years = 3
	}
	if input.Years > 10 {
		return nil, errors.New("projection cannot exceed 10 years")
	}
	if input.StartingCustomers < 0 || input.AverageRevenuePerCustomer < 0 || input.MonthlyFixedCosts < 0 {
		return nil, errors.New("projection inputs cannot be negative")
	}
	if input.CustomerGrowthRate < -1 || input.CustomerGrowthRate > 20 {
		return nil, errors.New("customer growth rate is outside the supported range")
	}
	if input.GrossMarginRate < 0 || input.GrossMarginRate > 1 || input.VariableCostRate < 0 || input.VariableCostRate > 1 {
		return nil, errors.New("margin and variable cost rates must be between 0 and 1")
	}
	if strings.TrimSpace(input.Currency) == "" {
		input.Currency = "USD"
	}
	customers := float64(input.StartingCustomers)
	result := &Projection{Label: "Management projection — not historical actuals", Currency: input.Currency, Input: input, GeneratedAt: time.Now().UTC().Format(time.RFC3339)}
	for year := 1; year <= input.Years; year++ {
		if year > 1 {
			customers *= 1 + input.CustomerGrowthRate
		}
		revenue := customers * input.AverageRevenuePerCustomer * 12
		cogsByMargin := revenue * (1 - input.GrossMarginRate)
		cogsByVariableRate := revenue * input.VariableCostRate
		cogs := math.Max(cogsByMargin, cogsByVariableRate)
		grossProfit := revenue - cogs
		operatingCost := input.MonthlyFixedCosts * 12
		netProfit := grossProfit - operatingCost
		netMargin := 0.0
		if revenue > 0 {
			netMargin = netProfit / revenue
		}
		result.Years = append(result.Years, ProjectionYear{Year: year, Customers: int(math.Round(customers)), Revenue: roundMoney(revenue), COGS: roundMoney(cogs), GrossProfit: roundMoney(grossProfit), OperatingCost: roundMoney(operatingCost), NetProfit: roundMoney(netProfit), NetMargin: math.Round(netMargin*10000) / 10000})
	}
	contributionRate := math.Max(input.GrossMarginRate, 1-input.VariableCostRate)
	if contributionRate > 0 {
		result.BreakEvenMonthlyRevenue = roundMoney(input.MonthlyFixedCosts / contributionRate)
	}
	return result, nil
}

func roundMoney(value float64) float64 { return math.Round(value*100) / 100 }
