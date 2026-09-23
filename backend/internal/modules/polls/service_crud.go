package polls

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

// ─── Reads ───────────────────────────────────────────────────────────────────

func (s *Service) find(id uint) (*Poll, error) {
	var p Poll
	if err := s.db.First(&p, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPollNotFound
		}
		return nil, internalErr("Failed to find the poll")
	}
	return &p, nil
}

func (s *Service) questions(pollID uint) ([]QuestionDTO, error) {
	var rows []Question
	if err := s.db.Where("poll_id = ?", pollID).Order("position, id").Find(&rows).Error; err != nil {
		return nil, internalErr("Failed to load the questions")
	}
	out := make([]QuestionDTO, 0, len(rows))
	for _, q := range rows {
		out = append(out, QuestionDTO{
			ID: q.ID, Position: q.Position, Text: q.Text, Kind: q.Kind,
			Options: splitOptions(q.Options), Required: q.Required,
		})
	}
	return out, nil
}

// stats counts the delivery and response funnel in one pass.
func (s *Service) stats(pollID uint) PollStats {
	var out PollStats
	type agg struct {
		Recipients int64
		Pending    int64
		Sent       int64
		Failed     int64
		Opened     int64
		Responded  int64
		OffersSent int64
	}
	var a agg
	s.db.Raw(`
		SELECT COUNT(*)                                          AS recipients,
		       COUNT(*) FILTER (WHERE sms_status = 'Pending')    AS pending,
		       COUNT(*) FILTER (WHERE sms_status = 'Sent')       AS sent,
		       COUNT(*) FILTER (WHERE sms_status = 'Failed')     AS failed,
		       COUNT(*) FILTER (WHERE opened_at IS NOT NULL)     AS opened,
		       COUNT(*) FILTER (WHERE responded_at IS NOT NULL)  AS responded,
		       COUNT(*) FILTER (WHERE offer_sent_at IS NOT NULL) AS offers_sent
		  FROM poll_recipients WHERE poll_id = ?`, pollID).Scan(&a)
	out = PollStats(a)
	return out
}

func (s *Service) mapToDTO(p *Poll, withQuestions bool) (*PollDTO, error) {
	dto := &PollDTO{
		ID:                    p.ID,
		Title:                 p.Title,
		Description:           p.Description,
		Status:                p.Status,
		SMSTemplateKey:        p.SMSTemplateKey,
		OfferSMSTemplateKey:   p.OfferSMSTemplateKey,
		LinkMode:              p.LinkMode,
		FilterCity:            p.FilterCity,
		FilterProvince:        p.FilterProvince,
		FilterProductID:       p.FilterProductID,
		FilterPurchasedBefore: fmtDate(p.FilterPurchasedBefore),
		FilterExpiryBefore:    fmtDate(p.FilterExpiryBefore),
		Stats:                 s.stats(p.ID),
		CreatedAt:             p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:             p.UpdatedAt.Format(time.RFC3339),
		ClosedAt:              fmtTime(p.ClosedAt),
		Questions:             []QuestionDTO{},
	}

	if p.FilterProductID != nil {
		s.db.Table("products").Where("id = ?", *p.FilterProductID).
			Select("name").Scan(&dto.FilterProductName)
	}
	if p.CreatedBy != nil {
		s.db.Table("admins").Where("id = ?", *p.CreatedBy).
			Select("username").Scan(&dto.CreatedByName)
	}
	if withQuestions {
		qs, err := s.questions(p.ID)
		if err != nil {
			return nil, err
		}
		dto.Questions = qs
	}
	return dto, nil
}

func (s *Service) GetByID(id uint) (*PollDTO, error) {
	p, err := s.find(id)
	if err != nil {
		return nil, err
	}
	return s.mapToDTO(p, true)
}

