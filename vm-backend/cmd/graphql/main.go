package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/graphql-go/handler"
	"github.com/joho/godotenv"
	"github.com/venturemate/vmbackend/graph"
	"github.com/venturemate/vmbackend/internal/app"
	"github.com/venturemate/vmbackend/internal/auth"
	"github.com/venturemate/vmbackend/internal/migrations"
	"github.com/venturemate/vmbackend/internal/oauth"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func authMiddleware(jwtSecret string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader {
			http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
			return
		}
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

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Document deleted",
		})
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

		doc, err := container.FileHandler.ProcessUpload(r.Context(), fileData, header.Filename, category, tags, businessID, userID)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"upload failed: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
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

	if err := migrations.Run(container.DB, "migrations"); err != nil {
		log.Printf("Warning: migrations failed: %v", err)
	}

	graph.SetContainer(container)

	schema := graph.Schema

	h := handler.New(&handler.Config{
		Schema:   &schema,
		Pretty:   true,
		GraphiQL: true,
	})

	http.Handle("/graphql", corsMiddleware(h))
	http.HandleFunc("/auth/google", auth.GoogleLoginHandler)
	http.HandleFunc("/auth/google/callback", auth.GoogleCallbackHandler)
	http.HandleFunc("/auth/oauth/", oauthHandler(container.OAuthManager))
	http.Handle("/api/upload", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, uploadHandler(container)))))
	http.Handle("/api/documents/delete", corsMiddleware(http.HandlerFunc(authMiddleware(container.JWTSecret, deleteDocumentHandler(container)))))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("GraphQL server running at http://localhost:%s/graphql (fully wired)\n", port)
	fmt.Printf("File upload endpoint at http://localhost:%s/api/upload\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
