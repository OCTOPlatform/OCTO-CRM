package service

import (
	"encoding/json"
	"fmt"
	"strings"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"

	"github.com/google/uuid"
)

type DealService struct {
	dealRepo      *repository.DealRepository
	activityRepo  *repository.ActivityRepository
	auditRepo     *repository.AuditRepository
	pillarService *PillarService
}

func (s *DealService) SetPillarService(ps *PillarService) {
	s.pillarService = ps
}

func NewDealService(dealRepo *repository.DealRepository, activityRepo *repository.ActivityRepository, auditRepo *repository.AuditRepository) *DealService {
	return &DealService{
		dealRepo:     dealRepo,
		activityRepo: activityRepo,
		auditRepo:    auditRepo,
	}
}

// Pipeline operations
func (s *DealService) GetPipelines(workspaceID string) ([]domain.Pipeline, error) {
	return s.dealRepo.GetPipelines(workspaceID)
}

func (s *DealService) CreatePipeline(workspaceID string, req domain.Pipeline) (*domain.Pipeline, error) {
	req.WorkspaceID = workspaceID
	if err := s.dealRepo.CreatePipeline(&req); err != nil {
		return nil, err
	}
	return &req, nil
}

// Deal CRUD
func (s *DealService) CreateDeal(workspaceID, currentUserID string, req domain.CreateDealRequest) (*domain.Deal, error) {
	deal := domain.Deal{
		ID:                uuid.New().String(),
		WorkspaceID:       workspaceID,
		PipelineID:        req.PipelineID,
		StageID:           req.StageID,
		ContactID:         req.ContactID,
		CompanyID:         req.CompanyID,
		OwnerID:           req.OwnerID,
		Title:             strings.TrimSpace(req.Title),
		Value:             req.Value,
		Currency:          req.Currency,
		ExpectedCloseDate: req.ExpectedCloseDate,
		Status:            req.Status,
		Priority:          req.Priority,
		Tags:              req.Tags,
		IsLead:            req.IsLead,
		Notes:             req.Notes,
	}

	if req.Probability != nil {
		deal.Probability = *req.Probability
	}

	if deal.Currency == "" {
		deal.Currency = "IDR"
	}
	if deal.Status == "" {
		deal.Status = domain.DealStatusOpen
	}
	if deal.OwnerID == nil || *deal.OwnerID == "" {
		deal.OwnerID = &currentUserID
	}

	if err := s.dealRepo.CreateDeal(&deal); err != nil {
		return nil, err
	}

	// Create activity
	var contactID string
	if deal.ContactID != nil {
		contactID = *deal.ContactID
	}
	_ = s.activityRepo.CreateActivity(&domain.Activity{
		WorkspaceID: workspaceID,
		ContactID:   contactID,
		DealID:      &deal.ID,
		UserID:      &currentUserID,
		Type:        domain.ActivityStatusChange,
		Subject:     fmt.Sprintf("Peluang penjualan baru dibuat: %s", deal.Title),
		Description: fmt.Sprintf("Nilai peluang: Rp %.0f", deal.Value),
	})

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "deal_created",
		EntityType:  "deal",
		EntityID:    deal.ID,
		Description: fmt.Sprintf("Created deal %s (Value: %.2f)", deal.Title, deal.Value),
	})

	return s.dealRepo.GetDealByID(workspaceID, deal.ID)
}

func (s *DealService) GetDeal(workspaceID, id string) (*domain.Deal, error) {
	return s.dealRepo.GetDealByID(workspaceID, id)
}

func (s *DealService) ListDeals(workspaceID string, filter domain.DealFilter) ([]domain.Deal, error) {
	return s.dealRepo.ListDeals(workspaceID, filter)
}

