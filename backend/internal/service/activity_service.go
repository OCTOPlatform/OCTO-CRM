package service

import (
	"encoding/json"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"

	"github.com/google/uuid"
)

type ActivityService struct {
	activityRepo *repository.ActivityRepository
	auditRepo    *repository.AuditRepository
}

func NewActivityService(activityRepo *repository.ActivityRepository, auditRepo *repository.AuditRepository) *ActivityService {
	return &ActivityService{
		activityRepo: activityRepo,
		auditRepo:    auditRepo,
	}
}

func (s *ActivityService) CreateActivity(workspaceID, currentUserID string, req domain.CreateActivityRequest) (*domain.Activity, error) {
	activity := domain.Activity{
		ID:          uuid.New().String(),
		WorkspaceID: workspaceID,
		ContactID:   req.ContactID,
		DealID:      req.DealID,
		UserID:      &currentUserID,
		Type:        req.Type,
		Subject:     strings.TrimSpace(req.Subject),
		Description: strings.TrimSpace(req.Description),
		Metadata:    req.Metadata,
		CreatedAt:   time.Now(),
	}

	if len(activity.Metadata) == 0 {
		activity.Metadata = json.RawMessage("{}")
	}

	if err := s.activityRepo.CreateActivity(&activity); err != nil {
		return nil, err
	}

	return &activity, nil
}

func (s *ActivityService) ListContactActivities(workspaceID, contactID string) ([]domain.Activity, error) {
	return s.activityRepo.ListActivitiesByContact(workspaceID, contactID)
}

func (s *ActivityService) ListDealActivities(workspaceID, dealID string) ([]domain.Activity, error) {
	return s.activityRepo.ListActivitiesByDeal(workspaceID, dealID)
}

func (s *ActivityService) ListRecentActivities(workspaceID string, limit int) ([]domain.Activity, error) {
	return s.activityRepo.ListRecentActivities(workspaceID, limit)
}
