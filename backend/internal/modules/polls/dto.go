package polls

// ─── Responses ───────────────────────────────────────────────────────────────

type QuestionDTO struct {
	ID       uint     `json:"id"`
	Position int      `json:"position"`
	Text     string   `json:"text"`
	Kind     string   `json:"kind"`
	Options  []string `json:"options"`
	Required bool     `json:"required"`
}

type PollDTO struct {
	ID          uint   `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`

	SMSTemplateKey      string `json:"sms_template_key"`
	OfferSMSTemplateKey string `json:"offer_sms_template_key"`
	LinkMode            string `json:"link_mode"`

	FilterCity            string  `json:"filter_city"`
	FilterProvince        string  `json:"filter_province"`
	FilterProductID       *uint   `json:"filter_product_id,omitempty"`
	FilterProductName     string  `json:"filter_product_name,omitempty"`
	FilterPurchasedBefore *string `json:"filter_purchased_before,omitempty"`
	FilterExpiryBefore    *string `json:"filter_expiry_before,omitempty"`

	Questions []QuestionDTO `json:"questions"`

	// Delivery and response tallies, so a list row needs no second call.
	Stats PollStats `json:"stats"`

	CreatedByName string  `json:"created_by_name,omitempty"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
	ClosedAt      *string `json:"closed_at,omitempty"`
}

type PollStats struct {
	Recipients int64 `json:"recipients"`
	Pending    int64 `json:"pending"`
	Sent       int64 `json:"sent"`
	Failed     int64 `json:"failed"`
	Opened     int64 `json:"opened"`
	Responded  int64 `json:"responded"`
	OffersSent int64 `json:"offers_sent"`
}

type ListPollsResponse struct {
	Polls    []PollDTO `json:"polls"`
	Total    int64     `json:"total"`
	Page     int       `json:"page"`
	Limit    int       `json:"limit"`
	LastPage int       `json:"last_page"`
}

type RecipientDTO struct {
	ID            uint    `json:"id"`
	CustomerID    *uint   `json:"customer_id,omitempty"`
	CustomerName  string  `json:"customer_name"`
	CustomerPhone string  `json:"customer_phone"`
	CustomerCity  string  `json:"customer_city"`
	GuaranteeCode string  `json:"guarantee_code"`
	ProductName   string  `json:"product_name"`
	Token         string  `json:"token"`
	SMSStatus     string  `json:"sms_status"`
	SMSError      string  `json:"sms_error,omitempty"`
	SentAt        *string `json:"sent_at,omitempty"`
	OpenedAt      *string `json:"opened_at,omitempty"`
	RespondedAt   *string `json:"responded_at,omitempty"`
	OfferSentAt   *string `json:"offer_sent_at,omitempty"`
	OfferError    string  `json:"offer_error,omitempty"`

	// Filled in on the results screen.
	Answers []AnswerDTO `json:"answers,omitempty"`
}

type AnswerDTO struct {
	QuestionID   uint   `json:"question_id"`
	QuestionText string `json:"question_text"`
	Kind         string `json:"kind"`
	AnswerText   string `json:"answer_text"`
	AnswerNumber *int   `json:"answer_number,omitempty"`
}

type ListRecipientsResponse struct {
	Recipients []RecipientDTO `json:"recipients"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	LastPage   int            `json:"last_page"`
}

// QuestionResult is one question's answers, totalled.
type QuestionResult struct {
	QuestionID uint   `json:"question_id"`
	Text       string `json:"text"`
	Kind       string `json:"kind"`
	Responses  int64  `json:"responses"`
	// Rating questions only.
	Average float64 `json:"average,omitempty"`
	// Counts per option / per rating value / yes-no.
	Breakdown []ResultBucket `json:"breakdown,omitempty"`
	// Free-text answers, newest first.
	TextAnswers []string `json:"text_answers,omitempty"`
}

type ResultBucket struct {
	Label string `json:"label"`
	Count int64  `json:"count"`
}

type ResultsResponse struct {
	Stats     PollStats        `json:"stats"`
	Questions []QuestionResult `json:"questions"`
}

// AudiencePreview is who a set of filters would reach.
type AudiencePreview struct {
	Total int64 `json:"total"`
	// Of those, how many have a phone number worth texting.
	Reachable int64 `json:"reachable"`
	// A handful of examples so the operator can sanity-check the filters.
	Sample []AudienceSample `json:"sample"`
}

