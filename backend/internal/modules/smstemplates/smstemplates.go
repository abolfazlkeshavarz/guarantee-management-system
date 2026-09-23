// Package smstemplates manages the Melli Payamak "body" patterns the system
// sends against. They used to be SMS_BODY_ID_* environment variables, which
// meant registering a new pattern required editing .env and redeploying.
//
// Every pattern is now a row: the built-in ones are wired to code paths and
// can only be re-pointed, while custom ones can be added freely and picked by
// name when sending a campaign (poll invitations, offers).
package smstemplates

import (
	"strings"
	"sync"
	"time"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/sms"

	"gorm.io/gorm"
)

type SMSTemplate struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"size:60;uniqueIndex;not null" json:"key"`
	Title       string    `gorm:"size:120;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	BodyID      int       `gorm:"not null;default:0" json:"body_id"`
	SampleText  string    `gorm:"type:text" json:"sample_text"`
	IsActive    bool      `gorm:"not null;default:true" json:"is_active"`
	IsBuiltin   bool      `gorm:"not null;default:false" json:"is_builtin"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (SMSTemplate) TableName() string { return "sms_templates" }

// ─── Service ─────────────────────────────────────────────────────────────────

type Service struct {
	db *gorm.DB

	mu    sync.RWMutex
	cache map[string]SMSTemplate
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db, cache: map[string]SMSTemplate{}}
}

// Bootstrap fills in any pattern that has never been configured from the
// environment defaults, loads the cache, and installs the resolver the sms
// package asks. Called once at startup.
func (s *Service) Bootstrap() error {
	for key, envID := range sms.EnvBodyIDs() {
		if envID <= 0 {
			continue
		}
		// Only rows still at 0: an admin's edit always wins over .env.
		if err := s.db.Model(&SMSTemplate{}).
			Where("key = ? AND body_id = 0", key).
			Update("body_id", envID).Error; err != nil {
			return err
		}
	}
	if err := s.reload(); err != nil {
		return err
	}
	sms.SetResolver(s.resolve)
	return nil
}

func (s *Service) reload() error {
	var rows []SMSTemplate
	if err := s.db.Find(&rows).Error; err != nil {
		return err
	}
	next := make(map[string]SMSTemplate, len(rows))
	for _, r := range rows {
		next[r.Key] = r
	}
	s.mu.Lock()
	s.cache = next
	s.mu.Unlock()
	return nil
}

// resolve is what the sms package calls for every message. A key with no row
// reports active=true with id 0 so the caller falls back to .env rather than
// going silent on a deployment whose rows were never created.
func (s *Service) resolve(key string) (int, bool) {
	s.mu.RLock()
	t, ok := s.cache[key]
	s.mu.RUnlock()
	if !ok {
		return 0, true
	}
	return t.BodyID, t.IsActive
}

func (s *Service) List() ([]SMSTemplate, error) {
	var rows []SMSTemplate
	// Built-ins first: they are the ones that must be configured for the
	// system to work at all.
	err := s.db.Order("is_builtin DESC, title ASC").Find(&rows).Error
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list SMS patterns", 500)
	}
	return rows, nil
}

// Usable lists the patterns a campaign may send against: active, with a real
// bodyId. Built-ins are included - an admin may well want the office's
// existing approved pattern for an offer.
func (s *Service) Usable() ([]SMSTemplate, error) {
	var rows []SMSTemplate
	err := s.db.Where("is_active = ? AND body_id > 0", true).Order("title ASC").Find(&rows).Error
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list SMS patterns", 500)
	}
	return rows, nil
}

func (s *Service) find(id uint) (*SMSTemplate, error) {
	var t SMSTemplate
	if err := s.db.First(&t, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find the SMS pattern", 500)
	}
	return &t, nil
}

type CreateRequest struct {
	Key         string `json:"key" binding:"required,min=2,max=60"`
	Title       string `json:"title" binding:"required,min=2,max=120"`
	Description string `json:"description"`
	BodyID      int    `json:"body_id" binding:"min=0"`
	SampleText  string `json:"sample_text"`
}

type UpdateRequest struct {
	Title       string  `json:"title" binding:"omitempty,min=2,max=120"`
	Description *string `json:"description"`
	BodyID      *int    `json:"body_id"`
	SampleText  *string `json:"sample_text"`
	IsActive    *bool   `json:"is_active"`
}

// normalizeKey keeps custom keys to the shape the code uses for built-ins, so
// they are safe to put in a URL or a config file later.
func normalizeKey(raw string) string {
	k := strings.ToLower(strings.TrimSpace(raw))
	var b strings.Builder
	for _, r := range k {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '_' || r == '-' || r == ' ':
			b.WriteRune('_')
		}
	}
	return strings.Trim(b.String(), "_")
}

func (s *Service) Create(req *CreateRequest) (*SMSTemplate, error) {
	key := normalizeKey(req.Key)
	if key == "" {
		return nil, ErrBadKey
	}

	var count int64
	s.db.Model(&SMSTemplate{}).Where("key = ?", key).Count(&count)
	if count > 0 {
		return nil, ErrDuplicateKey
	}

	t := &SMSTemplate{
		Key:         key,
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		BodyID:      req.BodyID,
		SampleText:  strings.TrimSpace(req.SampleText),
		IsActive:    true,
		IsBuiltin:   false,
	}
	if err := s.db.Create(t).Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create the SMS pattern", 500)
	}
	_ = s.reload()
	return t, nil
}

func (s *Service) Update(id uint, req *UpdateRequest) (*SMSTemplate, error) {
	t, err := s.find(id)
	if err != nil {
		return nil, err
	}

	if req.Title != "" {
		t.Title = strings.TrimSpace(req.Title)
	}
	if req.Description != nil {
		t.Description = strings.TrimSpace(*req.Description)
	}
	if req.SampleText != nil {
		t.SampleText = strings.TrimSpace(*req.SampleText)
	}
	if req.BodyID != nil {
		if *req.BodyID < 0 {
			return nil, ErrBadBodyID
		}
		t.BodyID = *req.BodyID
	}
	if req.IsActive != nil {
		// A built-in that is switched off stops a working notification, so it
		// is allowed but deliberate - the UI warns about it.
		t.IsActive = *req.IsActive
	}

	if err := s.db.Save(t).Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update the SMS pattern", 500)
	}
	_ = s.reload()
	return t, nil
}

func (s *Service) Delete(id uint) error {
	t, err := s.find(id)
	if err != nil {
		return err
	}
	if t.IsBuiltin {
		return ErrBuiltinLocked
	}
	if err := s.db.Delete(&SMSTemplate{}, id).Error; err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete the SMS pattern", 500)
	}
	_ = s.reload()
	return nil
}

// SendTest fires one message against this pattern so an admin can confirm the
// bodyId is the right one before relying on it.
func (s *Service) SendTest(id uint, to, text string) error {
	t, err := s.find(id)
	if err != nil {
		return err
	}
	if t.BodyID <= 0 {
		return ErrNoBodyID
	}
	if strings.TrimSpace(to) == "" {
		return errors.NewAppError(errors.ErrValidation, "Enter a phone number to send the test to", 400)
	}
	if strings.TrimSpace(text) == "" {
		text = "تست"
	}
	if err := sms.Send(t.Key, text, to); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, err.Error(), 502)
	}
	return nil
}

var (
	ErrNotFound      = errors.NewAppError(errors.ErrNotFound, "SMS pattern not found", 404)
	ErrDuplicateKey  = errors.NewAppError(errors.ErrDuplicateEntry, "An SMS pattern with that key already exists", 409)
	ErrBadKey        = errors.NewAppError(errors.ErrValidation, "Use letters, numbers and underscores for the key", 400)
	ErrBadBodyID     = errors.NewAppError(errors.ErrValidation, "Body id must be zero or a positive number", 400)
	ErrBuiltinLocked = errors.NewAppError(errors.ErrValidation, "Built-in patterns cannot be deleted, only re-pointed", 400)
	ErrNoBodyID      = errors.NewAppError(errors.ErrValidation, "Set a body id on this pattern before testing it", 400)
)
