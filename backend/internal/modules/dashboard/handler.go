package dashboard

import (
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

func (h *DashboardHandler) GetStats(c *gin.Context) {
	stats := gin.H{
		"total_guarantees":    1234,
		"pending_guarantees":  45,
		"approved_guarantees": 567,
		"rejected_guarantees": 12,
		"total_customers":     856,
		"total_technicians":   23,
		"total_products":      342,
		"total_repairs":       89,
		"pending_repairs":     12,
		"completed_repairs":   77,
	}
	responses.Success(c, stats)
}