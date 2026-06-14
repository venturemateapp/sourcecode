package migrations

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Run(db *pgxpool.Pool, migrationsDir string) error {
	ctx := context.Background()

	_, err := db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, f := range files {
		version := strings.TrimSuffix(f, ".up.sql")

		var exists bool
		db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&exists)
		if exists {
			continue
		}

		path := filepath.Join(migrationsDir, f)
		sql, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", f, err)
		}

		_, err = db.Exec(ctx, string(sql))
		if err != nil {
			return fmt.Errorf("apply %s: %w", f, err)
		}

		_, err = db.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version)
		if err != nil {
			return fmt.Errorf("record %s: %w", f, err)
		}

		fmt.Printf("Migration applied: %s\n", f)
	}

	return nil
}
