package rates

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

type Rate struct {
	Code   string  `json:"code"`
	Name   string  `json:"name"`
	Symbol string  `json:"symbol"`
	Rate   float64 `json:"rate"`
}

type Service struct {
	mu        sync.RWMutex
	rates     []Rate
	ratesMap  map[string]float64
	apiKey    string
	updatedAt time.Time
}

func NewService(apiKey string) *Service {
	s := &Service{apiKey: apiKey}
	s.loadDefaults()
	if apiKey != "" {
		go s.refreshPeriodically()
	}
	return s
}

func (s *Service) loadDefaults() {
	defaultRates := []Rate{
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
		{Code: "KES", Name: "Kenyan Shilling", Symbol: "KSh", Rate: 145},
		{Code: "ZAR", Name: "South African Rand", Symbol: "R", Rate: 18.2},
	}
	s.ratesMap = make(map[string]float64, len(defaultRates))
	for _, r := range defaultRates {
		s.ratesMap[r.Code] = r.Rate
	}
	s.rates = defaultRates
}

func (s *Service) refreshPeriodically() {
	s.refresh()
	ticker := time.NewTicker(24 * time.Hour)
	for range ticker.C {
		s.refresh()
	}
}

func (s *Service) refresh() {
	rates, err := s.fetchRates()
	if err != nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.rates = rates
	s.ratesMap = make(map[string]float64, len(rates))
	for _, r := range rates {
		s.ratesMap[r.Code] = r.Rate
	}
	s.updatedAt = time.Now()
}

type apiResponse struct {
	Valid   bool               `json:"valid"`
	Updated int64              `json:"updated"`
	Base    string             `json:"base"`
	Rates   map[string]float64 `json:"rates"`
}

var symbolMap = map[string]string{
	"USD": "$", "EUR": "€", "GBP": "£", "GHS": "₵", "NGN": "₦",
	"CAD": "CA$", "AUD": "A$", "JPY": "¥", "CNY": "¥", "INR": "₹",
	"AED": "د.إ", "KES": "KSh", "ZAR": "R", "CHF": "Fr", "SEK": "kr",
	"NOK": "kr", "DKK": "kr", "MXN": "Mex$", "BRL": "R$", "SGD": "S$",
	"HKD": "HK$", "TWD": "NT$", "KRW": "₩", "TRY": "₺", "RUB": "₽",
	"PLN": "zł", "CZK": "Kč", "ILS": "₪", "SAR": "﷼", "XAF": "FCFA",
	"XOF": "CFA", "MAD": "د.م.", "EGP": "E£", "TZS": "TSh", "UGX": "USh",
}

var nameMap = map[string]string{
	"USD": "US Dollar", "EUR": "Euro", "GBP": "British Pound",
	"GHS": "Ghanaian Cedi", "NGN": "Nigerian Naira",
	"CAD": "Canadian Dollar", "AUD": "Australian Dollar",
	"JPY": "Japanese Yen", "CNY": "Chinese Yuan", "INR": "Indian Rupee",
	"AED": "UAE Dirham", "KES": "Kenyan Shilling", "ZAR": "South African Rand",
}

func (s *Service) fetchRates() ([]Rate, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("no API key configured")
	}
	url := fmt.Sprintf("https://currencyapi.net/api/v2/rates?key=%s&base=USD&output=JSON", s.apiKey)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("fetch rates: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read rates: %w", err)
	}
	var apiResp apiResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("parse rates: %w", err)
	}
	if !apiResp.Valid {
		return nil, fmt.Errorf("invalid API response")
	}
	var rates []Rate
	for code, rate := range apiResp.Rates {
		symbol := symbolMap[code]
		if symbol == "" {
			symbol = code
		}
		name := nameMap[code]
		if name == "" {
			name = code
		}
		rates = append(rates, Rate{Code: code, Name: name, Symbol: symbol, Rate: rate})
	}
	return rates, nil
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

func (s *Service) UpdatedAt() time.Time {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.updatedAt
}