func (s *Service) List(page, limit int, status, search string) (*ListPollsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	q := s.db.Model(&Poll{})
	if status != "" && status != "all" {
		q = q.Where("status = ?", status)
	}
	if search = strings.TrimSpace(search); search != "" {
		q = q.Where("title ILIKE ?", "%"+search+"%")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, internalErr("Failed to count polls")
	}

	var rows []Poll
	if err := q.Offset((page - 1) * limit).Limit(limit).
		Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, internalErr("Failed to list polls")
	}

	out := make([]PollDTO, 0, len(rows))
	for i := range rows {
		// The list does not need every question, only the tallies.
		dto, err := s.mapToDTO(&rows[i], false)
		if err != nil {
			return nil, err
		}
		out = append(out, *dto)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}
	return &ListPollsResponse{Polls: out, Total: total, Page: page, Limit: limit, LastPage: lastPage}, nil
}

// ─── Writes ──────────────────────────────────────────────────────────────────

func questionRows(pollID uint, inputs []QuestionInput) []Question {
	rows := make([]Question, 0, len(inputs))
	for i, in := range inputs {
		rows = append(rows, Question{
			PollID:   pollID,
			Position: i,
			Text:     strings.TrimSpace(in.Text),
			Kind:     in.Kind,
			Options:  strings.Join(cleanOptions(in.Options), "\n"),
			Required: in.Required,
		})
	}
	return rows
}

func cleanOptions(raw []string) []string {
	out := []string{}
	for _, v := range raw {
		if v = strings.TrimSpace(v); v != "" {
			out = append(out, v)
		}
	}
	return out
}

func (s *Service) applyFilters(p *Poll, f AudienceFilterInput) error {
	purchasedBefore, err := parseDate(f.PurchasedBefore)
	if err != nil {
		return err
	}
	expiryBefore, err := parseDate(f.ExpiryBefore)
	if err != nil {
		return err
	}
	p.FilterCity = strings.TrimSpace(f.City)
	p.FilterProvince = strings.TrimSpace(f.Province)
	p.FilterProductID = f.ProductID
	p.FilterPurchasedBefore = purchasedBefore
	p.FilterExpiryBefore = expiryBefore
	return nil
}

func (s *Service) Create(req *CreatePollRequest, adminID uint) (*PollDTO, error) {
	if len(req.Questions) == 0 {
		return nil, ErrNoQuestions
	}

	linkMode := req.LinkMode
	if linkMode == "" {
		linkMode = LinkModeURL
	}

	p := &Poll{
		Title:               strings.TrimSpace(req.Title),
		Description:         strings.TrimSpace(req.Description),
		Status:              StatusDraft,
		SMSTemplateKey:      strings.TrimSpace(req.SMSTemplateKey),
		OfferSMSTemplateKey: strings.TrimSpace(req.OfferSMSTemplateKey),
		LinkMode:            linkMode,
	}
	if adminID != 0 {
		p.CreatedBy = &adminID
	}
	if err := s.applyFilters(p, req.Filters); err != nil {
		return nil, err
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(p).Error; err != nil {
			return err
		}
		rows := questionRows(p.ID, req.Questions)
		return tx.Create(&rows).Error
	})
	if err != nil {
		return nil, internalErr("Failed to create the poll")
	}
	return s.mapToDTO(p, true)
}

