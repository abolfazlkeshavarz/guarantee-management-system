# ============================================
# Guarantee Management System - Makefile
# Cross-Platform (Windows & Linux)
# ============================================

.PHONY: help run build dev test lint fmt coverage
.PHONY: migrate-up migrate-down migrate-create migrate-force migrate-single
.PHONY: seed db-create db-drop db-reset db-shell db-status db-query
.PHONY: docker-build docker-up docker-down docker-logs docker-clean docker-restart
.PHONY: clean install-tools generate-swagger setup fresh debug
.PHONY: admin-create admin-list admin-delete admin-reset-password admin-create-default admin-create-test
.PHONY: technician-create technician-list technician-toggle technician-create-default

# Detect OS
ifeq ($(OS),Windows_NT)
    OS_TYPE := Windows
else
    OS_TYPE := Linux
endif

# Load environment variables
ifneq (,$(wildcard .env))
    include .env
    export
endif

# Default values - Update with your actual password
DB_HOST ?= localhost
DB_PORT ?= 5432
DB_USER ?= postgres
DB_PASSWORD ?= Whoknowwho
DB_NAME ?= guarantee_db

# ============================================
# Platform-specific commands
# ============================================

ifeq ($(OS_TYPE),Windows)
    # Windows commands
    RM := -rmdir /s /q 2>nul
    RM_FILE := -del 2>nul
    RMDIR := rmdir /s /q 2>nul
    PSQL_CMD := powershell -Command "$$env:PGPASSWORD='$(DB_PASSWORD)'; psql -U $(DB_USER) -h $(DB_HOST) -d $(DB_NAME) -c"
    PSQL_RAW := powershell -Command "$$env:PGPASSWORD='$(DB_PASSWORD)'; psql -U $(DB_USER) -h $(DB_HOST) -c"
    PSQL_FILE := powershell -Command "$$env:PGPASSWORD='$(DB_PASSWORD)'; psql -U $(DB_USER) -h $(DB_HOST) -d $(DB_NAME) -f"
    PSQL_SHELL := powershell -Command "$$env:PGPASSWORD='$(DB_PASSWORD)'; psql -U $(DB_USER) -h $(DB_HOST) -d $(DB_NAME)"
    GO_BUILD := go build -o bin/api.exe
    GO_RUN := go run
else
    # Linux commands
    RM := rm -rf
    RM_FILE := rm -f
    RMDIR := rm -rf
    PSQL_CMD := PGPASSWORD='$(DB_PASSWORD)' psql -U $(DB_USER) -h $(DB_HOST) -d $(DB_NAME) -c
    PSQL_RAW := PGPASSWORD='$(DB_PASSWORD)' psql -U $(DB_USER) -h $(DB_HOST) -c
    PSQL_FILE := PGPASSWORD='$(DB_PASSWORD)' psql -U $(DB_USER) -h $(DB_HOST) -d $(DB_NAME) -f
    PSQL_SHELL := PGPASSWORD='$(DB_PASSWORD)' psql -U $(DB_USER) -h $(DB_HOST) -d $(DB_NAME)
    GO_BUILD := go build -o bin/api
    GO_RUN := go run
endif

# ============================================
# Help
# ============================================

