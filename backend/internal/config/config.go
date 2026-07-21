package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv  string
	AppPort string
	AppName string
	AppURL  string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	JWTSecret     string
	JWTExpiration time.Duration

	UploadPath    string
	MaxUploadSize int64

	CORSAllowedOrigins []string
}

func Load() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	jwtExpiration, _ := strconv.Atoi(getEnv("JWT_EXPIRATION", "24"))
	maxUploadSize, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "10485760"), 10, 64)

	return &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "8080"),
		AppName: getEnv("APP_NAME", "Guarantee Management System"),
		AppURL:  getEnv("APP_URL", "http://localhost:8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
		DBName:     getEnv("DB_NAME", "guarantee_db"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		JWTSecret:     getEnv("JWT_SECRET", "your-256-bit-secret-key-change-in-production"),
		JWTExpiration: time.Duration(jwtExpiration) * time.Hour,

		UploadPath:    getEnv("UPLOAD_PATH", "./uploads"),
		MaxUploadSize: maxUploadSize,

		CORSAllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:5173"}),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Simple comma-separated list
		var result []string
		current := ""
		for _, char := range value {
			if char == ',' {
				if current != "" {
					result = append(result, current)
					current = ""
				}
			} else {
				current += string(char)
			}
		}
		if current != "" {
			result = append(result, current)
		}
		return result
	}
	return defaultValue
}

func (c *Config) DBDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
}