func (s *Service) Update(id uint, req *UpdatePollRequest) (*PollDTO, error) {
	p, err := s.find(id)
	if err != nil {
		return nil, err
	}

	if req.Title != "" {
		p.Title = strings.TrimSpace(req.Title)
	}
	if req.Description != nil {
		p.Description = strings.TrimSpace(*req.Description)
	}
	if req.SMSTemplateKey != nil {
		p.SMSTemplateKey = strings.TrimSpace(*req.SMSTemplateKey)
	}
	if req.OfferSMSTemplateKey != nil {
		p.OfferSMSTemplateKey = strings.TrimSpace(*req.OfferSMSTemplateKey)
	}
	if req.LinkMode != "" {
		p.LinkMode = req.LinkMode
	}
	if req.Filters != nil {
		if err := s.applyFilters(p, *req.Filters); err != nil {
			return nil, err
		}
	}

	// Rewriting the questions after invitations have gone out would orphan the
	// answers already given, so it is only allowed while the poll is a draft.
	replaceQuestions := len(req.Questions) > 0
	if replaceQuestions && p.Status != StatusDraft {
		return nil, ErrNotDraft
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(p).Error; err != nil {
			return err
		}
		if replaceQuestions {
			if err := tx.Where("poll_id = ?", p.ID).Delete(&Question{}).Error; err != nil {
				return err
			}
			rows := questionRows(p.ID, req.Questions)
			return tx.Create(&rows).Error
		}
		return nil
	})
	if err != nil {
		return nil, internalErr("Failed to update the poll")
	}
	return s.mapToDTO(p, true)
}

// Close stops further answers without destroying what was collected.
func (s *Service) Close(id uint) (*PollDTO, error) {
	p, err := s.find(id)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	p.Status = StatusClosed
	p.ClosedAt = &now
	if err := s.db.Save(p).Error; err != nil {
		return nil, internalErr("Failed to close the poll")
	}
	return s.mapToDTO(p, true)
}

func (s *Service) Delete(id uint) error {
	p, err := s.find(id)
	if err != nil {
		return err
	}
	// Once customers have been texted, the poll is a record of something that
	// happened. Closing it is the honest way to end it.
	if p.Status != StatusDraft {
		return ErrSentLocked
	}
	if err := s.db.Delete(&Poll{}, id).Error; err != nil {
		return internalErr("Failed to delete the poll")
	}
	return nil
}

// ─── Recipients and results ──────────────────────────────────────────────────

func (s *Service) recipientDTO(r *Recipient) RecipientDTO {
	return RecipientDTO{
		ID:            r.ID,
		CustomerID:    r.CustomerID,
		CustomerName:  r.CustomerName,
		CustomerPhone: r.CustomerPhone,
		CustomerCity:  r.CustomerCity,
		GuaranteeCode: r.GuaranteeCode,
		ProductName:   r.ProductName,
		Token:         r.Token,
		SMSStatus:     r.SMSStatus,
		SMSError:      r.SMSError,
		SentAt:        fmtTime(r.SentAt),
		OpenedAt:      fmtTime(r.OpenedAt),
		RespondedAt:   fmtTime(r.RespondedAt),
		OfferSentAt:   fmtTime(r.OfferSentAt),
		OfferError:    r.OfferError,
	}
}

// ListRecipients pages the audience. respondedOnly narrows it to the people
// worth following up with.
func (s *Service) ListRecipients(pollID uint, page, limit int, smsStatus string, respondedOnly bool, withAnswers bool) (*ListRecipientsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 25
	}

	q := s.db.Model(&Recipient{}).Where("poll_id = ?", pollID)
	if smsStatus != "" && smsStatus != "all" {
		q = q.Where("sms_status = ?", smsStatus)
	}
	if respondedOnly {
		q = q.Where("responded_at IS NOT NULL")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, internalErr("Failed to count the recipients")
	}

	var rows []Recipient
	if err := q.Offset((page - 1) * limit).Limit(limit).
		Order("responded_at DESC NULLS LAST, id").Find(&rows).Error; err != nil {
		return nil, internalErr("Failed to load the recipients")
	}

	out := make([]RecipientDTO, 0, len(rows))
	for i := range rows {
		out = append(out, s.recipientDTO(&rows[i]))
	}

	if withAnswers && len(out) > 0 {
		ids := make([]uint, 0, len(out))
		for _, r := range out {
			ids = append(ids, r.ID)
		}
		type answerRow struct {
			RecipientID  uint
			QuestionID   uint
			QuestionText string
			Kind         string
			AnswerText   string
			AnswerNumber *int
		}
		var answers []answerRow
		s.db.Raw(`
			SELECT a.recipient_id, a.question_id, q.text AS question_text, q.kind,
			       a.answer_text, a.answer_number
			  FROM poll_answers a
			  JOIN poll_questions q ON q.id = a.question_id
			 WHERE a.recipient_id IN ?
			 ORDER BY q.position, q.id`, ids).Scan(&answers)

		byRecipient := map[uint][]AnswerDTO{}
		for _, a := range answers {
			byRecipient[a.RecipientID] = append(byRecipient[a.RecipientID], AnswerDTO{
				QuestionID: a.QuestionID, QuestionText: a.QuestionText, Kind: a.Kind,
				AnswerText: a.AnswerText, AnswerNumber: a.AnswerNumber,
			})
		}
		for i := range out {
			out[i].Answers = byRecipient[out[i].ID]
		}
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}
	return &ListRecipientsResponse{
		Recipients: out, Total: total, Page: page, Limit: limit, LastPage: lastPage,
	}, nil
}

