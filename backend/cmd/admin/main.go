package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/database"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	// Load config
	cfg := config.Load()

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	db := database.GetDB()

	switch command {
	case "create":
		createAdmin(db)
	case "list":
		listAdmins(db)
	case "delete":
		deleteAdmin(db)
	case "reset-password":
		resetAdminPassword(db)
	case "create-technician":
		createTechnician(db)
	case "list-technicians":
		listTechnicians(db)
	case "toggle-technician":
		toggleTechnician(db)
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: go run cmd/admin/main.go <command> [options]")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  create                Create a new admin user")
	fmt.Println("    -username=xxx       Username (required)")
	fmt.Println("    -password=xxx       Password (required)")
	fmt.Println("    -fullname=xxx       Full name")
	fmt.Println("    -email=xxx          Email address")
	fmt.Println("    -role=xxx           admin (default) or technical")
	fmt.Println("    -phone=xxx          Phone, for reviewer SMS")
	fmt.Println()
	fmt.Println("  list                  List all admin users")
	fmt.Println()
	fmt.Println("  delete                Delete an admin user")
	fmt.Println("    -username=xxx       Username (required)")
	fmt.Println()
	fmt.Println("  reset-password        Reset admin password")
	fmt.Println("    -username=xxx       Username (required)")
	fmt.Println("    -password=xxx       New password (required)")
	fmt.Println()
	fmt.Println("  create-technician     Create a new technician")
	fmt.Println("    -username=xxx       Username (required)")
	fmt.Println("    -password=xxx       Password (required)")
	fmt.Println("    -fullname=xxx       Full name")
	fmt.Println("    -phone=xxx          Phone number")
	fmt.Println("    -nationalid=xxx     National ID")
	fmt.Println("    -address=xxx        Address")
	fmt.Println()
	fmt.Println("  list-technicians      List all technicians")
	fmt.Println()
	fmt.Println("  toggle-technician     Activate/deactivate technician")
	fmt.Println("    -username=xxx       Username (required)")
	fmt.Println("    -active=true/false  Active status (required)")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  go run cmd/admin/main.go create -username=john -password=secret123 -fullname='John Doe' -email=john@example.com")
	fmt.Println("  go run cmd/admin/main.go list")
	fmt.Println("  go run cmd/admin/main.go delete -username=john")
	fmt.Println("  go run cmd/admin/main.go reset-password -username=john -password=newpass123")
	fmt.Println("  go run cmd/admin/main.go create-technician -username=tech1 -password=tech123 -fullname='Tech User'")
}

