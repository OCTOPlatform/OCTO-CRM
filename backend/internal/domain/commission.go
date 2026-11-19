package domain

import "time"

// SalesCommissionPlan defines the commission calculation formula/rules
type SalesCommissionPlan struct {
	ID              string    `json:"id" db:"id"`
	WorkspaceID     string    `json:"workspace_id" db:"workspace_id"`
	Name            string    `json:"name" db:"name"`
	CalculationType string    `json:"calculation_type" db:"calculation_type"` // 'percentage_deal', 'fixed_amount', 'tiered_threshold'
	BaseRate        float64   `json:"base_rate" db:"base_rate"`               // e.g. 2.5%
	ThresholdAmount float64   `json:"threshold_amount" db:"threshold_amount"` // e.g. 50,000,000 IDR
	BonusRate       float64   `json:"bonus_rate" db:"bonus_rate"`             // bonus rate if deal exceeds threshold
	IsActive        bool      `json:"is_active" db:"is_active"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

type CreateCommissionPlanRequest struct {
	Name            string  `json:"name" binding:"required"`
	CalculationType string  `json:"calculation_type"`
	BaseRate        float64 `json:"base_rate"`
	ThresholdAmount float64 `json:"threshold_amount"`
	BonusRate       float64 `json:"bonus_rate"`
	IsActive        *bool   `json:"is_active"`
}

type UpdateCommissionPlanRequest struct {
	Name            *string  `json:"name"`
	CalculationType *string  `json:"calculation_type"`
	BaseRate        *float64 `json:"base_rate"`
	ThresholdAmount *float64 `json:"threshold_amount"`
	BonusRate       *float64 `json:"bonus_rate"`
	IsActive        *bool    `json:"is_active"`
}

// SalesCommission represents a transaction commission earned by a sales rep
type SalesCommission struct {
	ID                 string     `json:"id" db:"id"`
	WorkspaceID        string     `json:"workspace_id" db:"workspace_id"`
	UserID             string     `json:"user_id" db:"user_id"`
	DealID             *string    `json:"deal_id" db:"deal_id"`
	InvoiceID          *string    `json:"invoice_id" db:"invoice_id"`
	PlanID             *string    `json:"plan_id" db:"plan_id"`
	DealTitle          string     `json:"deal_title" db:"deal_title"`
	DealAmount         float64    `json:"deal_amount" db:"deal_amount"`
	CommissionRate     float64    `json:"commission_rate" db:"commission_rate"`
	CommissionAmount   float64    `json:"commission_amount" db:"commission_amount"`
	Status             string     `json:"status" db:"status"` // 'pending', 'approved', 'paid_in_payroll', 'rejected'
	Period             string     `json:"period" db:"period"` // e.g. '2026-11'
	ApprovedBy         *string    `json:"approved_by" db:"approved_by"`
	ApprovedAt         *time.Time `json:"approved_at" db:"approved_at"`
	PaidPayrollSlipID  *string    `json:"paid_payroll_slip_id" db:"paid_payroll_slip_id"`
	Notes              string     `json:"notes" db:"notes"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`
	UserName           string     `json:"user_name,omitempty" db:"user_name"`
	UserEmail          string     `json:"user_email,omitempty" db:"user_email"`
	PlanName           string     `json:"plan_name,omitempty" db:"plan_name"`
}

type UpdateCommissionStatusRequest struct {
	Status string  `json:"status" binding:"required"` // 'approved', 'rejected', 'pending'
	Notes  *string `json:"notes"`
}

// SalesTeamTarget defines monthly revenue targets
type SalesTeamTarget struct {
	ID           string    `json:"id" db:"id"`
	WorkspaceID  string    `json:"workspace_id" db:"workspace_id"`
	Period       string    `json:"period" db:"period"` // '2026-11'
	TargetAmount float64   `json:"target_amount" db:"target_amount"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type SetSalesTeamTargetRequest struct {
	Period       string  `json:"period" binding:"required"`
	TargetAmount float64 `json:"target_amount" binding:"required"`
}

// War Room Leaderboard Models
type WarRoomLeaderboardItem struct {
	Rank                  int     `json:"rank"`
	UserID                string  `json:"user_id" db:"user_id"`
	FullName              string  `json:"full_name" db:"full_name"`
	Email                 string  `json:"email" db:"email"`
	AvatarURL             string  `json:"avatar_url" db:"avatar_url"`
	DealsWon              int     `json:"deals_won" db:"deals_won"`
	TotalRevenue          float64 `json:"total_revenue" db:"total_revenue"`
	TotalCommission       float64 `json:"total_commission" db:"total_commission"`
	TargetAmount          float64 `json:"target_amount" db:"target_amount"`
	AchievementPercentage float64 `json:"achievement_percentage"`
}

type RecentCelebration struct {
	DealID           string    `json:"deal_id" db:"deal_id"`
	DealTitle        string    `json:"deal_title" db:"deal_title"`
	Amount           float64   `json:"amount" db:"amount"`
	RepName          string    `json:"rep_name" db:"rep_name"`
	CommissionAmount float64   `json:"commission_amount" db:"commission_amount"`
	ClosedAt         time.Time `json:"closed_at" db:"closed_at"`
}

type WarRoomStats struct {
	Period                string                   `json:"period"`
	TeamTarget            float64                  `json:"team_target"`
	TotalRevenueWon       float64                  `json:"total_revenue_won"`
	TotalDealsWon         int                      `json:"total_deals_won"`
	TotalCommissionAccrued float64                 `json:"total_commission_accrued"`
	AchievementPercentage float64                  `json:"achievement_percentage"`
	Leaderboard           []WarRoomLeaderboardItem `json:"leaderboard"`
	RecentCelebrations    []RecentCelebration      `json:"recent_celebrations"`
}

type CommissionSummary struct {
	TotalAccrued       float64 `json:"total_accrued"`
	TotalPending       float64 `json:"total_pending"`
	TotalApproved      float64 `json:"total_approved"`
	TotalPaidInPayroll float64 `json:"total_paid_in_payroll"`
	TopEarnerName      string  `json:"top_earner_name"`
	TopEarnerAmount    float64 `json:"top_earner_amount"`
}
