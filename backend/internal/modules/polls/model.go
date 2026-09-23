// Package polls runs customer surveys: pick an audience, text each customer a
// personal link, read the answers, and follow up with an offer.
//
// Every recipient carries their own token. That is what lets the public page
// greet someone by name and attach their answers to a real customer without
// asking them to identify themselves - and it is why the link must be treated
// as a credential: anyone holding it can answer as that customer.
package polls

import (
	"time"

	"gorm.io/gorm"
)

type Poll struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Title       string `gorm:"size:150;not null" json:"title"`
	Description string `gorm:"type:text" json:"description"`
	Status      string `gorm:"size:20;not null;default:'Draft'" json:"status"`

	SMSTemplateKey      string `gorm:"size:60" json:"sms_template_key"`
	OfferSMSTemplateKey string `gorm:"size:60" json:"offer_sms_template_key"`
	LinkMode            string `gorm:"size:10;not null;default:'url'" json:"link_mode"`

	FilterCity            string     `gorm:"size:50" json:"filter_city"`
	FilterProvince        string     `gorm:"size:50" json:"filter_province"`
	FilterProductID       *uint      `json:"filter_product_id,omitempty"`
	FilterPurchasedBefore *time.Time `gorm:"type:date" json:"filter_purchased_before,omitempty"`
	FilterExpiryBefore    *time.Time `gorm:"type:date" json:"filter_expiry_before,omitempty"`

	CreatedBy *uint          `json:"created_by,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	ClosedAt  *time.Time     `json:"closed_at,omitempty"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Poll) TableName() string { return "polls" }

type Question struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	PollID   uint   `gorm:"not null" json:"poll_id"`
	Position int    `gorm:"not null;default:0" json:"position"`
	Text     string `gorm:"size:300;not null" json:"text"`
	Kind     string `gorm:"size:20;not null;default:'rating'" json:"kind"`
	// Newline-separated, only meaningful when Kind is "choice".
	Options string `gorm:"type:text" json:"options"`
	// No `default` tag on purpose: GORM skips a zero value when one is
	// present, so "not required" would silently be stored as required. The
	// column still defaults to true in the schema.
	Required bool `gorm:"not null" json:"required"`
}

func (Question) TableName() string { return "poll_questions" }

type Recipient struct {
	ID          uint  `gorm:"primaryKey" json:"id"`
	PollID      uint  `gorm:"not null" json:"poll_id"`
	CustomerID  *uint `json:"customer_id,omitempty"`
	GuaranteeID *uint `json:"guarantee_id,omitempty"`

	Token string `gorm:"size:32;uniqueIndex;not null" json:"token"`

	CustomerName  string `gorm:"size:100" json:"customer_name"`
	CustomerPhone string `gorm:"size:20" json:"customer_phone"`
	CustomerCity  string `gorm:"size:50" json:"customer_city"`
	GuaranteeCode string `gorm:"size:50" json:"guarantee_code"`
	ProductName   string `gorm:"size:150" json:"product_name"`

	SMSStatus string     `gorm:"size:20;not null;default:'Pending'" json:"sms_status"`
	SMSError  string     `gorm:"type:text" json:"sms_error"`
	SentAt    *time.Time `json:"sent_at,omitempty"`

	OpenedAt    *time.Time `json:"opened_at,omitempty"`
	RespondedAt *time.Time `json:"responded_at,omitempty"`

	OfferSentAt *time.Time `json:"offer_sent_at,omitempty"`
	OfferError  string     `gorm:"type:text" json:"offer_error"`

	CreatedAt time.Time `json:"created_at"`
}

func (Recipient) TableName() string { return "poll_recipients" }

type Answer struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	RecipientID  uint      `gorm:"not null" json:"recipient_id"`
	QuestionID   uint      `gorm:"not null" json:"question_id"`
	AnswerText   string    `gorm:"type:text" json:"answer_text"`
	AnswerNumber *int      `json:"answer_number,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

func (Answer) TableName() string { return "poll_answers" }

// Poll lifecycle.
const (
	StatusDraft   = "Draft"
	StatusSending = "Sending"
	StatusSent    = "Sent"
	StatusClosed  = "Closed"
)

// Per-recipient delivery state.
const (
	SMSPending = "Pending"
	SMSSent    = "Sent"
	SMSFailed  = "Failed"
	SMSSkipped = "Skipped"
)

// Question kinds.
const (
	KindRating = "rating"
	KindYesNo  = "yes_no"
	KindChoice = "choice"
	KindText   = "text"
)

// LinkMode decides what the invitation SMS carries.
const (
	LinkModeURL   = "url"   // the whole address
	LinkModeToken = "token" // only the code, for a pattern with the address baked in
)
