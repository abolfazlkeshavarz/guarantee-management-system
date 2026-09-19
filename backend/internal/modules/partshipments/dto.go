package partshipments

// ─── Responses ───────────────────────────────────────────────────────────────

type PartShipmentItemDTO struct {
	ID                    uint `json:"id"`
	RepairComponentItemID uint `json:"repair_component_item_id"`

	// Where the part came from.
	RepairID      uint   `json:"repair_id"`
	GuaranteeCode string `json:"guarantee_code"`
	CustomerName  string `json:"customer_name"`
	ProductName   string `json:"product_name"`
	ComponentID   uint   `json:"component_id"`
	ComponentName string `json:"component_name"`
	// The technician's own note on the repair line.
	RepairReport string `json:"repair_report"`

	ConditionNote string `json:"condition_note"`
	// nil = receipt not recorded yet.
	Received  *bool `json:"received"`
	UnitPrice int64 `json:"unit_price"`
}

type PartShipmentDTO struct {
	ID             uint   `json:"id"`
	TechnicianID   uint   `json:"technician_id"`
	TechnicianName string `json:"technician_name"`
	Status         string `json:"status"`

	ShippingMethod string `json:"shipping_method"`
	TrackingCode   string `json:"tracking_code"`
	SentOn         string `json:"sent_on"`
	Notes          string `json:"notes"`

	Items         []PartShipmentItemDTO `json:"items"`
	ItemCount     int                   `json:"item_count"`
	ReceivedCount int                   `json:"received_count"`

	ReceivedAt     *string `json:"received_at,omitempty"`
	ReceivedByName string  `json:"received_by_name,omitempty"`
	ReceiveNotes   string  `json:"receive_notes,omitempty"`

	InvoicedAt     *string `json:"invoiced_at,omitempty"`
	InvoicedByName string  `json:"invoiced_by_name,omitempty"`
	InvoiceTotal   int64   `json:"invoice_total"`

	PaidAt           *string `json:"paid_at,omitempty"`
	PaidByName       string  `json:"paid_by_name,omitempty"`
	PaymentReference string  `json:"payment_reference,omitempty"`
	PaymentNotes     string  `json:"payment_notes,omitempty"`

	ReviewNotes string `json:"review_notes,omitempty"`

	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type ListPartShipmentsResponse struct {
	Shipments []PartShipmentDTO `json:"shipments"`
	Total     int64             `json:"total"`
	Page      int               `json:"page"`
	Limit     int               `json:"limit"`
	LastPage  int               `json:"last_page"`
}

// ShippableItemDTO is a replaced part the technician has not sent yet.
type ShippableItemDTO struct {
	RepairComponentItemID uint   `json:"repair_component_item_id"`
	RepairID              uint   `json:"repair_id"`
	GuaranteeCode         string `json:"guarantee_code"`
	CustomerName          string `json:"customer_name"`
	ProductName           string `json:"product_name"`
	ComponentID           uint   `json:"component_id"`
	ComponentName         string `json:"component_name"`
	RepairReport          string `json:"repair_report"`
	RepairCreatedAt       string `json:"repair_created_at"`
}

// Summary powers the status tabs and the money cards.
type Summary struct {
	Counts map[string]int64 `json:"counts"`
	// Invoiced but not yet paid: what the company still owes.
	PayableTotal int64 `json:"payable_total"`
	// Already paid out.
	PaidTotal int64 `json:"paid_total"`
	// Technician view only: replaced parts still waiting to be sent.
	AwaitingCount int64 `json:"awaiting_count"`
}

// ─── Requests ────────────────────────────────────────────────────────────────

type CreateShipmentItemInput struct {
	RepairComponentItemID uint   `json:"repair_component_item_id" binding:"required"`
	ConditionNote         string `json:"condition_note" binding:"max=500"`
}

// CreateShipmentRequest is the form a technician fills in to send parts.
type CreateShipmentRequest struct {
	ShippingMethod string                    `json:"shipping_method" binding:"required,oneof=post courier in_person other"`
	TrackingCode   string                    `json:"tracking_code" binding:"max=100"`
	SentOn         string                    `json:"sent_on" binding:"required"`
	Notes          string                    `json:"notes"`
	Items          []CreateShipmentItemInput `json:"items" binding:"required,min=1,max=100,dive"`
}

type ReceiveItemInput struct {
	ID       uint `json:"id" binding:"required"`
	Received bool `json:"received"`
}

// ReceiveRequest records what physically arrived. Every line of the shipment
// has to be listed so nothing is silently left undecided.
type ReceiveRequest struct {
	Items []ReceiveItemInput `json:"items" binding:"required,min=1,dive"`
	Notes string             `json:"notes"`
}

type InvoiceItemInput struct {
	ID        uint  `json:"id" binding:"required"`
	UnitPrice int64 `json:"unit_price" binding:"min=0,max=1000000000000"`
}

// InvoiceRequest prices the lines that arrived.
type InvoiceRequest struct {
	Items []InvoiceItemInput `json:"items" binding:"required,min=1,dive"`
}

type PayRequest struct {
	Reference string `json:"reference" binding:"max=100"`
	Notes     string `json:"notes"`
}

type RejectRequest struct {
	Notes string `json:"notes" binding:"required,max=2000"`
}
