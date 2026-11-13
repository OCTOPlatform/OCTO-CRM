package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/jmoiron/sqlx"
)

type UnifiedOpsRepository struct {
	db *sqlx.DB
}

func NewUnifiedOpsRepository(db *sqlx.DB) *UnifiedOpsRepository {
	return &UnifiedOpsRepository{db: db}
}

// ================= INVENTORY & PRODUCTS =================

func (r *UnifiedOpsRepository) ListProducts(workspaceID, search, category string) ([]domain.Product, error) {
	query := `
		SELECT id, workspace_id, sku, name, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit, is_active, created_at, updated_at
		FROM products
		WHERE workspace_id = $1 AND is_active = true
	`
	args := []interface{}{workspaceID}

	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		query += fmt.Sprintf(" AND (LOWER(name) LIKE $%d OR LOWER(sku) LIKE $%d)", len(args), len(args))
	}
	if category != "" && category != "all" {
		args = append(args, category)
		query += fmt.Sprintf(" AND category = $%d", len(args))
	}

	query += " ORDER BY name ASC"

	var products []domain.Product
	err := r.db.Select(&products, query, args...)
	if products == nil {
		products = []domain.Product{}
	}
	return products, err
}

func (r *UnifiedOpsRepository) GetProductByID(workspaceID, productID string) (*domain.Product, error) {
	var prod domain.Product
	query := `SELECT id, workspace_id, sku, name, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit, is_active, created_at, updated_at
	          FROM products WHERE workspace_id = $1 AND id = $2`
	err := r.db.Get(&prod, query, workspaceID, productID)
	if err != nil {
		return nil, err
	}
	return &prod, nil
}

func (r *UnifiedOpsRepository) CreateProduct(p domain.Product) (*domain.Product, error) {
	query := `
		INSERT INTO products (workspace_id, sku, name, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, workspace_id, sku, name, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit, is_active, created_at, updated_at
	`
	var created domain.Product
	err := r.db.Get(&created, query,
		p.WorkspaceID, p.SKU, p.Name, p.Category, p.Description, p.CostPrice, p.SalePrice, p.StockQuantity, p.MinStockAlert, p.Unit,
	)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *UnifiedOpsRepository) UpdateProduct(p domain.Product) (*domain.Product, error) {
	query := `
		UPDATE products
		SET name = $1, category = $2, description = $3, cost_price = $4, sale_price = $5, stock_quantity = $6, min_stock_alert = $7, unit = $8, updated_at = NOW()
		WHERE workspace_id = $9 AND id = $10
		RETURNING id, workspace_id, sku, name, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit, is_active, created_at, updated_at
	`
	var updated domain.Product
	err := r.db.Get(&updated, query,
		p.Name, p.Category, p.Description, p.CostPrice, p.SalePrice, p.StockQuantity, p.MinStockAlert, p.Unit, p.WorkspaceID, p.ID,
	)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *UnifiedOpsRepository) AdjustStock(workspaceID, productID string, req domain.StockAdjustmentRequest, userID string) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Update product stock
	var qtyDelta int
	switch req.Type {
	case "in":
		qtyDelta = req.Quantity
	case "out":
		qtyDelta = -req.Quantity
	case "adjustment":
		// Set absolute
		var currQty int
		if err := tx.Get(&currQty, "SELECT stock_quantity FROM products WHERE workspace_id = $1 AND id = $2", workspaceID, productID); err != nil {
			return err
		}
		qtyDelta = req.Quantity - currQty
	default:
		qtyDelta = req.Quantity
	}

	updateQuery := `
		UPDATE products 
		SET stock_quantity = stock_quantity + $1, updated_at = NOW()
		WHERE workspace_id = $2 AND id = $3
	`
	if _, err := tx.Exec(updateQuery, qtyDelta, workspaceID, productID); err != nil {
		return err
	}

	// Insert movement log
	moveQuery := `
		INSERT INTO product_stock_movements (workspace_id, product_id, type, quantity, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::uuid)
	`
	if _, err := tx.Exec(moveQuery, workspaceID, productID, req.Type, req.Quantity, req.Notes, userID); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *UnifiedOpsRepository) ListStockMovements(workspaceID, productID string) ([]domain.ProductStockMovement, error) {
	query := `
		SELECT m.id, m.workspace_id, m.product_id, p.name AS product_name, p.sku AS product_sku, m.deal_id, m.type, m.quantity, m.notes, m.created_at
		FROM product_stock_movements m
		JOIN products p ON m.product_id = p.id
		WHERE m.workspace_id = $1 AND m.product_id = $2
		ORDER BY m.created_at DESC
		LIMIT 50
	`
	var movements []domain.ProductStockMovement
	err := r.db.Select(&movements, query, workspaceID, productID)
	if movements == nil {
		movements = []domain.ProductStockMovement{}
	}
	return movements, err
}

