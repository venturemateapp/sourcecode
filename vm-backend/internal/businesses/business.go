package businesses

import "time"

type Business struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	Name         string    `json:"name"`
	Tagline      string    `json:"tagline"`
	Description  string    `json:"description"`
	Industry     string    `json:"industry"`
	Stage        string    `json:"stage"`
	FoundedDate  *time.Time `json:"foundedDate"`
	Location     string    `json:"location"`
	Website      string    `json:"website"`
	Status       string    `json:"status"`
	BrandKit     string    `json:"brandKit"`
	PitchDeck    string    `json:"pitchDeck"`
	BusinessPlan string    `json:"businessPlan"`
	Milestones   string    `json:"milestones"`
	Team         string    `json:"team"`
	Documents    string    `json:"documents"`
	WebsiteConfig string   `json:"websiteConfig"`
	Financials   string    `json:"financials"`
	Metrics      string    `json:"metrics"`
	AIGenerated  string    `json:"aiGenerated"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
