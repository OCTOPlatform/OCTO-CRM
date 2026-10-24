package service

import (
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
)

type ReportService struct {
	reportRepo *repository.ReportRepository
	auditRepo  *repository.AuditRepository
}

func NewReportService(reportRepo *repository.ReportRepository, auditRepo *repository.AuditRepository) *ReportService {
	return &ReportService{
		reportRepo: reportRepo,
		auditRepo:  auditRepo,
	}
}

func (s *ReportService) GetDashboardSummary(workspaceID string) (*domain.DashboardSummary, error) {
	return s.reportRepo.GetDashboardSummary(workspaceID)
}

func (s *ReportService) GetPipelineFunnel(workspaceID string) ([]domain.StageFunnelItem, error) {
	return s.reportRepo.GetPipelineFunnel(workspaceID)
}

func (s *ReportService) GetLeadSources(workspaceID string) ([]domain.LeadSourceReportItem, error) {
	return s.reportRepo.GetLeadSources(workspaceID)
}

func (s *ReportService) GetActivitySummary(workspaceID string) ([]domain.ActivitySummaryItem, error) {
	return s.reportRepo.GetActivitySummary(workspaceID)
}

func (s *ReportService) ListAuditLogs(workspaceID string, limit int) ([]domain.AuditEvent, error) {
	return s.auditRepo.ListAuditEvents(workspaceID, limit)
}
