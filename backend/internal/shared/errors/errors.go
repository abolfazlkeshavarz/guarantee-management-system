package errors

import "errors"

// Application errors
var (
	ErrInternalServer     = errors.New("internal server error")
	ErrNotFound           = errors.New("resource not found")
	ErrValidation         = errors.New("validation error")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrDuplicateEntry     = errors.New("duplicate entry")
	ErrInvalidToken       = errors.New("invalid token")
	ErrExpiredToken       = errors.New("expired token")
)

type AppError struct {
	Err     error
	Message string
	Code    int
}

func NewAppError(err error, message string, code int) *AppError {
	return &AppError{
		Err:     err,
		Message: message,
		Code:    code,
	}
}

func (e *AppError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return e.Err.Error()
}
