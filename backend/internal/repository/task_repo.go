package repository

import (
	"fmt"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type TaskRepository struct {
	db *sqlx.DB
}

func NewTaskRepository(db *sqlx.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) CreateTask(t *domain.Task) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now

	if t.Priority == "" {
		t.Priority = domain.TaskPriorityMedium
	}
	if t.Status == "" {
		t.Status = domain.TaskStatusOpen
	}

	query := `
		INSERT INTO tasks (
			id, workspace_id, contact_id, deal_id, assigned_to_id,
			title, description, due_date, priority, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11, $12
		)
	`
	_, err := r.db.Exec(
		query,
		t.ID, t.WorkspaceID, t.ContactID, t.DealID, t.AssignedToID,
		t.Title, t.Description, t.DueDate, t.Priority, t.Status, t.CreatedAt, t.UpdatedAt,
	)
	return err
}

func (r *TaskRepository) GetTaskByID(workspaceID, id string) (*domain.Task, error) {
	var t domain.Task
	query := `
		SELECT 
			t.id, t.workspace_id, t.contact_id, TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS contact_name,
			t.deal_id, d.title AS deal_title,
			t.assigned_to_id, u.full_name AS assigned_to_name,
			t.title, t.description, t.due_date, t.priority, t.status,
			t.completed_at, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN contacts c ON t.contact_id = c.id
		LEFT JOIN deals d ON t.deal_id = d.id
		LEFT JOIN users u ON t.assigned_to_id = u.id
		WHERE t.workspace_id = $1 AND t.id = $2
	`
	err := r.db.Get(&t, query, workspaceID, id)
	if err != nil {
		return nil, err
	}

	if t.DueDate != nil && (t.Status == domain.TaskStatusOpen || t.Status == domain.TaskStatusInProgress) {
		t.IsOverdue = t.DueDate.Before(time.Now())
	}

	return &t, nil
}

func (r *TaskRepository) ListTasks(workspaceID string, filter domain.TaskFilter) ([]domain.Task, error) {
	baseQuery := `
		SELECT 
			t.id, t.workspace_id, t.contact_id, TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS contact_name,
			t.deal_id, d.title AS deal_title,
			t.assigned_to_id, u.full_name AS assigned_to_name,
			t.title, t.description, t.due_date, t.priority, t.status,
			t.completed_at, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN contacts c ON t.contact_id = c.id
		LEFT JOIN deals d ON t.deal_id = d.id
		LEFT JOIN users u ON t.assigned_to_id = u.id
		WHERE t.workspace_id = $1
	`
	args := []interface{}{workspaceID}
	argIdx := 2

	if filter.Status != "" {
		baseQuery += fmt.Sprintf(" AND t.status = $%d", argIdx)
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.Priority != "" {
		baseQuery += fmt.Sprintf(" AND t.priority = $%d", argIdx)
		args = append(args, filter.Priority)
		argIdx++
	}

	if filter.AssignedToID != "" {
		baseQuery += fmt.Sprintf(" AND t.assigned_to_id = $%d", argIdx)
		args = append(args, filter.AssignedToID)
		argIdx++
	}

	if filter.ContactID != "" {
		baseQuery += fmt.Sprintf(" AND t.contact_id = $%d", argIdx)
		args = append(args, filter.ContactID)
		argIdx++
	}

	if filter.DealID != "" {
		baseQuery += fmt.Sprintf(" AND t.deal_id = $%d", argIdx)
		args = append(args, filter.DealID)
		argIdx++
	}

	if filter.DueFilter == "overdue" {
		baseQuery += " AND t.status IN ('open', 'in_progress') AND t.due_date < NOW()"
	} else if filter.DueFilter == "today" {
		baseQuery += " AND t.due_date::date = CURRENT_DATE"
	} else if filter.DueFilter == "upcoming" {
		baseQuery += " AND t.due_date > NOW()"
	}

	if filter.Query != "" {
		searchTerm := "%" + strings.ToLower(filter.Query) + "%"
		baseQuery += fmt.Sprintf(" AND (LOWER(t.title) LIKE $%d OR LOWER(t.description) LIKE $%d)", argIdx, argIdx)
		args = append(args, searchTerm)
		argIdx++
	}

	baseQuery += " ORDER BY CASE WHEN t.status = 'completed' THEN 2 ELSE 1 END, t.due_date ASC NULLS LAST, t.created_at DESC"

	var tasks []domain.Task
	err := r.db.Select(&tasks, baseQuery, args...)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	for i := range tasks {
		if tasks[i].DueDate != nil && (tasks[i].Status == domain.TaskStatusOpen || tasks[i].Status == domain.TaskStatusInProgress) {
			tasks[i].IsOverdue = tasks[i].DueDate.Before(now)
		}
	}

	if tasks == nil {
		tasks = []domain.Task{}
	}

	return tasks, nil
}

func (r *TaskRepository) UpdateTask(workspaceID string, t *domain.Task) error {
	t.UpdatedAt = time.Now()
	query := `
		UPDATE tasks SET
			contact_id = $1, deal_id = $2, assigned_to_id = $3,
			title = $4, description = $5, due_date = $6, priority = $7,
			status = $8, completed_at = $9, updated_at = $10
		WHERE workspace_id = $11 AND id = $12
	`
	_, err := r.db.Exec(
		query,
		t.ContactID, t.DealID, t.AssignedToID,
		t.Title, t.Description, t.DueDate, t.Priority,
		t.Status, t.CompletedAt, t.UpdatedAt,
		workspaceID, t.ID,
	)
	return err
}

func (r *TaskRepository) ToggleCompleteTask(workspaceID, id string) (*domain.Task, error) {
	task, err := r.GetTaskByID(workspaceID, id)
	if err != nil {
		return nil, err
	}

	var newStatus domain.TaskStatus
	var completedAt *time.Time
	if task.Status == domain.TaskStatusCompleted {
		newStatus = domain.TaskStatusOpen
		completedAt = nil
	} else {
		newStatus = domain.TaskStatusCompleted
		now := time.Now()
		completedAt = &now
	}

	query := `UPDATE tasks SET status = $1, completed_at = $2, updated_at = NOW() WHERE workspace_id = $3 AND id = $4`
	_, err = r.db.Exec(query, newStatus, completedAt, workspaceID, id)
	if err != nil {
		return nil, err
	}

	return r.GetTaskByID(workspaceID, id)
}

func (r *TaskRepository) DeleteTask(workspaceID, id string) error {
	query := `DELETE FROM tasks WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, id)
	return err
}