help:
	@echo "============================================"
	@echo "  Guarantee Management System - Commands"
	@echo "  OS Detected: $(OS_TYPE)"
	@echo "============================================"
	@echo ""
	@echo "Development Commands:"
	@echo "  make run           Run the application"
	@echo "  make build         Build the application"
	@echo "  make dev           Run with hot reload (requires air)"
	@echo "  make test          Run tests"
	@echo "  make lint          Run linter"
	@echo "  make fmt           Format code"
	@echo "  make coverage      Generate test coverage report"
	@echo ""
	@echo "Database Commands:"
	@echo "  make migrate-up    Run database migrations"
	@echo "  make migrate-down  Rollback database migrations"
	@echo "  make migrate-create NAME=xxx  Create a new migration"
	@echo "  make migrate-single FILE=xxx  Run a specific migration"
	@echo "  make migrate-force Force run all migrations (drop and recreate)"
	@echo "  make seed          Seed the database"
	@echo "  make db-create     Create database if not exists"
	@echo "  make db-drop       Drop database"
	@echo "  make db-reset      Reset database (drop and recreate)"
	@echo "  make db-shell      Open database shell"
	@echo "  make db-status     Show database tables"
	@echo "  make db-query Q=xxx Run a custom SQL query"
	@echo ""
	@echo "Admin Management Commands:"
	@echo "  make admin-create USERNAME=xxx PASSWORD=xxx  Create admin user"
	@echo "    FULL_NAME=xxx EMAIL=xxx (optional)"
	@echo "  make admin-list                         List all admin users"
	@echo "  make admin-delete USERNAME=xxx          Delete admin user"
	@echo "  make admin-reset-password USERNAME=xxx PASSWORD=xxx  Reset password"
	@echo "  make admin-create-default               Create default admin (admin/Admin123!)"
	@echo "  make admin-create-test                  Create test admin (testadmin/Test123!)"
	@echo ""
	@echo "Technician Management Commands:"
	@echo "  make technician-create USERNAME=xxx PASSWORD=xxx  Create technician"
	@echo "    FULL_NAME=xxx PHONE=xxx NATIONAL_ID=xxx ADDRESS=xxx (optional)"
	@echo "  make technician-list                    List all technicians"
	@echo "  make technician-toggle USERNAME=xxx ACTIVE=true/false  Activate/deactivate"
	@echo "  make technician-create-default          Create default technician (tech1/Tech123!)"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-build  Build Docker images"
	@echo "  make docker-up     Start Docker containers"
	@echo "  make docker-down   Stop Docker containers"
	@echo "  make docker-logs   Show Docker logs"
	@echo "  make docker-clean  Clean Docker containers and volumes"
	@echo "  make docker-restart Restart Docker containers"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean         Clean build artifacts"
	@echo "  make install-tools Install development tools"
	@echo "  make generate-swagger Generate Swagger documentation"
	@echo "  make setup         Full setup (tools + db + migrations + seed)"
	@echo "  make fresh         Fresh start (clean + db-reset + seed)"
	@echo "  make debug         Show current configuration"
	@echo ""
	@echo "Examples:"
	@echo "  make migrate-create NAME=create_products_table"
	@echo "  make migrate-single FILE=004_create_product_categories_table.up.sql"
	@echo "  make db-query Q='SELECT * FROM users;'"
	@echo "  make admin-create USERNAME=johndoe PASSWORD=secret123 FULL_NAME='John Doe'"
	@echo "  make technician-create USERNAME=tech1 PASSWORD=tech123 FULL_NAME='Tech User'"
	@echo ""

debug:
	@echo "=== Current Configuration ==="
	@echo "OS: $(OS_TYPE)"
	@echo "DB_HOST: $(DB_HOST)"
	@echo "DB_PORT: $(DB_PORT)"
	@echo "DB_USER: $(DB_USER)"
	@echo "DB_PASSWORD: [HIDDEN]"
	@echo "DB_NAME: $(DB_NAME)"
	@echo "=============================="

# ============================================
# Development Commands
# ============================================

run:
	@echo "Starting application..."
	$(GO_RUN) cmd/api/main.go

build:
	@echo "Building application..."
	$(GO_BUILD) cmd/api/main.go
	@echo "Build completed!"

dev:
	@echo "Starting development server with hot reload..."
	go run github.com/air-verse/air@latest

test:
	@echo "Running tests..."
ifeq ($(OS_TYPE),Windows)
	set CGO_ENABLED=0 && go test -v -coverprofile=coverage.out ./...
else
	CGO_ENABLED=0 go test -v -coverprofile=coverage.out ./...
endif
	@echo "Tests completed"

