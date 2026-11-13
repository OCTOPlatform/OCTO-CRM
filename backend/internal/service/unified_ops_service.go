package service

import (
	"fmt"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/utils"
)

type UnifiedOpsService struct {
	repo         *repository.UnifiedOpsRepository
	userRepo     *repository.UserRepository
	dealRepo     *repository.DealRepository
}

func NewUnifiedOpsService(
	repo *repository.UnifiedOpsRepository,
	userRepo *repository.UserRepository,
	dealRepo *repository.DealRepository,
) *UnifiedOpsService {
	return &UnifiedOpsService{
		repo:     repo,
		userRepo: userRepo,
		dealRepo: dealRepo,
	}
}

// ================= INVENTORY =================

func (s *UnifiedOpsService) ListProducts(workspaceID, search, category string) ([]domain.Product, error) {
	return s.repo.ListProducts(workspaceID, search, category)
}

func (s *UnifiedOpsService) GetProduct(workspaceID, productID string) (*domain.Product, error) {
	return s.repo.GetProductByID(workspaceID, productID)
}

func (s *UnifiedOpsService) CreateProduct(workspaceID string, p domain.Product) (*domain.Product, error) {
	p.WorkspaceID = workspaceID
	if strings.TrimSpace(p.SKU) == "" {
		p.SKU = fmt.Sprintf("SKU-%d", time.Now().Unix()%100000)
	}
	p.SKU = strings.ToUpper(strings.TrimSpace(p.SKU))
	return s.repo.CreateProduct(p)
}

func (s *UnifiedOpsService) UpdateProduct(workspaceID, productID string, p domain.Product) (*domain.Product, error) {
	p.WorkspaceID = workspaceID
	p.ID = productID
	return s.repo.UpdateProduct(p)
}

func (s *UnifiedOpsService) AdjustStock(workspaceID, productID string, req domain.StockAdjustmentRequest, userID string) error {
	return s.repo.AdjustStock(workspaceID, productID, req, userID)
}

func (s *UnifiedOpsService) ListStockMovements(workspaceID, productID string) ([]domain.ProductStockMovement, error) {
	return s.repo.ListStockMovements(workspaceID, productID)
}

// ================= ATTENDANCE =================

func (s *UnifiedOpsService) CheckIn(workspaceID, userID string, req domain.CheckInRequest) (*domain.Attendance, error) {
	return s.repo.CheckIn(workspaceID, userID, req)
}

func (s *UnifiedOpsService) CheckOut(workspaceID, userID string, req domain.CheckOutRequest) (*domain.Attendance, error) {
	return s.repo.CheckOut(workspaceID, userID, req)
}

func (s *UnifiedOpsService) GetTodayAttendance(workspaceID, userID string) (*domain.Attendance, error) {
	return s.repo.GetTodayAttendance(workspaceID, userID)
}

func (s *UnifiedOpsService) ListAttendances(workspaceID, month, userID string) ([]domain.Attendance, error) {
	return s.repo.ListAttendances(workspaceID, month, userID)
}

func (s *UnifiedOpsService) GetAttendanceSummary(workspaceID, userID, month string) (*domain.AttendanceSummary, error) {
	return s.repo.GetAttendanceSummary(workspaceID, userID, month)
}

// ================= PAYROLL & FORMULA ENGINE =================

func (s *UnifiedOpsService) ListPayrollComponents(workspaceID string) ([]domain.PayrollComponent, error) {
	return s.repo.ListPayrollComponents(workspaceID)
}

func (s *UnifiedOpsService) CreatePayrollComponent(workspaceID string, comp domain.PayrollComponent) (*domain.PayrollComponent, error) {
	comp.WorkspaceID = workspaceID
	comp.Code = strings.ToUpper(strings.TrimSpace(comp.Code))
	// Test evaluate formula syntax before saving
	testVars := map[string]float64{
		"GAJI_POKOK":      5000000,
		"HARI_HADIR":     20,
		"TOTAL_OMSET_WON": 50000000,
		"TOTAL_JAM_LEMBUR": 2,
		"JUMLAH_TERLAMBAT": 1,
		"JUMLAH_DEAL_WON":  3,
		"HARI_ALPA":        0,
		"GAJI_BRUTO":       6000000,
	}
	if _, err := utils.EvaluateFormula(comp.FormulaExpression, testVars); err != nil {
		return nil, fmt.Errorf("sintaks rumus tidak valid: %v", err)
	}
	return s.repo.CreatePayrollComponent(comp)
}

func (s *UnifiedOpsService) UpdatePayrollComponent(workspaceID, compID string, comp domain.PayrollComponent) (*domain.PayrollComponent, error) {
	comp.WorkspaceID = workspaceID
	comp.ID = compID
	testVars := map[string]float64{
		"GAJI_POKOK":      5000000,
		"HARI_HADIR":     20,
		"TOTAL_OMSET_WON": 50000000,
		"TOTAL_JAM_LEMBUR": 2,
		"JUMLAH_TERLAMBAT": 1,
		"JUMLAH_DEAL_WON":  3,
		"HARI_ALPA":        0,
		"GAJI_BRUTO":       6000000,
	}
	if _, err := utils.EvaluateFormula(comp.FormulaExpression, testVars); err != nil {
		return nil, fmt.Errorf("sintaks rumus tidak valid: %v", err)
	}
	return s.repo.UpdatePayrollComponent(comp)
}

func (s *UnifiedOpsService) DeletePayrollComponent(workspaceID, compID string) error {
	return s.repo.DeletePayrollComponent(workspaceID, compID)
}

