package technicians

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"strings"

	"guarantee-management-system/internal/shared/errors"
	appvalidator "guarantee-management-system/internal/shared/validator"

	govalidator "github.com/go-playground/validator/v10"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

// maxImportRows caps how many data rows one upload may carry. Bulk onboarding a
// workshop is a few dozen people; anything past a couple of thousand is almost
// certainly the wrong file.
const maxImportRows = 2000

// ImportRowError is one row that could not be imported, keyed by its position
// in the file (1-based, counting the header as row 1) so the operator can find
// it in Excel.
type ImportRowError struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}

// ImportResult is the summary returned after a bulk upload. Rows are processed
// independently: a bad row never stops the good ones.
type ImportResult struct {
	Total   int              `json:"total"`   // data rows seen (excludes the header)
	Created int              `json:"created"` // technicians actually inserted
	Skipped int              `json:"skipped"` // rows whose username already existed
	Errors  []ImportRowError `json:"errors"`  // rows rejected by validation or a DB error
}

// importColumns maps every accepted header spelling (lower-cased, trimmed, with
// spaces/underscores/hyphens collapsed) to a canonical field name. English and
// common Persian headings are both accepted, in any column order.
var importColumns = map[string]string{
	// full_name
	"fullname": "full_name", "full name": "full_name", "name": "full_name",
	"نام": "full_name", "نام کامل": "full_name", "نام و نام خانوادگی": "full_name",
	// username
	"username": "username", "user name": "username", "user": "username",
	"نام کاربری": "username",
	// password
	"password": "password", "pass": "password", "pwd": "password",
	"رمز عبور": "password", "رمز": "password", "کلمه عبور": "password",
	// phone
	"phone": "phone", "phone number": "phone", "mobile": "phone", "tel": "phone",
	"موبایل": "phone", "تلفن": "phone", "شماره تماس": "phone", "شماره موبایل": "phone",
	// national_id
	"national id": "national_id", "nationalid": "national_id", "nid": "national_id",
	"کد ملی": "national_id", "شماره ملی": "national_id",
	// address
	"address": "address", "addr": "address", "آدرس": "address", "نشانی": "address",
	// is_active
	"is active": "is_active", "isactive": "is_active", "active": "is_active",
	"status": "is_active", "enabled": "is_active",
	"فعال": "is_active", "وضعیت": "is_active",
}

func normaliseHeader(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.NewReplacer("_", " ", "-", " ").Replace(s)
	return strings.Join(strings.Fields(s), " ")
}

func parseIsActive(s string) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "", "1", "true", "yes", "y", "active", "enabled", "بله", "فعال":
		return true
	default:
		return false
	}
}

// ParseImportFile turns an uploaded .xlsx or .csv into raw string rows. filename
// is only used to pick the parser by extension.
func ParseImportFile(filename string, data []byte) ([]map[string]string, error) {
	lower := strings.ToLower(filename)
	var records [][]string
	var err error

	switch {
	case strings.HasSuffix(lower, ".xlsx"):
		records, err = readXLSX(data)
	case strings.HasSuffix(lower, ".csv"), strings.HasSuffix(lower, ".txt"):
		records, err = readCSV(data)
	default:
		return nil, errors.NewAppError(errors.ErrValidation,
			"Unsupported file type. Upload a .xlsx or .csv file.", 400)
	}
	if err != nil {
		return nil, errors.NewAppError(errors.ErrValidation,
			"Could not read the file: "+err.Error(), 400)
	}

	// Drop fully blank rows (Excel loves trailing ones).
	cleaned := make([][]string, 0, len(records))
	for _, row := range records {
		if strings.TrimSpace(strings.Join(row, "")) != "" {
			cleaned = append(cleaned, row)
		}
	}
	if len(cleaned) < 2 {
		return nil, errors.NewAppError(errors.ErrValidation,
			"The file has no data rows. Keep the header row and add one technician per line.", 400)
	}

	header := cleaned[0]
	colField := make([]string, len(header))
	known := 0
	for i, h := range header {
		if field, ok := importColumns[normaliseHeader(h)]; ok {
			colField[i] = field
			known++
		}
	}
	if known == 0 {
		return nil, errors.NewAppError(errors.ErrValidation,
			"No recognised column headers. Expected at least full_name, username and password.", 400)
	}

	body := cleaned[1:]
	if len(body) > maxImportRows {
		return nil, errors.NewAppError(errors.ErrValidation,
			fmt.Sprintf("Too many rows (%d). The limit is %d per upload.", len(body), maxImportRows), 400)
	}

	rows := make([]map[string]string, 0, len(body))
	for _, r := range body {
		m := make(map[string]string, known)
		for i, field := range colField {
			if field == "" || i >= len(r) {
				continue
			}
			m[field] = strings.TrimSpace(r[i])
		}
		rows = append(rows, m)
	}
	return rows, nil
}

func readCSV(data []byte) ([][]string, error) {
	// Tolerate a UTF-8 BOM (Excel writes one on "CSV UTF-8") and ragged rows.
	data = bytes.TrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})
	reader := csv.NewReader(bytes.NewReader(data))
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true
	var out [][]string
	for {
		rec, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, nil
}

func readXLSX(data []byte) ([][]string, error) {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("the workbook has no sheets")
	}
	return f.GetRows(sheets[0])
}

