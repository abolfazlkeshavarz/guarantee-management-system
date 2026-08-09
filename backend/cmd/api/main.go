package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/database"
	"guarantee-management-system/internal/middleware"
	"guarantee-management-system/internal/modules/auth"
	"guarantee-management-system/internal/modules/categories"
	"guarantee-management-system/internal/modules/customers"
	"guarantee-management-system/internal/modules/dashboard"
	"guarantee-management-system/internal/modules/guarantees"
	"guarantee-management-system/internal/modules/products"
	"guarantee-management-system/internal/modules/repaircatalog"
	"guarantee-management-system/internal/modules/repairs"
	"guarantee-management-system/internal/modules/technicians"
	"guarantee-management-system/internal/shared/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	if err := cfg.Validate(); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	if err := database.Connect(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	if err := storage.Initialize(cfg.UploadPath); err != nil {
		log.Fatal("Failed to initialize storage:", err)
	}

	router := gin.New()

	// Trust nothing by default. Set TRUSTED_PROXIES when the API sits behind
	// nginx or a load balancer so client IPs in the logs stay accurate.
	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		log.Fatal("Failed to set trusted proxies:", err)
	}

	// Cap request bodies so a large upload can't exhaust memory.
	router.MaxMultipartMemory = cfg.MaxUploadSize

	router.Use(gin.Recovery())
	router.Use(middleware.CORS(cfg))
	router.Use(middleware.Logger())

	router.Static("/uploads", cfg.UploadPath)

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"app":    cfg.AppName,
			"env":    cfg.AppEnv,
		})
	})

	// Readiness probe: reports whether the database is actually reachable.
	router.GET("/ready", func(c *gin.Context) {
		sqlDB, err := database.GetDB().DB()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
			return
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := sqlDB.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	v1 := router.Group("/api/v1")
	{
		db := database.GetDB()

		auth.NewAuthModule(db, cfg).RegisterRoutes(v1)
		customers.NewCustomerModule(db).RegisterRoutes(v1)
		dashboard.NewDashboardModule(db).RegisterRoutes(v1)
		categories.NewCategoryModule(db).RegisterRoutes(v1)
		products.NewProductModule(db).RegisterRoutes(v1)
		guarantees.NewGuaranteeModule(db, cfg).RegisterRoutes(v1)
		technicians.NewTechnicianModule(db, cfg).RegisterRoutes(v1)
		repaircatalog.NewRepairCatalogModule(db).RegisterRoutes(v1)
		repairs.NewRepairModule(db).RegisterRoutes(v1)

		log.Println("All modules registered successfully")
	}

	if !cfg.IsProduction() {
		log.Println("Registered routes:")
		for _, route := range router.Routes() {
			log.Printf("  %s %s", route.Method, route.Path)
		}
	}

	server := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("Server listening on port %s (env: %s)", cfg.AppPort, cfg.AppEnv)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Forced shutdown: %v", err)
	}

	log.Println("Server stopped")
}
