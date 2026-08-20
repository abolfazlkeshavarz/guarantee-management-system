package warrantycode

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// The "seasonal" (old style) code era.
//
// Before the encoded format existed, a code carried no month. It ran
// {year:4}{PREFIX}{D?}{model}{serial:4} -- e.g. "1403FZ2400101234" -- and the
// manufacture month could only be recovered by looking the serial number up in
// a table of that year's production batches. Each batch covers a quarter, so
// these codes place a device in a season, never in a specific month.
//
// The tables below are transcribed from the reference implementation and are
// calibrated to one real production line. They are not derivable from the code
// itself: serial 800 means "summer" only because that line happened to reach
// serial 700 at the end of spring 1403. A product with different batch history
// cannot reuse them, which is why only years with recorded batches parse at all.
const seasonalModelSegment = "240010"

// seasonalBatch maps a serial range onto the month that closes its season.
// Months are always 3, 6, 9 or 12 -- the last month of spring, summer, autumn
// and winter -- because that is the finest resolution these codes support.
type seasonalBatch struct {
	minSerial int
	maxSerial int
	month     int
}

// Year 1403 split its batches across the two prefix variants: the plain
// prefix covered the first half of the year, the D-suffixed one the second.
var seasonalBatches1403Plain = []seasonalBatch{
	{1, 700, 3},    // فروردین تا خرداد
	{701, 1370, 6}, // تیر تا شهریور
}

var seasonalBatches1403D = []seasonalBatch{
	{1, 1800, 9},     // مهر تا آذر
	{1801, 2958, 12}, // دی تا اسفند
}

// Year 1404 numbered every batch in one sequence, so both prefix variants
// share the table and the final batch is open-ended.
var seasonalBatches1404 = []seasonalBatch{
	{1, 1200, 3},
	{1201, 1900, 6},
	{1901, 3400, 9},
	{3401, 0, 12}, // maxSerial 0 means "no upper bound"
}

// SeasonalBase strips the optional trailing "D" that marks the second-half
// variant of a prefix, so a product registered as "FZD" still recognises its
// own "FZ" codes.
func SeasonalBase(prefix string) string {
	return strings.TrimSuffix(strings.ToUpper(strings.TrimSpace(prefix)), "D")
}

// SeasonalPattern returns the regex matching this product's seasonal codes.
func SeasonalPattern(prefix string) string {
	return fmt.Sprintf(`^[0-9]{4}%sD?%s[0-9]{4}$`,
		regexp.QuoteMeta(SeasonalBase(prefix)), seasonalModelSegment)
}

// batchesFor returns the batch table for a manufacture year, and whether one
// exists at all. hasD selects the 1403 variant.
func batchesFor(year int, hasD bool) ([]seasonalBatch, bool) {
	switch year {
	case 1403:
		if hasD {
			return seasonalBatches1403D, true
		}
		return seasonalBatches1403Plain, true
	case 1404:
		return seasonalBatches1404, true
	default:
		return nil, false
	}
}

// monthFromSerial looks a serial up in a batch table.
func monthFromSerial(batches []seasonalBatch, serial int) (int, bool) {
	for _, b := range batches {
		if serial < b.minSerial {
			continue
		}
		if b.maxSerial == 0 || serial <= b.maxSerial {
			return b.month, true
		}
	}
	return 0, false
}

// maxKnownSerial reports the highest serial a table accounts for, for error
// messages. Returns 0 when the last batch is open-ended.
func maxKnownSerial(batches []seasonalBatch) int {
	if len(batches) == 0 {
		return 0
	}
	return batches[len(batches)-1].maxSerial
}

// ParseSeasonalCode parses an old-style code for the given product prefix.
// The returned month is the closing month of the manufacture season, and
// SeasonOnly is always true: these codes cannot identify a single month.
func ParseSeasonalCode(code, prefix string) *ParsedCode {
	parsed, _ := parseSeasonal(code, prefix)
	return parsed
}

