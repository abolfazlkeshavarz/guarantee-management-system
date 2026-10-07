package validator

import "strings"

// GuaranteeCodeMessage is what a caller is told when a code is rejected.
const GuaranteeCodeMessage = "Guarantee code may only contain English letters and numbers (A-Z, a-z, 0-9), with - _ . / allowed"

// IsValidGuaranteeCode reports whether code is made only of plain English
// letters, ASCII digits and a few separators.
//
// The check is byte-wise on purpose. Persian and Arabic digits (۱۲۳ / ١٢٣)
// and letters look like they belong, and a phone keyboard happily types them,
// but they never equal the Latin characters printed on the product - so a
// code carrying one can only ever be a lookup that fails, or worse, a
// registration that squats on a code nobody can later match.
func IsValidGuaranteeCode(code string) bool {
	if code == "" {
		return false
	}
	for i := 0; i < len(code); i++ {
		c := code[i]
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9':
		case c == '-' || c == '_' || c == '.' || c == '/':
		default:
			return false
		}
	}
	return true
}

// NormalizeGuaranteeCode trims the whitespace a paste tends to drag along.
func NormalizeGuaranteeCode(code string) string {
	return strings.TrimSpace(code)
}
