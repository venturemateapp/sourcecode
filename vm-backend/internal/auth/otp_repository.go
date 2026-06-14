package auth

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type OTPRepository struct {
	db *pgxpool.Pool
}

func NewOTPRepository(db *pgxpool.Pool) *OTPRepository {
	return &OTPRepository{db: db}
}

func (r *OTPRepository) SaveOTP(ctx context.Context, email, otp string, expiresAt time.Time) error {
	query := `
		INSERT INTO password_reset_otps (email, otp, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (email) DO UPDATE 
		SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, used = false
	`
	_, err := r.db.Exec(ctx, query, email, otp, expiresAt)
	return err
}

func (r *OTPRepository) VerifyOTP(ctx context.Context, email, otp string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM password_reset_otps 
			WHERE email = $1 AND otp = $2 AND expires_at > NOW() AND used = false
		)
	`
	var valid bool
	err := r.db.QueryRow(ctx, query, email, otp).Scan(&valid)
	return valid, err
}

func (r *OTPRepository) MarkOTPUsed(ctx context.Context, email string) error {
	query := `UPDATE password_reset_otps SET used = true WHERE email = $1`
	_, err := r.db.Exec(ctx, query, email)
	return err
}

// Optional: cleanup old OTPs
func (r *OTPRepository) CleanupExpired(ctx context.Context) error {
	query := `DELETE FROM password_reset_otps WHERE expires_at < NOW() OR used = true`
	_, err := r.db.Exec(ctx, query)
	return err
}
