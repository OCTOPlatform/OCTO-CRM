package domain

import (
	"time"

	"github.com/lib/pq"
)

type Pipeline struct {
	ID          string          `json:"id" db:"id"`
	WorkspaceID string          `json:"workspace_id" db:"workspace_id"`
	Name        string          `json:"name" db:"name"`
	IsDefault   bool            `json:"is_default" db:"is_default"`
	Stages      []PipelineStage `json:"stages,omitempty"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at" db:"updated_at"`
}

type PipelineStage struct {
	ID          string    `json:"id" db:"id"`
	PipelineID  string    `json:"pipeline_id" db:"pipeline_id"`
	Name        string    `json:"name" db:"name"`
	OrderIndex  int       `json:"order_index" db:"order_index"`
	Probability int       `json:"probability" db:"probability"` // 0-100
	IsWon       bool      `json:"is_won" db:"is_won"`
	IsLost      bool      `json:"is_lost" db:"is_lost"`
	DealCount   int       `json:"deal_count,omitempty" db:"deal_count"`
	TotalValue  float64   `json:"total_value,omitempty" db:"total_value"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type DealStatus string

const (
	DealStatusOpen DealStatus = "open"
	DealStatusWon  DealStatus = "won"
	DealStatusLost DealStatus = "lost"
)

type Deal struct {
	ID                string         `json:"id" db:"id"`
	WorkspaceID       string         `json:"workspace_id" db:"workspace_id"`
	PipelineID        string         `json:"pipeline_id" db:"pipeline_id"`
	PipelineName      string         `json:"pipeline_name,omitempty" db:"pipeline_name"`
	StageID           string         `json:"stage_id" db:"stage_id"`
	StageName         string         `json:"stage_name,omitempty" db:"stage_name"`
	StageProbability  int            `json:"stage_probability,omitempty" db:"stage_probability"`
	ContactID         *string        `json:"contact_id" db:"contact_id"`
	ContactName       *string        `json:"contact_name,omitempty" db:"contact_name"`
	ContactEmail      *string        `json:"contact_email,omitempty" db:"contact_email"`
	ContactPhone      *string        `json:"contact_phone,omitempty" db:"contact_phone"`
	CompanyID         *string        `json:"company_id" db:"company_id"`
	CompanyName       *string        `json:"company_name,omitempty" db:"company_name"`
	OwnerID           *string        `json:"owner_id" db:"owner_id"`
	OwnerName         *string        `json:"owner_name,omitempty" db:"owner_name"`
	Title             string         `json:"title" db:"title"`
	Value             float64        `json:"value" db:"value"`
	Currency          string         `json:"currency" db:"currency"`
	ExpectedCloseDate *string        `json:"expected_close_date" db:"expected_close_date"`
	Status            DealStatus     `json:"status" db:"status"`
	Priority          int            `json:"priority" db:"priority"`       // 0-3 stars (Odoo style)
	Probability       int            `json:"probability" db:"probability"` // 0-100%
	Tags              pq.StringArray `json:"tags" db:"tags"`
	IsLead            bool           `json:"is_lead" db:"is_lead"`
	LostReason        string         `json:"lost_reason" db:"lost_reason"`
	HandoverTicketID  *string        `json:"handover_ticket_id,omitempty" db:"handover_ticket_id"`
	Notes             string         `json:"notes" db:"notes"`
	CreatedAt         time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at" db:"updated_at"`
}

type DealFilter struct {
	PipelineID string `form:"pipeline_id"`
	StageID    string `form:"stage_id"`
	Status     string `form:"status"`
	OwnerID    string `form:"owner_id"`
	ContactID  string `form:"contact_id"`
	CompanyID  string `form:"company_id"`
	Priority   *int   `form:"priority"`
	IsLead     *bool  `form:"is_lead"`
	Query      string `form:"query"`
}

type CreateDealRequest struct {
	PipelineID        string     `json:"pipeline_id" binding:"required"`
	StageID           string     `json:"stage_id" binding:"required"`
	ContactID         *string    `json:"contact_id"`
	CompanyID         *string    `json:"company_id"`
	OwnerID           *string    `json:"owner_id"`
	Title             string     `json:"title" binding:"required"`
	Value             float64    `json:"value"`
	Currency          string     `json:"currency"`
	ExpectedCloseDate *string    `json:"expected_close_date"`
	Status            DealStatus `json:"status"`
	Priority          int        `json:"priority"`
	Probability       *int       `json:"probability"`
	Tags              []string   `json:"tags"`
	IsLead            bool       `json:"is_lead"`
	Notes             string     `json:"notes"`
}

type UpdateDealRequest struct {
	PipelineID        *string     `json:"pipeline_id"`
	StageID           *string     `json:"stage_id"`
	ContactID         *string     `json:"contact_id"`
	CompanyID         *string     `json:"company_id"`
	OwnerID           *string     `json:"owner_id"`
	Title             *string     `json:"title"`
	Value             *float64    `json:"value"`
	Currency          *string     `json:"currency"`
	ExpectedCloseDate *string     `json:"expected_close_date"`
	Status            *DealStatus `json:"status"`
	Priority          *int        `json:"priority"`
	Probability       *int        `json:"probability"`
	Tags              *[]string   `json:"tags"`
	IsLead            *bool       `json:"is_lead"`
	LostReason        *string     `json:"lost_reason"`
	Notes             *string     `json:"notes"`
}

type UpdateDealStageRequest struct {
	StageID    string      `json:"stage_id" binding:"required"`
	Status     *DealStatus `json:"status"` // optionally set won or lost
	LostReason *string     `json:"lost_reason"`
}

type MarkDealWonLostRequest struct {
	Status     DealStatus `json:"status" binding:"required"` // "won" or "lost"
	LostReason string     `json:"lost_reason"`
}
