package partrequests

import (
	"net/http"
	"strconv"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

type PartRequestHandler struct {
	service   *PartRequestService
	validator *PartRequestValidator
}

func NewPartRequestHandler(service *PartRequestService, validator *PartRequestValidator) *PartRequestHandler {
	return &PartRequestHandler{service: service, validator: validator}
}

// ─── Admin ───────────────────────────────────────────────────────────────────

func (h *PartRequestHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.DefaultQuery("status", "")
	search := c.DefaultQuery("search", "")

	var technicianID *uint
	if id, err := strconv.ParseUint(c.DefaultQuery("technician_id", "0"), 10, 32); err == nil && id > 0 {
		technicianID = new(uint)
		*technicianID = uint(id)
	}

	// Narrows to the parts requested for one repair -- what the repair view
	// uses to show which parts belong to it.
	var repairID *uint
	if id, err := strconv.ParseUint(c.DefaultQuery("repair_id", "0"), 10, 32); err == nil && id > 0 {
		repairID = new(uint)
		*repairID = uint(id)
	}

	result, err := h.service.List(page, limit, status, technicianID, search, repairID)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMeta(c, result.Requests, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

func (h *PartRequestHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid part request ID")
		return
	}

	request, err := h.service.GetByID(uint(id))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, request)
}

func (h *PartRequestHandler) StatusCounts(c *gin.Context) {
	counts, err := h.service.StatusCounts(nil)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, counts)
}

func (h *PartRequestHandler) UpdateStatus(c *gin.Context) {
	adminID := c.GetUint("admin_id")
	technicianID := c.GetUint("technician_id")

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid part request ID")
		return
	}

	req, err := h.validator.ValidateUpdateStatusRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	request, err := h.service.UpdateStatus(uint(id), req, adminID, technicianID)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Part request "+req.Status, request)
}

func (h *PartRequestHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid part request ID")
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Part request deleted successfully", nil)
}

// ─── Technician ──────────────────────────────────────────────────────────────

func (h *PartRequestHandler) CreateMine(c *gin.Context) {
	techID, exists := c.Get("technician_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	req, err := h.validator.ValidateCreateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	request, err := h.service.CreateByTechnician(techID.(uint), req)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Part request submitted successfully", request)
}

func (h *PartRequestHandler) MyList(c *gin.Context) {
	techID, exists := c.Get("technician_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.DefaultQuery("status", "")
	search := c.DefaultQuery("search", "")

	result, err := h.service.ListByTechnician(techID.(uint), page, limit, status, search)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMeta(c, result.Requests, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

func (h *PartRequestHandler) GetMine(c *gin.Context) {
	techID, exists := c.Get("technician_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid part request ID")
		return
	}

	request, err := h.service.GetByIDForTechnician(uint(id), techID.(uint))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, request)
}

func (h *PartRequestHandler) CancelMine(c *gin.Context) {
	techID, exists := c.Get("technician_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid part request ID")
		return
	}

	request, err := h.service.CancelByTechnician(uint(id), techID.(uint))
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Part request cancelled successfully", request)
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}
