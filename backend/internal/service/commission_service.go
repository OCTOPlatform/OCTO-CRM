package service

import (
	"errors"
	"math"
	"time"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
)

type CommissionService struct {
	repo         *repository.CommissionRepository
	userRepo     *repository.UserRepository
	dealRepo     *repository.DealRepository
}

func NewCommissionService(
	repo *repository.CommissionRepository,
	userRepo *repository.UserRepository,
	dealRepo *repository.DealRepository,
) *CommissionService {
	return &CommissionService{
		repo:     repo,
		userRepo: userRepo,
		dealRepo: dealRepo,
	}
}

// -----------------------------------------------------------------------------
// Commission Plans
// -----------------------------------------------------------------------------

func (s *CommissionService) ListPlans(workspaceID string) ([]domain.SalesCommissionPlan, error) {
	return s.repo.ListPlans(workspaceID)
}

func (s *CommissionService) CreatePlan(workspaceID string, req domain.CreateCommissionPlanRequest) (*domain.SalesCommissionPlan, error) {
	calcType := req.CalculationType
	if calcType == "" {
		calcType = "percentage_deal"
	}
	baseRate := req.BaseRate
	if baseRate <= 0 {
		baseRate = 2.50
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	plan := domain.SalesCommissionPlan{
		WorkspaceID:     workspaceID,
		Name:            req.Name,
		CalculationType: calcType,
		BaseRate:        baseRate,
		ThresholdAmount: req.ThresholdAmount,
		BonusRate:       req.BonusRate,
		IsActive:        isActive,
	}
	return s.repo.CreatePlan(workspaceID, plan)
}

func (s *CommissionService) UpdatePlan(workspaceID, id string, req domain.UpdateCommissionPlanRequest) (*domain.SalesCommissionPlan, error) {
	return s.repo.UpdatePlan(workspaceID, id, req)
}

// -----------------------------------------------------------------------------
// Sales Commissions
// -----------------------------------------------------------------------------

func (s *CommissionService) ListCommissions(workspaceID, period, status, userID string) ([]domain.SalesCommission, error) {
	return s.repo.ListCommissions(workspaceID, period, status, userID)
}

func (s *CommissionService) UpdateCommissionStatus(workspaceID, id, status, approverID string, notes *string) error {
	if status != "approved" && status != "rejected" && status != "pending" {
		return errors.New("invalid status: must be approved, rejected, or pending")
	}
	var appPtr *string
	if status == "approved" {
		appPtr = &approverID
	}
	return s.repo.UpdateCommissionStatus(workspaceID, id, status, appPtr, notes)
}

func (s *CommissionService) GetCommissionSummary(workspaceID, period string) (*domain.CommissionSummary, error) {
	return s.repo.GetCommissionSummary(workspaceID, period)
}

func (s *CommissionService) AutoCalculateCommissionForDeal(
	workspaceID string,
	dealID string,
	invoiceID *string,
	dealTitle string,
	amount float64,
	ownerID string,
) (*domain.SalesCommission, error) {
	if ownerID == "" {
		return nil, nil // No sales rep assigned
	}

	// 1. Get active commission plan
	plan, err := s.repo.GetActivePlan(workspaceID)
	baseRate := 2.50
	bonusRate := 0.0
	threshold := 0.0
	calcType := "percentage_deal"
	var planID *string

	if err == nil && plan != nil {
		planID = &plan.ID
		baseRate = plan.BaseRate
		bonusRate = plan.BonusRate
		threshold = plan.ThresholdAmount
		calcType = plan.CalculationType
	}

	// 2. Calculate commission amount
	var commissionAmount float64
	var effectiveRate float64

	switch calcType {
	case "fixed_amount":
		commissionAmount = baseRate
		effectiveRate = (commissionAmount / amount) * 100
	case "tiered_threshold":
		if threshold > 0 && amount > threshold {
			// Tiered bonus: base on threshold + bonus on excess
			baseComm := threshold * (baseRate / 100)
			bonusComm := (amount - threshold) * ((baseRate + bonusRate) / 100)
			commissionAmount = baseComm + bonusComm
			effectiveRate = (commissionAmount / amount) * 100
		} else {
			effectiveRate = baseRate
			commissionAmount = amount * (baseRate / 100)
		}
	default: // percentage_deal
		effectiveRate = baseRate
		commissionAmount = amount * (baseRate / 100)
	}

	effectiveRate = math.Round(effectiveRate*100) / 100
	commissionAmount = math.Round(commissionAmount*100) / 100

	period := time.Now().Format("2006-01")

	// 3. Save commission record (auto-approved)
	comm := domain.SalesCommission{
		WorkspaceID:      workspaceID,
		UserID:           ownerID,
		DealID:           &dealID,
		InvoiceID:        invoiceID,
		PlanID:           planID,
		DealTitle:        dealTitle,
		DealAmount:       amount,
		CommissionRate:   effectiveRate,
		CommissionAmount: commissionAmount,
		Status:           "approved", // Auto-approved upon deal win / invoice paid
		Period:           period,
		Notes:            "Perhitungan komisi otomatis saat invoice dibayar / deal closing",
	}

	return s.repo.CreateCommission(workspaceID, comm)
}

// -----------------------------------------------------------------------------
// War-Room & Leaderboard
// -----------------------------------------------------------------------------

func (s *CommissionService) GetWarRoomStats(workspaceID, period string) (*domain.WarRoomStats, error) {
	return s.repo.GetWarRoomStats(workspaceID, period)
}

func (s *CommissionService) SetTeamTarget(workspaceID string, req domain.SetSalesTeamTargetRequest) error {
	period := req.Period
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	return s.repo.SetTeamTarget(workspaceID, period, req.TargetAmount)
}
