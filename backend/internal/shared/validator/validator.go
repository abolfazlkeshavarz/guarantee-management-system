package validator

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		validate = v
		// Register custom validation tag if needed
		v.RegisterTagNameFunc(func(fld reflect.StructField) string {
			name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
			if name == "-" {
				return ""
			}
			return name
		})
	}
}

func ValidateStruct(s interface{}) error {
	if validate == nil {
		return nil
	}
	return validate.Struct(s)
}

func GetValidationErrors(err error) map[string]string {
	errors := make(map[string]string)
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, ve := range validationErrors {
			field := ve.Field()
			// Convert field name from Pascal to camel case
			field = strings.ToLower(field[:1]) + field[1:]
			errors[field] = getErrorMessage(ve)
		}
	}
	return errors
}

func GetValidationErrorString(err error) string {
	errors := GetValidationErrors(err)
	if len(errors) == 0 {
		return "Validation failed"
	}

	var messages []string
	for field, message := range errors {
		messages = append(messages, fmt.Sprintf("%s: %s", field, message))
	}
	return strings.Join(messages, "; ")
}

func getErrorMessage(ve validator.FieldError) string {
	switch ve.Tag() {
	case "required":
		return "This field is required"
	case "email":
		return "Invalid email format"
	case "min":
		return fmt.Sprintf("Minimum length is %s", ve.Param())
	case "max":
		return fmt.Sprintf("Maximum length is %s", ve.Param())
	case "len":
		return fmt.Sprintf("Length must be %s", ve.Param())
	case "numeric":
		return "Must be a number"
	case "url":
		return "Invalid URL format"
	default:
		return fmt.Sprintf("Invalid value for %s", ve.Tag())
	}
}