// parseSeasonal does the work and also reports why a well-shaped code was
// rejected, so ValidateSeasonalCode can explain itself.
func parseSeasonal(code, prefix string) (*ParsedCode, string) {
	if code == "" || prefix == "" {
		return nil, ""
	}
	base := SeasonalBase(prefix)
	if base == "" {
		return nil, ""
	}

	pattern := regexp.MustCompile(fmt.Sprintf(`^(\d{4})%s(D?)%s(\d{4})$`,
		regexp.QuoteMeta(base), seasonalModelSegment))
	m := pattern.FindStringSubmatch(strings.ToUpper(strings.TrimSpace(code)))
	if m == nil {
		return nil, ""
	}

	year, err := strconv.Atoi(m[1])
	if err != nil {
		return nil, ""
	}
	hasD := m[2] == "D"
	serialText := m[3]
	serial, err := strconv.Atoi(serialText)
	if err != nil {
		return nil, ""
	}

	batches, ok := batchesFor(year, hasD)
	if !ok {
		return nil, fmt.Sprintf(
			"برای سال %d دفترچه تولید ثبت نشده است، بنابراین ماه تولید از روی شماره سریال قابل تشخیص نیست. فرمت فصلی فقط برای سال‌های ۱۴۰۳ و ۱۴۰۴ تعریف شده است.",
			year)
	}

	month, ok := monthFromSerial(batches, serial)
	if !ok {
		if max := maxKnownSerial(batches); max > 0 {
			return nil, fmt.Sprintf(
				"شماره سریال %s برای سال %d ثبت نشده است. محدوده مجاز: 0001 تا %04d",
				serialText, year, max)
		}
		return nil, fmt.Sprintf("شماره سریال %s برای سال %d ثبت نشده است.", serialText, year)
	}

	return &ParsedCode{
		Year:       year,
		Month:      month,
		Serial:     serialText,
		SeasonOnly: true,
	}, ""
}

// ValidateSeasonalCode validates an old-style code and describes the device's
// manufacture season, expiry, and whether it can still be registered.
func ValidateSeasonalCode(code, prefix string) ValidationResult {
	if code == "" {
		return ValidationResult{
			Valid:       false,
			Message:     "کد گارانتی نمی‌تواند خالی باشد",
			MessageType: "error",
		}
	}

	parsed, reason := parseSeasonal(code, prefix)
	if parsed == nil {
		if reason == "" {
			base := SeasonalBase(prefix)
			reason = fmt.Sprintf(
				"فرمت کد گارانتی نامعتبر است. فرمت صحیح: سال%s%sسریال (مثال: 1403%s%s1234)",
				base, seasonalModelSegment, base, seasonalModelSegment)
		}
		return ValidationResult{Valid: false, Message: reason, MessageType: "error"}
	}

	isExpired, monthsSince := IsOlderThan24Months(parsed.Year, parsed.Month)
	seasonName := SeasonName(parsed.Month)
	seasonPeriod := SeasonPeriod(parsed.Month)

	// Seasonal codes report a season, never an exact month -- saying
	// "تاریخ تولید: 1403 / خرداد" would claim precision the code does not carry.
	var message, messageType string
	if isExpired {
		message = fmt.Sprintf(
			"کد گارانتی معتبر است اما گارانتی منقضی شده است (%d ماه از تولید گذشته) - فصل تولید: %s (%s)",
			monthsSince, seasonName, seasonPeriod)
		messageType = "warning"
	} else {
		message = fmt.Sprintf("کد گارانتی معتبر است (سال %d، فصل %s)", parsed.Year, seasonName)
		messageType = "success"
	}

	return ValidationResult{
		Valid:                  true,
		Year:                   parsed.Year,
		Month:                  parsed.Month,
		MonthName:              MonthName(parsed.Month),
		SeasonName:             seasonName,
		SeasonPeriod:           seasonPeriod,
		SeasonOnly:             true,
		Serial:                 parsed.Serial,
		IsExpired:              isExpired,
		MonthsSinceManufacture: monthsSince,
		CanRegister:            !isExpired,
		Message:                message,
		MessageType:            messageType,
	}
}