// Results totals each question's answers.
func (s *Service) Results(pollID uint) (*ResultsResponse, error) {
	if _, err := s.find(pollID); err != nil {
		return nil, err
	}

	var questions []Question
	if err := s.db.Where("poll_id = ?", pollID).Order("position, id").Find(&questions).Error; err != nil {
		return nil, internalErr("Failed to load the questions")
	}

	out := &ResultsResponse{Stats: s.stats(pollID), Questions: []QuestionResult{}}

	for _, q := range questions {
		res := QuestionResult{QuestionID: q.ID, Text: q.Text, Kind: q.Kind}

		type answerRow struct {
			AnswerText   string
			AnswerNumber *int
		}
		var rows []answerRow
		s.db.Raw(`SELECT answer_text, answer_number FROM poll_answers
		           WHERE question_id = ? ORDER BY id DESC`, q.ID).Scan(&rows)
		res.Responses = int64(len(rows))

		switch q.Kind {
		case KindRating:
			counts := map[int]int64{}
			var sum, n int64
			for _, r := range rows {
				if r.AnswerNumber == nil {
					continue
				}
				counts[*r.AnswerNumber]++
				sum += int64(*r.AnswerNumber)
				n++
			}
			if n > 0 {
				res.Average = float64(sum) / float64(n)
			}
			for v := 1; v <= 5; v++ {
				res.Breakdown = append(res.Breakdown, ResultBucket{
					Label: strconv.Itoa(v), Count: counts[v],
				})
			}

		case KindYesNo:
			var yes, no int64
			for _, r := range rows {
				if r.AnswerNumber != nil && *r.AnswerNumber == 1 {
					yes++
				} else {
					no++
				}
			}
			res.Breakdown = []ResultBucket{{Label: "yes", Count: yes}, {Label: "no", Count: no}}

		case KindChoice:
			counts := map[string]int64{}
			for _, r := range rows {
				counts[strings.TrimSpace(r.AnswerText)]++
			}
			// Every registered option appears, even at zero, so a gap is
			// visible rather than absent.
			for _, opt := range splitOptions(q.Options) {
				res.Breakdown = append(res.Breakdown, ResultBucket{Label: opt, Count: counts[opt]})
				delete(counts, opt)
			}
			extra := make([]string, 0, len(counts))
			for label := range counts {
				if label != "" {
					extra = append(extra, label)
				}
			}
			sort.Strings(extra)
			for _, label := range extra {
				res.Breakdown = append(res.Breakdown, ResultBucket{Label: label, Count: counts[label]})
			}

		case KindText:
			res.TextAnswers = []string{}
			for _, r := range rows {
				if v := strings.TrimSpace(r.AnswerText); v != "" {
					res.TextAnswers = append(res.TextAnswers, v)
				}
			}
		}

		out.Questions = append(out.Questions, res)
	}
	return out, nil
}
