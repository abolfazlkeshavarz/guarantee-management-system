package middleware

import (
	"strings"

	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/shared/responses"
	"guarantee-management-system/internal/shared/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	cfg := config.Load()

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			responses.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			responses.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.ValidateToken(token, cfg.JWTSecret)
		if err != nil {
			responses.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		// Set user context with role
		c.Set("role", claims.Role)
		c.Set("username", claims.Username)

		if claims.Role == "admin" || claims.Role == "technical" {
			c.Set("admin_id", claims.AdminID)
		} else if claims.Role == "technician" {
			c.Set("technician_id", claims.TechnicianID)
		}

		// A technical user may do everything a full admin can except delete.
		// The rule lives here because every authenticated route passes through
		// this function, including ones added later -- a router.Use()
		// middleware could not do it, since it runs before this one and would
		// see no role. Enforcing it route-by-route would only hold until
		// someone forgot.
		if c.Request.Method == "DELETE" && claims.Role == "technical" {
			responses.Forbidden(c, "Technical users cannot delete records")
			c.Abort()
			return
		}

		c.Next()
	}
}

func TechnicianOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "technician" {
			responses.Forbidden(c, "Technician access only")
			c.Abort()
			return
		}
		c.Next()
	}
}

// AdminOnly admits both staff roles. "technical" is a full staff account: it
// may create and update everything an admin can, and is barred only from
// deleting, which AuthMiddleware enforces.
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || (role != "admin" && role != "technical") {
			responses.Forbidden(c, "Staff access only")
			c.Abort()
			return
		}
		c.Next()
	}
}

// StrictAdminOnly excludes technical users, for the few things only a full
// admin should reach -- managing staff accounts themselves.
func StrictAdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "admin" {
			responses.Forbidden(c, "Admin access only")
			c.Abort()
			return
		}
		c.Next()
	}
}
