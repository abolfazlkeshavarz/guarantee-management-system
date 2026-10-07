// Package trash is the recycle bin: every record the admin panel can delete is
// only soft-deleted, so it can be looked at here and put back.
//
// It works across modules with plain SQL on purpose. Each kind is described by
// a table, two display expressions and a pre-flight check, so adding a module
// to the bin is one registry entry rather than a new dependency on that
// module's package.
package trash

import (
	"fmt"
	"strings"

	"guarantee-management-system/internal/shared/errors"

	"gorm.io/gorm"
)

// kind describes one type of deletable record.
type kind struct {
	Key   string
	Table string
	// From is the FROM clause; the trashed table is always aliased "t".
	From string
	// Label and Detail are SQL expressions: what the row is, and a line of
	// context so two entries with the same name can be told apart.
	Label  string
	Detail string
	// Check runs before a restore and refuses it when putting the record back
	// would leave it pointing at something that is itself deleted, or clash
	// with a record that took its place.
	Check func(tx *gorm.DB, id uint) error
}

// conflict is a restore the data cannot honour.
func conflict(msg string) error {
	return errors.NewAppError(errors.ErrDuplicateEntry, msg, 409)
}

func internal(msg string) error {
	return errors.NewAppError(errors.ErrInternalServer, msg, 500)
}

// exists reports whether the query returns at least one row.
func exists(tx *gorm.DB, query string, args ...interface{}) (bool, error) {
	var n int64
	if err := tx.Raw("SELECT COUNT(*) FROM ("+query+") q", args...).Scan(&n).Error; err != nil {
		return false, internal("Failed to check the record")
	}
	return n > 0, nil
}

// needLive refuses a restore whose parent record is itself still deleted.
func needLive(tx *gorm.DB, table, fkColumn, owner string, id uint, msg string) error {
	ok, err := exists(tx, fmt.Sprintf(
		`SELECT 1 FROM %s p JOIN %s o ON o.%s = p.id WHERE o.id = ? AND p.deleted_at IS NULL`,
		table, owner, fkColumn), id)
	if err != nil {
		return err
	}
	if !ok {
		return conflict(msg)
	}
	return nil
}

// nameFree refuses a restore whose name has since been taken by a live row.
func nameFree(tx *gorm.DB, table, column string, id uint, msg string) error {
	taken, err := exists(tx, fmt.Sprintf(
		`SELECT 1 FROM %[1]s d JOIN %[1]s l ON LOWER(l.%[2]s) = LOWER(d.%[2]s)
		  WHERE d.id = ? AND l.id <> d.id AND l.deleted_at IS NULL`, table, column), id)
	if err != nil {
		return err
	}
	if taken {
		return conflict(msg)
	}
	return nil
}

