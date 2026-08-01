package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/venturemate/vmbackend/internal/aiworker"
	"github.com/venturemate/vmbackend/internal/app"
	"github.com/venturemate/vmbackend/internal/migrations"
)

func main() {
	_ = godotenv.Load()
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()
	container, err := app.NewContainer(ctx)
	if err != nil {
		log.Fatal(err)
	}
	defer container.DB.Close()
	if err := migrations.Run(container.DB, "migrations"); err != nil {
		log.Fatal("database migrations failed: ", err)
	}
	worker := aiworker.New(container.AIJobRepo, container.AIStudioRepo, container.BusinessRepo, container.AIManager, container.AssetStudio, container.S3, container.UsageRepo)
	if raw := os.Getenv("AI_WORKER_POLL_INTERVAL"); raw != "" {
		if interval, parseErr := time.ParseDuration(raw); parseErr != nil {
			log.Fatalf("invalid AI_WORKER_POLL_INTERVAL: %v", parseErr)
		} else {
			worker.PollEvery = interval
		}
	}
	log.Printf("AI worker %s started", worker.WorkerID)
	if err := worker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		log.Fatal(err)
	}
}
