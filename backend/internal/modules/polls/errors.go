package polls

import "guarantee-management-system/internal/shared/errors"

var (
	ErrPollNotFound    = errors.NewAppError(errors.ErrNotFound, "Poll not found", 404)
	ErrPollClosed      = errors.NewAppError(errors.ErrValidation, "This poll is closed", 400)
	ErrNotDraft        = errors.NewAppError(errors.ErrValidation, "The questions can only be changed while the poll is a draft", 400)
	ErrNoQuestions     = errors.NewAppError(errors.ErrValidation, "A poll needs at least one question", 400)
	ErrNoTemplate      = errors.NewAppError(errors.ErrValidation, "Choose the SMS pattern that carries the invitation", 400)
	ErrNoOfferTemplate = errors.NewAppError(errors.ErrValidation, "Choose the SMS pattern that carries the offer", 400)
	ErrNoRecipients    = errors.NewAppError(errors.ErrValidation, "Build the audience before sending", 400)
	ErrSMSDisabled     = errors.NewAppError(errors.ErrValidation, "SMS sending is switched off (SMS_ENABLED)", 400)
	ErrNoPublicURL     = errors.NewAppError(errors.ErrValidation,
		"No public address is configured, so a link cannot be built. Set PUBLIC_BASE_URL, or switch this poll to send only the code.", 400)
	ErrBadDate         = errors.NewAppError(errors.ErrValidation, "Dates must look like 2026-09-23", 400)
	ErrBadToken        = errors.NewAppError(errors.ErrNotFound, "This link is not valid", 404)
	ErrAlreadyAnswered = errors.NewAppError(errors.ErrValidation, "You have already answered this poll", 409)
	ErrUnknownQuestion = errors.NewAppError(errors.ErrValidation, "That question does not belong to this poll", 400)
	ErrSentLocked      = errors.NewAppError(errors.ErrValidation, "A poll that has gone out cannot be deleted; close it instead", 400)
)
