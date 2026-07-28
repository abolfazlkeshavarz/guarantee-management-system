package repairs

import (
    "net/http"
    "strconv"
    "guarantee-management-system/internal/shared/errors"
    "guarantee-management-system/internal/shared/responses"
    "github.com/gin-gonic/gin"
)

type RepairHandler struct {
    service   *RepairService
    validator *RepairValidator
}

func NewRepairHandler(service *RepairService, validator *RepairValidator) *RepairHandler {
    return &RepairHandler{
        service:   service,
        validator: validator,
    }
}

func (h *RepairHandler) Create(c *gin.Context) {
    req, err := h.validator.ValidateCreateRequest(c)
    if err != nil {
        handleError(c, err)
        return
    }

    repair, err := h.service.Create(req)
    if err != nil {
        handleError(c, err)
        return
    }

    responses.SuccessWithMessage(c, "Repair created successfully", repair)
}

func (h *RepairHandler) Get(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        responses.Error(c, http.StatusBadRequest, "Invalid repair ID")
        return
    }

    repair, err := h.service.GetByID(uint(id))
    if err != nil {
        handleError(c, err)
        return
    }

    responses.Success(c, repair)
}

func (h *RepairHandler) List(c *gin.Context) {
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
    status := c.DefaultQuery("status", "")

    result, err := h.service.List(page, limit, status)
    if err != nil {
        handleError(c, err)
        return
    }

    responses.SuccessWithMeta(c, result.Repairs, responses.PaginationMeta{
        CurrentPage: result.Page,
        PerPage:     result.Limit,
        Total:       result.Total,
        LastPage:    result.LastPage,
    })
}

func (h *RepairHandler) Update(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        responses.Error(c, http.StatusBadRequest, "Invalid repair ID")
        return
    }

    req, err := h.validator.ValidateUpdateRequest(c)
    if err != nil {
        handleError(c, err)
        return
    }

    repair, err := h.service.Update(uint(id), req)
    if err != nil {
        handleError(c, err)
        return
    }

    responses.SuccessWithMessage(c, "Repair updated successfully", repair)
}

func (h *RepairHandler) Delete(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        responses.Error(c, http.StatusBadRequest, "Invalid repair ID")
        return
    }

    if err := h.service.Delete(uint(id)); err != nil {
        handleError(c, err)
        return
    }

    responses.SuccessWithMessage(c, "Repair deleted successfully", nil)
}

func handleError(c *gin.Context, err error) {
    if appErr, ok := err.(*errors.AppError); ok {
        responses.Error(c, appErr.Code, appErr.Message)
        return
    }
    responses.InternalError(c, err)
}