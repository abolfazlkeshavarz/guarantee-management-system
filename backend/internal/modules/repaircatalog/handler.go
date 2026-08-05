package repaircatalog

import (
	"net/http"
	"strconv"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

type RepairCatalogHandler struct {
	componentService *RepairComponentService
	serviceService   *RepairServiceService
	validator        *RepairCatalogValidator
}

func NewRepairCatalogHandler(componentService *RepairComponentService, serviceService *RepairServiceService, validator *RepairCatalogValidator) *RepairCatalogHandler {
	return &RepairCatalogHandler{
		componentService: componentService,
		serviceService:   serviceService,
		validator:        validator,
	}
}

// Components

func (h *RepairCatalogHandler) CreateComponent(c *gin.Context) {
	req, err := h.validator.ValidateCreateComponentRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}
	component, err := h.componentService.Create(req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Component created successfully", component)
}

func (h *RepairCatalogHandler) GetComponent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid component ID")
		return
	}
	component, err := h.componentService.GetByID(uint(id))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, component)
}

func (h *RepairCatalogHandler) ListComponents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")

	result, err := h.componentService.List(page, limit, search)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMeta(c, result.Components, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

func (h *RepairCatalogHandler) ListActiveComponents(c *gin.Context) {
	components, err := h.componentService.ListActive()
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, components)
}

func (h *RepairCatalogHandler) UpdateComponent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid component ID")
		return
	}
	req, err := h.validator.ValidateUpdateComponentRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}
	component, err := h.componentService.Update(uint(id), req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Component updated successfully", component)
}

func (h *RepairCatalogHandler) DeleteComponent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid component ID")
		return
	}
	if err := h.componentService.Delete(uint(id)); err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Component deleted successfully", nil)
}

// Services

func (h *RepairCatalogHandler) CreateService(c *gin.Context) {
	req, err := h.validator.ValidateCreateServiceRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}
	service, err := h.serviceService.Create(req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Service created successfully", service)
}

func (h *RepairCatalogHandler) GetService(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid service ID")
		return
	}
	service, err := h.serviceService.GetByID(uint(id))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, service)
}

func (h *RepairCatalogHandler) ListServices(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")

	result, err := h.serviceService.List(page, limit, search)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMeta(c, result.Services, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

func (h *RepairCatalogHandler) ListActiveServices(c *gin.Context) {
	services, err := h.serviceService.ListActive()
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, services)
}

func (h *RepairCatalogHandler) UpdateService(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid service ID")
		return
	}
	req, err := h.validator.ValidateUpdateServiceRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}
	service, err := h.serviceService.Update(uint(id), req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Service updated successfully", service)
}

func (h *RepairCatalogHandler) DeleteService(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid service ID")
		return
	}
	if err := h.serviceService.Delete(uint(id)); err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Service deleted successfully", nil)
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}
