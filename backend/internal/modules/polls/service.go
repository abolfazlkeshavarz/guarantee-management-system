package polls

import (
	"crypto/rand"
	"fmt"
	"strings"
	"time"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/sms"

	"gorm.io/gorm"
)

// maxSendBatch caps how many invitations one click sends. The provider is
// called once per recipient and the request is synchronous, so an unbounded
// loop over a few thousand customers would time out with no record of how far
// it got. Whatever is left stays Pending and the operator sends again.
const maxSendBatch = 200

// tokenAlphabet leaves out characters that are easy to confuse when a customer
// reads a code off a text message (0/O, 1/l/I).
const tokenAlphabet = "abcdefghjkmnpqrstuvwxyz23456789"

const tokenLength = 10

type Service struct {
	db            *gorm.DB
	publicBaseURL string
}

func NewService(db *gorm.DB, publicBaseURL string) *Service {
	return &Service{db: db, publicBaseURL: strings.TrimRight(strings.TrimSpace(publicBaseURL), "/")}
}

func internalErr(msg string) error {
	return errors.NewAppError(errors.ErrInternalServer, msg, 500)
}

func newToken() (string, error) {
	buf := make([]byte, tokenLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	out := make([]byte, tokenLength)
	for i, b := range buf {
		out[i] = tokenAlphabet[int(b)%len(tokenAlphabet)]
	}
	return string(out), nil
}

func parseDate(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, ErrBadDate
	}
	return &t, nil
}

func fmtTime(t *time.Time) *string {
	if t == nil {
		return nil
	}
	f := t.Format(time.RFC3339)
	return &f
}

func fmtDate(t *time.Time) *string {
	if t == nil {
		return nil
	}
	f := t.Format("2006-01-02")
	return &f
}

// ─── Audience ────────────────────────────────────────────────────────────────

// audienceQuery picks one row per customer - their most recent live guarantee -
// so a customer with three appliances is texted once, not three times.
const audienceQuery = `
SELECT DISTINCT ON (c.id)
       c.id                        AS customer_id,
       COALESCE(c.full_name, '')   AS customer_name,
       COALESCE(c.phone, '')       AS customer_phone,
       COALESCE(c.city, '')        AS customer_city,
       g.id                        AS guarantee_id,
       COALESCE(g.code, '')        AS guarantee_code,
       COALESCE(p.name, '')        AS product_name,
       g.purchase_date
  FROM guarantees g
  JOIN customers c ON c.id = g.customer_id AND c.deleted_at IS NULL
  LEFT JOIN products p ON p.id = g.product_id
 WHERE g.deleted_at IS NULL
   AND g.status IN ('Approved', 'Renewed')`

type audienceRow struct {
	CustomerID    uint
	CustomerName  string
	CustomerPhone string
	CustomerCity  string
	GuaranteeID   uint
	GuaranteeCode string
	ProductName   string
	PurchaseDate  time.Time
}

func (s *Service) audience(f AudienceFilterInput) ([]audienceRow, error) {
	purchasedBefore, err := parseDate(f.PurchasedBefore)
	if err != nil {
		return nil, err
	}
	expiryBefore, err := parseDate(f.ExpiryBefore)
	if err != nil {
		return nil, err
	}

	q := audienceQuery
	args := []interface{}{}

	if city := strings.TrimSpace(f.City); city != "" {
		q += " AND c.city ILIKE ?"
		args = append(args, "%"+city+"%")
	}
	if province := strings.TrimSpace(f.Province); province != "" {
		q += " AND c.province ILIKE ?"
		args = append(args, "%"+province+"%")
	}
	if f.ProductID != nil && *f.ProductID > 0 {
		q += " AND g.product_id = ?"
		args = append(args, *f.ProductID)
	}
	if purchasedBefore != nil {
		q += " AND g.purchase_date < ?"
		args = append(args, *purchasedBefore)
	}
	if expiryBefore != nil {
		q += " AND g.expiry_date < ?"
		args = append(args, *expiryBefore)
	}

	// DISTINCT ON needs the deduplicated column first; the rest decides which
	// of that customer's guarantees wins.
	q += " ORDER BY c.id, g.purchase_date DESC, g.id DESC"

	var rows []audienceRow
	if err := s.db.Raw(q, args...).Scan(&rows).Error; err != nil {
		return nil, internalErr("Failed to work out the audience")
	}
	return rows, nil
}