lint:
	@echo "Running linter..."
	go run github.com/golangci/golangci-lint/cmd/golangci-lint@latest run ./...

fmt:
	@echo "Formatting code..."
	go fmt ./...
	@echo "Code formatted"

coverage:
	@echo "Generating test coverage report..."
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# ============================================
# Database Commands
# ============================================

migrate-up:
	@echo "Running migrations..."
	go run cmd/migrate/main.go -cmd=up

migrate-down:
	@echo "Rolling back migrations..."
	go run cmd/migrate/main.go -cmd=down

migrate-create:
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required"; \
		echo "Usage: make migrate-create NAME=your_migration_name"; \
		exit 1; \
	fi
	@echo "Creating migration: $(NAME)"
	go run cmd/migrate/main.go -cmd=create -name=$(NAME)

migrate-single:
	@if [ -z "$(FILE)" ]; then \
		echo "Error: FILE is required"; \
		echo "Usage: make migrate-single FILE=004_create_product_categories_table.up.sql"; \
		exit 1; \
	fi
	@echo "Running migration: $(FILE)"
	$(PSQL_FILE) migrations/$(FILE)

migrate-force:
	@echo "WARNING: This will drop and recreate all tables!"
	@read -p "Are you sure? (y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "Dropping and recreating database..."; \
		$(PSQL_RAW) "DROP DATABASE IF EXISTS $(DB_NAME);"; \
		$(PSQL_RAW) "CREATE DATABASE $(DB_NAME);"; \
		$(PSQL_RAW) "GRANT ALL PRIVILEGES ON DATABASE $(DB_NAME) TO $(DB_USER);"; \
		echo "Running migrations..."; \
		go run cmd/migrate/main.go -cmd=up; \
		echo "Database reset and migrations completed"; \
	else \
		echo "Operation cancelled."; \
	fi

seed:
	@echo "Seeding database..."
	go run cmd/seed/main.go

db-create:
	@echo "Creating database if not exists..."
	-$(PSQL_RAW) "CREATE DATABASE $(DB_NAME);" 2>/dev/null || true
	$(PSQL_RAW) "GRANT ALL PRIVILEGES ON DATABASE $(DB_NAME) TO $(DB_USER);"
	@echo "Database $(DB_NAME) ready"

db-drop:
	@echo "WARNING: This will delete the database $(DB_NAME)!"
	@read -p "Are you sure? (y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		$(PSQL_RAW) "DROP DATABASE IF EXISTS $(DB_NAME);"; \
		echo "Database dropped"; \
	else \
		echo "Operation cancelled."; \
	fi

db-reset:
	@echo "WARNING: This will delete the database $(DB_NAME)!"
	@read -p "Are you sure? (y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "Dropping database..."; \
		$(PSQL_RAW) "DROP DATABASE IF EXISTS $(DB_NAME);"; \
		echo "Creating database..."; \
		$(PSQL_RAW) "CREATE DATABASE $(DB_NAME);"; \
		$(PSQL_RAW) "GRANT ALL PRIVILEGES ON DATABASE $(DB_NAME) TO $(DB_USER);"; \
		echo "Running migrations..."; \
		go run cmd/migrate/main.go -cmd=up; \
		echo "Seeding database..."; \
		go run cmd/seed/main.go; \
		echo "Database reset complete!"; \
	else \
		echo "Operation cancelled."; \
	fi

db-shell:
	@echo "Opening database shell..."
	$(PSQL_SHELL)

db-status:
	@echo "Checking database status..."
	$(PSQL_CMD) "\dt"

db-query:
	@echo "Running query: $(Q)"
	powershell -Command "$$env:PGPASSWORD='$(DB_PASSWORD)'; psql -U $(DB_USER) -h $(DB_HOST) -d $(DB_NAME) -c '$(Q)'"
# ============================================
# Admin Management Commands
# ============================================

# ============================================
# Admin Management Commands - Windows Compatible
# ============================================

