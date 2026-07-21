package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/database"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	var cmd string
	var name string

	// Check if using flags or positional arguments
	if len(os.Args) > 1 && os.Args[1][0] != '-' {
		// Positional arguments (e.g., go run main.go up)
		cmd = os.Args[1]
		if len(os.Args) > 2 {
			name = os.Args[2]
		}
	} else {
		// Flags (e.g., go run main.go -cmd=up)
		flag.StringVar(&cmd, "cmd", "", "Migration command: up, down, create")
		flag.StringVar(&name, "name", "", "Migration name for create command")
		flag.Parse()
	}

	if cmd == "" {
		log.Fatal("Please specify a command with -cmd flag: up, down, create")
	}

	// Load config
	cfg := config.Load()

	// Ensure database exists before connecting
	if cmd == "up" || cmd == "down" {
		if err := ensureDatabaseExists(cfg); err != nil {
			log.Fatal("Failed to ensure database exists:", err)
		}
	}

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	db := database.GetDB()

	switch cmd {
	case "up":
		runMigrations(db)
	case "down":
		rollbackMigrations(db)
	case "create":
		if name == "" {
			log.Fatal("Please specify migration name with -name flag")
		}
		createMigration(name)
	default:
		log.Fatal("Invalid command. Use: up, down, create")
	}
}

func ensureDatabaseExists(cfg *config.Config) error {
	// Connect to default postgres database
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=postgres sslmode=disable TimeZone=UTC",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to postgres database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()

	// Check if database exists
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ?)"
	err = db.Raw(query, cfg.DBName).Scan(&exists).Error
	if err != nil {
		return fmt.Errorf("failed to check database existence: %w", err)
	}

	if !exists {
		log.Printf("Database '%s' does not exist. Creating...", cfg.DBName)
		createQuery := fmt.Sprintf("CREATE DATABASE %s", cfg.DBName)
		if err := db.Exec(createQuery).Error; err != nil {
			return fmt.Errorf("failed to create database: %w", err)
		}
		log.Printf("Database '%s' created successfully", cfg.DBName)
	}

	return nil
}

func runMigrations(db *gorm.DB) {
	log.Println("Running migrations...")

	// Read migrations directory
	files, err := filepath.Glob("migrations/*.up.sql")
	if err != nil {
		log.Fatal("Failed to read migrations:", err)
	}

	if len(files) == 0 {
		log.Println("No migrations found")
		return
	}

	// Sort files (simple string sort works for our naming convention)
	// In production, you might want more sophisticated sorting

	for _, file := range files {
		log.Printf("Running migration: %s", file)
		sql, err := os.ReadFile(file)
		if err != nil {
			log.Fatal("Failed to read migration file:", err)
		}

		if err := db.Exec(string(sql)).Error; err != nil {
			log.Fatalf("Failed to run migration %s: %v", file, err)
		}
	}

	log.Println("Migrations completed successfully")
}

func rollbackMigrations(db *gorm.DB) {
	log.Println("Rolling back migrations...")
	// Implementation for rollback
	// For now, just a placeholder
	log.Println("Rollback not fully implemented yet")
}

func createMigration(name string) {
	timestamp := time.Now().Format("20060102150405")
	filename := fmt.Sprintf("migrations/%s_%s.up.sql", timestamp, name)
	downFilename := fmt.Sprintf("migrations/%s_%s.down.sql", timestamp, name)

	// Create up migration
	content := "-- Migration: " + name + "\n\n"
	if err := os.WriteFile(filename, []byte(content), 0644); err != nil {
		log.Fatal("Failed to create migration:", err)
	}

	// Create down migration
	downContent := "-- Rollback: " + name + "\n\n"
	if err := os.WriteFile(downFilename, []byte(downContent), 0644); err != nil {
		log.Fatal("Failed to create down migration:", err)
	}

	log.Printf("Created migration: %s", filename)
	log.Printf("Created rollback: %s", downFilename)
}
