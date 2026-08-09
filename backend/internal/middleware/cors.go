package middleware

import (
	"net/http"
	"strings"

	"guarantee-management-system/internal/config"

	"github.com/gin-gonic/gin"
)

// CORS builds a middleware that only reflects origins present in
// CORS_ALLOWED_ORIGINS. The previous implementation sent
// "Access-Control-Allow-Origin: *" together with
// "Access-Control-Allow-Credentials: true", which browsers reject outright and
// which would have allowed any site to call the API once cookies/tokens were
// in play. A literal "*" in the config still opens the API to everyone, but
// now that is an explicit choice rather than the default.
func CORS(cfg *config.Config) gin.HandlerFunc {
	allowed := make(map[string]bool, len(cfg.CORSAllowedOrigins))
	allowAny := false

	for _, origin := range cfg.CORSAllowedOrigins {
		origin = strings.TrimSpace(strings.TrimSuffix(origin, "/"))
		if origin == "" {
			continue
		}
		if origin == "*" {
			allowAny = true
			continue
		}
		allowed[origin] = true
	}

	return func(c *gin.Context) {
		origin := strings.TrimSuffix(c.GetHeader("Origin"), "/")

		if origin != "" && (allowAny || allowed[origin]) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Vary", "Origin")
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		c.Header("Access-Control-Max-Age", "600")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
