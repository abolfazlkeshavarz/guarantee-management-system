package technicians

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

// maxImportUpload is the hard ceiling on the multipart body for a bulk import.
// A 2000-row .xlsx is well under 1 MB; 5 MB is generous headroom.
const maxImportUpload = 5 << 20

type TechnicianHandler struct {
	service   *TechnicianService
	validator *TechnicianValidator
}

func NewTechnicianHandler(service *TechnicianService, validator *TechnicianValidator) *TechnicianHandler {
	return &TechnicianHandler{
		service:   service,
		validator: validator,
	}
}

func (h *TechnicianHandler) Create(c *gin.Context) {
	req, err := h.validator.ValidateCreateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	tech, err := h.service.Create(req)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Technician created successfully", tech)
}

func (h *TechnicianHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid technician ID")
		return
	}

	tech, err := h.service.GetByID(uint(id))
	if err != nil {
		handleError(c, err)
		return
	}

	responses.Success(c, tech)
}

func (h *TechnicianHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")

	result, err := h.service.List(page, limit, search)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMeta(c, result.Technicians, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

func (h *TechnicianHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid technician ID")
		return
	}

	req, err := h.validator.ValidateUpdateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	tech, err := h.service.Update(uint(id), req)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Technician updated successfully", tech)
}

func (h *TechnicianHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid technician ID")
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Technician deleted successfully", nil)
}

// Login handles technician login
func (h *TechnicianHandler) Login(c *gin.Context) {
	var req TechnicianLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.Username == "" || req.Password == "" {
		responses.Error(c, http.StatusBadRequest, "Username and password are required")
		return
	}

	tech, token, expiresIn, err := h.service.Login(req.Username, req.Password)
	if err != nil {
		handleError(c, err)
		return
	}

	// AuthMiddleware never runs on the login route, so without this the audit
	// trail would record every sign-in as an anonymous "public" action.
	c.Set("username", tech.Username)
	c.Set("role", "technician")
	c.Set("technician_id", tech.ID)

	responses.Success(c, gin.H{
		"token":      token,
		"token_type": "Bearer",
		"expires_in": expiresIn,
		"technician": tech,
	})
}

// GetProfile returns the current technician's profile
func (h *TechnicianHandler) GetProfile(c *gin.Context) {
	techID, exists := c.Get("technician_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	tech, err := h.service.GetByID(techID.(uint))
	if err != nil {
		handleError(c, err)
		return
	}

	responses.Success(c, tech)
}

// ImportTemplate streams a ready-to-fill .xlsx describing every column.
func (h *TechnicianHandler) ImportTemplate(c *gin.Context) {
	data, err := BuildImportTemplate()
	if err != nil {
		responses.InternalError(c, err)
		return
	}
	c.Header("Content-Disposition", `attachment; filename="technicians-import-template.xlsx"`)
	c.Data(http.StatusOK,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data)
}

// ImportFile bulk-creates technicians from an uploaded .xlsx or .csv. Rows are
// independent: invalid rows and existing usernames are reported, the rest are
// created. Responds 200 with a summary even when some rows failed.
func (h *TechnicianHandler) ImportFile(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxImportUpload)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		if err.Error() == "http: request body too large" {
			responses.Error(c, http.StatusRequestEntityTooLarge,
				fmt.Sprintf("File is larger than %d MB", maxImportUpload>>20))
			return
		}
		responses.Error(c, http.StatusBadRequest, "Attach the spreadsheet as the \"file\" field")
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Could not open the uploaded file")
		return
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Could not read the uploaded file")
		return
	}

	rows, err := ParseImportFile(fileHeader.Filename, data)
	if err != nil {
		handleError(c, err)
		return
	}

	result, err := h.service.Import(rows)
	if err != nil {
		handleError(c, err)
		return
	}

	msg := fmt.Sprintf("%d created, %d skipped, %d failed",
		result.Created, result.Skipped, len(result.Errors))
	responses.SuccessWithMessage(c, msg, result)
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}