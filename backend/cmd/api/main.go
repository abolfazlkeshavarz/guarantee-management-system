package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/database"
	"guarantee-management-system/internal/middleware"
	"guarantee-management-system/internal/modules/auth"
	"guarantee-management-system/internal/modules/customers"
	"guarantee-management-system/internal/modules/dashboard"
	"guarantee-management-system/internal/shared/storage"
	"guarantee-management-system/internal/modules/categories"
	"guarantee-management-system/internal/modules/products"
	"guarantee-management-system/internal/modules/guarantees"
	"guarantee-management-system/internal/modules/technicians"
	"guarantee-management-system/internal/modules/repairs"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

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

	// Setup router
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORS(cfg))
	router.Use(middleware.Logger())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"app":    cfg.AppName,
			"env":    cfg.AppEnv,
		})
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
		guaranteesModule := guarantees.NewGuaranteeModule(database.GetDB())
		guaranteesModule.RegisterRoutes(v1)

		// Initialize technicians module with config
		techniciansModule := technicians.NewTechnicianModule(database.GetDB(), cfg)
		techniciansModule.RegisterRoutes(v1)

		// Initialize repairs module
		repairsModule := repairs.NewRepairModule(database.GetDB())
		repairsModule.RegisterRoutes(v1)

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

	go func() {
		if err := router.Run(":" + port); err != nil {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")
}