type AudienceSample struct {
	CustomerName  string `json:"customer_name"`
	CustomerPhone string `json:"customer_phone"`
	CustomerCity  string `json:"customer_city"`
	GuaranteeCode string `json:"guarantee_code"`
	ProductName   string `json:"product_name"`
	PurchaseDate  string `json:"purchase_date"`
}

// SendResult is what happened when the invitations went out.
type SendResult struct {
	Attempted int `json:"attempted"`
	Sent      int `json:"sent"`
	Failed    int `json:"failed"`
	Skipped   int `json:"skipped"`
	// Still queued after this batch, so the UI can say "send the rest".
	Remaining int `json:"remaining"`
	// The first few failures, so the operator sees why without digging.
	Errors []string `json:"errors"`
}

// PublicPollDTO is what the customer's browser sees. It carries just enough
// about them to fill the form in, and nothing about anyone else.
type PublicPollDTO struct {
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Questions   []QuestionDTO `json:"questions"`

	CustomerName  string `json:"customer_name"`
	CustomerPhone string `json:"customer_phone"`
	CustomerCity  string `json:"customer_city"`
	GuaranteeCode string `json:"guarantee_code"`
	ProductName   string `json:"product_name"`

	// True once they have answered; the page then shows a thank-you instead
	// of the form.
	AlreadyAnswered bool `json:"already_answered"`
	Closed          bool `json:"closed"`
}

// ─── Requests ────────────────────────────────────────────────────────────────

type QuestionInput struct {
	Text     string   `json:"text" binding:"required,min=2,max=300"`
	Kind     string   `json:"kind" binding:"required,oneof=rating yes_no choice text"`
	Options  []string `json:"options"`
	Required bool     `json:"required"`
}

type AudienceFilterInput struct {
	City            string `json:"city" binding:"omitempty,max=50"`
	Province        string `json:"province" binding:"omitempty,max=50"`
	ProductID       *uint  `json:"product_id"`
	PurchasedBefore string `json:"purchased_before"`
	ExpiryBefore    string `json:"expiry_before"`
}

type CreatePollRequest struct {
	Title               string              `json:"title" binding:"required,min=2,max=150"`
	Description         string              `json:"description" binding:"omitempty,max=2000"`
	SMSTemplateKey      string              `json:"sms_template_key" binding:"omitempty,max=60"`
	OfferSMSTemplateKey string              `json:"offer_sms_template_key" binding:"omitempty,max=60"`
	LinkMode            string              `json:"link_mode" binding:"omitempty,oneof=url token"`
	Filters             AudienceFilterInput `json:"filters"`
	Questions           []QuestionInput     `json:"questions" binding:"required,min=1,max=20,dive"`
}

type UpdatePollRequest struct {
	Title               string               `json:"title" binding:"omitempty,min=2,max=150"`
	Description         *string              `json:"description"`
	SMSTemplateKey      *string              `json:"sms_template_key"`
	OfferSMSTemplateKey *string              `json:"offer_sms_template_key"`
	LinkMode            string               `json:"link_mode" binding:"omitempty,oneof=url token"`
	Filters             *AudienceFilterInput `json:"filters"`
	// Replacing the questions is only allowed while the poll is a draft.
	Questions []QuestionInput `json:"questions" binding:"omitempty,max=20,dive"`
}

// SubmitAnswerInput is one answer from the customer's browser.
type SubmitAnswerInput struct {
	QuestionID uint   `json:"question_id" binding:"required"`
	Text       string `json:"text" binding:"omitempty,max=2000"`
	Number     *int   `json:"number"`
}

type SubmitRequest struct {
	Answers []SubmitAnswerInput `json:"answers" binding:"required,min=1,dive"`
}

// SendRequest optionally narrows an invitation send to chosen recipients.
// Empty means everyone still pending.
type SendRequest struct {
	RecipientIDs []uint `json:"recipient_ids" binding:"omitempty,max=500"`
}

// SendOffersRequest texts an offer to specific respondents.
type SendOffersRequest struct {
	RecipientIDs []uint `json:"recipient_ids" binding:"required,min=1,max=500"`
	// The sentence that fills the offer pattern's placeholder.
	Message string `json:"message" binding:"required,min=2,max=400"`
}
