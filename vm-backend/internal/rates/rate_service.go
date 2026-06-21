package rates

import "sync"

type Rate struct {
	Code   string  `json:"code"`
	Name   string  `json:"name"`
	Symbol string  `json:"symbol"`
	Rate   float64 `json:"rate"`
}

var defaultRates = []Rate{
	{Code: "USD", Name: "US Dollar", Symbol: "$", Rate: 1},
	{Code: "EUR", Name: "Euro", Symbol: "€", Rate: 0.92},
	{Code: "GBP", Name: "British Pound", Symbol: "£", Rate: 0.79},
	{Code: "GHS", Name: "Ghanaian Cedi", Symbol: "₵", Rate: 15.5},
	{Code: "NGN", Name: "Nigerian Naira", Symbol: "₦", Rate: 1550},
	{Code: "CAD", Name: "Canadian Dollar", Symbol: "CA$", Rate: 1.37},
	{Code: "AUD", Name: "Australian Dollar", Symbol: "A$", Rate: 1.52},
	{Code: "JPY", Name: "Japanese Yen", Symbol: "¥", Rate: 157},
	{Code: "CNY", Name: "Chinese Yuan", Symbol: "¥", Rate: 7.24},
	{Code: "INR", Name: "Indian Rupee", Symbol: "₹", Rate: 83.5},
	{Code: "AED", Name: "UAE Dirham", Symbol: "د.إ", Rate: 3.67},
	{Code: "KES", Name: "Kenyan Shilling", Symbol: "KSh", Rate: 130},
	{Code: "ZAR", Name: "South African Rand", Symbol: "R", Rate: 18.2},
}

type Service struct {
	mu       sync.RWMutex
	rates    []Rate
	ratesMap map[string]float64
}

func NewService() *Service {
	s := &Service{}
	s.loadRates()
	return s
}

func (s *Service) loadRates() {
	s.ratesMap = make(map[string]float64, len(defaultRates))
	for _, r := range defaultRates {
		s.ratesMap[r.Code] = r.Rate
	}
	s.rates = defaultRates
}

func (s *Service) List() []Rate {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.rates
}

func (s *Service) Convert(amountUSD float64, toCurrency string) float64 {
	s.mu.RLock()
	rate, ok := s.ratesMap[toCurrency]
	s.mu.RUnlock()
	if !ok || toCurrency == "USD" {
		return amountUSD
	}
	return amountUSD * rate
}
