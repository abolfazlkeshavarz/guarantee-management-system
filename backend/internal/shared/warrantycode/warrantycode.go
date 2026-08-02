// Package warrantycode validates "encoded" guarantee codes that carry the
// product's Jalali manufacture year/month and a serial number, in the form
// {year:4}{prefix}{month:2}{serial:5} -- e.g. "1405EVC0912345" for prefix
// "EVC" (year 1405, month 09, serial 12345).
//
// This is a Go port of the validation rules from a reference Python
// `WarrantyCode` model (Flask/SQLAlchemy) supplied by the project owner. That
// model supported two code eras:
//   - an "old style" used only for manufacture years 1400-1404, where the
//     month had to be inferred from hand-calibrated serial-number ranges
//     tied to a specific product's historical production batches, and
//   - a "new style" used from year 1405 onward, where the month is encoded
//     directly in the code: {year:4}{PREFIX}{month:2}{serial:5}.
//
// Only the "new style" format is ported here: it's the only format that can
// validly apply to a brand-new product line (a product can't have shipped in
// a manufacture year before it existed, and there is no historical serial
// data to calibrate an old-style month-inference table against). The season
// helpers, month names, and 24-month expiry rule (measured from the current
// Jalali date) are ported verbatim.
package warrantycode

import (
	"fmt"
	"regexp"
	"strconv"

	"guarantee-management-system/internal/shared/jalali"
)

var monthNames = map[int]string{
	1: "فروردین", 2: "اردیبهشت", 3: "خرداد",
	4: "تیر", 5: "مرداد", 6: "شهریور",
	7: "مهر", 8: "آبان", 9: "آذر",
	10: "دی", 11: "بهمن", 12: "اسفند",
}

// MonthName returns the Persian name of a Jalali month (1-12).
func MonthName(month int) string {
	if name, ok := monthNames[month]; ok {
		return name
	}
	return "نامشخص"
}

// SeasonName returns the Persian season name for a Jalali month.
func SeasonName(month int) string {
	switch {
	case month >= 1 && month <= 3:
		return "بهار"
	case month >= 4 && month <= 6:
		return "تابستان"
	case month >= 7 && month <= 9:
		return "پاییز"
	case month >= 10 && month <= 12:
		return "زمستان"
	default:
		return "نامشخص"
	}
}

// SeasonPeriod returns the Persian month-range description for a Jalali month's season.
func SeasonPeriod(month int) string {
	switch {
	case month >= 1 && month <= 3:
		return "فروردین تا خرداد"
	case month >= 4 && month <= 6:
		return "تیر تا شهریور"
	case month >= 7 && month <= 9:
		return "مهر تا آذر"
	case month >= 10 && month <= 12:
		return "دی تا اسفند"
	default:
		return "نامشخص"
	}
}

// IsOlderThan24Months reports whether a Jalali (year, month) manufacture date
// is more than 24 months before today, along with the number of months elapsed.
func IsOlderThan24Months(year, month int) (bool, int) {
	todayY, todayM, _ := jalali.Today()
	monthsDiff := (todayY-year)*12 + (todayM - month)
	return monthsDiff > 24, monthsDiff
}

// ParsedCode is the result of successfully parsing an encoded guarantee code.
type ParsedCode struct {
	Year   int
	Month  int
	Serial string
}

// ParseCode parses a "{year:4}{prefix}{month:2}{serial:5}" guarantee code
// for the given product prefix. Returns nil if the code doesn't match this
// product's format, has an out-of-range year/month, or the year predates
// 1405 (the first year the encoded-code format applies).
func ParseCode(code, prefix string) *ParsedCode {
	if code == "" || prefix == "" {
		return nil
	}
	pattern := regexp.MustCompile(`^(\d{4})` + regexp.QuoteMeta(prefix) + `(\d{2})(\d{5})$`)
	m := pattern.FindStringSubmatch(code)
	if m == nil {
		return nil
	}

	year, err := strconv.Atoi(m[1])
	if err != nil {
		return nil
	}
	month, err := strconv.Atoi(m[2])
	if err != nil {
		return nil
	}
	serial := m[3]

	if year < 1405 {
		return nil
	}
	if month < 1 || month > 12 {
		return nil
	}

	return &ParsedCode{Year: year, Month: month, Serial: serial}
}

// ValidationResult mirrors the reference Python model's validate_code_format() response.
type ValidationResult struct {
	Valid                  bool   `json:"valid"`
	Year                   int    `json:"year,omitempty"`
	Month                  int    `json:"month,omitempty"`
	MonthName              string `json:"month_name,omitempty"`
	SeasonName             string `json:"season_name,omitempty"`
	SeasonPeriod           string `json:"season_period,omitempty"`
	Serial                 string `json:"serial,omitempty"`
	IsExpired              bool   `json:"is_expired"`
	MonthsSinceManufacture int    `json:"months_since_manufacture"`
	CanRegister            bool   `json:"can_register"`
	Message                string `json:"message"`
	MessageType            string `json:"message_type"` // "success" | "warning" | "error"
}

// ValidateCodeFormat validates an encoded guarantee code against a product's
// prefix and returns full details: manufacture year/month, season, whether
// the 24-month warranty-eligibility window (from manufacture date) has
// elapsed, and a human-readable Persian message.
func ValidateCodeFormat(code, prefix string) ValidationResult {
	if code == "" {
		return ValidationResult{
			Valid:       false,
			Message:     "کد گارانتی نمی‌تواند خالی باشد",
			MessageType: "error",
		}
	}

	parsed := ParseCode(code, prefix)
	if parsed == nil {
		return ValidationResult{
			Valid: false,
			Message: fmt.Sprintf(
				"فرمت کد گارانتی نامعتبر است. فرمت صحیح: سال%sماهسریال (مثال: 1405%s0912345)",
				prefix, prefix,
			),
			MessageType: "error",
		}
	}

	isExpired, monthsSince := IsOlderThan24Months(parsed.Year, parsed.Month)
	seasonName := SeasonName(parsed.Month)
	seasonPeriod := SeasonPeriod(parsed.Month)
	monthName := MonthName(parsed.Month)

	var message, messageType string
	if isExpired {
		message = fmt.Sprintf(
			"کد گارانتی معتبر است اما گارانتی منقضی شده است (%d ماه از تولید گذشته) - تاریخ تولید: %d / %s",
			monthsSince, parsed.Year, monthName,
		)
		messageType = "warning"
	} else {
		message = fmt.Sprintf("کد گارانتی معتبر است (تاریخ تولید: %d / %s)", parsed.Year, monthName)
		messageType = "success"
	}

	return ValidationResult{
		Valid:                  true,
		Year:                   parsed.Year,
		Month:                  parsed.Month,
		MonthName:              monthName,
		SeasonName:             seasonName,
		SeasonPeriod:           seasonPeriod,
		Serial:                 parsed.Serial,
		IsExpired:              isExpired,
		MonthsSinceManufacture: monthsSince,
		CanRegister:            !isExpired,
		Message:                message,
		MessageType:            messageType,
	}
}
