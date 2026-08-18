// Package sms sends transactional SMS via Melli Payamak's SendByBaseNumber2
// method (a pre-approved "body" template + ordered fill-in values — this
// provider does not support arbitrary free-text SMS on this endpoint).
package sms

import (
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"guarantee-management-system/internal/config"

	ptime "github.com/yaa110/go-persian-calendar"
)

const sendURL = "http://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2"

var (
	enabled  bool
	username string
	password string

	adminPhone string

	bodyIDApproved     int
	bodyIDRenewed      int
	bodyIDPartRequest  int
	bodyIDRepairReport int
	bodyIDTest         int

	httpClient = &http.Client{Timeout: 10 * time.Second}
)

func Initialize(cfg *config.Config) {
	enabled = cfg.SMSEnabled
	username = cfg.SMSUsername
	password = cfg.SMSPassword
	adminPhone = cfg.SMSAdminPhone
	bodyIDApproved = cfg.SMSBodyIDApproved
	bodyIDRenewed = cfg.SMSBodyIDRenewed
	bodyIDPartRequest = cfg.SMSBodyIDPartRequest
	bodyIDRepairReport = cfg.SMSBodyIDRepairReport
	bodyIDTest = cfg.SMSBodyIDTest

	if enabled && (username == "" || password == "") {
		log.Println("⚠️  SMS_ENABLED is true but SMS_USERNAME/SMS_PASSWORD are not set — SMS sending will fail")
	}
}

var nonDigits = regexp.MustCompile(`\D`)

// normalizePhone converts +98/0098/98-prefixed or bare 9xxxxxxxxx numbers to
// the 09xxxxxxxxx format Melli Payamak requires. Numbers already in that
// format, or anything that doesn't look Iranian, pass through unchanged so
// the provider's own error reporting surfaces the real problem.
func normalizePhone(phone string) string {
	digits := nonDigits.ReplaceAllString(phone, "")
	switch {
	case strings.HasPrefix(digits, "0098"):
		digits = digits[2:]
	case strings.HasPrefix(digits, "98") && len(digits) == 12:
		digits = "0" + digits[2:]
	case strings.HasPrefix(digits, "9") && len(digits) == 10:
		digits = "0" + digits
	}
	return digits
}

// The non-WSDL GET endpoint returns a bare <string> element, not the SOAP
// envelope the WSDL/SOAP-client docs show (that shape only applies to an
// actual SOAP POST call, which this package doesn't make).
type sendByBaseNumber2Response struct {
	XMLName xml.Name `xml:"string"`
	Result  string   `xml:",chardata"`
}

// resultMessages documents Melli Payamak's shared numeric result codes
// (confirmed against their REST API docs; SendByBaseNumber2 uses the same
// taxonomy). A code > 0 that isn't one of these known small numbers is a
// real message/receipt ID, i.e. success.
var resultMessages = map[int64]string{
	0:  "invalid username or password",
	2:  "insufficient SMS credit on this Melli Payamak account",
	3:  "daily sending limit reached",
	4:  "sending volume limit reached",
	5:  "invalid sender number",
	6:  "provider system is updating, try again shortly",
	7:  "message text contains a filtered word",
	9:  "cannot send from a public line via web service",
	10: "account is not active",
	11: "not sent",
	12: "account documents are incomplete",
	14: "message text contains a link",
	15: "message text is missing the required opt-out suffix",
	16: "recipient number not found",
	17: "message text is empty",
	18: "invalid mobile number",
}

