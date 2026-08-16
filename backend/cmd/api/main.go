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
	"guarantee-management-system/internal/modules/partrequests"
	"guarantee-management-system/internal/modules/products"
	"guarantee-management-system/internal/modules/repaircatalog"
	"guarantee-management-system/internal/modules/repairs"
	"guarantee-management-system/internal/modules/technicians"
	"guarantee-management-system/internal/shared/sms"
	"guarantee-management-system/internal/shared/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Refuse to boot a production server with development defaults (example
	// JWT secret, empty DB password, wildcard CORS, etc.)
	if err := cfg.Validate(); err != nil {
		log.Fatal(err)
	}

	// Set Gin mode
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	if err := database.Connect(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	// Initialize storage
	if err := storage.Initialize(cfg.UploadPath); err != nil {
		log.Fatal("Failed to initialize storage:", err)
	}

	// Initialize SMS client (Melli Payamak)
	sms.Initialize(cfg)

	// Setup router
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORS(cfg))
	router.Use(middleware.Logger())

	// Only trust X-Forwarded-For from these proxies (empty = trust none,
	// i.e. use the direct connection's address). Without this call Gin
	// trusts every proxy by default, which lets a client spoof its IP.
	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		log.Fatal("Invalid TRUSTED_PROXIES:", err)
	}

	// Serve uploaded files (invoice/guarantee-card images, etc.)
	router.Static("/uploads", cfg.UploadPath)

	// Liveness: process is up, nothing more.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"app":    cfg.AppName,
			"env":    cfg.AppEnv,
		})
	})

	// Readiness: process is up AND can reach the database. Used by
	// docker-compose/orchestrators to gate traffic, not just process liveness.
	router.GET("/ready", func(c *gin.Context) {
		sqlDB, err := database.GetDB().DB()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready", "error": "database handle unavailable"})
			return
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := sqlDB.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready", "error": "database unreachable"})
			return
		}
		c.JSON(200, gin.H{"status": "ready"})
	})

	// API v1
	v1 := router.Group("/api/v1")
	{
		// Initialize auth module
		authModule := auth.NewAuthModule(database.GetDB(), cfg)
		authModule.RegisterRoutes(v1)

		// Initialize customers module
		customersModule := customers.NewCustomerModule(database.GetDB())
		customersModule.RegisterRoutes(v1)

		// Initialize dashboard module
		dashboardModule := dashboard.NewDashboardModule(database.GetDB())
		dashboardModule.RegisterRoutes(v1)

		// Initialize product categories module
		categoriesModule := categories.NewCategoryModule(database.GetDB())
		categoriesModule.RegisterRoutes(v1)

		// Initialize products module
		productsModule := products.NewProductModule(database.GetDB())
		productsModule.RegisterRoutes(v1)

		// Initialize guarantees module
		guaranteesModule := guarantees.NewGuaranteeModule(database.GetDB(), cfg)
		guaranteesModule.RegisterRoutes(v1)

		// Initialize technicians module with config
		techniciansModule := technicians.NewTechnicianModule(database.GetDB(), cfg)
		techniciansModule.RegisterRoutes(v1)

		// Initialize repair catalog module (components/services admin-managed lists)
		repairCatalogModule := repaircatalog.NewRepairCatalogModule(database.GetDB())
		repairCatalogModule.RegisterRoutes(v1)

		// Initialize repairs module
		repairsModule := repairs.NewRepairModule(database.GetDB())
		repairsModule.RegisterRoutes(v1)

		// Initialize part requests module (technician -> admin part/service requests)
		partRequestsModule := partrequests.NewPartRequestModule(database.GetDB())
		partRequestsModule.RegisterRoutes(v1)

		// Admin-only: send an arbitrary test SMS, to confirm the Melli
		// Payamak integration is working without waiting for a real
		// guarantee approval / part request / repair report.
		smsTest := v1.Group("/sms")
		smsTest.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
		{
			smsTest.POST("/test", func(c *gin.Context) {
				var req struct {
					To   string `json:"to" binding:"required"`
					Text string `json:"text" binding:"required"`
				}
				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
					return
				}
				if err := sms.SendTest(req.To, req.Text); err != nil {
					c.JSON(http.StatusBadGateway, gin.H{"success": false, "message": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"success": true, "message": "SMS sent"})
			})
		}

		log.Println("✅ All modules registered successfully")
	}

	// Log all routes for debugging
	log.Println("📋 Registered routes:")
	for _, route := range router.Routes() {
		log.Printf("  %s %s", route.Method, route.Path)
	}

	// Start server
	port := cfg.AppPort
	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("🌍 Environment: %s", cfg.AppEnv)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Graceful shutdown: stop accepting new connections and give in-flight
	// requests up to 15s to finish before the process exits.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Println("⚠️  Forced shutdown:", err)
	} else {
		log.Println("✅ Server exited cleanly")
	}
}
