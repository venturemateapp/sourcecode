package auth

import "context"

type contextKey string

const userIDContextKey contextKey = "venturemate-user-id"

// WithUserID stores the authenticated user ID on a request context.
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDContextKey, userID)
}

// UserIDFromContext returns the authenticated user ID, when present.
func UserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDContextKey).(string)
	return userID, ok && userID != ""
}
