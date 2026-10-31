package dashboard

import (
	"log"
	"strconv"
	"time"

	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

const (
	// expiryWarningMonths is how far ahead an approved guarantee counts as
	// "expiring soon".
	expiryWarningMonths = 3
	// recentlyExpiredDays is how long a lapsed guarantee stays on the list,
	// as a prompt to offer a renewal.
	recentlyExpiredDays = 30
	// pollResponseDays is how long a customer's poll answer stays "new".
	pollResponseDays = 7
	// perSourceLimit caps each source so one backlog cannot flood the client.
	perSourceLimit = 100
)

// Notification is one thing staff should look at. ID is stable per
// (type, entity) so a polling client can tell what it has already shown.
type Notification struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	EntityID  uint      `json:"entity_id"`
	CreatedAt time.Time `json:"created_at"`
}

// source is one kind of notification: a query returning (id, body, at) rows.
// The query is parameter-free apart from the optional args.
type source struct {
	typ   string
	title string
	sql   string
	args  []any
}

var notificationSources = []source{
	{
		typ: "guarantee_pending", title: "Pending guarantee",
		sql: `SELECT id, code AS body, created_at AS at FROM guarantees
		      WHERE status = 'Pending' AND deleted_at IS NULL
		      ORDER BY created_at DESC LIMIT ?`,
	},
	{
		typ: "technician_pending", title: "Technician awaiting approval",
		sql: `SELECT id, full_name AS body, created_at AS at FROM technicians
		      WHERE status = 'Pending' AND deleted_at IS NULL
		      ORDER BY created_at DESC LIMIT ?`,
	},
	{
		typ: "part_request_pending", title: "Part request pending",
		sql: `SELECT id, 'Request #' || id || COALESCE(' (' || NULLIF(guarantee_code, '') || ')', '') AS body,
		             created_at AS at
		      FROM component_requests
		      WHERE status = 'Pending' AND deleted_at IS NULL
		      ORDER BY created_at DESC LIMIT ?`,
	},
	{
		typ: "repair_pending", title: "Repair awaiting review",
		sql: `SELECT r.id, COALESCE(g.code, 'Repair #' || r.id) AS body, r.created_at AS at
		      FROM repairs r LEFT JOIN guarantees g ON g.id = r.guarantee_id
		      WHERE r.status = 'Pending' AND r.deleted_at IS NULL
		      ORDER BY r.created_at DESC LIMIT ?`,
	},
	{
		typ: "shipment_sent", title: "Parcel on its way - receive it",
		sql: `SELECT s.id, COALESCE(t.full_name, 'Technician') || COALESCE(' - ' || NULLIF(s.tracking_code, ''), '') AS body,
		             s.created_at AS at
		      FROM part_shipments s LEFT JOIN technicians t ON t.id = s.technician_id
		      WHERE s.status = 'Sent' AND s.deleted_at IS NULL
		      ORDER BY s.created_at DESC LIMIT ?`,
	},
	{
		typ: "shipment_received", title: "Parcel received - needs invoice",
		sql: `SELECT s.id, COALESCE(t.full_name, 'Technician') AS body, COALESCE(s.received_at, s.created_at) AS at
		      FROM part_shipments s LEFT JOIN technicians t ON t.id = s.technician_id
		      WHERE s.status = 'Received' AND s.deleted_at IS NULL
		      ORDER BY s.created_at DESC LIMIT ?`,
	},
	{
		typ: "shipment_invoiced", title: "Invoice awaiting payment",
		sql: `SELECT s.id, COALESCE(t.full_name, 'Technician') || ' - ' || s.invoice_total AS body,
		             COALESCE(s.invoiced_at, s.created_at) AS at
		      FROM part_shipments s LEFT JOIN technicians t ON t.id = s.technician_id
		      WHERE s.status = 'Invoiced' AND s.deleted_at IS NULL
		      ORDER BY s.created_at DESC LIMIT ?`,
	},
	{
		typ: "poll_response", title: "New poll response",
		sql: `SELECT pr.id, p.title || ' - ' || COALESCE(NULLIF(pr.customer_name, ''), pr.guarantee_code, '') AS body,
		             pr.responded_at AS at
		      FROM poll_recipients pr JOIN polls p ON p.id = pr.poll_id
		      WHERE pr.responded_at IS NOT NULL AND p.deleted_at IS NULL
		        AND pr.responded_at >= NOW() - (? * INTERVAL '1 day')
		      ORDER BY pr.responded_at DESC LIMIT ?`,
		args: []any{pollResponseDays},
	},
	{
		typ: "guarantee_expiring", title: "Guarantee expiring soon",
		sql: `SELECT id, code || ' - ' || to_char(expiry_date, 'YYYY-MM-DD') AS body, expiry_date AS at
		      FROM guarantees
		      WHERE status IN ('Approved', 'Renewed') AND deleted_at IS NULL
		        AND expiry_date >= CURRENT_DATE
		        AND expiry_date <= CURRENT_DATE + (? * INTERVAL '1 month')
		      ORDER BY expiry_date ASC LIMIT ?`,
		args: []any{expiryWarningMonths},
	},
	{
		typ: "guarantee_expired", title: "Guarantee just expired",
		sql: `SELECT id, code || ' - ' || to_char(expiry_date, 'YYYY-MM-DD') AS body, expiry_date AS at
		      FROM guarantees
		      WHERE status IN ('Approved', 'Renewed') AND deleted_at IS NULL
		        AND expiry_date < CURRENT_DATE
		        AND expiry_date >= CURRENT_DATE - (? * INTERVAL '1 day')
		      ORDER BY expiry_date DESC LIMIT ?`,
		args: []any{recentlyExpiredDays},
	},
}

// GetNotifications returns everything currently needing staff attention. It
// is computed from live data, so there is nothing to keep in sync; the client
// decides what is new. A source that fails is logged and skipped, so one bad
// query cannot silence the others.
func (h *DashboardHandler) GetNotifications(c *gin.Context) {
	items := []Notification{}

	for _, s := range notificationSources {
		var rows []struct {
			ID   uint
			Body string
			At   time.Time
		}
		args := append(append([]any{}, s.args...), perSourceLimit)
		if err := h.db.Raw(s.sql, args...).Scan(&rows).Error; err != nil {
			log.Printf("notifications: %s: %v", s.typ, err)
			continue
		}
		for _, r := range rows {
			items = append(items, Notification{
				ID:   s.typ + ":" + strconv.Itoa(int(r.ID)),
				Type: s.typ, Title: s.title, Body: r.Body, EntityID: r.ID, CreatedAt: r.At,
			})
		}
	}

	responses.Success(c, gin.H{"count": len(items), "items": items})
}