// ================= ATTENDANCE & WORKFORCE =================

func (r *UnifiedOpsRepository) CheckIn(workspaceID, userID string, req domain.CheckInRequest) (*domain.Attendance, error) {
	now := time.Now()
	dateStr := now.Format("2006-01-02")

	// Determine status (late if after 09:00 AM)
	status := "present"
	if now.Hour() > 9 || (now.Hour() == 9 && now.Minute() > 15) {
		status = "late"
	}

	query := `
		INSERT INTO attendances (workspace_id, user_id, date, check_in, gps_lat, gps_lng, location_name, status, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (workspace_id, user_id, date) DO UPDATE 
		SET check_in = COALESCE(attendances.check_in, EXCLUDED.check_in),
		    gps_lat = COALESCE(EXCLUDED.gps_lat, attendances.gps_lat),
		    gps_lng = COALESCE(EXCLUDED.gps_lng, attendances.gps_lng),
		    location_name = COALESCE(NULLIF(EXCLUDED.location_name, ''), attendances.location_name),
		    updated_at = NOW()
		RETURNING id, workspace_id, user_id, date, check_in, check_out, gps_lat, gps_lng, location_name, status, overtime_hours, notes, created_at, updated_at
	`
	var att domain.Attendance
	err := r.db.Get(&att, query, workspaceID, userID, dateStr, now, req.GPSLat, req.GPSLng, req.LocationName, status, req.Notes)
	if err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *UnifiedOpsRepository) CheckOut(workspaceID, userID string, req domain.CheckOutRequest) (*domain.Attendance, error) {
	now := time.Now()
	dateStr := now.Format("2006-01-02")

	// Calculate overtime if check-out is after 18:00
	var overtime float64 = 0
	if now.Hour() >= 18 {
		overtime = float64(now.Hour()-18) + float64(now.Minute())/60.0
	}

	query := `
		UPDATE attendances
		SET check_out = $1, overtime_hours = $2, notes = CASE WHEN notes = '' THEN $3 ELSE notes || ' | ' || $3 END, updated_at = NOW()
		WHERE workspace_id = $4 AND user_id = $5 AND date = $6
		RETURNING id, workspace_id, user_id, date, check_in, check_out, gps_lat, gps_lng, location_name, status, overtime_hours, notes, created_at, updated_at
	`
	var att domain.Attendance
	err := r.db.Get(&att, query, now, overtime, req.Notes, workspaceID, userID, dateStr)
	if err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *UnifiedOpsRepository) GetTodayAttendance(workspaceID, userID string) (*domain.Attendance, error) {
	dateStr := time.Now().Format("2006-01-02")
	var att domain.Attendance
	query := `
		SELECT a.id, a.workspace_id, a.user_id, u.full_name AS user_name, u.email AS user_email, a.date, a.check_in, a.check_out, a.gps_lat, a.gps_lng, a.location_name, a.status, a.overtime_hours, a.notes, a.created_at, a.updated_at
		FROM attendances a
		JOIN users u ON a.user_id = u.id
		WHERE a.workspace_id = $1 AND a.user_id = $2 AND a.date = $3
	`
	err := r.db.Get(&att, query, workspaceID, userID, dateStr)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &att, nil
}

