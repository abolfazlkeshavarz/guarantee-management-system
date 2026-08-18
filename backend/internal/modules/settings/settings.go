// Package settings exposes the single row of global display settings
// (language + calendar) that an admin controls and every other surface --
// technician portal, public guarantee pages -- inherits.
package settings

import (
	"time"

	"guarantee-management-system/internal/middleware"
	"guarantee-management-system/internal/shared/errors"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const singletonID = 1

var (
	allowedLanguages = map[string]bool{"en": true, "fa": true}
	allowedCalendars = map[string]bool{"gregorian": true, "jalali": true}
)

type AppSettings struct {
	ID        uint8     `gorm:"primaryKey" json:"-"`
	Language  string    `gorm:"size:5;not null" json:"language"`
	Calendar  string    `gorm:"size:20;not null" json:"calendar"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (AppSettings) TableName() string { return "app_settings" }

type UpdateSettingsRequest struct {
	Language string `json:"language" binding:"omitempty,oneof=en fa"`
	Calendar string `json:"calendar" binding:"omitempty,oneof=gregorian jalali"`
}

type SettingsModule struct {
	db *gorm.DB
}

func NewSettingsModule(db *gorm.DB) *SettingsModule {
	return &SettingsModule{db: db}
}

// get returns the singleton row, recreating it with defaults if it somehow
// went missing, so a read never fails just because the seed row was deleted.
func (m *SettingsModule) get() (*AppSettings, error) {
	var s AppSettings
	err := m.db.First(&s, singletonID).Error
	if err == gorm.ErrRecordNotFound {
		s = AppSettings{ID: singletonID, Language: "en", Calendar: "gregorian"}
		if err := m.db.Create(&s).Error; err != nil {
			return nil, err
		}
		return &s, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (m *SettingsModule) RegisterRoutes(router *gin.RouterGroup) {
	// Public on purpose: the login screen and the public guarantee pages need
	// to know which language to render before anyone has authenticated.
	router.GET("/settings", func(c *gin.Context) {
		s, err := m.get()
		if err != nil {
			c.JSON(500, gin.H{"success": false, "message": "Failed to load settings"})
			return
		}
		c.JSON(200, gin.H{"success": true, "data": s})
	})

	admin := router.Group("")
	admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	admin.PUT("/settings", func(c *gin.Context) {
		var req UpdateSettingsRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"success": false, "message": err.Error()})
			return
		}

		s, err := m.get()
		if err != nil {
			c.JSON(500, gin.H{"success": false, "message": "Failed to load settings"})
			return
		}

		if req.Language != "" && allowedLanguages[req.Language] {
			s.Language = req.Language
		}
		if req.Calendar != "" && allowedCalendars[req.Calendar] {
			s.Calendar = req.Calendar
		}

		if err := m.db.Save(s).Error; err != nil {
			c.JSON(500, gin.H{"success": false, "message": errors.ErrInternalServer})
			return
		}
		c.JSON(200, gin.H{"success": true, "data": s})
	})
}