// Import validates and inserts the parsed rows one by one. Every row is handled
// on its own: a row that fails validation or collides with an existing username
// is recorded in the result and the rest still go in.
func (s *TechnicianService) Import(rows []map[string]string) (*ImportResult, error) {
	// Errors starts non-nil so it marshals as [] not null - the frontend calls
	// .length / .slice on it unconditionally.
	result := &ImportResult{Total: len(rows), Errors: []ImportRowError{}}
	seen := make(map[string]bool, len(rows))

	for i, row := range rows {
		fileRow := i + 2 // +1 for the header, +1 to be 1-based

		req := &CreateTechnicianRequest{
			FullName:   row["full_name"],
			Username:   row["username"],
			Password:   row["password"],
			Phone:      row["phone"],
			NationalID: row["national_id"],
			Address:    row["address"],
		}
		if v, ok := row["is_active"]; ok {
			active := parseIsActive(v)
			req.IsActive = &active
		}

		if err := appvalidator.ValidateStruct(req); err != nil {
			result.Errors = append(result.Errors, ImportRowError{fileRow, humaniseValidation(err)})
			continue
		}

		key := strings.ToLower(req.Username)
		if seen[key] {
			result.Errors = append(result.Errors, ImportRowError{fileRow,
				fmt.Sprintf("username %q appears more than once in the file", req.Username)})
			continue
		}
		seen[key] = true

		existing, err := s.repo.FindByUsername(req.Username)
		if err != nil {
			result.Errors = append(result.Errors, ImportRowError{fileRow, "could not check for an existing username"})
			continue
		}
		if existing != nil {
			result.Skipped++
			continue
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			result.Errors = append(result.Errors, ImportRowError{fileRow, "could not hash the password"})
			continue
		}

		isActive := true
		if req.IsActive != nil {
			isActive = *req.IsActive
		}

		if err := s.repo.Create(&Technician{
			FullName:   req.FullName,
			Username:   req.Username,
			Password:   string(hashed),
			Phone:      req.Phone,
			NationalID: req.NationalID,
			Address:    req.Address,
			IsActive:   isActive,
		}); err != nil {
			result.Errors = append(result.Errors, ImportRowError{fileRow, "database rejected the row"})
			continue
		}
		result.Created++
	}

	return result, nil
}

func humaniseValidation(err error) string {
	verrs, ok := err.(govalidator.ValidationErrors)
	if !ok || len(verrs) == 0 {
		return "row failed validation"
	}
	// The tag-name func registered in the validator package makes Field() the
	// json name (full_name, national_id, ...).
	switch verrs[0].Field() {
	case "full_name":
		return "full_name is required (2-100 characters)"
	case "username":
		return "username is required (3-50 characters)"
	case "password":
		return "password is required (at least 6 characters)"
	case "phone":
		return "phone must be 10-20 characters"
	case "national_id":
		return "national_id must be 6-20 characters"
	default:
		return fmt.Sprintf("%s is invalid", verrs[0].Field())
	}
}

// BuildImportTemplate returns a ready-to-fill .xlsx: a header row, one example
// row, and a second sheet describing every column.
func BuildImportTemplate() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	const dataSheet = "Technicians"
	f.SetSheetName("Sheet1", dataSheet)

	headers := []string{"full_name", "username", "password", "phone", "national_id", "address", "is_active"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(dataSheet, cell, h)
	}
	example := []interface{}{"Ali Rezaei", "alirezaei", "changeMe123", "09121234567", "0012345678", "Tehran, Vali-Asr St, No 10", "yes"}
	for i, v := range example {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(dataSheet, cell, v)
	}
	bold, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	f.SetCellStyle(dataSheet, "A1", "G1", bold)
	f.SetColWidth(dataSheet, "A", "F", 22)

	const helpSheet = "How to fill in"
	f.NewSheet(helpSheet)
	help := [][]interface{}{
		{"Column", "Required", "Notes"},
		{"full_name", "yes", "2-100 characters."},
		{"username", "yes", "3-50 characters. Must be unique. Used to sign in."},
		{"password", "yes", "At least 6 characters. The technician can change it later."},
		{"phone", "no", "10-20 characters if given, e.g. 09121234567."},
		{"national_id", "no", "6-20 characters if given."},
		{"address", "no", "Free text."},
		{"is_active", "no", "yes/no (also 1/0, true/false, فعال/غیرفعال). Blank means yes."},
		{"", "", ""},
		{"Notes", "", ""},
		{"Header row", "", "Keep row 1. Columns may be in any order; unknown columns are ignored."},
		{"Persian headers", "", "نام / نام کاربری / رمز عبور / موبایل / کد ملی / آدرس / وضعیت also work."},
		{"Existing usernames", "", "Rows whose username already exists are skipped, not overwritten."},
		{"File types", "", ".xlsx or .csv (UTF-8)."},
	}
	for r, row := range help {
		for c, v := range row {
			cell, _ := excelize.CoordinatesToCellName(c+1, r+1)
			f.SetCellValue(helpSheet, cell, v)
		}
	}
	f.SetCellStyle(helpSheet, "A1", "C1", bold)
	f.SetColWidth(helpSheet, "A", "A", 16)
	f.SetColWidth(helpSheet, "B", "B", 10)
	f.SetColWidth(helpSheet, "C", "C", 64)

	if idx, err := f.GetSheetIndex(dataSheet); err == nil {
		f.SetActiveSheet(idx)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