// The order here is the order the tabs appear in.
var kinds = []kind{
	{
		Key:   "guarantees",
		Table: "guarantees",
		From: `guarantees t
		       LEFT JOIN customers c ON c.id = t.customer_id
		       LEFT JOIN products p ON p.id = t.product_id`,
		Label:  `t.code`,
		Detail: `CONCAT_WS(' · ', c.full_name, p.name, t.status)`,
		Check: func(tx *gorm.DB, id uint) error {
			if err := needLive(tx, "customers", "customer_id", "guarantees", id,
				"The customer of this guarantee is deleted. Restore the customer first."); err != nil {
				return err
			}
			if err := needLive(tx, "products", "product_id", "guarantees", id,
				"The product of this guarantee is deleted. Restore the product first."); err != nil {
				return err
			}
			taken, err := exists(tx, `SELECT 1 FROM guarantees d JOIN guarantees l ON l.code = d.code
			                           WHERE d.id = ? AND l.id <> d.id AND l.deleted_at IS NULL`, id)
			if err != nil {
				return err
			}
			if taken {
				return conflict("Another guarantee now uses this code, so this one cannot be restored.")
			}
			return nil
		},
	},
	{
		Key:    "customers",
		Table:  "customers",
		From:   `customers t`,
		Label:  `t.full_name`,
		Detail: `CONCAT_WS(' · ', t.phone, t.national_id, t.city)`,
		Check: func(tx *gorm.DB, id uint) error {
			// A blank national id is not an identity: many customers have none.
			blank, err := exists(tx, `SELECT 1 FROM customers WHERE id = ? AND COALESCE(national_id, '') = ''`, id)
			if err != nil {
				return err
			}
			if blank {
				return nil
			}
			return nameFree(tx, "customers", "national_id", id,
				"Another customer now has this national ID, so this one cannot be restored.")
		},
	},
	{
		Key:    "products",
		Table:  "products",
		From:   `products t LEFT JOIN product_categories pc ON pc.id = t.category_id`,
		Label:  `t.name`,
		Detail: `CONCAT_WS(' · ', pc.name, t.code_prefix)`,
		Check: func(tx *gorm.DB, id uint) error {
			return needLive(tx, "product_categories", "category_id", "products", id,
				"The category of this product is deleted. Restore the category first.")
		},
	},
	{
		Key:    "categories",
		Table:  "product_categories",
		From:   `product_categories t`,
		Label:  `t.name`,
		Detail: `t.description`,
		Check: func(tx *gorm.DB, id uint) error {
			return nameFree(tx, "product_categories", "name", id,
				"A category with this name already exists.")
		},
	},
	{
		Key:    "technicians",
		Table:  "technicians",
		From:   `technicians t`,
		Label:  `t.full_name`,
		Detail: `CONCAT_WS(' · ', t.username, t.phone, t.status)`,
		Check: func(tx *gorm.DB, id uint) error {
			return nameFree(tx, "technicians", "username", id,
				"Another technician now uses this username, so this one cannot be restored.")
		},
	},
	{
		Key:   "repairs",
		Table: "repairs",
		From: `repairs t
		       LEFT JOIN guarantees g ON g.id = t.guarantee_id
		       LEFT JOIN customers c ON c.id = g.customer_id
		       LEFT JOIN technicians te ON te.id = t.technician_id`,
		Label:  `CONCAT('#', t.id, COALESCE(' · ' || NULLIF(g.code, ''), ''))`,
		Detail: `CONCAT_WS(' · ', c.full_name, te.full_name, t.status)`,
		Check: func(tx *gorm.DB, id uint) error {
			if err := needLive(tx, "guarantees", "guarantee_id", "repairs", id,
				"The guarantee of this repair is deleted. Restore the guarantee first."); err != nil {
				return err
			}
			// Older deletions removed the parts and services along with the
			// repair. Putting back an empty report would be a repair that
			// records no work, so say so rather than do it.
			has, err := exists(tx, `SELECT 1 FROM repair_component_items WHERE repair_id = ?
			                        UNION ALL SELECT 1 FROM repair_service_items WHERE repair_id = ?`, id, id)
			if err != nil {
				return err
			}
			if !has {
				return conflict("This repair's parts and services were removed when it was deleted, so it cannot be restored.")
			}
			return nil
		},
	},
	{
		Key:    "part_requests",
		Table:  "component_requests",
		From:   `component_requests t LEFT JOIN technicians te ON te.id = t.technician_id`,
		Label:  `CONCAT('#', t.id, COALESCE(' · ' || NULLIF(t.guarantee_code, ''), ''))`,
		Detail: `CONCAT_WS(' · ', te.full_name, t.status)`,
		Check: func(tx *gorm.DB, id uint) error {
			return needLive(tx, "technicians", "technician_id", "component_requests", id,
				"The technician of this request is deleted. Restore the technician first.")
		},
	},
	{
		Key:    "part_shipments",
		Table:  "part_shipments",
		From:   `part_shipments t LEFT JOIN technicians te ON te.id = t.technician_id`,
		Label:  `CONCAT('#', t.id, COALESCE(' · ' || NULLIF(t.tracking_code, ''), ''))`,
		Detail: `CONCAT_WS(' · ', te.full_name, t.status, CASE WHEN t.invoice_total > 0 THEN t.invoice_total::text END)`,
		Check: func(tx *gorm.DB, id uint) error {
			return needLive(tx, "technicians", "technician_id", "part_shipments", id,
				"The technician of this shipment is deleted. Restore the technician first.")
		},
	},
	{
		Key:    "repair_components",
		Table:  "repair_components",
		From:   `repair_components t`,
		Label:  `t.name`,
		Detail: `t.description`,
		Check: func(tx *gorm.DB, id uint) error {
			return nameFree(tx, "repair_components", "name", id,
				"A part with this name already exists in the catalog.")
		},
	},
	{
		Key:    "repair_services",
		Table:  "repair_services",
		From:   `repair_services t`,
		Label:  `t.name`,
		Detail: `t.description`,
		Check: func(tx *gorm.DB, id uint) error {
			return nameFree(tx, "repair_services", "name", id,
				"A service with this name already exists in the catalog.")
		},
	},
	{
		Key:    "polls",
		Table:  "polls",
		From:   `polls t`,
		Label:  `t.title`,
		Detail: `t.status`,
	},
	{
		Key:    "admins",
		Table:  "admins",
		From:   `admins t`,
		Label:  `t.username`,
		Detail: `CONCAT_WS(' · ', t.full_name, t.role)`,
		Check: func(tx *gorm.DB, id uint) error {
			return nameFree(tx, "admins", "username", id,
				"Another staff account now uses this username, so this one cannot be restored.")
		},
	},
}

