package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/venturemate/vmbackend/internal/app"
	"github.com/venturemate/vmbackend/internal/auth"
)

func main() {
	ctx := context.Background()

	container, err := app.NewContainer(ctx)
	if err != nil {
		log.Fatal("Failed to initialize application container:", err)
	}
	defer container.DB.Close()

	// Initialize Google OAuth with all dependencies
	if err := auth.InitGoogleOAuth("config/google-credentials.json", container.UserRepo, container.S3, os.Getenv("JWT_SECRET")); err != nil {
		log.Fatal("Failed to init Google OAuth:", err)
	}

	http.HandleFunc("/auth/google", auth.GoogleLoginHandler)
	http.HandleFunc("/auth/google/callback", auth.GoogleCallbackHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	fmt.Printf("🚀 Auth server running on :%s (fully wired)\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