func (s *Service) PreviewAudience(f AudienceFilterInput) (*AudiencePreview, error) {
	rows, err := s.audience(f)
	if err != nil {
		return nil, err
	}

	out := &AudiencePreview{Total: int64(len(rows)), Sample: []AudienceSample{}}
	for _, r := range rows {
		if strings.TrimSpace(r.CustomerPhone) != "" {
			out.Reachable++
		}
		if len(out.Sample) < 5 {
			out.Sample = append(out.Sample, AudienceSample{
				CustomerName:  r.CustomerName,
				CustomerPhone: r.CustomerPhone,
				CustomerCity:  r.CustomerCity,
				GuaranteeCode: r.GuaranteeCode,
				ProductName:   r.ProductName,
				PurchaseDate:  r.PurchaseDate.Format("2006-01-02"),
			})
		}
	}
	return out, nil
}

// BuildAudience turns the poll's filters into recipients, each with their own
// token. Re-running it adds anyone newly matching without disturbing the
// people already invited.
func (s *Service) BuildAudience(pollID uint) (*AudiencePreview, error) {
	poll, err := s.find(pollID)
	if err != nil {
		return nil, err
	}
	if poll.Status == StatusClosed {
		return nil, ErrPollClosed
	}

	rows, err := s.audience(AudienceFilterInput{
		City:            poll.FilterCity,
		Province:        poll.FilterProvince,
		ProductID:       poll.FilterProductID,
		PurchasedBefore: dateOrEmpty(poll.FilterPurchasedBefore),
		ExpiryBefore:    dateOrEmpty(poll.FilterExpiryBefore),
	})
	if err != nil {
		return nil, err
	}

	var existing []uint
	s.db.Model(&Recipient{}).Where("poll_id = ?", pollID).Pluck("customer_id", &existing)
	already := make(map[uint]bool, len(existing))
	for _, id := range existing {
		already[id] = true
	}

	added := &AudiencePreview{Sample: []AudienceSample{}}
	batch := make([]Recipient, 0, len(rows))
	for _, r := range rows {
		if already[r.CustomerID] {
			continue
		}
		token, err := newToken()
		if err != nil {
			return nil, internalErr("Failed to generate an invitation code")
		}
		customerID, guaranteeID := r.CustomerID, r.GuaranteeID
		batch = append(batch, Recipient{
			PollID:        pollID,
			CustomerID:    &customerID,
			GuaranteeID:   &guaranteeID,
			Token:         token,
			CustomerName:  r.CustomerName,
			CustomerPhone: r.CustomerPhone,
			CustomerCity:  r.CustomerCity,
			GuaranteeCode: r.GuaranteeCode,
			ProductName:   r.ProductName,
			// Nobody to text: recorded rather than silently dropped, so the
			// operator can see the gap in their customer data.
			SMSStatus: statusFor(r.CustomerPhone),
		})
		added.Total++
		if strings.TrimSpace(r.CustomerPhone) != "" {
			added.Reachable++
		}
	}

	if len(batch) > 0 {
		if err := s.db.CreateInBatches(&batch, 200).Error; err != nil {
			return nil, internalErr("Failed to save the audience")
		}
	}
	return added, nil
}

func statusFor(phone string) string {
	if strings.TrimSpace(phone) == "" {
		return SMSSkipped
	}
	return SMSPending
}

func dateOrEmpty(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02")
}

// ─── Sending ─────────────────────────────────────────────────────────────────

// PublicLink is the address a recipient's token resolves to.
func (s *Service) PublicLink(token string) string {
	if s.publicBaseURL == "" {
		return "/p/" + token
	}
	return s.publicBaseURL + "/p/" + token
}