func (r *UnifiedOpsRepository) ListAttendances(workspaceID, month, userID string) ([]domain.Attendance, error) {
	query := `
		SELECT a.id, a.workspace_id, a.user_id, u.full_name AS user_name, u.email AS user_email, a.date, a.check_in, a.check_out, a.gps_lat, a.gps_lng, a.location_name, a.status, a.overtime_hours, a.notes, a.created_at, a.updated_at
		FROM attendances a
		JOIN users u ON a.user_id = u.id
		WHERE a.workspace_id = $1
	`
	args := []interface{}{workspaceID}

	if month != "" {
		args = append(args, month+"%")
		query += fmt.Sprintf(" AND a.date::text LIKE $%d", len(args))
	}
	if userID != "" {
		args = append(args, userID)
		query += fmt.Sprintf(" AND a.user_id = $%d", len(args))
	}

	query += " ORDER BY a.date DESC, a.created_at DESC LIMIT 100"

	var list []domain.Attendance
	err := r.db.Select(&list, query, args...)
	if list == nil {
		list = []domain.Attendance{}
	}
	return list, err
}

func (r *UnifiedOpsRepository) GetAttendanceSummary(workspaceID, userID, month string) (*domain.AttendanceSummary, error) {
	query := `
		SELECT 
			COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) AS total_days_present,
			COUNT(CASE WHEN status = 'late' THEN 1 END) AS total_late_count,
			COALESCE(SUM(overtime_hours), 0.0) AS total_overtime,
			COUNT(CASE WHEN status = 'absent' THEN 1 END) AS total_absent
		FROM attendances
		WHERE workspace_id = $1 AND user_id = $2 AND date::text LIKE $3
	`
	var summary struct {
		Present  int     `db:"total_days_present"`
		Late     int     `db:"total_late_count"`
		Overtime float64 `db:"total_overtime"`
		Absent   int     `db:"total_absent"`
	}
	err := r.db.Get(&summary, query, workspaceID, userID, month+"%")
	if err != nil {
		return &domain.AttendanceSummary{}, nil
	}
	return &domain.AttendanceSummary{
		TotalDaysPresent: summary.Present,
		TotalLateCount:   summary.Late,
		TotalOvertime:    summary.Overtime,
		TotalAbsent:      summary.Absent,
	}, nil
}

// ================= DYNAMIC PAYROLL & FORMULAS =================

func (r *UnifiedOpsRepository) ListPayrollComponents(workspaceID string) ([]domain.PayrollComponent, error) {
	query := `
		SELECT id, workspace_id, name, code, type, formula_expression, description, is_active, created_at, updated_at
		FROM payroll_components
		WHERE workspace_id = $1 AND is_active = true
		ORDER BY created_at ASC
	`
	var comps []domain.PayrollComponent
	err := r.db.Select(&comps, query, workspaceID)
	if comps == nil {
		comps = []domain.PayrollComponent{}
	}
	return comps, err
}

