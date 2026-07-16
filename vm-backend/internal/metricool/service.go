package metricool

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const baseURL = "https://app.metricool.com/api"

type Connection struct {
	ID                string    `json:"id"`
	UserID            string    `json:"userId"`
	MetricoolUserToken string   `json:"metricoolUserToken"`
	MetricoolUserID   string    `json:"metricoolUserId"`
	ActiveBrandID     string    `json:"activeBrandId"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetByUserID(ctx context.Context, userID string) (*Connection, error) {
	var c Connection
	var activeBrandID *string
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, metricool_user_token, metricool_user_id, active_brand_id, created_at, updated_at
		 FROM metricool_connections WHERE user_id = $1`, userID,
	).Scan(&c.ID, &c.UserID, &c.MetricoolUserToken, &c.MetricoolUserID, &activeBrandID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if activeBrandID != nil {
		c.ActiveBrandID = *activeBrandID
	}
	return &c, nil
}

func (r *Repository) Upsert(ctx context.Context, userID, token, metricoolUserID string) (*Connection, error) {
	var c Connection
	var activeBrandID *string
	err := r.db.QueryRow(ctx,
		`INSERT INTO metricool_connections (user_id, metricool_user_token, metricool_user_id)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id) DO UPDATE SET metricool_user_token = $2, metricool_user_id = $3, updated_at = NOW()
		 RETURNING id, user_id, metricool_user_token, metricool_user_id, active_brand_id, created_at, updated_at`,
		userID, token, metricoolUserID,
	).Scan(&c.ID, &c.UserID, &c.MetricoolUserToken, &c.MetricoolUserID, &activeBrandID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if activeBrandID != nil {
		c.ActiveBrandID = *activeBrandID
	}
	return &c, nil
}

func (r *Repository) UpdateActiveBrand(ctx context.Context, userID, brandID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE metricool_connections SET active_brand_id = $1, updated_at = NOW() WHERE user_id = $2`,
		brandID, userID)
	return err
}

type Service struct {
	repo  *Repository
	http  *http.Client
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
		http: &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *Service) GetConnection(ctx context.Context, userID string) (*Connection, error) {
	return s.repo.GetByUserID(ctx, userID)
}

func (s *Service) SaveConnection(ctx context.Context, userID, token, metricoolUserID string) (*Connection, error) {
	return s.repo.Upsert(ctx, userID, token, metricoolUserID)
}

func (s *Service) UpdateActiveBrand(ctx context.Context, userID, brandID string) error {
	return s.repo.UpdateActiveBrand(ctx, userID, brandID)
}

func (s *Service) doRequest(ctx context.Context, conn *Connection, path string, params map[string]string) ([]byte, error) {
	u, _ := url.Parse(baseURL + path)
	q := u.Query()
	q.Set("userId", conn.MetricoolUserID)
	q.Set("integrationSource", "venturemate")
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("authorization", conn.MetricoolUserToken)
	req.Header.Set("Accept", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("metricool request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 5<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("metricool API error %d: %s", resp.StatusCode, string(body))
	}
	return body, nil
}

type Brand struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	UserID   string `json:"userId"`
	Timezone string `json:"timezone"`
	Networks []struct {
		Network string `json:"network"`
		Handle  string `json:"handle"`
		Active  bool   `json:"active"`
	} `json:"networks,omitempty"`
}

func (s *Service) GetBrands(ctx context.Context, conn *Connection) ([]Brand, error) {
	body, err := s.doRequest(ctx, conn, "/v2/settings/brands", nil)
	if err != nil {
		return nil, err
	}
	var resp struct {
		Data []Brand `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse brands: %w", err)
	}
	return resp.Data, nil
}

type Post struct {
	ID          string `json:"id"`
	Text        string `json:"text"`
	Date        string `json:"date"`
	Impressions int    `json:"impressions,omitempty"`
	Engagement  int    `json:"engagement,omitempty"`
	Likes       int    `json:"likes,omitempty"`
	Comments    int    `json:"comments,omitempty"`
	Shares      int    `json:"shares,omitempty"`
	MediaURL    string `json:"mediaUrl,omitempty"`
	Permalink   string `json:"permalink,omitempty"`
}

func (s *Service) GetPosts(ctx context.Context, conn *Connection, brandID, network, postType string) ([]Post, error) {
	from := time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	to := time.Now().Format("2006-01-02")
	var path string
	switch postType {
	case "reels":
		path = fmt.Sprintf("/v2/analytics/reels/%s", network)
	case "stories":
		path = fmt.Sprintf("/v2/analytics/stories/%s", network)
	default:
		path = fmt.Sprintf("/v2/analytics/posts/%s", network)
	}
	params := map[string]string{
		"blogId": brandID,
		"from":   from + "T00:00:00",
		"to":     to + "T23:59:59",
	}
	body, err := s.doRequest(ctx, conn, path, params)
	if err != nil {
		return nil, err
	}
	var dataArr []Post
	if err := json.Unmarshal(body, &dataArr); err == nil {
		return dataArr, nil
	}
	var dataObj struct {
		Data []Post `json:"data"`
	}
	if err := json.Unmarshal(body, &dataObj); err == nil {
		return dataObj.Data, nil
	}
	return nil, fmt.Errorf("unexpected posts response: %s", truncate(string(body), 200))
}

type ScheduledPost struct {
	ID      string `json:"id"`
	Text    string `json:"text"`
	Date    string `json:"date"`
	Network string `json:"network"`
	Status  string `json:"status"`
}

func (s *Service) GetScheduledPosts(ctx context.Context, conn *Connection, brandID string) ([]ScheduledPost, error) {
	params := map[string]string{"blogId": brandID}
	body, err := s.doRequest(ctx, conn, "/v2/calendar/posts/scheduled", params)
	if err != nil {
		return nil, err
	}
	var data struct {
		Data []ScheduledPost `json:"data"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		var arr []ScheduledPost
		if e2 := json.Unmarshal(body, &arr); e2 != nil {
			return nil, fmt.Errorf("parse scheduled posts: %w", err)
		}
		return arr, nil
	}
	return data.Data, nil
}

type AccountMetrics struct {
	Followers  int     `json:"followers,omitempty"`
	Following  int     `json:"following,omitempty"`
	PostsCount int     `json:"postsCount,omitempty"`
	Engagement float64 `json:"engagement,omitempty"`
}

func (s *Service) GetAccountMetrics(ctx context.Context, conn *Connection, brandID, network string) (*AccountMetrics, error) {
	params := map[string]string{
		"blogId":  brandID,
		"network": network,
	}
	body, err := s.doRequest(ctx, conn, "/v2/analytics/account", params)
	if err != nil {
		return nil, err
	}
	var m AccountMetrics
	_ = json.Unmarshal(body, &m)
	return &m, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