admin-create:
	@echo "Creating admin user: $(USERNAME)..."
	@go run cmd/admin/main.go create -username=$(USERNAME) -password=$(PASSWORD) -fullname="$(FULL_NAME)" -email="$(EMAIL)"

admin-list:
	@echo "Listing admin users..."
	@go run cmd/admin/main.go list

admin-delete:
	@echo "Deleting admin user: $(USERNAME)..."
	@go run cmd/admin/main.go delete -username=$(USERNAME)

admin-reset-password:
	@echo "Resetting password for: $(USERNAME)..."
	@go run cmd/admin/main.go reset-password -username=$(USERNAME) -password=$(PASSWORD)

admin-create-default:
	@echo "Creating default admin user..."
	@go run cmd/admin/main.go create -username=admin -password=Admin123! -fullname="System Administrator" -email="admin@guarantee-system.com"

admin-create-test:
	@echo "Creating test admin user..."
	@go run cmd/admin/main.go create -username=testadmin -password=Test123! -fullname="Test Admin" -email="test@example.com"

# ============================================
# Technician Management Commands - Windows Compatible
# ============================================

technician-create:
	@echo "Creating technician: $(USERNAME)..."
	@go run cmd/admin/main.go create-technician -username=$(USERNAME) -password=$(PASSWORD) -fullname="$(FULL_NAME)" -phone="$(PHONE)" -nationalid="$(NATIONAL_ID)" -address="$(ADDRESS)"

technician-list:
	@echo "Listing technicians..."
	@go run cmd/admin/main.go list-technicians

technician-toggle:
	@echo "Toggling technician: $(USERNAME) to $(ACTIVE)..."
	@go run cmd/admin/main.go toggle-technician -username=$(USERNAME) -active=$(ACTIVE)

technician-create-default:
	@echo "Creating default technician..."
	@go run cmd/admin/main.go create-technician -username=tech1 -password=Tech123! -fullname="John Technician" -phone="+1234567890" -nationalid="TECH001" -address="123 Tech Street"
# ============================================
# Docker Commands
# ============================================

docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d
	@echo "Containers started"
	@echo "Frontend: http://localhost"
	@echo "Backend API: http://localhost:8080"

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	@echo "Showing Docker logs..."
	docker-compose logs -f

docker-clean:
	@echo "Cleaning Docker containers and volumes..."
	docker-compose down -v
	docker-compose rm -f
	@echo "Cleaned"

docker-restart: docker-down docker-up
	@echo "Containers restarted"

# ============================================
# Utility Commands
# ============================================

clean:
	@echo "Cleaning build artifacts..."
	-rmdir /s /q bin 2>nul || true
	-rmdir /s /q uploads 2>nul || true
	-del coverage.out coverage.html 2>nul || true
	@echo "Cleaned"

install-tools:
	@echo "Installing development tools..."
	go install github.com/air-verse/air@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/swaggo/swag/cmd/swag@latest
	go install github.com/go-delve/delve/cmd/dlv@latest
	@echo "Tools installed"

generate-swagger:
	@echo "Generating Swagger documentation..."
	go install github.com/swaggo/swag/cmd/swag@latest
	swag init -g cmd/api/main.go -o docs
	@echo "Swagger documentation generated"

# ============================================
# Quick Commands
# ============================================

setup: install-tools db-create migrate-up seed
	@echo "============================================"
	@echo "  Setup Complete!"
	@echo "============================================"
	@echo "  Database: $(DB_NAME)"
	@echo "  Host: $(DB_HOST):$(DB_PORT)"
	@echo "  User: $(DB_USER)"
	@echo ""
	@echo "  Run 'make run' to start the application"
	@echo "  Run 'make db-status' to check database"
	@echo "  Run 'make admin-create-default' to create admin"
	@echo "============================================"

fresh: clean db-reset
	@echo "Fresh start complete!"

# ============================================
# Default target
# ============================================

.DEFAULT_GOAL := help