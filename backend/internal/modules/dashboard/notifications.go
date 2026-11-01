package dashboard

import (
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"guarantee-management-system/internal/shared/jalali"
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

// source is one kind of notification: a query returning (id, detail, at)
// rows, plus how to word it. detail is the raw fact (a code, a name); the
// sentence around it is built in Go so it can be Persian or English.
type source struct {
	typ     string
	titleFA string
	titleEN string
	// body builds the second line from the row. Nil means detail as is.
	body func(fa bool, id uint, detail string, at time.Time) string
	sql  string
	args []any
}

func plain(_ bool, _ uint, detail string, _ time.Time) string { return detail }

// withDate appends the date, in the Jalali calendar for Persian readers.
func withDate(fa bool, _ uint, detail string, at time.Time) string {
	return detail + " - " + formatDate(fa, at)
}

func formatDate(fa bool, t time.Time) string {
	if !fa {
		return t.Format("2006-01-02")
	}
	jy, jm, jd := jalali.FromTime(t)
	return persianDigits(fmt.Sprintf("%04d/%02d/%02d", jy, jm, jd))
}

func persianDigits(s string) string {
	return strings.NewReplacer("0", "۰", "1", "۱", "2", "۲", "3", "۳", "4", "۴",
		"5", "۵", "6", "۶", "7", "۷", "8", "۸", "9", "۹").Replace(s)
}

var notificationSources = []source{
	{
		typ: "guarantee_pending", titleFA: "گارانتی جدید در انتظار تأیید", titleEN: "Pending guarantee",
		body: plain,
		sql: `SELECT id, code AS detail, created_at AS at FROM guarantees
		      WHERE status = 'Pending' AND deleted_at IS NULL
		      ORDER BY created_at DESC LIMIT ?`,
	},
	{
		typ: "technician_pending", titleFA: "تکنسین جدید در انتظار تأیید", titleEN: "Technician awaiting approval",
		body: plain,
		sql: `SELECT id, full_name AS detail, created_at AS at FROM technicians
		      WHERE status = 'Pending' AND deleted_at IS NULL
		      ORDER BY created_at DESC LIMIT ?`,
	},
	{
		typ: "part_request_pending", titleFA: "درخواست قطعه جدید", titleEN: "Part request pending",
		body: func(fa bool, id uint, code string, _ time.Time) string {
			label := "Request #" + strconv.Itoa(int(id))
			if fa {
				label = persianDigits("درخواست شماره " + strconv.Itoa(int(id)))
			}
			if code != "" {
				label += " (" + code + ")"
			}
			return label
		},
		sql: `SELECT id, COALESCE(guarantee_code, '') AS detail, created_at AS at
		      FROM component_requests
		      WHERE status = 'Pending' AND deleted_at IS NULL
		      ORDER BY created_at DESC LIMIT ?`,
	},
	{
		typ: "repair_pending", titleFA: "گزارش تعمیر در انتظار بررسی", titleEN: "Repair awaiting review",
		body: plain,
		sql: `SELECT r.id, COALESCE(g.code, '#' || r.id) AS detail, r.created_at AS at
		      FROM repairs r LEFT JOIN guarantees g ON g.id = r.guarantee_id
		      WHERE r.status = 'Pending' AND r.deleted_at IS NULL
		      ORDER BY r.created_at DESC LIMIT ?`,
	},
	{
		typ: "shipment_sent", titleFA: "مرسوله قطعات در راه است - پس از رسیدن دریافت کنید", titleEN: "Parcel on its way - receive it",
		body: plain,
		sql: `SELECT s.id, COALESCE(t.full_name, '') || COALESCE(' - ' || NULLIF(s.tracking_code, ''), '') AS detail,
		             s.created_at AS at
		      FROM part_shipments s LEFT JOIN technicians t ON t.id = s.technician_id
		      WHERE s.status = 'Sent' AND s.deleted_at IS NULL
		      ORDER BY s.created_at DESC LIMIT ?`,
	},
	{
		typ: "shipment_received", titleFA: "مرسوله دریافت شد - فاکتور صادر کنید", titleEN: "Parcel received - needs invoice",
		body: plain,
		sql: `SELECT s.id, COALESCE(t.full_name, '') AS detail, COALESCE(s.received_at, s.created_at) AS at
		      FROM part_shipments s LEFT JOIN technicians t ON t.id = s.technician_id
		      WHERE s.status = 'Received' AND s.deleted_at IS NULL
		      ORDER BY s.created_at DESC LIMIT ?`,
	},
	{
		typ: "shipment_invoiced", titleFA: "فاکتور در انتظار پرداخت", titleEN: "Invoice awaiting payment",
		body: plain,
		sql: `SELECT s.id, COALESCE(t.full_name, '') || ' - ' || s.invoice_total AS detail,
		             COALESCE(s.invoiced_at, s.created_at) AS at
		      FROM part_shipments s LEFT JOIN technicians t ON t.id = s.technician_id
		      WHERE s.status = 'Invoiced' AND s.deleted_at IS NULL
		      ORDER BY s.created_at DESC LIMIT ?`,
	},
	{
		typ: "poll_response", titleFA: "پاسخ جدید به نظرسنجی", titleEN: "New poll response",
		body: plain,
		sql: `SELECT pr.id, p.title || ' - ' || COALESCE(NULLIF(pr.customer_name, ''), pr.guarantee_code, '') AS detail,
		             pr.responded_at AS at
		      FROM poll_recipients pr JOIN polls p ON p.id = pr.poll_id
		      WHERE pr.responded_at IS NOT NULL AND p.deleted_at IS NULL
		        AND pr.responded_at >= NOW() - (? * INTERVAL '1 day')
		      ORDER BY pr.responded_at DESC LIMIT ?`,
		args: []any{pollResponseDays},
	},
	{
		typ: "guarantee_expiring", titleFA: "گارانتی در آستانه انقضا", titleEN: "Guarantee expiring soon",
		body: withDate,
		sql: `SELECT id, code AS detail, expiry_date AS at
		      FROM guarantees
		      WHERE status IN ('Approved', 'Renewed') AND deleted_at IS NULL
		        AND expiry_date >= CURRENT_DATE
		        AND expiry_date <= CURRENT_DATE + (? * INTERVAL '1 month')
		      ORDER BY expiry_date ASC LIMIT ?`,
		args: []any{expiryWarningMonths},
	},
	{
		typ: "guarantee_expired", titleFA: "گارانتی تازه منقضی شد", titleEN: "Guarantee just expired",
		body: withDate,
		sql: `SELECT id, code AS detail, expiry_date AS at
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
//
// Wording is Persian unless ?lang=en is passed.
func (h *DashboardHandler) GetNotifications(c *gin.Context) {
	fa := c.Query("lang") != "en"
	items := []Notification{}

	for _, s := range notificationSources {
		var rows []struct {
			ID     uint
			Detail string
			At     time.Time
		}
		args := append(append([]any{}, s.args...), perSourceLimit)
		if err := h.db.Raw(s.sql, args...).Scan(&rows).Error; err != nil {
			log.Printf("notifications: %s: %v", s.typ, err)
			continue
		}
		title := s.titleEN
		if fa {
			title = s.titleFA
		}
		for _, r := range rows {
			items = append(items, Notification{
				ID:   s.typ + ":" + strconv.Itoa(int(r.ID)),
				Type: s.typ, Title: title, Body: s.body(fa, r.ID, r.Detail, r.At),
				EntityID: r.ID, CreatedAt: r.At,
			})
		}
	}

	responses.Success(c, gin.H{"count": len(items), "items": items})
}
