package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found — using environment variables")
	}

	port := getEnv("PORT", "8080")

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		getEnv("DB_USER", "venturematedb"),
		getEnv("DB_PASSWORD", "venturematedb"),
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_NAME", "venturematedb"),
		getEnv("DB_SSLMODE", "disable"),
	)

	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("❌ Failed to connect to PostgreSQL: %v", err)
	}
	defer dbpool.Close()

	if err := dbpool.Ping(ctx); err != nil {
		log.Fatalf("❌ Database ping failed: %v", err)
	}

	log.Println("✅ Successfully connected to PostgreSQL (user: venturematedb, db: venturematedb)")
	log.Printf("🚀 Server placeholder ready on port %s (GraphQL + URL/REST)", port)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
