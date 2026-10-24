package domain

import (
	"time"
)

type TaskPriority string

const (
	TaskPriorityLow    TaskPriority = "low"
	TaskPriorityMedium TaskPriority = "medium"
	TaskPriorityHigh   TaskPriority = "high"
	TaskPriorityUrgent TaskPriority = "urgent"
)

type TaskStatus string

const (
	TaskStatusOpen       TaskStatus = "open"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusCancelled  TaskStatus = "cancelled"
)

type Task struct {
	ID             string       `json:"id" db:"id"`
	WorkspaceID    string       `json:"workspace_id" db:"workspace_id"`
	ContactID      *string      `json:"contact_id" db:"contact_id"`
	ContactName    *string      `json:"contact_name,omitempty" db:"contact_name"`
	DealID         *string      `json:"deal_id" db:"deal_id"`
	DealTitle      *string      `json:"deal_title,omitempty" db:"deal_title"`
	AssignedToID   *string      `json:"assigned_to_id" db:"assigned_to_id"`
	AssignedToName *string      `json:"assigned_to_name,omitempty" db:"assigned_to_name"`
	Title          string       `json:"title" db:"title"`
	Description    string       `json:"description" db:"description"`
	DueDate        *time.Time   `json:"due_date" db:"due_date"`
	Priority       TaskPriority `json:"priority" db:"priority"`
	Status         TaskStatus   `json:"status" db:"status"`
	IsOverdue      bool         `json:"is_overdue"`
	CompletedAt    *time.Time   `json:"completed_at" db:"completed_at"`
	CreatedAt      time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at" db:"updated_at"`
}

type TaskFilter struct {
	Status       string `form:"status"`
	Priority     string `form:"priority"`
	AssignedToID string `form:"assigned_to_id"`
	ContactID    string `form:"contact_id"`
	DealID       string `form:"deal_id"`
	DueFilter    string `form:"due_filter"` // "today", "overdue", "upcoming"
	Query        string `form:"query"`
}

type CreateTaskRequest struct {
	ContactID    *string      `json:"contact_id"`
	DealID       *string      `json:"deal_id"`
	AssignedToID *string      `json:"assigned_to_id"`
	Title        string       `json:"title" binding:"required"`
	Description  string       `json:"description"`
	DueDate      *time.Time   `json:"due_date"`
	Priority     TaskPriority `json:"priority"`
	Status       TaskStatus   `json:"status"`
}

type UpdateTaskRequest struct {
	ContactID    *string       `json:"contact_id"`
	DealID       *string       `json:"deal_id"`
	AssignedToID *string       `json:"assigned_to_id"`
	Title        *string       `json:"title"`
	Description  *string       `json:"description"`
	DueDate      *time.Time    `json:"due_date"`
	Priority     *TaskPriority `json:"priority"`
	Status       *TaskStatus   `json:"status"`
}
