package partshipments

import (
	"net/http"
	"strconv"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

type PartShipmentHandler struct {
	service   *PartShipmentService
	validator *PartShipmentValidator
}

func NewPartShipmentHandler(service *PartShipmentService, validator *PartShipmentValidator) *PartShipmentHandler {
	return &PartShipmentHandler{service: service, validator: validator}
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}

func paramID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid shipment ID")
		return 0, false
	}
	return uint(id), true
}

func techID(c *gin.Context) (uint, bool) {
	v, ok := c.Get("technician_id")
	if !ok {
		responses.Unauthorized(c, "Unauthorized")
		return 0, false
	}
	return v.(uint), true
}

func listResponse(c *gin.Context, result *ListPartShipmentsResponse) {
	responses.SuccessWithMeta(c, result.Shipments, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

// ─── Staff ───────────────────────────────────────────────────────────────────

func (h *PartShipmentHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	var technicianID *uint
	if id, err := strconv.ParseUint(c.DefaultQuery("technician_id", "0"), 10, 32); err == nil && id > 0 {
		v := uint(id)
		technicianID = &v
	}

	result, err := h.service.List(page, limit, c.DefaultQuery("status", ""), technicianID, c.DefaultQuery("search", ""))
	if err != nil {
		handleError(c, err)
		return
	}
	listResponse(c, result)
}

func (h *PartShipmentHandler) Summary(c *gin.Context) {
	summary, err := h.service.Summary(nil)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, summary)
}

// Finance is the money side: what is waiting to be priced, what is owed, and
// the per-technician breakdown.
func (h *PartShipmentHandler) Finance(c *gin.Context) {
	summary, err := h.service.Finance()
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, summary)
}

func (h *PartShipmentHandler) Get(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	shipment, err := h.service.GetByID(id)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, shipment)
}

func (h *PartShipmentHandler) Receive(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	req, err := h.validator.ValidateReceive(c)
	if err != nil {
		handleError(c, err)
		return
	}
	shipment, err := h.service.Receive(id, req, c.GetUint("admin_id"))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Shipment received", shipment)
}

func (h *PartShipmentHandler) Invoice(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	req, err := h.validator.ValidateInvoice(c)
	if err != nil {
		handleError(c, err)
		return
	}
	shipment, err := h.service.Invoice(id, req, c.GetUint("admin_id"))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Shipment invoiced", shipment)
}

func (h *PartShipmentHandler) Pay(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	req, err := h.validator.ValidatePay(c)
	if err != nil {
		handleError(c, err)
		return
	}
	shipment, err := h.service.Pay(id, req, c.GetUint("admin_id"))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Shipment paid", shipment)
}

func (h *PartShipmentHandler) Reject(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	req, err := h.validator.ValidateReject(c)
	if err != nil {
		handleError(c, err)
		return
	}
	shipment, err := h.service.Reject(id, req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Shipment rejected", shipment)
}

func (h *PartShipmentHandler) Delete(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(id); err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Shipment deleted successfully", nil)
}

// ─── Technician ──────────────────────────────────────────────────────────────

func (h *PartShipmentHandler) MyList(c *gin.Context) {
	tid, ok := techID(c)
	if !ok {
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	result, err := h.service.ListByTechnician(tid, page, limit, c.DefaultQuery("status", ""), c.DefaultQuery("search", ""))
	if err != nil {
		handleError(c, err)
		return
	}
	listResponse(c, result)
}

func (h *PartShipmentHandler) MySummary(c *gin.Context) {
	tid, ok := techID(c)
	if !ok {
		return
	}
	summary, err := h.service.Summary(&tid)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, summary)
}

func (h *PartShipmentHandler) MyShippable(c *gin.Context) {
	tid, ok := techID(c)
	if !ok {
		return
	}
	items, err := h.service.Shippable(tid)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, items)
}

func (h *PartShipmentHandler) GetMine(c *gin.Context) {
	tid, ok := techID(c)
	if !ok {
		return
	}
	id, ok := paramID(c)
	if !ok {
		return
	}
	shipment, err := h.service.GetByIDForTechnician(id, tid)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, shipment)
}

func (h *PartShipmentHandler) CreateMine(c *gin.Context) {
	tid, ok := techID(c)
	if !ok {
		return
	}
	req, err := h.validator.ValidateCreate(c)
	if err != nil {
		handleError(c, err)
		return
	}
	shipment, err := h.service.CreateByTechnician(tid, req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Shipment submitted successfully", shipment)
}

func (h *PartShipmentHandler) CancelMine(c *gin.Context) {
	tid, ok := techID(c)
	if !ok {
		return
	}
	id, ok := paramID(c)
	if !ok {
		return
	}
	shipment, err := h.service.CancelByTechnician(id, tid)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Shipment cancelled successfully", shipment)
}
