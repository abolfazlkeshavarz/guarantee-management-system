package guarantees

import (
	"net/http"
	"strconv"
	"path/filepath"
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"
	"guarantee-management-system/internal/shared/storage"
	"fmt"
	"strings"
	"github.com/gin-gonic/gin"
	"io"
	"bytes"
)

type GuaranteeHandler struct {
	service   *GuaranteeService
	validator *GuaranteeValidator
	appURL    string
}

func NewGuaranteeHandler(service *GuaranteeService, validator *GuaranteeValidator, appURL string) *GuaranteeHandler {
	return &GuaranteeHandler{
		service:   service,
		validator: validator,
		appURL:    appURL,
	}
}

func (h *GuaranteeHandler) Create(c *gin.Context) {
	req, err := h.validator.ValidateCreateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	adminID := c.GetUint("admin_id")

	guarantee, err := h.service.Create(req, adminID)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Guarantee created successfully", guarantee)
}

func (h *GuaranteeHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid guarantee ID")
		return
	}

	guarantee, err := h.service.GetByID(uint(id))
	if err != nil {
		handleError(c, err)
		return
	}

	responses.Success(c, guarantee)
}

func (h *GuaranteeHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")
	status := c.DefaultQuery("status", "")

	var customerID, productID *uint
	if id, err := strconv.ParseUint(c.DefaultQuery("customer_id", "0"), 10, 32); err == nil && id > 0 {
		customerID = new(uint)
		*customerID = uint(id)
	}
	if id, err := strconv.ParseUint(c.DefaultQuery("product_id", "0"), 10, 32); err == nil && id > 0 {
		productID = new(uint)
		*productID = uint(id)
	}

	result, err := h.service.List(page, limit, search, status, customerID, productID)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMeta(c, result.Guarantees, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

func (h *GuaranteeHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid guarantee ID")
		return
	}

	req, err := h.validator.ValidateUpdateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	guarantee, err := h.service.Update(uint(id), req)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Guarantee updated successfully", guarantee)
}

func (h *GuaranteeHandler) Approve(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid guarantee ID")
		return
	}

	req, err := h.validator.ValidateApproveRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	adminID := c.GetUint("admin_id")

	guarantee, err := h.service.Approve(uint(id), req, adminID)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Guarantee approved successfully", guarantee)
}

func (h *GuaranteeHandler) Renew(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid guarantee ID")
		return
	}

	req, err := h.validator.ValidateRenewRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	adminID := c.GetUint("admin_id")

	guarantee, err := h.service.Renew(uint(id), req, adminID)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Guarantee renewed successfully", guarantee)
}

func (h *GuaranteeHandler) Cancel(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid guarantee ID")
		return
	}

	adminID := c.GetUint("admin_id")

	guarantee, err := h.service.Cancel(uint(id), adminID)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Guarantee cancelled successfully", guarantee)
}

func (h *GuaranteeHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid guarantee ID")
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Guarantee deleted successfully", nil)
}

func (h *GuaranteeHandler) GetExpiringSoon(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))

	guarantees, err := h.service.GetExpiringSoon(days)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.Success(c, guarantees)
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}

// Add these methods to GuaranteeHandler

// PublicRegister handles public guarantee registration without authentication
// PublicRegister handles public guarantee registration without authentication
func (h *GuaranteeHandler) PublicRegister(c *gin.Context) {
	var req PublicRegisterRequest
	
	// Log the request body for debugging
	body, _ := c.GetRawData()
	fmt.Println("Received request body:", string(body))
	
	// Restore the body since GetRawData consumes it
	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
	
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	response, err := h.service.PublicRegister(&req)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Guarantee registered successfully", response)
}

// GetGuaranteePeriods returns available guarantee periods
func (h *GuaranteeHandler) GetGuaranteePeriods(c *gin.Context) {
	periods := h.service.GetGuaranteePeriods()
	responses.Success(c, periods)
}

// CheckGuaranteeStatus allows public checking of guarantee status by code
func (h *GuaranteeHandler) CheckGuaranteeStatus(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		responses.Error(c, http.StatusBadRequest, "Guarantee code is required")
		return
	}

	guarantee, err := h.service.GetByCode(code)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.Success(c, guarantee)
}

// Add this method for file upload
func (h *GuaranteeHandler) UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "No file uploaded")
		return
	}

	// Validate file type
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
		"application/pdf": true,
	}
	
	contentType := file.Header.Get("Content-Type")
	if !allowedTypes[contentType] {
		responses.Error(c, http.StatusBadRequest, "Invalid file type. Allowed: JPEG, PNG, GIF, WEBP, PDF")
		return
	}

	// Validate file size (max 10MB)
	if file.Size > 10*1024*1024 {
		responses.Error(c, http.StatusBadRequest, "File size exceeds 10MB limit")
		return
	}

	// Save the file under the shared uploads directory (served at /uploads).
	info, err := storage.SaveFile(file, "guarantees")
	if err != nil {
		responses.InternalError(c, err)
		return
	}

	// Return an absolute URL so it resolves correctly from any client origin
	// (the frontend dev server, a mobile app, etc.), not just the API's own origin.
	fileURL := fmt.Sprintf("%s/uploads/%s", strings.TrimRight(h.appURL, "/"), filepath.ToSlash(info.Path))
	responses.Success(c, gin.H{
		"url":      fileURL,
		"filename": info.Name,
		"size":     info.Size,
		"type":     contentType,
	})
}

func (h *GuaranteeHandler) CreateByAdmin(c *gin.Context) {
    var req AdminCreateGuaranteeRequest
    
    // Log request body for debugging
    body, _ := c.GetRawData()
    fmt.Println("Admin create request body:", string(body))
    
    // Restore body
    c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
    
    if err := c.ShouldBindJSON(&req); err != nil {
        responses.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
        return
    }

    adminID := c.GetUint("admin_id")

    guarantee, err := h.service.CreateByAdmin(&req, adminID)
    if err != nil {
        handleError(c, err)
        return
    }

    responses.SuccessWithMessage(c, "Guarantee created successfully by admin", guarantee)
}