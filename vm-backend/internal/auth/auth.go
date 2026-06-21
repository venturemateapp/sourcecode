package auth

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/venturemate/vmbackend/internal/email"
	"github.com/venturemate/vmbackend/internal/subscriptions"
	"github.com/venturemate/vmbackend/internal/users"
	"golang.org/x/crypto/bcrypt"
)

type SignupInput struct {
	FirstName string
	Surname   string
	Email     string
	Password  string
}

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidOTP         = errors.New("invalid or expired OTP")
	ErrPasswordMismatch   = errors.New("passwords do not match")
	ErrEmailTaken         = errors.New("email already registered")
)

func GenerateOTP() string {
	return fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
}

// Login with email + password
func Login(repo *users.Repository, subRepo *subscriptions.Repository, emailAddr, password, jwtSecret string) (string, *users.User, error) {
	user, err := repo.FindByEmail(context.Background(), emailAddr)
	if err != nil {
		return "", nil, ErrInvalidCredentials
	}
	if user.Status != "active" {
		return "", nil, errors.New("account is not active")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	sub, plan, err := subRepo.GetUserSubscription(context.Background(), user.ID)
	var planName, subStatus string
	if err == nil && sub != nil {
		planName = plan.Name
		subStatus = sub.Status
	}

	claims := jwt.MapClaims{
		"user_id":             user.ID,
		"email":               user.Email,
		"first_name":          user.FirstName,
		"surname":             user.Surname,
		"onboarded":           user.Onboarded,
		"status":              user.Status,
		"subscription_plan":   planName,
		"subscription_status": subStatus,
		"exp":                 time.Now().Add(24 * time.Hour).Unix(),
		"iat":                 time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", nil, err
	}

	go sendLoginNotification(user)
	return tokenString, user, nil
}

func Signup(repo *users.Repository, subRepo *subscriptions.Repository, emailAddr, password, firstName, surname, jwtSecret string) (string, *users.User, error) {
	existing, err := repo.FindByEmail(context.Background(), emailAddr)
	if err == nil && existing != nil {
		return "", nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &users.User{
		FirstName: firstName,
		Surname:   surname,
		Email:     emailAddr,
		Password:  string(hash),
		Onboarded: true,
		Status:    "active",
	}

	if err := repo.Create(context.Background(), user); err != nil {
		return "", nil, fmt.Errorf("failed to create user: %w", err)
	}

	if err := subRepo.CreateFreeSubscription(context.Background(), user.ID); err != nil {
		log.Printf("Warning: failed to create free subscription for user %s: %v", user.ID, err)
	}

	sub, plan, err := subRepo.GetUserSubscription(context.Background(), user.ID)
	var planName, subStatus string
	if err == nil && sub != nil {
		planName = plan.Name
		subStatus = sub.Status
	}

	claims := jwt.MapClaims{
		"user_id":             user.ID,
		"email":               user.Email,
		"first_name":          user.FirstName,
		"surname":             user.Surname,
		"onboarded":           user.Onboarded,
		"status":              user.Status,
		"subscription_plan":   planName,
		"subscription_status": subStatus,
		"exp":                 time.Now().Add(24 * time.Hour).Unix(),
		"iat":                 time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", nil, err
	}

	return tokenString, user, nil
}

func sendLoginNotification(user *users.User) {
	svc, err := email.New()
	if err != nil {
		log.Printf("Email error: %v", err)
		return
	}
	now := time.Now().Format("Monday, 2 January 2006 at 3:04PM")
	subject := "Security Alert - New Login"
	body := fmt.Sprintf(`<h2>New Login</h2><p>Hello %s, login detected at %s. If not you, reset password.</p>`, user.FirstName, now)
	if err := svc.SendTemplatedEmail([]string{user.Email}, subject, body); err != nil {
		log.Printf("SendTemplatedEmail (login alert) error: %v", err)
	}
}

// Password Reset
func RequestPasswordReset(userRepo *users.Repository, otpRepo *OTPRepository, emailAddr string) error {
	_, err := userRepo.FindByEmail(context.Background(), emailAddr)
	if err != nil {
		return nil
	}
	otp := GenerateOTP()
	expires := time.Now().Add(10 * time.Minute)
	if err := otpRepo.SaveOTP(context.Background(), emailAddr, otp, expires); err != nil {
		return err
	}
	svc, err := email.New()
	if err != nil {
		log.Printf("email.New() error: %v", err)
		return nil
	}
	subject := "Password Reset OTP"
	body := fmt.Sprintf(`<p>Your OTP is <b>%s</b>. Expires in 10 min.</p>`, otp)
	if err := svc.SendTemplatedEmail([]string{emailAddr}, subject, body); err != nil {
		log.Printf("SendTemplatedEmail error: %v", err)
	}
	return nil
}

func UpdateProfile(repo *users.Repository, subRepo *subscriptions.Repository, userID, jwtSecret, firstName, surname, otherNames, dob, primaryPhone, secondaryPhone, picture, bio, country, city, language, linkedIn, twitter, website, preferredCurrency string) (string, *users.User, error) {
	user, err := repo.FindByID(context.Background(), userID)
	if err != nil {
		return "", nil, ErrUserNotFound
	}

	if err := repo.UpdateProfile(context.Background(), userID, firstName, surname, otherNames, dob, primaryPhone, secondaryPhone, picture, bio, country, city, language, linkedIn, twitter, website, preferredCurrency); err != nil {
		return "", nil, fmt.Errorf("failed to update profile: %w", err)
	}

	user.FirstName = firstName
	user.Surname = surname
	user.OtherNames = otherNames
	user.DOB = dob
	user.PrimaryPhone = primaryPhone
	user.SecondaryPhone = secondaryPhone
	user.Picture = picture
	user.Bio = bio
	user.Country = country
	user.City = city
	user.Language = language
	user.LinkedIn = linkedIn
	user.Twitter = twitter
	user.Website = website
	user.PreferredCurrency = preferredCurrency

	sub, plan, err := subRepo.GetUserSubscription(context.Background(), user.ID)
	var planName, subStatus string
	if err == nil && sub != nil {
		planName = plan.Name
		subStatus = sub.Status
	}

	claims := jwt.MapClaims{
		"user_id":             user.ID,
		"email":               user.Email,
		"first_name":          user.FirstName,
		"surname":             user.Surname,
		"onboarded":           user.Onboarded,
		"status":              user.Status,
		"subscription_plan":   planName,
		"subscription_status": subStatus,
		"exp":                 time.Now().Add(24 * time.Hour).Unix(),
		"iat":                 time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", nil, err
	}

	return tokenString, user, nil
}

func ValidateToken(tokenString, jwtSecret string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("invalid token claims")
	}
	userID, ok := claims["user_id"].(string)
	if !ok || userID == "" {
		return "", fmt.Errorf("user_id not found in token")
	}
	return userID, nil
}

func ChangePassword(userRepo *users.Repository, userID, currentPassword, newPassword string) error {
	user, err := userRepo.FindByID(context.Background(), userID)
	if err != nil {
		return ErrUserNotFound
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	return userRepo.ChangePassword(context.Background(), userID, string(hash))
}

func ResetPassword(userRepo *users.Repository, otpRepo *OTPRepository, emailAddr, otp, newPass, confirm string) error {
	if newPass != confirm {
		return ErrPasswordMismatch
	}
	valid, err := otpRepo.VerifyOTP(context.Background(), emailAddr, otp)
	if err != nil || !valid {
		return ErrInvalidOTP
	}
	user, err := userRepo.FindByEmail(context.Background(), emailAddr)
	if err != nil {
		return ErrUserNotFound
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(newPass), bcrypt.DefaultCost)
	user.Password = string(hash)
	otpRepo.MarkOTPUsed(context.Background(), emailAddr)

	svc, _ := email.New()
	subject := "Password Reset Successful"
	body := "<p>Your password was changed successfully.</p>"
	svc.SendTemplatedEmail([]string{emailAddr}, subject, body)
	return nil
}
