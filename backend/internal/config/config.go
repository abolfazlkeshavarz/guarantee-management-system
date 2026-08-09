package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Values that ship in .env.example. If any of these survive into a production
// boot the server refuses to start rather than running with a known secret.
const (
	defaultJWTSecret  = "your-super-secret-jwt-key-change-in-production"
	legacyJWTSecret   = "your-256-bit-secret-key-change-in-production"
	minJWTSecretBytes = 32
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

	// TrustedProxies is the set of proxy IPs/CIDRs Gin will trust for
	// X-Forwarded-For. Empty means "trust nothing", which is the correct
	// default when the API is reached directly.
	TrustedProxies []string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	jwtExpiration, _ := strconv.Atoi(getEnv("JWT_EXPIRATION", "24"))
	maxUploadSize, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "10485760"), 10, 64)

	return &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "8080"),
		AppName: getEnv("APP_NAME", "Guarantee Management System"),
		AppURL:  getEnv("APP_URL", ""),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "guarantee_db"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		JWTSecret:     getEnv("JWT_SECRET", defaultJWTSecret),
		JWTExpiration: time.Duration(jwtExpiration) * time.Hour,

		UploadPath:    getEnv("UPLOAD_PATH", "./uploads"),
		MaxUploadSize: maxUploadSize,

		CORSAllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:5173"}),
		TrustedProxies:     getEnvAsSlice("TRUSTED_PROXIES", nil),
	}
}

// IsProduction reports whether the app is running with production guarantees.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.AppEnv, "production")
}

// Validate refuses to boot a production server with development defaults.
func (c *Config) Validate() error {
	if !c.IsProduction() {
		return nil
	}

	var problems []string

	if c.JWTSecret == defaultJWTSecret || c.JWTSecret == legacyJWTSecret {
		problems = append(problems, "JWT_SECRET is still the example value")
	}
	if len(c.JWTSecret) < minJWTSecretBytes {
		problems = append(problems, fmt.Sprintf("JWT_SECRET must be at least %d characters", minJWTSecretBytes))
	}
	if c.DBPassword == "" {
		problems = append(problems, "DB_PASSWORD is empty")
	}
	if len(c.CORSAllowedOrigins) == 0 {
		problems = append(problems, "CORS_ALLOWED_ORIGINS is empty")
	}
	for _, origin := range c.CORSAllowedOrigins {
		if strings.TrimSpace(origin) == "*" {
			problems = append(problems, "CORS_ALLOWED_ORIGINS contains '*', which allows any site to call the API")
		}
	}

	if len(problems) > 0 {
		return fmt.Errorf("invalid production configuration:\n  - %s", strings.Join(problems, "\n  - "))
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	var result []string
	for _, part := range strings.Split(value, ",") {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	if len(result) == 0 {
		return defaultValue
	}
	return result
}

func (c *Config) DBDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
}
