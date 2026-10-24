package domain

import (
	"encoding/json"
	"time"
)

type TicketPriority string

const (
	TicketPriorityLow    TicketPriority = "low"
	TicketPriorityMedium TicketPriority = "medium"
	TicketPriorityHigh   TicketPriority = "high"
	TicketPriorityUrgent TicketPriority = "urgent"
)

type TicketStatus string

const (
	TicketStatusOpen       TicketStatus = "open"
	TicketStatusInProgress TicketStatus = "in_progress"
	TicketStatusEscalated  TicketStatus = "escalated"
	TicketStatusResolved   TicketStatus = "resolved"
	TicketStatusClosed     TicketStatus = "closed"
)

type Ticket struct {
	ID             string         `json:"id" db:"id"`
	WorkspaceID    string         `json:"workspace_id" db:"workspace_id"`
	TicketNumber   string         `json:"ticket_number" db:"ticket_number"`
	ConversationID *string        `json:"conversation_id" db:"conversation_id"`
	ContactID      *string        `json:"contact_id" db:"contact_id"`
	ContactName    *string        `json:"contact_name,omitempty" db:"contact_name"`
	ContactPhone   *string        `json:"contact_phone,omitempty" db:"contact_phone"`
	ContactEmail   *string        `json:"contact_email,omitempty" db:"contact_email"`
	Subject        string         `json:"subject" db:"subject"`
	Description    string         `json:"description" db:"description"`
	Category       string         `json:"category" db:"category"` // 'complaint', 'technical', 'billing', 'general', 'feature_request'
	Priority       TicketPriority `json:"priority" db:"priority"`
	Status         TicketStatus   `json:"status" db:"status"`
	AssignedToID   *string        `json:"assigned_to_id" db:"assigned_to_id"`
	AssignedToName *string        `json:"assigned_to_name,omitempty" db:"assigned_to_name"`
	CreatedByID    *string        `json:"created_by_id" db:"created_by_id"`
	CreatedByName  *string        `json:"created_by_name,omitempty" db:"created_by_name"`
	Department     string         `json:"department" db:"department"` // 'support', 'technical', 'billing', 'sales'
	SLADueAt       *time.Time     `json:"sla_due_at,omitempty" db:"sla_due_at"`
	FRTDueAt       *time.Time     `json:"frt_due_at,omitempty" db:"frt_due_at"`
	FirstRespondedAt *time.Time   `json:"first_responded_at,omitempty" db:"first_responded_at"`
	IsSLABreached  bool           `json:"is_sla_breached" db:"is_sla_breached"`
	ResolvedAt     *time.Time     `json:"resolved_at,omitempty" db:"resolved_at"`
	CreatedAt      time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at" db:"updated_at"`

	// Nested activities / internal notes
	Activities []TicketActivity `json:"activities,omitempty"`
}

type TicketActivity struct {
	ID           string          `json:"id" db:"id"`
	TicketID     string          `json:"ticket_id" db:"ticket_id"`
	UserID       *string         `json:"user_id" db:"user_id"`
	UserName     *string         `json:"user_name,omitempty" db:"user_name"`
	ActivityType string          `json:"activity_type" db:"activity_type"` // 'note', 'status_change', 'assignment_change', 'escalation'
	Note         string          `json:"note" db:"note"`
	Metadata     json.RawMessage `json:"metadata" db:"metadata"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
}

type TicketFilter struct {
	Status       string `form:"status"`
	Priority     string `form:"priority"`
	Category     string `form:"category"`
	Department   string `form:"department"`
	AssignedToID string `form:"assigned_to_id"`
	Query        string `form:"query"`
}

type CreateTicketRequest struct {
	ConversationID *string        `json:"conversation_id"`
	ContactID      *string        `json:"contact_id"`
	Subject        string         `json:"subject" binding:"required"`
	Description    string         `json:"description"`
	Category       string         `json:"category"`
	Priority       TicketPriority `json:"priority"`
	Department     string         `json:"department"`
	AssignedToID   *string        `json:"assigned_to_id"`
}

type UpdateTicketRequest struct {
	Subject      *string         `json:"subject"`
	Description  *string         `json:"description"`
	Category     *string         `json:"category"`
	Priority     *TicketPriority `json:"priority"`
	Status       *TicketStatus   `json:"status"`
	Department   *string         `json:"department"`
	AssignedToID *string         `json:"assigned_to_id"`
}

type AddTicketNoteRequest struct {
	Note         string `json:"note" binding:"required"`
	ActivityType string `json:"activity_type"` // default 'note'
}

type SupportReportResponse struct {
	TotalTickets        int            `json:"total_tickets"`
	OpenTickets         int            `json:"open_tickets"`
	InProgressTickets   int            `json:"in_progress_tickets"`
	EscalatedTickets    int            `json:"escalated_tickets"`
	ResolvedTickets     int            `json:"resolved_tickets"`
	ResolutionRate      float64        `json:"resolution_rate"`
	AvgResolutionHours  float64        `json:"avg_resolution_hours"`
	CategoryBreakdown   map[string]int `json:"category_breakdown"`
	PriorityBreakdown   map[string]int `json:"priority_breakdown"`
	DepartmentBreakdown map[string]int `json:"department_breakdown"`
}