func (s *UnifiedOpsService) SimulateFormula(req domain.FormulaSimulationRequest) domain.FormulaSimulationResponse {
	vars := req.SampleVariables
	if vars == nil {
		vars = map[string]float64{
			"GAJI_POKOK":      5000000,
			"HARI_HADIR":     22,
			"TOTAL_OMSET_WON": 75000000,
			"TOTAL_JAM_LEMBUR": 4,
			"JUMLAH_TERLAMBAT": 1,
			"JUMLAH_DEAL_WON":  4,
			"HARI_ALPA":        0,
			"GAJI_BRUTO":       7500000,
		}
	}

	result, err := utils.EvaluateFormula(req.FormulaExpression, vars)
	resp := domain.FormulaSimulationResponse{
		FormulaExpression: req.FormulaExpression,
		EvaluatedResult:   result,
		VariablesUsed:     vars,
	}
	if err != nil {
		resp.Error = err.Error()
	}
	return resp
}

func (s *UnifiedOpsService) ListPayrollSlips(workspaceID, periodMonth string) ([]domain.PayrollSlip, error) {
	return s.repo.ListPayrollSlips(workspaceID, periodMonth)
}

func (s *UnifiedOpsService) GenerateMonthlyPayrollRun(workspaceID, periodMonth string) ([]domain.PayrollSlip, error) {
	if periodMonth == "" {
		periodMonth = time.Now().Format("2006-01")
	}

	// 1. Get workspace members
	members, err := s.userRepo.GetWorkspaceMembers(workspaceID)
	if err != nil {
		return nil, err
	}

	// 2. Get active payroll components
	components, err := s.repo.ListPayrollComponents(workspaceID)
	if err != nil {
		return nil, err
	}

	for _, member := range members {
		userID := member.UserID
		baseSalary := 5000000.0 // Default standard base salary

		// Pull attendance summary for period
		attSummary, _ := s.repo.GetAttendanceSummary(workspaceID, userID, periodMonth)
		if attSummary == nil {
			attSummary = &domain.AttendanceSummary{TotalDaysPresent: 20}
		}

		// Pull sales won deals for period from CRM deals
		salesWonVal, salesWonCount, _ := s.repo.GetSalesWonSummary(workspaceID, userID, periodMonth)

		// Base variables map for formula evaluator
		vars := map[string]float64{
			"GAJI_POKOK":       baseSalary,
			"HARI_HADIR":      float64(attSummary.TotalDaysPresent),
			"TOTAL_JAM_LEMBUR": attSummary.TotalOvertime,
			"JUMLAH_TERLAMBAT": float64(attSummary.TotalLateCount),
			"HARI_ALPA":        float64(attSummary.TotalAbsent),
			"TOTAL_OMSET_WON":  salesWonVal,
			"JUMLAH_DEAL_WON":  float64(salesWonCount),
			"GAJI_BRUTO":       baseSalary,
		}

		var totalAllowances, totalDeductions, totalCommissions float64
		breakdownItems := make(map[string]interface{})

		// First pass: allowances and commissions
		for _, comp := range components {
			if comp.Type == "allowance" || comp.Type == "commission" {
				val, err := utils.EvaluateFormula(comp.FormulaExpression, vars)
				if err == nil && val > 0 {
					if comp.Type == "allowance" {
						totalAllowances += val
					} else {
						totalCommissions += val
					}
					breakdownItems[comp.Code] = map[string]interface{}{
						"name":    comp.Name,
						"type":    comp.Type,
						"amount":  val,
						"formula": comp.FormulaExpression,
					}
				}
			}
		}

		// Update GAJI_BRUTO for tax/deductions
		gajiBruto := baseSalary + totalAllowances + totalCommissions
		vars["GAJI_BRUTO"] = gajiBruto

		// Second pass: deductions and taxes
		for _, comp := range components {
			if comp.Type == "deduction" || comp.Type == "tax" {
				val, err := utils.EvaluateFormula(comp.FormulaExpression, vars)
				if err == nil && val > 0 {
					totalDeductions += val
					breakdownItems[comp.Code] = map[string]interface{}{
						"name":    comp.Name,
						"type":    comp.Type,
						"amount":  val,
						"formula": comp.FormulaExpression,
					}
				}
			}
		}

		netSalary := baseSalary + totalAllowances + totalCommissions - totalDeductions
		if netSalary < 0 {
			netSalary = 0
		}

		slip := domain.PayrollSlip{
			WorkspaceID:      workspaceID,
			UserID:           userID,
			UserName:         member.FullName,
			UserEmail:        member.Email,
			PeriodMonth:      periodMonth,
			BaseSalary:       baseSalary,
			TotalAllowances:  totalAllowances,
			TotalDeductions:  totalDeductions,
			TotalCommissions: totalCommissions,
			NetSalary:        netSalary,
			Status:           "approved",
			CalculationBreakdown: map[string]interface{}{
				"items": breakdownItems,
				"metrics": map[string]interface{}{
					"hari_hadir":       attSummary.TotalDaysPresent,
					"jam_lembur":       attSummary.TotalOvertime,
					"telat":            attSummary.TotalLateCount,
					"omset_sales_won":  salesWonVal,
					"jumlah_deal_won":  salesWonCount,
				},
			},
		}

		_ = s.repo.SavePayrollSlip(slip)
	}

	return s.repo.ListPayrollSlips(workspaceID, periodMonth)
}