func (r *UnifiedOpsRepository) CreatePayrollComponent(c domain.PayrollComponent) (*domain.PayrollComponent, error) {
	query := `
		INSERT INTO payroll_components (workspace_id, name, code, type, formula_expression, description)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, workspace_id, name, code, type, formula_expression, description, is_active, created_at, updated_at
	`
	var created domain.PayrollComponent
	err := r.db.Get(&created, query, c.WorkspaceID, c.Name, strings.ToUpper(c.Code), c.Type, c.FormulaExpression, c.Description)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *UnifiedOpsRepository) UpdatePayrollComponent(c domain.PayrollComponent) (*domain.PayrollComponent, error) {
	query := `
		UPDATE payroll_components
		SET name = $1, formula_expression = $2, description = $3, updated_at = NOW()
		WHERE workspace_id = $4 AND id = $5
		RETURNING id, workspace_id, name, code, type, formula_expression, description, is_active, created_at, updated_at
	`
	var updated domain.PayrollComponent
	err := r.db.Get(&updated, query, c.Name, c.FormulaExpression, c.Description, c.WorkspaceID, c.ID)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *UnifiedOpsRepository) DeletePayrollComponent(workspaceID, compID string) error {
	_, err := r.db.Exec("DELETE FROM payroll_components WHERE workspace_id = $1 AND id = $2", workspaceID, compID)
	return err
}

func (r *UnifiedOpsRepository) ListPayrollSlips(workspaceID, periodMonth string) ([]domain.PayrollSlip, error) {
	query := `
		SELECT s.id, s.workspace_id, s.user_id, u.full_name AS user_name, u.email AS user_email, s.period_month, s.base_salary, s.total_allowances, s.total_deductions, s.total_commissions, s.net_salary, s.status, s.calculation_breakdown, s.created_at, s.updated_at
		FROM payroll_slips s
		JOIN users u ON s.user_id = u.id
		WHERE s.workspace_id = $1
	`
	args := []interface{}{workspaceID}
	if periodMonth != "" {
		args = append(args, periodMonth)
		query += fmt.Sprintf(" AND s.period_month = $%d", len(args))
	}
	query += " ORDER BY s.net_salary DESC"

	var slips []domain.PayrollSlip
	err := r.db.Select(&slips, query, args...)
	if slips == nil {
		slips = []domain.PayrollSlip{}
	}
	for i := range slips {
		if len(slips[i].BreakdownRaw) > 0 {
			var m map[string]interface{}
			if err := json.Unmarshal(slips[i].BreakdownRaw, &m); err == nil {
				slips[i].CalculationBreakdown = m
			}
		}
	}
	return slips, err
}

func (r *UnifiedOpsRepository) SavePayrollSlip(s domain.PayrollSlip) error {
	query := `
		INSERT INTO payroll_slips (workspace_id, user_id, period_month, base_salary, total_allowances, total_deductions, total_commissions, net_salary, status, calculation_breakdown)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (workspace_id, user_id, period_month) DO UPDATE
		SET base_salary = EXCLUDED.base_salary,
		    total_allowances = EXCLUDED.total_allowances,
		    total_deductions = EXCLUDED.total_deductions,
		    total_commissions = EXCLUDED.total_commissions,
		    net_salary = EXCLUDED.net_salary,
		    status = EXCLUDED.status,
		    calculation_breakdown = EXCLUDED.calculation_breakdown,
		    updated_at = NOW()
	`
	breakdownJSON, _ := json.Marshal(s.CalculationBreakdown)
	_, err := r.db.Exec(query,
		s.WorkspaceID, s.UserID, s.PeriodMonth, s.BaseSalary, s.TotalAllowances, s.TotalDeductions, s.TotalCommissions, s.NetSalary, s.Status, breakdownJSON,
	)
	return err
}

func (r *UnifiedOpsRepository) GetSalesWonSummary(workspaceID, userID, periodMonth string) (float64, int, error) {
	// Deals won by owner in periodMonth (e.g. '2026-11%')
	query := `
		SELECT COALESCE(SUM(value), 0.0) AS total_won, COUNT(id) AS count_won
		FROM deals
		WHERE workspace_id = $1 AND owner_id = $2 AND status = 'won' AND updated_at::text LIKE $3
	`
	var res struct {
		TotalWon float64 `db:"total_won"`
		CountWon int     `db:"count_won"`
	}
	err := r.db.Get(&res, query, workspaceID, userID, periodMonth+"%")
	if err != nil {
		return 0, 0, nil
	}
	return res.TotalWon, res.CountWon, nil
}