// Send texts the invitation one recipient at a time and records the outcome
// per recipient so a failure is attributable rather than lost in a count.
//
// With no ids it goes to everyone still pending. With ids it goes only to
// those that are still pending: the operator chose them, so anyone left out
// stays queued and the poll counts as sent rather than waiting on them.
func (s *Service) Send(pollID uint, recipientIDs []uint) (*SendResult, error) {
	poll, err := s.find(pollID)
	if err != nil {
		return nil, err
	}
	if poll.Status == StatusClosed {
		return nil, ErrPollClosed
	}
	if strings.TrimSpace(poll.SMSTemplateKey) == "" {
		return nil, ErrNoTemplate
	}
	if !sms.Enabled() {
		return nil, ErrSMSDisabled
	}
	if poll.LinkMode == LinkModeURL && s.publicBaseURL == "" {
		return nil, ErrNoPublicURL
	}

	var pending []Recipient
	q := s.db.Where("poll_id = ? AND sms_status = ?", pollID, SMSPending)
	if len(recipientIDs) > 0 {
		q = q.Where("id IN ?", recipientIDs)
	}
	if err := q.Order("id").Limit(maxSendBatch).Find(&pending).Error; err != nil {
		return nil, internalErr("Failed to load the recipients")
	}

	result := &SendResult{Errors: []string{}}
	now := time.Now()

	for i := range pending {
		r := &pending[i]
		result.Attempted++

		value := s.PublicLink(r.Token)
		if poll.LinkMode == LinkModeToken {
			value = r.Token
		}

		if err := sms.Send(poll.SMSTemplateKey, value, r.CustomerPhone); err != nil {
			r.SMSStatus = SMSFailed
			r.SMSError = err.Error()
			result.Failed++
			if len(result.Errors) < 5 {
				result.Errors = append(result.Errors,
					fmt.Sprintf("%s: %s", r.CustomerName, err.Error()))
			}
		} else {
			r.SMSStatus = SMSSent
			r.SMSError = ""
			r.SentAt = &now
			result.Sent++
		}

		s.db.Model(&Recipient{}).Where("id = ?", r.ID).Updates(map[string]interface{}{
			"sms_status": r.SMSStatus,
			"sms_error":  r.SMSError,
			"sent_at":    r.SentAt,
		})
	}

	var remaining int64
	s.db.Model(&Recipient{}).Where("poll_id = ? AND sms_status = ?", pollID, SMSPending).Count(&remaining)
	result.Remaining = int(remaining)

	// Sending is finished only when nothing is left queued.
	next := StatusSending
	if remaining == 0 || len(recipientIDs) > 0 {
		next = StatusSent
	}
	s.db.Model(&Poll{}).Where("id = ?", pollID).Update("status", next)

	return result, nil
}

// SendOffers texts a follow-up to the respondents an operator picked.
func (s *Service) SendOffers(pollID uint, req *SendOffersRequest) (*SendResult, error) {
	poll, err := s.find(pollID)
	if err != nil {
		return nil, err
	}
	key := strings.TrimSpace(poll.OfferSMSTemplateKey)
	if key == "" {
		return nil, ErrNoOfferTemplate
	}
	if !sms.Enabled() {
		return nil, ErrSMSDisabled
	}

	var recipients []Recipient
	if err := s.db.Where("poll_id = ? AND id IN ?", pollID, req.RecipientIDs).
		Find(&recipients).Error; err != nil {
		return nil, internalErr("Failed to load the recipients")
	}

	result := &SendResult{Errors: []string{}}
	now := time.Now()
	message := strings.TrimSpace(req.Message)

	for i := range recipients {
		r := &recipients[i]
		result.Attempted++

		if strings.TrimSpace(r.CustomerPhone) == "" {
			result.Skipped++
			continue
		}
		if err := sms.Send(key, message, r.CustomerPhone); err != nil {
			result.Failed++
			if len(result.Errors) < 5 {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %s", r.CustomerName, err.Error()))
			}
			s.db.Model(&Recipient{}).Where("id = ?", r.ID).Update("offer_error", err.Error())
			continue
		}
		result.Sent++
		s.db.Model(&Recipient{}).Where("id = ?", r.ID).Updates(map[string]interface{}{
			"offer_sent_at": now,
			"offer_error":   "",
		})
	}
	return result, nil
}

// ─── Public (the customer's browser) ─────────────────────────────────────────

func (s *Service) findByToken(token string) (*Recipient, *Poll, error) {
	var r Recipient
	if err := s.db.Where("token = ?", strings.TrimSpace(token)).First(&r).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil, ErrBadToken
		}
		return nil, nil, internalErr("Failed to open the poll")
	}
	poll, err := s.find(r.PollID)
	if err != nil {
		return nil, nil, err
	}
	return &r, poll, nil
}

