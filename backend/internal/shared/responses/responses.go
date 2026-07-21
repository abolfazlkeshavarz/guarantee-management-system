package responses

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Errors  interface{} `json:"errors,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}

type PaginationMeta struct {
	CurrentPage int   `json:"current_page"`
	PerPage     int   `json:"per_page"`
	Total       int64 `json:"total"`
	LastPage    int   `json:"last_page"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    data,
	})
}

func SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func SuccessWithMeta(c *gin.Context, data interface{}, meta interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

func Error(c *gin.Context, code int, message string) {
	c.JSON(code, Response{
		Success: false,
		Message: message,
	})
}

func ValidationError(c *gin.Context, errors interface{}) {
	c.JSON(http.StatusBadRequest, Response{
		Success: false,
		Message: "Validation error",
		Errors:  errors,
	})
}

func InternalError(c *gin.Context, err error) {
	c.JSON(http.StatusInternalServerError, Response{
		Success: false,
		Message: "Internal server error",
	})
}

func NotFound(c *gin.Context, message string) {
	if message == "" {
		message = "Resource not found"
	}
	c.JSON(http.StatusNotFound, Response{
		Success: false,
		Message: message,
	})
}

func Unauthorized(c *gin.Context, message string) {
	if message == "" {
		message = "Unauthorized"
	}
	c.JSON(http.StatusUnauthorized, Response{
		Success: false,
		Message: message,
	})
}

func Forbidden(c *gin.Context, message string) {
	if message == "" {
		message = "Forbidden"
	}
	c.JSON(http.StatusForbidden, Response{
		Success: false,
		Message: message,
	})
}
