package oauth

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) SaveToken(ctx context.Context, token *OAuthToken) error {
	token.ID = uuid.New().String()
	now := time.Now()

	query := `INSERT INTO oauth_tokens (id, user_id, provider, access_token, refresh_token, token_type, scope, expires_at, provider_user_id, provider_email, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	          ON CONFLICT (user_id, provider) DO UPDATE SET
	            access_token = $4, refresh_token = $5, token_type = $6, scope = $7,
	            expires_at = $8, provider_user_id = $9, provider_email = $10, updated_at = $12`

	var expiresAt interface{}
	if token.ExpiresAt != "" {
		expiresAt = token.ExpiresAt
	}

	_, err := r.db.Exec(ctx, query,
		token.ID, token.UserID, token.Provider, token.AccessToken, token.RefreshToken,
		token.TokenType, token.Scope, expiresAt, token.ProviderUserID, token.ProviderEmail,
		now, now,
	)
	return err
}

func (r *Repository) GetToken(ctx context.Context, userID, provider string) (*OAuthToken, error) {
	query := `SELECT id, user_id, provider, access_token, COALESCE(refresh_token,''), COALESCE(token_type,'Bearer'), COALESCE(scope,''), COALESCE(expires_at::text,''), COALESCE(provider_user_id,''), COALESCE(provider_email,'')
	          FROM oauth_tokens WHERE user_id = $1 AND provider = $2`

	var t OAuthToken
	err := r.db.QueryRow(ctx, query, userID, provider).Scan(
		&t.ID, &t.UserID, &t.Provider, &t.AccessToken, &t.RefreshToken,
		&t.TokenType, &t.Scope, &t.ExpiresAt, &t.ProviderUserID, &t.ProviderEmail,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) DeleteToken(ctx context.Context, userID, provider string) error {
	query := `DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = $2`
	_, err := r.db.Exec(ctx, query, userID, provider)
	return err
}

func (r *Repository) ListTokens(ctx context.Context, userID string) ([]*OAuthToken, error) {
	query := `SELECT id, user_id, provider, access_token, COALESCE(refresh_token,''), COALESCE(token_type,'Bearer'), COALESCE(scope,''), COALESCE(expires_at::text,''), COALESCE(provider_user_id,''), COALESCE(provider_email,'')
	          FROM oauth_tokens WHERE user_id = $1`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []*OAuthToken
	for rows.Next() {
		var t OAuthToken
		if err := rows.Scan(&t.ID, &t.UserID, &t.Provider, &t.AccessToken, &t.RefreshToken,
			&t.TokenType, &t.Scope, &t.ExpiresAt, &t.ProviderUserID, &t.ProviderEmail); err != nil {
			return nil, err
		}
		tokens = append(tokens, &t)
	}
	return tokens, nil
}
