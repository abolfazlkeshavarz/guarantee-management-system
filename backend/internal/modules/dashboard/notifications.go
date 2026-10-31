package dashboard

import (
	"strconv"
	"time"

	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

// expiryWarningMonths is how far ahead an approved guarantee counts as
// "expiring soon".
const expiryWarningMonths = 3

// Notification is one thing staff should look at. ID is stable per
// (type, entity) so a polling client can tell what it has already shown.
type Notification struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // guarantee_pending | technician_pending | part_request_pending | guarantee_expiring
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	EntityID  uint      `json:"entity_id"`
	CreatedAt time.Time `json:"created_at"`
}

// GetNotifications returns everything currently needing staff attention:
// pending guarantees, technician sign-ups, part requests, and approved
// guarantees expiring within three months. It is computed from live data, so
// there is nothing to keep in sync; the client decides what is new.
func (h *DashboardHandler) GetNotifications(c *gin.Context) {
	items := []Notification{}

	var guarantees []struct {
		ID        uint
		Code      string
		CreatedAt time.Time
	}
	h.db.Table("guarantees").Select("id, code, created_at").
		Where("status = ? AND deleted_at IS NULL", "Pending").
		Order("created_at DESC").Limit(100).Scan(&guarantees)
	for _, g := range guarantees {
		items = append(items, Notification{
			ID: "guarantee_pending:" + strconv.Itoa(int(g.ID)), Type: "guarantee_pending",
			Title: "Pending guarantee", Body: g.Code, EntityID: g.ID, CreatedAt: g.CreatedAt,
		})
	}

	var techs []struct {
		ID        uint
		FullName  string
		CreatedAt time.Time
	}
	h.db.Table("technicians").Select("id, full_name, created_at").
		Where("status = ? AND deleted_at IS NULL", "Pending").
		Order("created_at DESC").Limit(100).Scan(&techs)
	for _, t := range techs {
		items = append(items, Notification{
			ID: "technician_pending:" + strconv.Itoa(int(t.ID)), Type: "technician_pending",
			Title: "Technician awaiting approval", Body: t.FullName, EntityID: t.ID, CreatedAt: t.CreatedAt,
		})
	}

	var reqs []struct {
		ID            uint
		GuaranteeCode string
		CreatedAt     time.Time
	}
	h.db.Table("part_requests").Select("id, guarantee_code, created_at").
		Where("status = ? AND deleted_at IS NULL", "Pending").
		Order("created_at DESC").Limit(100).Scan(&reqs)
	for _, r := range reqs {
		body := "Request #" + strconv.Itoa(int(r.ID))
		if r.GuaranteeCode != "" {
			body += " (" + r.GuaranteeCode + ")"
		}
		items = append(items, Notification{
			ID: "part_request_pending:" + strconv.Itoa(int(r.ID)), Type: "part_request_pending",
			Title: "Part request pending", Body: body, EntityID: r.ID, CreatedAt: r.CreatedAt,
		})
	}

	var expiring []struct {
		ID         uint
		Code       string
		ExpiryDate time.Time
	}
	h.db.Table("guarantees").Select("id, code, expiry_date").
		Where("status IN ? AND deleted_at IS NULL AND expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + (? * INTERVAL '1 month')",
			[]string{"Approved", "Renewed"}, expiryWarningMonths).
		Order("expiry_date ASC").Limit(200).Scan(&expiring)
	for _, g := range expiring {
		items = append(items, Notification{
			ID: "guarantee_expiring:" + strconv.Itoa(int(g.ID)), Type: "guarantee_expiring",
			Title: "Guarantee expiring soon", Body: g.Code + " - " + g.ExpiryDate.Format("2006-01-02"),
			EntityID: g.ID, CreatedAt: g.ExpiryDate,
		})
	}

	responses.Success(c, gin.H{"count": len(items), "items": items})
}
