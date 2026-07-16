package app

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/venturemate/vmbackend/internal/ai"
	"github.com/venturemate/vmbackend/internal/auth"
	"github.com/venturemate/vmbackend/internal/banking"
	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/chat"
	"github.com/venturemate/vmbackend/internal/crm"
	"github.com/venturemate/vmbackend/internal/db"
	"github.com/venturemate/vmbackend/internal/domains"
	"github.com/venturemate/vmbackend/internal/email"
	"github.com/venturemate/vmbackend/internal/investors"
	"github.com/venturemate/vmbackend/internal/invoices"
	"github.com/venturemate/vmbackend/internal/marketplace"
	"github.com/venturemate/vmbackend/internal/metricool"
	"github.com/venturemate/vmbackend/internal/notifications"
	"github.com/venturemate/vmbackend/internal/oauth"
	"github.com/venturemate/vmbackend/internal/rates"
	"github.com/venturemate/vmbackend/internal/registrations"
	"github.com/venturemate/vmbackend/internal/s3"
	"github.com/venturemate/vmbackend/internal/scores"
	"github.com/venturemate/vmbackend/internal/subscriptions"
	"github.com/venturemate/vmbackend/internal/support"
	"github.com/venturemate/vmbackend/internal/users"
	"github.com/venturemate/vmbackend/internal/websites"
)

type Container struct {
	DB                  *pgxpool.Pool
	S3                  *s3.Service
	Email               *email.Service
	UserRepo            *users.Repository
	OTPRepo             *auth.OTPRepository
	GoogleAuth          *auth.GoogleOAuth
	JWTSecret           string
	SubscriptionRepo    *subscriptions.Repository
	BusinessRepo        *businesses.Repository
	WebsiteRepo         *websites.Repository
	DomainRepo          *domains.Repository
	InvestorRepo        *investors.Repository
	NotificationRepo    *notifications.Repository
	NotificationService *notifications.Service
	ScoreRepo           *scores.Repository
	ScoreEngine         *scores.Engine
	HealthEngine        *scores.HealthEngine
	RateService         *rates.Service
	GeminiAPIKey        string
	OpenAIAPIKey        string
	ClaudeAPIKey        string
	GrokAPIKey          string
	AIManager           *ai.ProviderManager
	FileHandler         *ai.FileHandler
	OAuthRepo           *oauth.Repository
	OAuthManager        *oauth.OAuthManager
	BankAccountRepo     *banking.Repository
	InvoiceRepo         *invoices.Repository
	RegistrationRepo    *registrations.Repository
	MarketplaceRepo     *marketplace.Repository
	SupportRepo         *support.Repository
	SupportService      *support.Service
	CrmRepo             *crm.Repository
	MetricoolService    *metricool.Service
	ChatRepo            *chat.Repository
	ChatHub             *chat.Hub
}

func NewContainer(ctx context.Context) (*Container, error) {
	// 1. Database
	dbPool, err := db.NewPostgresPool(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// 2. S3
	s3Svc, err := s3.New(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize S3: %w", err)
	}

	// 3. Email
	emailSvc, err := email.New()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Email service: %w", err)
	}

	// 4. Repositories
	userRepo := users.NewRepository(dbPool)
	otpRepo := auth.NewOTPRepository(dbPool)
	subRepo := subscriptions.NewRepository(dbPool)
	bizRepo := businesses.NewRepository(dbPool)
	webRepo := websites.NewRepository(dbPool)
	domainRepo := domains.NewRepository(dbPool)
	investorRepo := investors.NewRepository(dbPool)
	notificationRepo := notifications.NewRepository(dbPool)
	scoreRepo := scores.NewRepository(dbPool)
	bankAccountRepo := banking.NewRepository(dbPool)
	invoiceRepo := invoices.NewRepository(dbPool)
	registrationRepo := registrations.NewRepository(dbPool)
	marketplaceRepo := marketplace.NewRepository(dbPool)
	supportRepo := support.NewRepository(dbPool)
	crmRepo := crm.NewRepository(dbPool)
	metricoolRepo := metricool.NewRepository(dbPool)
	metricoolSvc := metricool.NewService(metricoolRepo)
	chatRepo := chat.NewRepository(dbPool)
	chatHub := chat.NewHub(chatRepo)
	scoreEngine := scores.NewEngine(bizRepo, invoiceRepo, scoreRepo)
	healthEngine := scores.NewHealthEngine(bizRepo, scoreRepo)
	rateService := rates.NewService()

	notificationSvc := notifications.NewService(notificationRepo, emailSvc)

	// 5. Google OAuth
	credsPath := os.Getenv("GOOGLE_CREDENTIALS_PATH")
	if credsPath == "" {
		credsPath = "config/google-credentials.json"
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-change-in-prod"
	}

	err = auth.InitGoogleOAuth(credsPath, userRepo, s3Svc, jwtSecret)
	if err != nil {
		return nil, err
	}

	// 6. AI API keys
	geminiKey := os.Getenv("GEMINI_API_KEY")
	openAIKey := os.Getenv("OPENAI_API_KEY")
	claudeKey := os.Getenv("CLAUDE_API_KEY")
	grokKey := os.Getenv("GROK_API_KEY")
	aiManager := ai.NewProviderManagerFromEnv()
	supportSvc := support.NewService(supportRepo, aiManager, emailSvc)

	// 7. OAuth
	oauthRepo := oauth.NewRepository(dbPool)
	redirectBase := os.Getenv("OAUTH_REDIRECT_BASE")
	if redirectBase == "" {
		redirectBase = "http://localhost:8080"
	}
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	oauth.InitProviders(redirectBase, frontendURL)
	oauthManager := oauth.NewOAuthManager(oauthRepo, userRepo, jwtSecret, frontendURL, redirectBase)

	// 8. File handler
	fileHandler := ai.NewFileHandler(s3Svc, bizRepo, geminiKey)
	fileHandler.Providers = aiManager

	return &Container{
		DB:                  dbPool,
		S3:                  s3Svc,
		Email:               emailSvc,
		UserRepo:            userRepo,
		MarketplaceRepo:     marketplaceRepo,
		OTPRepo:             otpRepo,
		SubscriptionRepo:    subRepo,
		BusinessRepo:        bizRepo,
		WebsiteRepo:         webRepo,
		DomainRepo:          domainRepo,
		InvestorRepo:        investorRepo,
		NotificationRepo:    notificationRepo,
		NotificationService: notificationSvc,
		ScoreRepo:           scoreRepo,
		ScoreEngine:         scoreEngine,
		HealthEngine:        healthEngine,
		RateService:         rateService,
		JWTSecret:           jwtSecret,
		GeminiAPIKey:        geminiKey,
		OpenAIAPIKey:        openAIKey,
		ClaudeAPIKey:        claudeKey,
		GrokAPIKey:          grokKey,
		AIManager:           aiManager,
		FileHandler:         fileHandler,
		OAuthRepo:           oauthRepo,
		OAuthManager:        oauthManager,
		BankAccountRepo:     bankAccountRepo,
		InvoiceRepo:         invoiceRepo,
		RegistrationRepo:    registrationRepo,
		SupportRepo:         supportRepo,
		SupportService:      supportSvc,
		CrmRepo:             crmRepo,
		MetricoolService:    metricoolSvc,
		ChatRepo:            chatRepo,
		ChatHub:             chatHub,
	}, nil
}