// GetPublic returns the form, pre-filled with who the link belongs to. Opening
// it is recorded once, so "sent but never looked at" stays distinguishable
// from "looked at but did not answer".
func (s *Service) GetPublic(token string) (*PublicPollDTO, error) {
	r, poll, err := s.findByToken(token)
	if err != nil {
		return nil, err
	}

	if r.OpenedAt == nil {
		now := time.Now()
		s.db.Model(&Recipient{}).Where("id = ?", r.ID).Update("opened_at", now)
	}

	questions, err := s.questions(poll.ID)
	if err != nil {
		return nil, err
	}

	return &PublicPollDTO{
		Title:           poll.Title,
		Description:     poll.Description,
		Questions:       questions,
		CustomerName:    r.CustomerName,
		CustomerPhone:   r.CustomerPhone,
		CustomerCity:    r.CustomerCity,
		GuaranteeCode:   r.GuaranteeCode,
		ProductName:     r.ProductName,
		AlreadyAnswered: r.RespondedAt != nil,
		Closed:          poll.Status == StatusClosed,
	}, nil
}

func (s *Service) Submit(token string, req *SubmitRequest) error {
	r, poll, err := s.findByToken(token)
	if err != nil {
		return err
	}
	if poll.Status == StatusClosed {
		return ErrPollClosed
	}
	if r.RespondedAt != nil {
		return ErrAlreadyAnswered
	}

	var questions []Question
	if err := s.db.Where("poll_id = ?", poll.ID).Order("position, id").Find(&questions).Error; err != nil {
		return internalErr("Failed to load the questions")
	}
	byID := make(map[uint]Question, len(questions))
	for _, q := range questions {
		byID[q.ID] = q
	}

	given := make(map[uint]SubmitAnswerInput, len(req.Answers))
	for _, a := range req.Answers {
		q, ok := byID[a.QuestionID]
		if !ok {
			return ErrUnknownQuestion
		}
		if err := validateAnswer(q, a); err != nil {
			return err
		}
		given[a.QuestionID] = a
	}
	for _, q := range questions {
		if q.Required {
			if _, ok := given[q.ID]; !ok {
				return errors.NewAppError(errors.ErrValidation,
					fmt.Sprintf("Please answer: %s", q.Text), 400)
			}
		}
	}

	now := time.Now()
	rows := make([]Answer, 0, len(given))
	for qid, a := range given {
		rows = append(rows, Answer{
			RecipientID:  r.ID,
			QuestionID:   qid,
			AnswerText:   strings.TrimSpace(a.Text),
			AnswerNumber: a.Number,
		})
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if len(rows) > 0 {
			if err := tx.Create(&rows).Error; err != nil {
				return internalErr("Failed to save the answers")
			}
		}
		return tx.Model(&Recipient{}).Where("id = ?", r.ID).
			Update("responded_at", now).Error
	})
}

func validateAnswer(q Question, a SubmitAnswerInput) error {
	switch q.Kind {
	case KindRating:
		if a.Number == nil || *a.Number < 1 || *a.Number > 5 {
			return errors.NewAppError(errors.ErrValidation, "A rating must be between 1 and 5", 400)
		}
	case KindYesNo:
		if a.Number == nil || (*a.Number != 0 && *a.Number != 1) {
			return errors.NewAppError(errors.ErrValidation, "Answer yes or no", 400)
		}
	case KindChoice:
		choice := strings.TrimSpace(a.Text)
		if choice == "" {
			return errors.NewAppError(errors.ErrValidation, "Choose one of the options", 400)
		}
		for _, opt := range splitOptions(q.Options) {
			if opt == choice {
				return nil
			}
		}
		return errors.NewAppError(errors.ErrValidation, "That is not one of the options", 400)
	case KindText:
		if q.Required && strings.TrimSpace(a.Text) == "" {
			return errors.NewAppError(errors.ErrValidation, "Please write an answer", 400)
		}
	}
	return nil
}

func splitOptions(raw string) []string {
	out := []string{}
	for _, line := range strings.Split(raw, "\n") {
		if v := strings.TrimSpace(line); v != "" {
			out = append(out, v)
		}
	}
	return out
}
