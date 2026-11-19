package repository

import (
	"fmt"
	"math"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/jmoiron/sqlx"
)

type CommissionRepository struct {
	db *sqlx.DB
}

func NewCommissionRepository(db *sqlx.DB) *CommissionRepository {
	return &CommissionRepository{db: db}
}

// -----------------------------------------------------------------------------
// Commission Plans
// -----------------------------------------------------------------------------

func (r *CommissionRepository) ListPlans(workspaceID string) ([]domain.SalesCommissionPlan, error) {
	query := `
		SELECT id, workspace_id, name, calculation_type, base_rate, threshold_amount, bonus_rate, is_active, created_at, updated_at
		FROM sales_commission_plans
		WHERE workspace_id = $1
		ORDER BY created_at DESC
	`
	var plans []domain.SalesCommissionPlan
	err := r.db.Select(&plans, query, workspaceID)
	if err != nil {
		return nil, err
	}
	return plans, nil
}

func (r *CommissionRepository) GetPlanByID(workspaceID, id string) (*domain.SalesCommissionPlan, error) {
	query := `
		SELECT id, workspace_id, name, calculation_type, base_rate, threshold_amount, bonus_rate, is_active, created_at, updated_at
		FROM sales_commission_plans
		WHERE workspace_id = $1 AND id = $2
	`
	var plan domain.SalesCommissionPlan
	err := r.db.Get(&plan, query, workspaceID, id)
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *CommissionRepository) GetActivePlan(workspaceID string) (*domain.SalesCommissionPlan, error) {
	query := `
		SELECT id, workspace_id, name, calculation_type, base_rate, threshold_amount, bonus_rate, is_active, created_at, updated_at
		FROM sales_commission_plans
		WHERE workspace_id = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT 1
	`
	var plan domain.SalesCommissionPlan
	err := r.db.Get(&plan, query, workspaceID)
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *CommissionRepository) CreatePlan(workspaceID string, plan domain.SalesCommissionPlan) (*domain.SalesCommissionPlan, error) {
	query := `
		INSERT INTO sales_commission_plans (workspace_id, name, calculation_type, base_rate, threshold_amount, bonus_rate, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, workspace_id, name, calculation_type, base_rate, threshold_amount, bonus_rate, is_active, created_at, updated_at
	`
	var created domain.SalesCommissionPlan
	err := r.db.QueryRowx(query,
		workspaceID, plan.Name, plan.CalculationType, plan.BaseRate, plan.ThresholdAmount, plan.BonusRate, plan.IsActive,
	).StructScan(&created)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *CommissionRepository) UpdatePlan(workspaceID, id string, req domain.UpdateCommissionPlanRequest) (*domain.SalesCommissionPlan, error) {
	current, err := r.GetPlanByID(workspaceID, id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		current.Name = *req.Name
	}
	if req.CalculationType != nil {
		current.CalculationType = *req.CalculationType
	}
	if req.BaseRate != nil {
		current.BaseRate = *req.BaseRate
	}
	if req.ThresholdAmount != nil {
		current.ThresholdAmount = *req.ThresholdAmount
	}
	if req.BonusRate != nil {
		current.BonusRate = *req.BonusRate
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	query := `
		UPDATE sales_commission_plans
		SET name = $1, calculation_type = $2, base_rate = $3, threshold_amount = $4, bonus_rate = $5, is_active = $6, updated_at = NOW()
		WHERE workspace_id = $7 AND id = $8
		RETURNING id, workspace_id, name, calculation_type, base_rate, threshold_amount, bonus_rate, is_active, created_at, updated_at
	`
	var updated domain.SalesCommissionPlan
	err = r.db.QueryRowx(query,
		current.Name, current.CalculationType, current.BaseRate, current.ThresholdAmount, current.BonusRate, current.IsActive,
		workspaceID, id,
	).StructScan(&updated)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

// -----------------------------------------------------------------------------
// Sales Commissions
// -----------------------------------------------------------------------------

func (r *CommissionRepository) ListCommissions(workspaceID, period, status, userID string) ([]domain.SalesCommission, error) {
	query := `
		SELECT 
			sc.id, sc.workspace_id, sc.user_id, sc.deal_id, sc.invoice_id, sc.plan_id,
			sc.deal_title, sc.deal_amount, sc.commission_rate, sc.commission_amount,
			sc.status, sc.period, sc.approved_by, sc.approved_at, sc.paid_payroll_slip_id,
			sc.notes, sc.created_at, sc.updated_at,
			COALESCE(u.full_name, '') AS user_name,
			COALESCE(u.email, '') AS user_email,
			COALESCE(p.name, 'Default Plan') AS plan_name
		FROM sales_commissions sc
		JOIN users u ON sc.user_id = u.id
		LEFT JOIN sales_commission_plans p ON sc.plan_id = p.id
		WHERE sc.workspace_id = $1
	`
	args := []interface{}{workspaceID}

	if period != "" && period != "all" {
		args = append(args, period)
		query += fmt.Sprintf(" AND sc.period = $%d", len(args))
	}
	if status != "" && status != "all" {
		args = append(args, status)
		query += fmt.Sprintf(" AND sc.status = $%d", len(args))
	}
	if userID != "" && userID != "all" {
		args = append(args, userID)
		query += fmt.Sprintf(" AND sc.user_id = $%d", len(args))
	}

	query += " ORDER BY sc.created_at DESC"

	var comms []domain.SalesCommission
	err := r.db.Select(&comms, query, args...)
	if err != nil {
		return nil, err
	}
	return comms, nil
}

func (r *CommissionRepository) GetCommissionByID(workspaceID, id string) (*domain.SalesCommission, error) {
	query := `
		SELECT 
			sc.id, sc.workspace_id, sc.user_id, sc.deal_id, sc.invoice_id, sc.plan_id,
			sc.deal_title, sc.deal_amount, sc.commission_rate, sc.commission_amount,
			sc.status, sc.period, sc.approved_by, sc.approved_at, sc.paid_payroll_slip_id,
			sc.notes, sc.created_at, sc.updated_at,
			COALESCE(u.full_name, '') AS user_name,
			COALESCE(u.email, '') AS user_email,
			COALESCE(p.name, 'Default Plan') AS plan_name
		FROM sales_commissions sc
		JOIN users u ON sc.user_id = u.id
		LEFT JOIN sales_commission_plans p ON sc.plan_id = p.id
		WHERE sc.workspace_id = $1 AND sc.id = $2
	`
	var comm domain.SalesCommission
	err := r.db.Get(&comm, query, workspaceID, id)
	if err != nil {
		return nil, err
	}
	return &comm, nil
}

func (r *CommissionRepository) CreateCommission(workspaceID string, comm domain.SalesCommission) (*domain.SalesCommission, error) {
	query := `
		INSERT INTO sales_commissions (
			workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title,
			deal_amount, commission_rate, commission_amount, status, period, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title,
		          deal_amount, commission_rate, commission_amount, status, period,
		          approved_by, approved_at, paid_payroll_slip_id, notes, created_at, updated_at
	`
	var created domain.SalesCommission
	err := r.db.QueryRowx(query,
		workspaceID, comm.UserID, comm.DealID, comm.InvoiceID, comm.PlanID, comm.DealTitle,
		comm.DealAmount, comm.CommissionRate, comm.CommissionAmount, comm.Status, comm.Period, comm.Notes,
	).StructScan(&created)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *CommissionRepository) UpdateCommissionStatus(workspaceID, id, status string, approvedBy *string, notes *string) error {
	var query string
	var err error

	if status == "approved" {
		query = `
			UPDATE sales_commissions
			SET status = $1, approved_by = $2, approved_at = NOW(),
			    notes = COALESCE($3, notes), updated_at = NOW()
			WHERE workspace_id = $4 AND id = $5
		`
		_, err = r.db.Exec(query, status, approvedBy, notes, workspaceID, id)
	} else {
		query = `
			UPDATE sales_commissions
			SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
			WHERE workspace_id = $3 AND id = $4
		`
		_, err = r.db.Exec(query, status, notes, workspaceID, id)
	}
	return err
}

func (r *CommissionRepository) GetCommissionSummary(workspaceID, period string) (*domain.CommissionSummary, error) {
	query := `
		SELECT 
			COALESCE(SUM(commission_amount), 0.0) AS total_accrued,
			COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0.0) AS total_pending,
			COALESCE(SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END), 0.0) AS total_approved,
			COALESCE(SUM(CASE WHEN status = 'paid_in_payroll' THEN commission_amount ELSE 0 END), 0.0) AS total_paid_in_payroll
		FROM sales_commissions
		WHERE workspace_id = $1 AND ($2 = '' OR period = $2) AND status != 'rejected'
	`
	var summary domain.CommissionSummary
	err := r.db.QueryRow(query, workspaceID, period).Scan(
		&summary.TotalAccrued, &summary.TotalPending, &summary.TotalApproved, &summary.TotalPaidInPayroll,
	)
	if err != nil {
		return nil, err
	}

	// Find top earner
	topQuery := `
		SELECT COALESCE(u.full_name, 'None'), COALESCE(SUM(sc.commission_amount), 0.0)
		FROM sales_commissions sc
		JOIN users u ON sc.user_id = u.id
		WHERE sc.workspace_id = $1 AND ($2 = '' OR sc.period = $2) AND sc.status != 'rejected'
		GROUP BY u.id, u.full_name
		ORDER BY SUM(sc.commission_amount) DESC
		LIMIT 1
	`
	_ = r.db.QueryRow(topQuery, workspaceID, period).Scan(&summary.TopEarnerName, &summary.TopEarnerAmount)

	return &summary, nil
}

// -----------------------------------------------------------------------------
// Team Target & War-Room
// -----------------------------------------------------------------------------

func (r *CommissionRepository) GetTeamTarget(workspaceID, period string) (float64, error) {
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	query := `SELECT target_amount FROM sales_team_targets WHERE workspace_id = $1 AND period = $2`
	var target float64
	err := r.db.Get(&target, query, workspaceID, period)
	if err != nil {
		return 200000000.0, nil // Default 200jt fallback
	}
	return target, nil
}

func (r *CommissionRepository) SetTeamTarget(workspaceID, period string, targetAmount float64) error {
	query := `
		INSERT INTO sales_team_targets (workspace_id, period, target_amount)
		VALUES ($1, $2, $3)
		ON CONFLICT (workspace_id, period) DO UPDATE
		SET target_amount = EXCLUDED.target_amount, updated_at = NOW()
	`
	_, err := r.db.Exec(query, workspaceID, period, targetAmount)
	return err
}

func (r *CommissionRepository) GetWarRoomStats(workspaceID, period string) (*domain.WarRoomStats, error) {
	if period == "" {
		period = time.Now().Format("2006-01")
	}

	teamTarget, _ := r.GetTeamTarget(workspaceID, period)

	leaderboardQuery := `
		WITH user_deals AS (
			SELECT 
				d.owner_id AS user_id,
				COUNT(d.id) AS deals_won,
				COALESCE(SUM(d.value), 0.0) AS total_revenue
			FROM deals d
			WHERE d.workspace_id = $1 
			  AND (LOWER(d.status) = 'won')
			  AND ($2 = '' OR TO_CHAR(d.updated_at, 'YYYY-MM') = $2)
			GROUP BY d.owner_id
		),
		user_commissions AS (
			SELECT 
				sc.user_id,
				COALESCE(SUM(sc.commission_amount), 0.0) AS total_commission
			FROM sales_commissions sc
			WHERE sc.workspace_id = $1 
			  AND ($2 = '' OR sc.period = $2)
			  AND sc.status != 'rejected'
			GROUP BY sc.user_id
		)
		SELECT 
			u.id AS user_id,
			u.full_name,
			u.email,
			COALESCE(u.avatar_url, '') AS avatar_url,
			COALESCE(ud.deals_won, 0) AS deals_won,
			COALESCE(ud.total_revenue, 0.0) AS total_revenue,
			COALESCE(uc.total_commission, 0.0) AS total_commission
		FROM workspace_members wm
		JOIN users u ON wm.user_id = u.id
		LEFT JOIN user_deals ud ON ud.user_id = u.id
		LEFT JOIN user_commissions uc ON uc.user_id = u.id
		WHERE wm.workspace_id = $1
		ORDER BY total_revenue DESC, total_commission DESC, deals_won DESC
	`

	var items []domain.WarRoomLeaderboardItem
	err := r.db.Select(&items, leaderboardQuery, workspaceID, period)
	if err != nil {
		return nil, err
	}

	var totalRevenueWon float64
	var totalDealsWon int
	var totalCommissionAccrued float64

	individualTarget := teamTarget
	if len(items) > 0 {
		individualTarget = teamTarget / float64(len(items))
	}

	for i := range items {
		items[i].Rank = i + 1
		items[i].TargetAmount = individualTarget
		if individualTarget > 0 {
			items[i].AchievementPercentage = math.Round((items[i].TotalRevenue/individualTarget)*1000) / 10
		}
		totalRevenueWon += items[i].TotalRevenue
		totalDealsWon += items[i].DealsWon
		totalCommissionAccrued += items[i].TotalCommission
	}

	var overallAchievement float64
	if teamTarget > 0 {
		overallAchievement = math.Round((totalRevenueWon/teamTarget)*1000) / 10
	}

	// Recent celebrations query
	celebrationQuery := `
		SELECT 
			COALESCE(sc.deal_id::text, '') AS deal_id,
			sc.deal_title,
			sc.deal_amount AS amount,
			COALESCE(u.full_name, 'Sales Rep') AS rep_name,
			sc.commission_amount,
			sc.created_at AS closed_at
		FROM sales_commissions sc
		JOIN users u ON sc.user_id = u.id
		WHERE sc.workspace_id = $1
		ORDER BY sc.created_at DESC
		LIMIT 6
	`
	var celebrations []domain.RecentCelebration
	_ = r.db.Select(&celebrations, celebrationQuery, workspaceID)

	return &domain.WarRoomStats{
		Period:                 period,
		TeamTarget:             teamTarget,
		TotalRevenueWon:        totalRevenueWon,
		TotalDealsWon:          totalDealsWon,
		TotalCommissionAccrued: totalCommissionAccrued,
		AchievementPercentage:  overallAchievement,
		Leaderboard:            items,
		RecentCelebrations:     celebrations,
	}, nil
}

// -----------------------------------------------------------------------------
// Payroll Integration Linkage
// -----------------------------------------------------------------------------

func (r *CommissionRepository) GetApprovedCommissionsForUser(workspaceID, userID, period string) ([]domain.SalesCommission, float64, error) {
	query := `
		SELECT id, workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title,
		       deal_amount, commission_rate, commission_amount, status, period,
		       approved_by, approved_at, paid_payroll_slip_id, notes, created_at, updated_at
		FROM sales_commissions
		WHERE workspace_id = $1 AND user_id = $2 AND period = $3 AND status = 'approved'
	`
	var comms []domain.SalesCommission
	err := r.db.Select(&comms, query, workspaceID, userID, period)
	if err != nil {
		return nil, 0, err
	}

	var total float64
	for _, c := range comms {
		total += c.CommissionAmount
	}
	return comms, total, nil
}

func (r *CommissionRepository) MarkCommissionsPaidInPayroll(workspaceID, userID, period, slipID string) error {
	query := `
		UPDATE sales_commissions
		SET status = 'paid_in_payroll', paid_payroll_slip_id = $1, updated_at = NOW()
		WHERE workspace_id = $2 AND user_id = $3 AND period = $4 AND status = 'approved'
	`
	_, err := r.db.Exec(query, slipID, workspaceID, userID, period)
	return err
}
