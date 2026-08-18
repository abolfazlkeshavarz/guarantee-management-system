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
		
		if claims.Role == "admin" {
			c.Set("admin_id", claims.AdminID)
		} else if claims.Role == "technician" {
			c.Set("technician_id", claims.TechnicianID)
			c.Set("is_technical", claims.IsTechnical)
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

func AdminOnly() gin.HandlerFunc {
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

// ReviewerOnly admits admins and "technical" technicians -- the two who may
// review part requests and repair reports. A plain technician can still file
// their own work, but not sit in judgement of anyone else's.
func ReviewerOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role == "admin" {
			c.Next()
			return
		}
		if role == "technician" {
			if isTechnical, ok := c.Get("is_technical"); ok && isTechnical == true {
				c.Next()
				return
			}
		}
		responses.Forbidden(c, "Reviewer access only")
		c.Abort()
	}
}