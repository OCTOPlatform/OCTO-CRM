package domain

import "time"

// Product represents inventory items
type Product struct {
	ID             string    `json:"id" db:"id"`
	WorkspaceID    string    `json:"workspace_id" db:"workspace_id"`
	SKU            string    `json:"sku" db:"sku"`
	Name           string    `json:"name" db:"name"`
	Category       string    `json:"category" db:"category"`
	Description    string    `json:"description" db:"description"`
	CostPrice      float64   `json:"cost_price" db:"cost_price"`
	SalePrice      float64   `json:"sale_price" db:"sale_price"`
	StockQuantity  int       `json:"stock_quantity" db:"stock_quantity"`
	MinStockAlert  int       `json:"min_stock_alert" db:"min_stock_alert"`
	Unit           string    `json:"unit" db:"unit"`
	IsActive       bool      `json:"is_active" db:"is_active"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type ProductStockMovement struct {
	ID          string    `json:"id" db:"id"`
	WorkspaceID string    `json:"workspace_id" db:"workspace_id"`
	ProductID   string    `json:"product_id" db:"product_id"`
	ProductName string    `json:"product_name,omitempty" db:"product_name"`
	ProductSKU  string    `json:"product_sku,omitempty" db:"product_sku"`
	DealID      *string   `json:"deal_id,omitempty" db:"deal_id"`
	Type        string    `json:"type" db:"type"` // 'in', 'out', 'adjustment', 'deal_won'
	Quantity    int       `json:"quantity" db:"quantity"`
	Notes       string    `json:"notes" db:"notes"`
	CreatedBy   *string   `json:"created_by,omitempty" db:"created_by"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type StockAdjustmentRequest struct {
	Quantity int    `json:"quantity" binding:"required"`
	Type     string `json:"type" binding:"required"` // 'in', 'out', 'adjustment'
	Notes    string `json:"notes"`
}

// Attendance represents workforce staff presence
type Attendance struct {
	ID            string     `json:"id" db:"id"`
	WorkspaceID   string     `json:"workspace_id" db:"workspace_id"`
	UserID        string     `json:"user_id" db:"user_id"`
	UserName      string     `json:"user_name,omitempty" db:"user_name"`
	UserEmail     string     `json:"user_email,omitempty" db:"user_email"`
	Date          string     `json:"date" db:"date"` // 'YYYY-MM-DD'
	CheckIn       *time.Time `json:"check_in" db:"check_in"`
	CheckOut      *time.Time `json:"check_out" db:"check_out"`
	GPSLat        *float64   `json:"gps_lat" db:"gps_lat"`
	GPSLng        *float64   `json:"gps_lng" db:"gps_lng"`
	LocationName  string     `json:"location_name" db:"location_name"`
	Status        string     `json:"status" db:"status"` // 'present', 'late', 'absent', 'on_leave'
	OvertimeHours float64    `json:"overtime_hours" db:"overtime_hours"`
	Notes         string     `json:"notes" db:"notes"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type CheckInRequest struct {
	GPSLat       *float64 `json:"gps_lat"`
	GPSLng       *float64 `json:"gps_lng"`
	LocationName string   `json:"location_name"`
	Notes        string   `json:"notes"`
}

type CheckOutRequest struct {
	Notes string `json:"notes"`
}

type AttendanceSummary struct {
	TotalDaysPresent int     `json:"total_days_present"`
	TotalLateCount   int     `json:"total_late_count"`
	TotalOvertime    float64 `json:"total_overtime"`
	TotalAbsent      int     `json:"total_absent"`
}

// Payroll Components & Dynamic Formulas
type PayrollComponent struct {
	ID                string    `json:"id" db:"id"`
	WorkspaceID       string    `json:"workspace_id" db:"workspace_id"`
	Name              string    `json:"name" db:"name"`
	Code              string    `json:"code" db:"code"`
	Type              string    `json:"type" db:"type"` // 'allowance', 'deduction', 'commission', 'tax'
	FormulaExpression string    `json:"formula_expression" db:"formula_expression"`
	Description       string    `json:"description" db:"description"`
	IsActive          bool      `json:"is_active" db:"is_active"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}

type PayrollSlip struct {
	ID                   string                 `json:"id" db:"id"`
	WorkspaceID          string                 `json:"workspace_id" db:"workspace_id"`
	UserID               string                 `json:"user_id" db:"user_id"`
	UserName             string                 `json:"user_name,omitempty" db:"user_name"`
	UserEmail            string                 `json:"user_email,omitempty" db:"user_email"`
	PeriodMonth          string                 `json:"period_month" db:"period_month"`
	BaseSalary           float64                `json:"base_salary" db:"base_salary"`
	TotalAllowances      float64                `json:"total_allowances" db:"total_allowances"`
	TotalDeductions      float64                `json:"total_deductions" db:"total_deductions"`
	TotalCommissions     float64                `json:"total_commissions" db:"total_commissions"`
	NetSalary            float64                `json:"net_salary" db:"net_salary"`
	Status               string                 `json:"status" db:"status"`
	CalculationBreakdown map[string]interface{} `json:"calculation_breakdown" db:"-"`
	BreakdownRaw         []byte                 `json:"-" db:"calculation_breakdown"`
	CreatedAt            time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at" db:"updated_at"`
}

type FormulaSimulationRequest struct {
	FormulaExpression string             `json:"formula_expression" binding:"required"`
	SampleVariables   map[string]float64 `json:"sample_variables"`
}

type FormulaSimulationResponse struct {
	FormulaExpression string             `json:"formula_expression"`
	EvaluatedResult   float64            `json:"evaluated_result"`
	VariablesUsed     map[string]float64 `json:"variables_used"`
	Error             string             `json:"error,omitempty"`
}

type GeneratePayrollRunRequest struct {
	PeriodMonth string `json:"period_month" binding:"required"` // e.g. "2026-11"
}