// send calls the provider synchronously and returns an error if the HTTP
// call fails or the provider's own result code indicates failure. Melli
// Payamak returns a numeric string: real message/receipt IDs are large
// (many digits); every documented error code is small (0-18, see
// resultMessages), so a low number is always a failure even though it's
// technically positive - checking only "<= 0" would silently treat error
// codes like 2 (insufficient credit) as a successful send.
const successThreshold = 1000
func send(bodyID int, text, to string) error {
	if !enabled {
		return fmt.Errorf("sms sending is disabled (SMS_ENABLED=false)")
	}
	if username == "" || password == "" {
		return fmt.Errorf("sms credentials not configured")
	}

	to = normalizePhone(to)

	params := url.Values{}
	params.Set("username", username)
	params.Set("password", password)
	params.Set("text", text)
	params.Set("to", to)
	params.Set("bodyId", strconv.Itoa(bodyID))

	resp, err := httpClient.Get(sendURL + "?" + params.Encode())
	if err != nil {
		return fmt.Errorf("sms request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("sms response read failed: %w", err)
	}

	var parsed sendByBaseNumber2Response
	if err := xml.Unmarshal(raw, &parsed); err != nil {
		return fmt.Errorf("sms response parse failed: %w (raw: %s)", err, string(raw))
	}

	result := strings.TrimSpace(parsed.Result)
	code, convErr := strconv.ParseInt(result, 10, 64)
	if convErr != nil {
		return fmt.Errorf("unexpected sms response: %s", result)
	}
	if code < successThreshold {
		if msg, known := resultMessages[code]; known {
			return fmt.Errorf("sms provider error %d: %s", code, msg)
		}
		return fmt.Errorf("sms provider returned error code %d", code)
	}

	return nil
}

// sendAsync fires the SMS in the background and only logs failures — used
// for the three business-flow notifications, which must never make the
// guarantee-approval / part-request / repair-report action itself fail or
// wait on an SMS gateway's network latency.
func sendAsync(kind string, bodyID int, text, to string) {
	go func() {
		if err := send(bodyID, text, to); err != nil {
			log.Printf("⚠️  SMS (%s) to %s failed: %v", kind, to, err)
		}
	}()
}

// ─── Notifications ───────────────────────────────────────────────────────────
//
// Every notification sends ONE value: a complete Persian sentence.
//
// SendByBaseNumber2 fills a template that was pre-approved in the Melli
// Payamak panel; `text` only supplies the values. The template in use
// (474023) is
//
//	تایید گارانتی
//	%1
//	با تشکر
//	اوینکی
//
// -- a single placeholder. Sending several semicolon-separated values against
// it silently drops everything after the first, which is why an earlier
// version delivered a bare technician name. Composing the whole sentence here
// keeps all the detail inside that one slot.
//
// If separate multi-placeholder templates are registered later, switch these
// back to strings.Join(values, ";") in the registered order.
//
// Dates are Jalali, matching what the UI shows, because these are read by
// Persian speakers.

// sanitize keeps a value from breaking out of its slot: ";" separates
// variables for this provider, and newlines confuse the template renderer.
func sanitize(v string) string {
	v = strings.ReplaceAll(v, ";", "،")
	v = strings.ReplaceAll(v, "\n", " ")
	v = strings.ReplaceAll(v, "\r", " ")
	return strings.TrimSpace(v)
}

// jalaliDate renders a Gregorian time as a Jalali date string.
func jalaliDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	p := ptime.New(t)
	return fmt.Sprintf("%04d/%02d/%02d", p.Year(), int(p.Month()), p.Day())
}

// AdminPhone exposes the configured admin recipient so callers can build a
// recipient list (admin + technical users) without duplicating config.
func AdminPhone() string { return adminPhone }

// NotifyRepairReport tells reviewers a technician filed a repair report.
// One sentence: technician, guarantee code, date filed.
func NotifyRepairReport(recipients []string, technicianName, guaranteeCode string, filedAt time.Time) {
	text := fmt.Sprintf("گزارش تعمیر جدید از تعمیرکار %s برای گارانتی %s در تاریخ %s ثبت شد.",
		sanitize(technicianName), sanitize(guaranteeCode), jalaliDate(filedAt))
	broadcast("repair-report", bodyIDRepairReport, text, recipients)
}

// NotifyPartRequest tells reviewers a technician requested a part or service.
// One sentence: item, technician, date requested.
func NotifyPartRequest(recipients []string, technicianName, itemName string, requestedAt time.Time) {
	text := fmt.Sprintf("درخواست قطعه %s از تعمیرکار %s در تاریخ %s ثبت شد.",
		sanitize(itemName), sanitize(technicianName), jalaliDate(requestedAt))
	broadcast("part-request", bodyIDPartRequest, text, recipients)
}

// NotifyGuaranteeApproved tells the customer their guarantee was approved.
// One sentence: customer, guarantee code, expiry date.
func NotifyGuaranteeApproved(customerPhone, customerName, guaranteeCode string, expiryDate time.Time) {
	if customerPhone == "" {
		return
	}
	text := fmt.Sprintf("%s عزیز، گارانتی %s تایید شد. تاریخ انقضا %s",
		sanitize(customerName), sanitize(guaranteeCode), jalaliDate(expiryDate))
	sendAsync("guarantee-approved", bodyIDApproved, text, customerPhone)
}

// NotifyGuaranteeRenewed tells the customer their guarantee was extended.
// One sentence: customer, guarantee code, new expiry date -- deliberately
// the same shape as the approval message.
func NotifyGuaranteeRenewed(customerPhone, customerName, guaranteeCode string, newExpiryDate time.Time) {
	if customerPhone == "" {
		return
	}
	text := fmt.Sprintf("%s عزیز، گارانتی %s تمدید شد. تاریخ انقضای جدید %s",
		sanitize(customerName), sanitize(guaranteeCode), jalaliDate(newExpiryDate))
	sendAsync("guarantee-renewed", bodyIDRenewed, text, customerPhone)
}

// broadcast fans one message out to several recipients, skipping blanks and
// duplicates so an admin who is also a technical user is not texted twice.
func broadcast(kind string, bodyID int, text string, recipients []string) {
	seen := make(map[string]bool, len(recipients))
	for _, phone := range recipients {
		normalized := normalizePhone(phone)
		if normalized == "" || seen[normalized] {
			continue
		}
		seen[normalized] = true
		sendAsync(kind, bodyID, text, normalized)
	}
}

// SendTest sends synchronously (unlike the Notify* functions) so the caller
// gets a real pass/fail result back immediately.
func SendTest(to, text string) error {
	return send(bodyIDTest, text, to)
}
