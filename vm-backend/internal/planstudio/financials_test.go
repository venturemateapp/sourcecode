package planstudio

import "testing"

func TestCalculateProjection(t *testing.T) {
	projection, err := CalculateProjection(ProjectionInput{Currency: "GHS", StartingCustomers: 100, CustomerGrowthRate: .2, AverageRevenuePerCustomer: 10, GrossMarginRate: .8, MonthlyFixedCosts: 500, VariableCostRate: .2, Years: 3})
	if err != nil {
		t.Fatal(err)
	}
	if len(projection.Years) != 3 {
		t.Fatalf("expected 3 years, got %d", len(projection.Years))
	}
	if projection.Years[0].Revenue != 12000 {
		t.Fatalf("unexpected revenue: %v", projection.Years[0].Revenue)
	}
	if projection.BreakEvenMonthlyRevenue != 625 {
		t.Fatalf("unexpected break even: %v", projection.BreakEvenMonthlyRevenue)
	}
}
