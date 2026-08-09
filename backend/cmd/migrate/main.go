package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/database"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

const migrationsDir = "migrations"

func main() {
	var cmd string
	var name string

	if len(os.Args) > 1 && os.Args[1][0] != '-' {
		cmd = os.Args[1]
		if len(os.Args) > 2 {
			name = os.Args[2]
		}
	} else {
		flag.StringVar(&cmd, "cmd", "", "Migration command: up, status, create")
		flag.StringVar(&name, "name", "", "Migration name for create command")
		flag.Parse()
	}

	if cmd == "" {
		log.Fatal("Please specify a command with -cmd flag: up, status, create")
	}

	if cmd == "create" {
		if name == "" {
			log.Fatal("Please specify migration name with -name flag")
		}
		createMigration(name)
		return
	}

	cfg := config.Load()

	if err := ensureDatabaseExists(cfg); err != nil {
		log.Fatal("Failed to ensure database exists:", err)
	}

	if err := database.Connect(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	db := database.GetDB()

	switch cmd {
	case "up":
		runMigrations(db)
	case "status":
		showStatus(db)
	case "down":
		log.Fatal("Rollback is not supported. Write a corrective migration instead.")
	default:
		log.Fatal("Invalid command. Use: up, status, create")
	}
}

func ensureDatabaseExists(cfg *config.Config) error {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=postgres sslmode=%s TimeZone=UTC",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBSSLMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to postgres database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()

	var exists bool
	if err := db.Raw("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ?)", cfg.DBName).Scan(&exists).Error; err != nil {
		return fmt.Errorf("failed to check database existence: %w", err)
	}

	if !exists {
		log.Printf("Database %q does not exist. Creating...", cfg.DBName)
		if err := db.Exec(fmt.Sprintf("CREATE DATABASE %q", cfg.DBName)).Error; err != nil {
			return fmt.Errorf("failed to create database: %w", err)
		}
		log.Printf("Database %q created", cfg.DBName)
	}

	return nil
}

// ensureMigrationsTable creates the ledger that records which migrations have
// already run. Without it every `migrate up` re-executed every file, which only
// worked because most of them happened to be idempotent.
func ensureMigrationsTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`).Error
}

func migrationFiles() ([]string, error) {
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.up.sql"))
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	return files, nil
}

func versionOf(file string) string {
	return strings.TrimSuffix(filepath.Base(file), ".up.sql")
}

func appliedVersions(db *gorm.DB) (map[string]bool, error) {
	var versions []string
	if err := db.Table("schema_migrations").Pluck("version", &versions).Error; err != nil {
		return nil, err
	}
	applied := make(map[string]bool, len(versions))
	for _, v := range versions {
		applied[v] = true
	}
	return applied, nil
}

func runMigrations(db *gorm.DB) {
	if err := ensureMigrationsTable(db); err != nil {
		log.Fatal("Failed to create schema_migrations table:", err)
	}

	files, err := migrationFiles()
	if err != nil {
		log.Fatal("Failed to read migrations:", err)
	}
	if len(files) == 0 {
		log.Println("No migrations found")
		return
	}

	applied, err := appliedVersions(db)
	if err != nil {
		log.Fatal("Failed to read applied migrations:", err)
	}

	pending := 0
	for _, file := range files {
		version := versionOf(file)
		if applied[version] {
			continue
		}

		sqlBytes, err := os.ReadFile(file)
		if err != nil {
			log.Fatalf("Failed to read %s: %v", file, err)
		}

		log.Printf("Applying %s", version)

		// Each migration runs inside its own transaction together with the
		// ledger insert, so a failure never leaves a half-applied schema.
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(string(sqlBytes)).Error; err != nil {
				return err
			}
			return tx.Exec("INSERT INTO schema_migrations (version) VALUES (?)", version).Error
		})
		if err != nil {
			log.Fatalf("Migration %s failed: %v", version, err)
		}

		pending++
	}

	if pending == 0 {
		log.Println("Database is already up to date")
		return
	}
	log.Printf("Applied %d migration(s) successfully", pending)
}

func showStatus(db *gorm.DB) {
	if err := ensureMigrationsTable(db); err != nil {
		log.Fatal("Failed to create schema_migrations table:", err)
	}

	files, err := migrationFiles()
	if err != nil {
		log.Fatal("Failed to read migrations:", err)
	}

	applied, err := appliedVersions(db)
	if err != nil {
		log.Fatal("Failed to read applied migrations:", err)
	}

	fmt.Println("\nMigration status")
	fmt.Println(strings.Repeat("-", 60))
	for _, file := range files {
		version := versionOf(file)
		state := "pending"
		if applied[version] {
			state = "applied"
		}
		fmt.Printf("  %-9s %s\n", state, version)
	}
	fmt.Println()
}

func createMigration(name string) {
	if err := os.MkdirAll(migrationsDir, 0o755); err != nil {
		log.Fatal("Failed to create migrations directory:", err)
	}

	timestamp := time.Now().Format("20060102150405")
	upFile := filepath.Join(migrationsDir, fmt.Sprintf("%s_%s.up.sql", timestamp, name))
	downFile := filepath.Join(migrationsDir, fmt.Sprintf("%s_%s.down.sql", timestamp, name))

	if err := os.WriteFile(upFile, []byte("-- Migration: "+name+"\n\n"), 0o644); err != nil {
		log.Fatal("Failed to create migration:", err)
	}
	if err := os.WriteFile(downFile, []byte("-- Rollback: "+name+"\n\n"), 0o644); err != nil {
		log.Fatal("Failed to create down migration:", err)
	}

	log.Printf("Created %s", upFile)
	log.Printf("Created %s", downFile)
}