func (s *DealService) UpdateDeal(workspaceID, currentUserID, id string, req domain.UpdateDealRequest) (*domain.Deal, error) {
	deal, err := s.dealRepo.GetDealByID(workspaceID, id)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		deal.Title = strings.TrimSpace(*req.Title)
	}
	if req.Value != nil {
		deal.Value = *req.Value
	}
	if req.Currency != nil {
		deal.Currency = *req.Currency
	}
	if req.ExpectedCloseDate != nil {
		deal.ExpectedCloseDate = req.ExpectedCloseDate
	}
	if req.PipelineID != nil {
		deal.PipelineID = *req.PipelineID
	}
	if req.StageID != nil {
		deal.StageID = *req.StageID
	}
	if req.ContactID != nil {
		deal.ContactID = req.ContactID
	}
	if req.CompanyID != nil {
		deal.CompanyID = req.CompanyID
	}
	if req.OwnerID != nil {
		deal.OwnerID = req.OwnerID
	}
	if req.Status != nil {
		deal.Status = *req.Status
	}
	if req.Priority != nil {
		deal.Priority = *req.Priority
	}
	if req.Probability != nil {
		deal.Probability = *req.Probability
	}
	if req.Tags != nil {
		deal.Tags = *req.Tags
	}
	if req.IsLead != nil {
		deal.IsLead = *req.IsLead
	}
	if req.LostReason != nil {
		deal.LostReason = *req.LostReason
	}
	if req.Notes != nil {
		deal.Notes = *req.Notes
	}

	if err := s.dealRepo.UpdateDeal(workspaceID, deal); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "deal_updated",
		EntityType:  "deal",
		EntityID:    deal.ID,
		Description: fmt.Sprintf("Updated deal %s", deal.Title),
	})

	return s.dealRepo.GetDealByID(workspaceID, deal.ID)
}

func (s *DealService) UpdateDealPriority(workspaceID, currentUserID, dealID string, priority int) (*domain.Deal, error) {
	if err := s.dealRepo.UpdateDealPriority(workspaceID, dealID, priority); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "deal_priority_changed",
		EntityType:  "deal",
		EntityID:    dealID,
		Description: fmt.Sprintf("Changed deal priority to %d stars", priority),
	})

	return s.dealRepo.GetDealByID(workspaceID, dealID)
}

func (s *DealService) UpdateDealStage(workspaceID, currentUserID, dealID string, req domain.UpdateDealStageRequest) (*domain.Deal, error) {
	oldDeal, err := s.dealRepo.GetDealByID(workspaceID, dealID)
	if err != nil {
		return nil, err
	}

	if err := s.dealRepo.UpdateDealStage(workspaceID, dealID, req.StageID, req.Status, req.LostReason); err != nil {
		return nil, err
	}

	updatedDeal, err := s.dealRepo.GetDealByID(workspaceID, dealID)
	if err != nil {
		return nil, err
	}

	// Record activity
	if updatedDeal.ContactID != nil && *updatedDeal.ContactID != "" {
		desc := fmt.Sprintf("Tahap berpindah dari %s ke %s", oldDeal.StageName, updatedDeal.StageName)
		if updatedDeal.Status == domain.DealStatusLost && updatedDeal.LostReason != "" {
			desc += fmt.Sprintf(" (Alasan Lost: %s)", updatedDeal.LostReason)
		}
		_ = s.activityRepo.CreateActivity(&domain.Activity{
			WorkspaceID: workspaceID,
			ContactID:   *updatedDeal.ContactID,
			DealID:      &updatedDeal.ID,
			UserID:      &currentUserID,
			Type:        domain.ActivityStatusChange,
			Subject:     fmt.Sprintf("Perubahan Tahap Deal: %s", updatedDeal.Title),
			Description: desc,
		})
	}

	meta, _ := json.Marshal(map[string]interface{}{
		"from_stage": oldDeal.StageName,
		"to_stage":   updatedDeal.StageName,
		"status":     updatedDeal.Status,
	})

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "deal_stage_changed",
		EntityType:  "deal",
		EntityID:    dealID,
		Description: fmt.Sprintf("Moved deal %s to stage %s (Status: %s)", updatedDeal.Title, updatedDeal.StageName, updatedDeal.Status),
		Metadata:    meta,
	})

	// Pilar 1: Deal Won Handover Trigger
	if updatedDeal.Status == domain.DealStatusWon && oldDeal.Status != domain.DealStatusWon && s.pillarService != nil {
		go func() {
			_, _ = s.pillarService.HandleDealWonHandover(workspaceID, updatedDeal, currentUserID)
		}()
	}

	return updatedDeal, nil
}

func (s *DealService) DeleteDeal(workspaceID, currentUserID, id string) error {
	if err := s.dealRepo.DeleteDeal(workspaceID, id); err != nil {
		return err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "deal_deleted",
		EntityType:  "deal",
		EntityID:    id,
		Description: fmt.Sprintf("Deleted deal %s", id),
	})

	return nil
}
