package main

import (
	"log"

	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/database"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	cfg := config.Load()

	if err := database.Connect(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	db := database.GetDB()

	// Seed initial data
	seedAdmins(db)
	seedProductCategories(db)
	seedProducts(db)
	seedTechnicians(db)

	log.Println("Database seeded successfully")
}

func seedAdmins(db *gorm.DB) {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Admin123!"), bcrypt.DefaultCost)

	// Check if admin exists
	var count int64
	db.Table("admins").Where("username = ?", "admin").Count(&count)

	if count == 0 {
		admin := map[string]interface{}{
			"username":  "admin",
			"password":  string(hashedPassword),
			"full_name": "System Administrator",
			"email":     "admin@guarantee-system.com",
			"is_active": true,
		}

		if err := db.Table("admins").Create(&admin).Error; err != nil {
			log.Printf("Failed to seed admin: %v", err)
		} else {
			log.Println("Admin seeded successfully")
		}
	} else {
		log.Println("Admin already exists, skipping...")
	}
}

func seedProductCategories(db *gorm.DB) {
	// Check if categories already exist
	var count int64
	db.Table("product_categories").Count(&count)

	if count == 0 {
		categories := []map[string]interface{}{
			{"name": "Electronics", "description": "Electronic products and devices", "is_active": true},
			{"name": "Home Appliances", "description": "Home and kitchen appliances", "is_active": true},
			{"name": "Mobile Phones", "description": "Smartphones and accessories", "is_active": true},
			{"name": "Computers", "description": "Laptops, desktops and peripherals", "is_active": true},
			{"name": "Furniture", "description": "Home and office furniture", "is_active": true},
		}

		for _, category := range categories {
			if err := db.Table("product_categories").Create(&category).Error; err != nil {
				log.Printf("Failed to seed category: %v", err)
			}
		}
		log.Println("Product categories seeded successfully")
	} else {
		log.Println("Product categories already exist, skipping...")
	}
}

func seedProducts(db *gorm.DB) {
	// Check if products already exist
	var count int64
	db.Table("products").Count(&count)

	if count == 0 {
		// Get category IDs
		var categoryIDs []uint
		db.Table("product_categories").Pluck("id", &categoryIDs)

		if len(categoryIDs) > 0 {
			products := []map[string]interface{}{
				{"name": "Smart TV 55\"", "description": "4K Smart LED TV", "category_id": categoryIDs[0], "is_active": true},
				{"name": "Washing Machine", "description": "Front load washing machine", "category_id": categoryIDs[1], "is_active": true},
				{"name": "iPhone 15 Pro", "description": "Latest iPhone model", "category_id": categoryIDs[2], "is_active": true},
				{"name": "MacBook Pro", "description": "Professional laptop", "category_id": categoryIDs[3], "is_active": true},
				{"name": "Office Desk", "description": "Modern office desk", "category_id": categoryIDs[4], "is_active": true},
			}

			for _, product := range products {
				if err := db.Table("products").Create(&product).Error; err != nil {
					log.Printf("Failed to seed product: %v", err)
				}
			}
			log.Println("Products seeded successfully")
		}
	} else {
		log.Println("Products already exist, skipping...")
	}
}

func seedTechnicians(db *gorm.DB) {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Tech123!"), bcrypt.DefaultCost)

	// Check if technicians already exist
	var count int64
	db.Table("technicians").Count(&count)

	if count == 0 {
		technicians := []map[string]interface{}{
			{
				"full_name":   "John Doe",
				"username":    "johndoe",
				"password":    string(hashedPassword),
				"phone":       "+1234567890",
				"national_id": "ID123456",
				"address":     "123 Main St, City",
				"is_active":   true,
			},
			{
				"full_name":   "Jane Smith",
				"username":    "janesmith",
				"password":    string(hashedPassword),
				"phone":       "+0987654321",
				"national_id": "ID654321",
				"address":     "456 Oak Ave, Town",
				"is_active":   true,
			},
		}

		for _, tech := range technicians {
			if err := db.Table("technicians").Create(&tech).Error; err != nil {
				log.Printf("Failed to seed technician: %v", err)
			}
		}
		log.Println("Technicians seeded successfully")
	} else {
		log.Println("Technicians already exist, skipping...")
	}
}
