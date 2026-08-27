package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/graphql-go/handler"
	"github.com/joho/godotenv"
	"github.com/venturemate/vmbackend/graph"
	"github.com/venturemate/vmbackend/internal/ai"
	"github.com/venturemate/vmbackend/internal/app"
	"github.com/venturemate/vmbackend/internal/auth"
	"github.com/venturemate/vmbackend/internal/crmcalendar"
	"github.com/venturemate/vmbackend/internal/migrations"
	"github.com/venturemate/vmbackend/internal/oauth"
	"github.com/venturemate/vmbackend/internal/subscriptions"
	"github.com/venturemate/vmbackend/internal/websites"
)

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigins := map[string]bool{}
	for _, value := range strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",") {
		value = strings.TrimSpace(strings.TrimSuffix(value, "/"))
		if value != "" {
			allowedOrigins[value] = true
		}
	}
	if frontend := strings.TrimSpace(strings.TrimSuffix(os.Getenv("FRONTEND_URL"), "/")); frontend != "" {
		allowedOrigins[frontend] = true
	}
	allowAny := allowedOrigins["*"]

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := strings.TrimSpace(strings.TrimSuffix(r.Header.Get("Origin"), "/"))
		allowed := origin == "" || allowAny || allowedOrigins[origin]
		if origin != "" && allowed {
			w.Header().Set("Access-Control-Allow-Origin", map[bool]string{true: "*", false: origin}[allowAny])
			w.Header().Add("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-VM-Runtime-Key, Last-Event-ID")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Type")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		if r.Method == http.MethodOptions {
			if !allowed {
				http.Error(w, `{"error":"origin not allowed"}`, http.StatusForbidden)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if !allowed {
			http.Error(w, `{"error":"origin not allowed"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func optionalAuthMiddleware(jwtSecret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		if authHeader == "" {
			next.ServeHTTP(w, r)
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader || strings.TrimSpace(tokenStr) == "" {
			http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
			return
		}
		userID, err := auth.ValidateToken(tokenStr, jwtSecret)
		if err != nil {
			http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
			return
		}
		r = r.WithContext(auth.WithUserID(r.Context(), userID))
		next.ServeHTTP(w, r)
	})
}

func authMiddleware(jwtSecret string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenStr := strings.TrimSpace(r.Header.Get("Authorization"))
		if tokenStr == "" {
			tokenStr = r.URL.Query().Get("token")
		}
		if tokenStr == "" {
			http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
			return
		}
		tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")
		userID, err := auth.ValidateToken(tokenStr, jwtSecret)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusUnauthorized)
			return
		}
		r.Header.Set("X-User-ID", userID)
		next(w, r)
	}
}

func deleteDocumentHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		businessID := r.URL.Query().Get("businessId")
		docID := r.URL.Query().Get("documentId")
		if businessID == "" || docID == "" {
			http.Error(w, `{"error":"businessId and documentId query params are required"}`, http.StatusBadRequest)
			return
		}

		if err := container.FileHandler.DeleteDocument(r.Context(), docID, businessID, userID); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		totalStorage, err := container.FileHandler.CalculateTotalStorage(r.Context(), userID)
		if err == nil {
			container.UsageRepo.UpdateStorage(r.Context(), userID, subscriptions.BillingPeriod(time.Now()), totalStorage)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Document deleted",
		})
	}
}

func downloadHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		businessID := r.URL.Query().Get("businessId")
		docID := r.URL.Query().Get("documentId")
		if businessID == "" || docID == "" {
			http.Error(w, `{"error":"businessId and documentId required"}`, http.StatusBadRequest)
			return
		}

		biz, err := container.BusinessRepo.GetByIDAndUser(r.Context(), businessID, userID)
		if err != nil || biz == nil {
			http.Error(w, `{"error":"business not found"}`, http.StatusNotFound)
			return
		}

		var docs []ai.DocumentInfo
		if err := json.Unmarshal([]byte(biz.Documents), &docs); err != nil {
			http.Error(w, `{"error":"invalid documents data"}`, http.StatusInternalServerError)
			return
		}

		var found *ai.DocumentInfo
		for _, d := range docs {
			if d.ID == docID {
				found = &d
				break
			}
		}
		if found == nil {
			http.Error(w, `{"error":"document not found"}`, http.StatusNotFound)
			return
		}

		key := found.S3Key
		if key == "" && found.URL != "" {
			parts := strings.SplitN(found.URL, ".amazonaws.com/", 2)
			if len(parts) == 2 {
				key = parts[1]
			}
		}
		if key == "" {
			http.Error(w, `{"error":"no s3 key"}`, http.StatusNotFound)
			return
		}

		data, contentType, err := container.S3.Download(r.Context(), key)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"download failed: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": found.Name}))
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Write(data)
	}
}

func teamAvatarUploadHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		if err := r.ParseMultipartForm(10 << 20); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"failed to parse form: %s"}`, err.Error()), http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"file required: %s"}`, err.Error()), http.StatusBadRequest)
			return
		}
		defer file.Close()

		if header.Size > 2*1024*1024 {
			http.Error(w, `{"error":"file too large: max 2MB"}`, http.StatusBadRequest)
			return
		}

		fileData, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"failed to read file: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		contentType := header.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		fileName := fmt.Sprintf("team-avatars/%s/%d", userID, time.Now().UnixNano())
		_, err = container.S3.Upload(r.Context(), fileName, fileData, contentType)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"upload failed: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}
		// Return API URL instead of direct S3 URL
		apiURL := fmt.Sprintf("/api/team-avatar/public?file=%s", fileName)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"url":     apiURL,
		})
	}
}

func avatarHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			avatarUploadHandler(container)(w, r)
			return
		}
		// GET: serve avatar image
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			userID = r.URL.Query().Get("userId")
		}
		if userID == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		key := fmt.Sprintf("avatars/%s", userID)
		data, contentType, err := container.S3.Download(r.Context(), key)
		if err != nil {
			http.Error(w, `{"error":"avatar not found"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(data)
	}
}

func avatarUploadHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		if err := r.ParseMultipartForm(10 << 20); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"failed to parse form: %s"}`, err.Error()), http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"file required: %s"}`, err.Error()), http.StatusBadRequest)
			return
		}
		defer file.Close()

		if header.Size > 5*1024*1024 {
			http.Error(w, `{"error":"file too large: max 5MB"}`, http.StatusBadRequest)
			return
		}

		fileData, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"failed to read file: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		contentType := header.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		fileName := fmt.Sprintf("avatars/%s", userID)
		url, err := container.S3.Upload(r.Context(), fileName, fileData, contentType)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"upload failed: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		// Also make the object publicly readable so the URL works directly
		container.S3.SetPublicRead(r.Context(), fileName)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"upload failed: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		if err := container.UserRepo.UpdatePicture(r.Context(), userID, url); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"failed to update profile: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		// Return the public API URL instead of the direct S3 URL
		apiURL := fmt.Sprintf("/api/avatar/public?userId=%s", userID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"url":     apiURL,
			"s3Url":   url,
		})
	}
}

func pdfDownloadHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		pdfType := r.URL.Query().Get("type")
		id := r.URL.Query().Get("id")
		if pdfType == "" || id == "" {
			http.Error(w, `{"error":"type and id required"}`, http.StatusBadRequest)
			return
		}

		var s3Key string
		var fileName string

		switch pdfType {
		case "invoice":
			inv, err := container.InvoiceRepo.GetByID(r.Context(), id)
			if err != nil || inv == nil {
				http.Error(w, `{"error":"invoice not found"}`, http.StatusNotFound)
				return
			}
			if inv.UserID != userID {
				http.Error(w, `{"error":"access denied"}`, http.StatusForbidden)
				return
			}
			s3Key = fmt.Sprintf("invoices/%s.pdf", inv.InvoiceNumber)
			fileName = fmt.Sprintf("invoice_%s.pdf", inv.InvoiceNumber)
		case "expense":
			exp, err := container.ExpenditureRepo.GetByID(r.Context(), id)
			if err != nil || exp == nil {
				http.Error(w, `{"error":"expense not found"}`, http.StatusNotFound)
				return
			}
			s3Key = fmt.Sprintf("expenses/%s.pdf", exp.ID)
			fileName = fmt.Sprintf("expense_%s.pdf", exp.ID[:8])
		default:
			http.Error(w, `{"error":"invalid type, use 'invoice' or 'expense'"}`, http.StatusBadRequest)
			return
		}

		data, contentType, err := container.S3.Download(r.Context(), s3Key)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"download failed: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": fileName}))
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Write(data)
	}
}

func oauthHandler(manager *oauth.OAuthManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, "/login") {
			manager.LoginHandler(w, r)
		} else if strings.HasSuffix(path, "/callback") {
			manager.CallbackHandler(w, r)
		} else {
			http.NotFound(w, r)
		}
	}
}

func uploadHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		if err := r.ParseMultipartForm(50 << 20); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"failed to parse form: %s"}`, err.Error()), http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"file required: %s"}`, err.Error()), http.StatusBadRequest)
			return
		}
		defer file.Close()

		businessID := r.FormValue("businessId")
		category := r.FormValue("category")
		tagsStr := r.FormValue("tags")

		if businessID == "" {
			http.Error(w, `{"error":"businessId is required"}`, http.StatusBadRequest)
			return
		}
		if category == "" {
			category = "other"
		}

		var tags []string
		if tagsStr != "" {
			tags = strings.Split(tagsStr, ",")
			for i := range tags {
				tags[i] = strings.TrimSpace(tags[i])
			}
		}

		fileData, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"failed to read file: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		// Storage quota check
		_, plan, err := container.SubscriptionRepo.GetUserSubscription(r.Context(), userID)
		if err != nil {
			http.Error(w, `{"error":"failed to lookup subscription"}`, http.StatusInternalServerError)
			return
		}
		if plan != nil {
			var limits map[string]interface{}
			if err := json.Unmarshal([]byte(plan.Limits), &limits); err == nil {
				if storageGB, ok := limits["storage_gb"]; ok {
					var limitBytes int64 = -1
					var gbLimit float64
					switch v := storageGB.(type) {
					case float64:
						gbLimit = v
						if v >= 0 {
							limitBytes = int64(v * 1024 * 1024 * 1024)
						}
					}
					if limitBytes >= 0 {
						currentStorage, err := container.FileHandler.CalculateTotalStorage(r.Context(), userID)
						if err != nil {
							http.Error(w, fmt.Sprintf(`{"error":"failed to calculate storage: %s"}`, err.Error()), http.StatusInternalServerError)
							return
						}
						if currentStorage+int64(len(fileData)) > limitBytes {
							http.Error(w, fmt.Sprintf(`{"error":"storage limit exceeded: %.1f GB / %.0f GB used"}`, float64(currentStorage)/float64(1024*1024*1024), gbLimit), http.StatusConflict)
							return
						}
					}
				}
			}
		}

		doc, err := container.FileHandler.ProcessUpload(r.Context(), fileData, header.Filename, category, tags, businessID, userID)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"upload failed: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		totalStorage, err := container.FileHandler.CalculateTotalStorage(r.Context(), userID)
		if err == nil {
			container.UsageRepo.UpdateStorage(r.Context(), userID, subscriptions.BillingPeriod(time.Now()), totalStorage)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"document": doc,
		})
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found — using environment variables")
	}

	ctx := context.Background()

	container, err := app.NewContainer(ctx)
	if err != nil {
		log.Fatal("Failed to initialize app container:", err)
	}
	defer container.DB.Close()

	googleCalOAuth := crmcalendar.NewGoogleCalendarOAuth(container.DB, "https://venturemate.net")

	if err := migrations.Run(container.DB, "migrations"); err != nil {
		log.Fatal("Database migrations failed: ", err)
	}

	// Background sync scheduler: periodically pull emails + calendar events
	// for every account with sync_enabled = true.
	go func() {
		syncInterval := 15 * time.Minute
		if iv := os.Getenv("SYNC_INTERVAL_MINUTES"); iv != "" {
			if mins, err := strconv.Atoi(iv); err == nil && mins > 0 {
				syncInterval = time.Duration(mins) * time.Minute
			}
		}
		runSync := func() {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			defer cancel()
			// Email
			if container.EmailSyncService != nil {
				if accts, err := container.EmailSyncRepo.ListAllEnabled(ctx); err == nil {
					for i := range accts {
						if err := container.EmailSyncService.SyncAccount(ctx, &accts[i]); err != nil {
							log.Printf("email sync failed for %s: %v", accts[i].Email, err)
						}
					}
				} else {
					log.Printf("email sync list error: %v", err)
				}
			}
			// Calendar
			if container.CalendarSyncService != nil {
				if accts, err := container.CalendarRepo.ListAllEnabled(ctx); err == nil {
					for i := range accts {
						if err := container.CalendarSyncService.SyncAccount(ctx, &accts[i]); err != nil {
							log.Printf("calendar sync failed for %s: %v", accts[i].Email, err)
						}
					}
				} else {
					log.Printf("calendar sync list error: %v", err)
				}
			}
		}
		// Run once shortly after boot, then on the interval.
		time.Sleep(30 * time.Second)
		runSync()
		ticker := time.NewTicker(syncInterval)
		defer ticker.Stop()
		for range ticker.C {
			runSync()
		}
	}()

	graph.SetContainer(container)

	schema := graph.Schema

	graphiqlEnabled := strings.EqualFold(strings.TrimSpace(os.Getenv("GRAPHIQL_ENABLED")), "true")
	h := handler.New(&handler.Config{
		Schema:   &schema,
		Pretty:   graphiqlEnabled,
		GraphiQL: graphiqlEnabled,
	})

	publicSiteDomain := os.Getenv("PUBLIC_SITE_BASE_DOMAIN")
	if publicSiteDomain == "" {
		publicSiteDomain = "venturemate.net"
	}
	customDomainTarget := os.Getenv("PUBLIC_SITE_CNAME_TARGET")
	if customDomainTarget == "" {
		customDomainTarget = "sites." + publicSiteDomain
	}
	publicSites := websites.NewPublicHandler(container.WebsiteRepo, publicSiteDomain, customDomainTarget)

	http.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	http.Handle("/graphql", corsMiddleware(optionalAuthMiddleware(container.JWTSecret, h)))
	http.HandleFunc("/auth/google", auth.GoogleLoginHandler)
	http.HandleFunc("/auth/google/callback", func(w http.ResponseWriter, r *http.Request) {
		state := r.URL.Query().Get("state")
		if strings.HasPrefix(state, "calendar:") {
			code := r.URL.Query().Get("code")
			googleCalOAuth.HandleCallback(w, r, code, state)
		} else {
			auth.GoogleCallbackHandler(w, r)
		}
	})
	http.HandleFunc("/auth/google/calendar/login", googleCalOAuth.LoginHandler)
	http.HandleFunc("/auth/oauth/", oauthHandler(container.OAuthManager))
	http.Handle("/api/upload", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, uploadHandler(container)))))
	http.Handle("/api/documents/delete", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, deleteDocumentHandler(container)))))
	http.Handle("/api/documents/download", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, downloadHandler(container)))))
	http.Handle("/api/pdf/download", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, pdfDownloadHandler(container)))))
	http.Handle("/api/avatar", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, avatarHandler(container)))))
	http.Handle("/api/team-avatar/upload", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, teamAvatarUploadHandler(container)))))
	http.Handle("/api/ai/jobs/", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, aiJobEventsHandler(container)))))
	http.Handle("/api/ai/projects/", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, aiProjectSourceHandler(container)))))
	http.Handle("/api/ai/builds/", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, aiBuildDownloadHandler(container)))))
	http.Handle("/api/runtime/", corsMiddleware(aiRuntimeHandler(container)))
	http.HandleFunc("/api/generate", handleGenerateWebsite)
	http.HandleFunc("/api/pdf/public", func(w http.ResponseWriter, r *http.Request) {
		// Public PDF download - no auth required (for customers viewing invoices from email)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		pdfType := r.URL.Query().Get("type")
		id := r.URL.Query().Get("id")
		if pdfType != "invoice" || id == "" {
			http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
			return
		}
		inv, err := container.InvoiceRepo.GetByID(r.Context(), id)
		if err != nil || inv == nil {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		s3Key := fmt.Sprintf("invoices/%s.pdf", inv.InvoiceNumber)
		data, contentType, err := container.S3.Download(r.Context(), s3Key)
		if err != nil {
			http.Error(w, `{"error":"PDF not available"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="invoice_%s.pdf"`, inv.InvoiceNumber))
		w.Write(data)
	})
	http.HandleFunc("/api/avatar/public", func(w http.ResponseWriter, r *http.Request) {
		// Public endpoint - no auth needed, serves by userId query param
		w.Header().Set("Access-Control-Allow-Origin", "*")
		userID := r.URL.Query().Get("userId")
		if userID == "" {
			http.Error(w, `{"error":"userId required"}`, http.StatusBadRequest)
			return
		}
		key := fmt.Sprintf("avatars/%s", userID)
		data, contentType, err := container.S3.Download(r.Context(), key)
		if err != nil {
			http.Error(w, `{"error":"avatar not found"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(data)
	})
	http.HandleFunc("/api/team-avatar/public", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		key := r.URL.Query().Get("file")
		if key == "" {
			http.Error(w, `{"error":"file key required"}`, http.StatusBadRequest)
			return
		}
		data, contentType, err := container.S3.Download(r.Context(), key)
		if err != nil {
			http.Error(w, `{"error":"avatar not found"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(data)
	})
	http.HandleFunc("/api/public-sites/allow-domain", publicSites.AllowDomain)
	http.HandleFunc("/api/public-sites/subdomain-availability", publicSites.SubdomainAvailability)
	http.HandleFunc("/api/public-sites/contact", publicSites.SubmitContact)
	http.HandleFunc("/ws/chat", container.ChatHub.HandleWebSocket)
	http.Handle("/", publicSites)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("GraphQL server running at http://localhost:%s/graphql (fully wired)\n", port)
	fmt.Printf("File upload endpoint at http://localhost:%s/api/upload\n", port)
	fmt.Printf("Public websites served for *.%s and verified custom domains\n", publicSiteDomain)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
