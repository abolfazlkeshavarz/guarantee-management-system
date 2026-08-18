// Package audit records every successful mutating request -- who did it, to
// what, and when -- and serves that history back to admins.
//
// It works as a Gin middleware rather than as calls sprinkled through each
// service. Instrumenting call sites means every future endpoint has to
// remember to log, and the first one that forgets leaves a silent hole in the
// trail. Observing the request boundary cannot be forgotten.
package audit

import (
	"log"
	"strconv"
	"strings"
	"time"

	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuditLog struct {
	ID         uint64    `gorm:"primaryKey" json:"id"`
	ActorType  string    `json:"actor_type"`
	ActorID    *uint64   `json:"actor_id,omitempty"`
	ActorName  string    `json:"actor_name"`
	Action     string    `json:"action"`
	EntityType string    `json:"entity_type"`
	EntityID   *uint64   `json:"entity_id,omitempty"`
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	StatusCode int       `json:"status_code"`
	IP         string    `json:"ip"`
	CreatedAt  time.Time `json:"created_at"`
}

func (AuditLog) TableName() string { return "audit_logs" }

// skipPaths are endpoints whose traffic is noise rather than history.
var skipPaths = map[string]bool{
	"/api/v1/sms/test": true,
}

// classify turns "POST /api/v1/guarantees/15/approve" into
// (entity="guarantees", id=15, action="approve").
//
// The trailing verb, when present, is the action -- that is the convention
// this API already follows for approve/reject/review/cancel/status. Otherwise
// the HTTP method decides.
func classify(method, fullPath string) (entityType string, entityID *uint64, action string) {
	trimmed := strings.TrimPrefix(fullPath, "/api/v1/")
	parts := strings.Split(strings.Trim(trimmed, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return "unknown", nil, strings.ToLower(method)
	}

	// Account verbs are named by their trailing segment regardless of which
	// portal they live under. Without this /technician/login reduces to the
	// single segment "login", which the generic logic below would read as the
	// entity rather than the action.
	for _, verb := range []string{"login", "change-password", "reset-password"} {
		if strings.HasSuffix(trimmed, "/"+verb) || trimmed == verb {
			return "auth", nil, verb
		}
	}

	// "technician/part-requests/..." is the same entity as "part-requests/...".
	if parts[0] == "technician" && len(parts) > 1 {
		parts = parts[1:]
	}

	entityType = parts[0]

	switch method {
	case "POST":
		action = "create"
	case "PUT", "PATCH":
		action = "update"
	case "DELETE":
		action = "delete"
	default:
		action = strings.ToLower(method)
	}

	for i, part := range parts[1:] {
		if id, err := strconv.ParseUint(part, 10, 64); err == nil {
			entityID = &id
			// Anything after the id is the verb: /repairs/3/review
			if i+2 < len(parts) {
				action = parts[i+2]
			}
			break
		}
	}

	// Collection-level verbs with no id, e.g. POST /auth/login.
	if entityID == nil && len(parts) > 1 {
		last := parts[len(parts)-1]
		if _, err := strconv.ParseUint(last, 10, 64); err != nil {
			action = last
		}
	}

	return entityType, entityID, action
}

// Middleware records mutating requests that succeeded. Reads are ignored --
// they would swamp the table without answering "who changed this?".
func Middleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		method := c.Request.Method
		if method == "GET" || method == "HEAD" || method == "OPTIONS" {
			return
		}
		status := c.Writer.Status()
		if status >= 400 {
			return
		}
		path := c.Request.URL.Path
		if skipPaths[path] {
			return
		}

		entityType, entityID, action := classify(method, path)

		entry := AuditLog{
			ActorType:  "public",
			Action:     action,
			EntityType: entityType,
			EntityID:   entityID,
			Method:     method,
			Path:       path,
			StatusCode: status,
			IP:         c.ClientIP(),
		}

		if name, ok := c.Get("username"); ok {
			entry.ActorName, _ = name.(string)
		}
		if role, ok := c.Get("role"); ok {
			if r, _ := role.(string); r != "" {
				entry.ActorType = r
			}
		}
		if adminID := c.GetUint("admin_id"); adminID != 0 {
			id := uint64(adminID)
			entry.ActorID = &id
		} else if techID := c.GetUint("technician_id"); techID != 0 {
			id := uint64(techID)
			entry.ActorID = &id
		}

		// Written off the request path: the response is already committed by
		// now, so blocking on an INSERT would only add latency. A failure here
		// must never surface to the caller, so it is logged and dropped.
		go func(e AuditLog) {
			if err := db.Create(&e).Error; err != nil {
				log.Printf("⚠️  audit log write failed (%s %s): %v", e.Method, e.Path, err)
			}
		}(entry)
	}
}

type ListResponse struct {
	Logs     []AuditLog `json:"logs"`
	Total    int64      `json:"total"`
	Page     int        `json:"page"`
	Limit    int        `json:"limit"`
	LastPage int        `json:"last_page"`
}

type AuditModule struct{ db *gorm.DB }

func NewAuditModule(db *gorm.DB) *AuditModule { return &AuditModule{db: db} }

func (m *AuditModule) RegisterRoutes(router *gin.RouterGroup) {
	// Admin-only: the audit trail names who did what, which is not a
	// technician's business even for their own records.
	logs := router.Group("/audit-logs")
	logs.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		logs.GET("", m.list)
		logs.GET("/actions", m.actions)
	}
}

func (m *AuditModule) list(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}

	q := m.db.Model(&AuditLog{})
	if v := strings.TrimSpace(c.Query("actor")); v != "" {
		q = q.Where("actor_name ILIKE ?", "%"+v+"%")
	}
	if v := strings.TrimSpace(c.Query("actor_type")); v != "" {
		q = q.Where("actor_type = ?", v)
	}
	if v := strings.TrimSpace(c.Query("action")); v != "" {
		q = q.Where("action = ?", v)
	}
	if v := strings.TrimSpace(c.Query("entity_type")); v != "" {
		q = q.Where("entity_type = ?", v)
	}
	if v := strings.TrimSpace(c.Query("from")); v != "" {
		q = q.Where("created_at >= ?", v)
	}
	if v := strings.TrimSpace(c.Query("to")); v != "" {
		// Inclusive of the whole "to" day.
		q = q.Where("created_at < (?::date + INTERVAL '1 day')", v)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		c.JSON(500, gin.H{"success": false, "message": "Failed to count audit logs"})
		return
	}

	var logs []AuditLog
	if err := q.Order("created_at DESC").
		Offset((page - 1) * limit).Limit(limit).
		Find(&logs).Error; err != nil {
		c.JSON(500, gin.H{"success": false, "message": "Failed to list audit logs"})
		return
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	c.JSON(200, gin.H{"success": true, "data": ListResponse{
		Logs: logs, Total: total, Page: page, Limit: limit, LastPage: lastPage,
	}})
}

// actions powers the filter dropdowns without hardcoding the vocabulary in
// the UI -- new endpoints introduce new verbs on their own.
func (m *AuditModule) actions(c *gin.Context) {
	var actions []string
	m.db.Model(&AuditLog{}).Distinct().Order("action").Pluck("action", &actions)

	var entities []string
	m.db.Model(&AuditLog{}).Distinct().Order("entity_type").Pluck("entity_type", &entities)

	c.JSON(200, gin.H{"success": true, "data": gin.H{
		"actions": actions, "entity_types": entities,
	}})
}