func find(key string) (*kind, bool) {
	for i := range kinds {
		if kinds[i].Key == key {
			return &kinds[i], true
		}
	}
	return nil, false
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

type SummaryItem struct {
	Key   string `json:"key"`
	Count int64  `json:"count"`
}

type ItemDTO struct {
	ID        uint   `json:"id"`
	Label     string `json:"label"`
	Detail    string `json:"detail"`
	DeletedAt string `json:"deleted_at"`
}

type ListResult struct {
	Items    []ItemDTO
	Total    int64
	Page     int
	Limit    int
	LastPage int
}

// ─── Service ─────────────────────────────────────────────────────────────────

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

var ErrUnknownKind = errors.NewAppError(errors.ErrNotFound, "Unknown type of deleted item", 404)
var ErrNotInTrash = errors.NewAppError(errors.ErrNotFound, "This item is not in the deleted items", 404)

// Summary counts what is in the bin, per kind, in tab order.
func (s *Service) Summary() ([]SummaryItem, error) {
	out := make([]SummaryItem, 0, len(kinds))
	for _, k := range kinds {
		var n int64
		q := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE deleted_at IS NOT NULL", k.Table)
		if err := s.db.Raw(q).Scan(&n).Error; err != nil {
			return nil, internal("Failed to count deleted items")
		}
		out = append(out, SummaryItem{Key: k.Key, Count: n})
	}
	return out, nil
}

// List pages through one kind, newest deletion first.
func (s *Service) List(key string, page, limit int, search string) (*ListResult, error) {
	k, ok := find(key)
	if !ok {
		return nil, ErrUnknownKind
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	where := "t.deleted_at IS NOT NULL"
	var args []interface{}
	if search = strings.TrimSpace(search); search != "" {
		where += fmt.Sprintf(" AND CONCAT_WS(' ', %s, %s) ILIKE ?", k.Label, k.Detail)
		args = append(args, "%"+search+"%")
	}

	var total int64
	if err := s.db.Raw(fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s", k.From, where), args...).
		Scan(&total).Error; err != nil {
		return nil, internal("Failed to count deleted items")
	}

	type row struct {
		ID        uint
		Label     string
		Detail    string
		DeletedAt string
	}
	var rows []row
	listArgs := append(append([]interface{}{}, args...), limit, (page-1)*limit)
	q := fmt.Sprintf(`SELECT t.id AS id,
	                         COALESCE(%s, '')            AS label,
	                         COALESCE(%s, '')            AS detail,
	                         to_char(t.deleted_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS deleted_at
	                    FROM %s
	                   WHERE %s
	                   ORDER BY t.deleted_at DESC, t.id DESC
	                   LIMIT ? OFFSET ?`, k.Label, k.Detail, k.From, where)
	if err := s.db.Raw(q, listArgs...).Scan(&rows).Error; err != nil {
		return nil, internal("Failed to load deleted items")
	}

	items := make([]ItemDTO, len(rows))
	for i, r := range rows {
		items[i] = ItemDTO{ID: r.ID, Label: r.Label, Detail: r.Detail, DeletedAt: r.DeletedAt}
	}
	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}
	return &ListResult{Items: items, Total: total, Page: page, Limit: limit, LastPage: lastPage}, nil
}

// Restore puts one record back, after checking it can stand on its own again.
func (s *Service) Restore(key string, id uint) error {
	k, ok := find(key)
	if !ok {
		return ErrUnknownKind
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		inBin, err := exists(tx, fmt.Sprintf("SELECT 1 FROM %s WHERE id = ? AND deleted_at IS NOT NULL", k.Table), id)
		if err != nil {
			return err
		}
		if !inBin {
			return ErrNotInTrash
		}
		if k.Check != nil {
			if err := k.Check(tx, id); err != nil {
				return err
			}
		}
		res := tx.Exec(fmt.Sprintf("UPDATE %s SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL", k.Table), id)
		if res.Error != nil {
			// A unique index the pre-flight checks do not know about.
			if strings.Contains(res.Error.Error(), "23505") {
				return conflict("Something else now uses a value this record needs to be unique, so it cannot be restored.")
			}
			return internal("Failed to restore the record")
		}
		if res.RowsAffected == 0 {
			return ErrNotInTrash
		}
		return nil
	})
}
