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

		// Set user context
		c.Set("admin_id", claims.AdminID)
		c.Set("username", claims.Username)

		c.Next()
	}
}
