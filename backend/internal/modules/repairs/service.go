package repairs

import (
    "time"
    "guarantee-management-system/internal/shared/errors"
    "gorm.io/gorm"
)

type RepairService struct {
    repo *RepairRepository
    db   *gorm.DB
}

func NewRepairService(repo *RepairRepository, db *gorm.DB) *RepairService {
    return &RepairService{repo: repo, db: db}
}

func (s *RepairService) Create(req *CreateRepairRequest) (*RepairDTO, error) {
    // Verify guarantee exists
    var exists bool
    if err := s.db.Table("guarantees").Where("id = ? AND deleted_at IS NULL", req.GuaranteeID).Select("count(*) > 0").Find(&exists).Error; err != nil {
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify guarantee", 500)
    }
    if !exists {
        return nil, errors.NewAppError(errors.ErrNotFound, "Guarantee not found", 404)
    }

    repair := &Repair{
        GuaranteeID:  req.GuaranteeID,
        TechnicianID: req.TechnicianID,
        Status:       StatusPending,
        Description:  req.Description,
    }

    if err := s.repo.Create(repair); err != nil {
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create repair", 500)
    }

    return s.mapToDTO(repair), nil
}

func (s *RepairService) GetByID(id uint) (*RepairDTO, error) {
    repair, err := s.repo.FindByID(id)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, ErrRepairNotFound
        }
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find repair", 500)
    }
    return s.mapToDTO(repair), nil
}

func (s *RepairService) List(page, limit int, status string) (*ListRepairsResponse, error) {
    if page < 1 {
        page = 1
    }
    if limit < 1 || limit > 100 {
        limit = 10
    }

    repairs, total, err := s.repo.FindAll(page, limit, status)
    if err != nil {
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list repairs", 500)
    }

    dtos := make([]RepairDTO, len(repairs))
    for i, repair := range repairs {
        dtos[i] = *s.mapToDTO(&repair)
    }

    lastPage := int(total) / limit
    if int(total)%limit != 0 {
        lastPage++
    }

    return &ListRepairsResponse{
        Repairs:  dtos,
        Total:    total,
        Page:     page,
        Limit:    limit,
        LastPage: lastPage,
    }, nil
}

func (s *RepairService) Update(id uint, req *UpdateRepairRequest) (*RepairDTO, error) {
    repair, err := s.repo.FindByID(id)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, ErrRepairNotFound
        }
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find repair", 500)
    }

    // Prevent updates if completed or cancelled
    if repair.Status == StatusCompleted || repair.Status == StatusCancelled {
        return nil, ErrCannotUpdate
    }

    if req.TechnicianID != nil {
        repair.TechnicianID = req.TechnicianID
    }

    if req.Status != "" {
        // Validate status transition
        if !s.isValidTransition(repair.Status, req.Status) {
            return nil, ErrInvalidStatus
        }
        repair.Status = req.Status

        // Set timestamps based on status
        now := time.Now()
        if req.Status == StatusInProgress && repair.StartedAt == nil {
            repair.StartedAt = &now
        } else if req.Status == StatusCompleted {
            repair.CompletedAt = &now
        }
    }

    if req.Description != "" {
        repair.Description = req.Description
    }

    if err := s.repo.Update(repair); err != nil {
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update repair", 500)
    }

    return s.mapToDTO(repair), nil
}

func (s *RepairService) Delete(id uint) error {
    if err := s.repo.Delete(id); err != nil {
        if err == gorm.ErrRecordNotFound {
            return ErrRepairNotFound
        }
        return errors.NewAppError(errors.ErrInternalServer, "Failed to delete repair", 500)
    }
    return nil
}

func (s *RepairService) isValidTransition(current, new string) bool {
    // Define valid transitions
    validTransitions := map[string][]string{
        StatusPending:    {StatusInProgress, StatusCancelled},
        StatusInProgress: {StatusCompleted, StatusCancelled},
        StatusCompleted:  {},
        StatusCancelled:  {},
    }

    allowed, ok := validTransitions[current]
    if !ok {
        return false
    }

    for _, status := range allowed {
        if status == new {
            return true
        }
    }
    return false
}

func (s *RepairService) mapToDTO(repair *Repair) *RepairDTO {
    dto := &RepairDTO{
        ID:          repair.ID,
        GuaranteeID: repair.GuaranteeID,
        TechnicianID: repair.TechnicianID,
        Status:      repair.Status,
        Description: repair.Description,
        CreatedAt:   repair.CreatedAt.Format(time.RFC3339),
        UpdatedAt:   repair.UpdatedAt.Format(time.RFC3339),
    }

    if repair.StartedAt != nil {
        started := repair.StartedAt.Format(time.RFC3339)
        dto.StartedAt = &started
    }
    if repair.CompletedAt != nil {
        completed := repair.CompletedAt.Format(time.RFC3339)
        dto.CompletedAt = &completed
    }

    return dto
}