func createAdmin(db *gorm.DB) {
	username := flag.String("username", "", "Username")
	password := flag.String("password", "", "Password")
	fullname := flag.String("fullname", "", "Full name")
	email := flag.String("email", "", "Email")
	role := flag.String("role", "admin", "Role: admin or technical")
	phone := flag.String("phone", "", "Phone (used for reviewer SMS)")

	// Parse flags after the command
	if err := flag.CommandLine.Parse(os.Args[2:]); err != nil {
		log.Fatal("Failed to parse flags:", err)
	}

	if *username == "" || *password == "" {
		log.Fatal("Error: username and password are required")
	}
	if *role != "admin" && *role != "technical" {
		log.Fatal("Error: role must be 'admin' or 'technical'")
	}

	// Check if user already exists
	var count int64
	db.Table("admins").Where("username = ?", *username).Count(&count)
	if count > 0 {
		log.Fatalf("Error: admin user '%s' already exists", *username)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	// Create admin
	admin := map[string]interface{}{
		"username":  *username,
		"password":  string(hashedPassword),
		"full_name": *fullname,
		"email":     *email,
		"role":      *role,
		"phone":     *phone,
		"is_active": true,
	}

	if err := db.Table("admins").Create(&admin).Error; err != nil {
		log.Fatal("Failed to create admin:", err)
	}

	fmt.Printf("✓ Admin user '%s' created successfully!\n", *username)
}

func listAdmins(db *gorm.DB) {
	var admins []map[string]interface{}
	if err := db.Table("admins").Where("is_active = ?", true).Find(&admins).Error; err != nil {
		log.Fatal("Failed to list admins:", err)
	}

	fmt.Println("\n=== Admin Users ===")
	fmt.Printf("%-5s %-20s %-30s %-20s\n", "ID", "Username", "Full Name", "Email")
	fmt.Println("--------------------------------------------------------")

	for _, admin := range admins {
		fmt.Printf("%-5v %-20s %-30s %-20s\n",
			admin["id"],
			admin["username"],
			admin["full_name"],
			admin["email"],
		)
	}
	fmt.Printf("\nTotal: %d admin(s)\n", len(admins))
}

func deleteAdmin(db *gorm.DB) {
	username := flag.String("username", "", "Username")
	if err := flag.CommandLine.Parse(os.Args[2:]); err != nil {
		log.Fatal("Failed to parse flags:", err)
	}

	if *username == "" {
		log.Fatal("Error: username is required")
	}

	// Check if it's the last admin
	var count int64
	db.Table("admins").Where("is_active = ?", true).Count(&count)
	if count <= 1 {
		log.Fatal("Error: Cannot delete the last admin user")
	}

	result := db.Table("admins").Where("username = ?", *username).Delete(nil)
	if result.RowsAffected == 0 {
		log.Fatalf("Error: admin user '%s' not found", *username)
	}

	fmt.Printf("✓ Admin user '%s' deleted successfully!\n", *username)
}

func resetAdminPassword(db *gorm.DB) {
	username := flag.String("username", "", "Username")
	password := flag.String("password", "", "New password")
	if err := flag.CommandLine.Parse(os.Args[2:]); err != nil {
		log.Fatal("Failed to parse flags:", err)
	}

	if *username == "" || *password == "" {
		log.Fatal("Error: username and password are required")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	result := db.Table("admins").Where("username = ?", *username).Update("password", string(hashedPassword))
	if result.RowsAffected == 0 {
		log.Fatalf("Error: admin user '%s' not found", *username)
	}

	fmt.Printf("✓ Password for '%s' reset successfully!\n", *username)
}

func createTechnician(db *gorm.DB) {
	username := flag.String("username", "", "Username")
	password := flag.String("password", "", "Password")
	fullname := flag.String("fullname", "", "Full name")
	phone := flag.String("phone", "", "Phone number")
	nationalid := flag.String("nationalid", "", "National ID")
	address := flag.String("address", "", "Address")

	if err := flag.CommandLine.Parse(os.Args[2:]); err != nil {
		log.Fatal("Failed to parse flags:", err)
	}

	if *username == "" || *password == "" {
		log.Fatal("Error: username and password are required")
	}

	// Check if user already exists
	var count int64
	db.Table("technicians").Where("username = ?", *username).Count(&count)
	if count > 0 {
		log.Fatalf("Error: technician '%s' already exists", *username)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	// Create technician
	tech := map[string]interface{}{
		"username":    *username,
		"password":    string(hashedPassword),
		"full_name":   *fullname,
		"phone":       *phone,
		"national_id": *nationalid,
		"address":     *address,
		"is_active":   true,
	}

	if err := db.Table("technicians").Create(&tech).Error; err != nil {
		log.Fatal("Failed to create technician:", err)
	}

	fmt.Printf("✓ Technician '%s' created successfully!\n", *username)
}

func listTechnicians(db *gorm.DB) {
	var technicians []map[string]interface{}
	if err := db.Table("technicians").Find(&technicians).Error; err != nil {
		log.Fatal("Failed to list technicians:", err)
	}

	fmt.Println("\n=== Technicians ===")
	fmt.Printf("%-5s %-20s %-25s %-15s %-10s\n", "ID", "Username", "Full Name", "Phone", "Active")
	fmt.Println("----------------------------------------------------------------")

	for _, tech := range technicians {
		active := "No"
		if tech["is_active"].(bool) {
			active = "Yes"
		}
		fmt.Printf("%-5v %-20s %-25s %-15s %-10s\n",
			tech["id"],
			tech["username"],
			tech["full_name"],
			tech["phone"],
			active,
		)
	}
	fmt.Printf("\nTotal: %d technician(s)\n", len(technicians))
}

func toggleTechnician(db *gorm.DB) {
	username := flag.String("username", "", "Username")
	active := flag.String("active", "", "Active status (true/false)")
	if err := flag.CommandLine.Parse(os.Args[2:]); err != nil {
		log.Fatal("Failed to parse flags:", err)
	}

	if *username == "" || *active == "" {
		log.Fatal("Error: username and active status are required")
	}

	activeBool := *active == "true"

	result := db.Table("technicians").Where("username = ?", *username).Update("is_active", activeBool)
	if result.RowsAffected == 0 {
		log.Fatalf("Error: technician '%s' not found", *username)
	}

	status := "activated"
	if !activeBool {
		status = "deactivated"
	}
	fmt.Printf("✓ Technician '%s' %s successfully!\n", *username, status)
}
