package planstudio

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

const SchemaVersion = "2.0"

type Metadata struct {
	BusinessID   string `json:"businessId"`
	VersionLabel string `json:"versionLabel"`
	Currency     string `json:"currency"`
	PreparedAt   string `json:"preparedAt"`
}

type Block struct {
	ID              string         `json:"id"`
	Type            string         `json:"type"`
	Text            string         `json:"text,omitempty"`
	Level           int            `json:"level,omitempty"`
	Items           []string       `json:"items,omitempty"`
	Rows            [][]string     `json:"rows,omitempty"`
	Headers         []string       `json:"headers,omitempty"`
	AssetID         string         `json:"assetId,omitempty"`
	URL             string         `json:"url,omitempty"`
	AltText         string         `json:"altText,omitempty"`
	Chart           map[string]any `json:"chart,omitempty"`
	Data            map[string]any `json:"data,omitempty"`
	Style           map[string]any `json:"style,omitempty"`
	Locked          bool           `json:"locked,omitempty"`
	PageBreakBefore bool           `json:"pageBreakBefore,omitempty"`
}

type Section struct {
	ID     string  `json:"id"`
	Title  string  `json:"title"`
	Order  int     `json:"order"`
	Locked bool    `json:"locked,omitempty"`
	Notes  string  `json:"notes,omitempty"`
	Blocks []Block `json:"blocks"`
}

type Document struct {
	SchemaVersion    string         `json:"schemaVersion"`
	Title            string         `json:"title"`
	ExecutiveSummary string         `json:"executiveSummary"`
	Metadata         Metadata       `json:"metadata"`
	Sections         []Section      `json:"sections"`
	Assumptions      []Assumption   `json:"assumptions,omitempty"`
	Projection       *Projection    `json:"projection,omitempty"`
	Theme            map[string]any `json:"theme,omitempty"`
}

type Assumption struct {
	ID          string  `json:"id"`
	Label       string  `json:"label"`
	Value       float64 `json:"value"`
	Unit        string  `json:"unit"`
	Description string  `json:"description,omitempty"`
	Source      string  `json:"source"`
}

type ProjectionInput struct {
	Currency                  string  `json:"currency"`
	StartingCustomers         int     `json:"startingCustomers"`
	CustomerGrowthRate        float64 `json:"customerGrowthRate"`
	AverageRevenuePerCustomer float64 `json:"averageRevenuePerCustomer"`
	GrossMarginRate           float64 `json:"grossMarginRate"`
	MonthlyFixedCosts         float64 `json:"monthlyFixedCosts"`
	VariableCostRate          float64 `json:"variableCostRate"`
	Years                     int     `json:"years"`
}

type ProjectionYear struct {
	Year          int     `json:"year"`
	Customers     int     `json:"customers"`
	Revenue       float64 `json:"revenue"`
	COGS          float64 `json:"cogs"`
	GrossProfit   float64 `json:"grossProfit"`
	OperatingCost float64 `json:"operatingCost"`
	NetProfit     float64 `json:"netProfit"`
	NetMargin     float64 `json:"netMargin"`
}

type Projection struct {
	Label                   string           `json:"label"`
	Currency                string           `json:"currency"`
	Input                   ProjectionInput  `json:"input"`
	Years                   []ProjectionYear `json:"years"`
	BreakEvenMonthlyRevenue float64          `json:"breakEvenMonthlyRevenue"`
	GeneratedAt             string           `json:"generatedAt"`
}

var allowedBlocks = map[string]bool{
	"heading": true, "paragraph": true, "bullet_list": true, "numbered_list": true,
	"callout": true, "quote": true, "image": true, "table": true, "chart": true,
	"page_break": true, "financial_assumptions": true, "financial_projection_table": true,
}

func (d *Document) Validate() error {
	if d == nil {
		return errors.New("business plan document is required")
	}
	if d.SchemaVersion == "" {
		d.SchemaVersion = SchemaVersion
	}
	if d.SchemaVersion != SchemaVersion {
		return fmt.Errorf("unsupported plan schema version %q", d.SchemaVersion)
	}
	d.Title = strings.TrimSpace(d.Title)
	if d.Title == "" {
		return errors.New("business plan title is required")
	}
	if len(d.Sections) == 0 || len(d.Sections) > 80 {
		return errors.New("business plan must contain between 1 and 80 sections")
	}
	if strings.TrimSpace(d.Metadata.Currency) == "" {
		d.Metadata.Currency = "USD"
	}
	if strings.TrimSpace(d.Metadata.VersionLabel) == "" {
		d.Metadata.VersionLabel = "1.0"
	}
	if strings.TrimSpace(d.Metadata.PreparedAt) == "" {
		d.Metadata.PreparedAt = time.Now().UTC().Format(time.RFC3339)
	}
	seen := map[string]bool{}
	for i := range d.Sections {
		s := &d.Sections[i]
		s.ID = strings.TrimSpace(s.ID)
		s.Title = strings.TrimSpace(s.Title)
		if s.ID == "" || seen[s.ID] {
			return fmt.Errorf("section %d has a missing or duplicate id", i+1)
		}
		seen[s.ID] = true
		if s.Title == "" {
			return fmt.Errorf("section %s needs a title", s.ID)
		}
		s.Order = i
		for j := range s.Blocks {
			block := &s.Blocks[j]
			block.ID = strings.TrimSpace(block.ID)
			if block.ID == "" || seen[block.ID] {
				return fmt.Errorf("section %s has a missing or duplicate block id", s.ID)
			}
			seen[block.ID] = true
			if !allowedBlocks[block.Type] {
				return fmt.Errorf("block %s has unsupported type %q", block.ID, block.Type)
			}
			if len(block.Text) > 200000 {
				return fmt.Errorf("block %s is too large", block.ID)
			}
		}
	}
	sort.SliceStable(d.Sections, func(i, j int) bool { return d.Sections[i].Order < d.Sections[j].Order })
	return nil
}

func Parse(value string) (*Document, error) {
	var document Document
	decoder := json.NewDecoder(strings.NewReader(value))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&document); err != nil {
		return nil, err
	}
	if err := document.Validate(); err != nil {
		return nil, err
	}
	return &document, nil
}
