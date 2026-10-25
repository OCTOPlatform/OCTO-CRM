package service

import (
	"fmt"
	"strings"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"

	"github.com/google/uuid"
)

type TaskService struct {
	taskRepo     *repository.TaskRepository
	activityRepo *repository.ActivityRepository
	auditRepo    *repository.AuditRepository
}

func NewTaskService(taskRepo *repository.TaskRepository, activityRepo *repository.ActivityRepository, auditRepo *repository.AuditRepository) *TaskService {
	return &TaskService{
		taskRepo:     taskRepo,
		activityRepo: activityRepo,
		auditRepo:    auditRepo,
	}
}

func (s *TaskService) CreateTask(workspaceID, currentUserID string, req domain.CreateTaskRequest) (*domain.Task, error) {
	task := domain.Task{
		ID:           uuid.New().String(),
		WorkspaceID:  workspaceID,
		ContactID:    req.ContactID,
		DealID:       req.DealID,
		AssignedToID: req.AssignedToID,
		Title:        strings.TrimSpace(req.Title),
		Description:  req.Description,
		DueDate:      req.DueDate,
		Priority:     req.Priority,
		Status:       req.Status,
	}

	if task.AssignedToID == nil || *task.AssignedToID == "" {
		if strings.TrimSpace(currentUserID) != "" {
			cleanUser := strings.TrimSpace(currentUserID)
			task.AssignedToID = &cleanUser
		} else {
			task.AssignedToID = nil
		}
	}

	if err := s.taskRepo.CreateTask(&task); err != nil {
		return nil, err
	}

	var userPtr *string
	if strings.TrimSpace(currentUserID) != "" {
		cleanUser := strings.TrimSpace(currentUserID)
		userPtr = &cleanUser
	}

	// Record activity if linked to contact
	if task.ContactID != nil && *task.ContactID != "" {
		_ = s.activityRepo.CreateActivity(&domain.Activity{
			WorkspaceID: workspaceID,
			ContactID:   *task.ContactID,
			DealID:      task.DealID,
			UserID:      userPtr,
			Type:        domain.ActivityNote,
			Subject:     fmt.Sprintf("Tugas dibuat: %s", task.Title),
			Description: task.Description,
		})
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      userPtr,
		Action:      "task_created",
		EntityType:  "task",
		EntityID:    task.ID,
		Description: fmt.Sprintf("Created task %s", task.Title),
	})

	return s.taskRepo.GetTaskByID(workspaceID, task.ID)
}

func (s *TaskService) GetTask(workspaceID, id string) (*domain.Task, error) {
	return s.taskRepo.GetTaskByID(workspaceID, id)
}

func (s *TaskService) ListTasks(workspaceID string, filter domain.TaskFilter) ([]domain.Task, error) {
	return s.taskRepo.ListTasks(workspaceID, filter)
}

func (s *TaskService) UpdateTask(workspaceID, currentUserID, id string, req domain.UpdateTaskRequest) (*domain.Task, error) {
	task, err := s.taskRepo.GetTaskByID(workspaceID, id)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		task.Title = strings.TrimSpace(*req.Title)
	}
	if req.Description != nil {
		task.Description = *req.Description
	}
	if req.DueDate != nil {
		task.DueDate = req.DueDate
	}
	if req.Priority != nil {
		task.Priority = *req.Priority
	}
	if req.Status != nil {
		task.Status = *req.Status
	}
	if req.ContactID != nil {
		task.ContactID = req.ContactID
	}
	if req.DealID != nil {
		task.DealID = req.DealID
	}
	if req.AssignedToID != nil {
		task.AssignedToID = req.AssignedToID
	}

	if err := s.taskRepo.UpdateTask(workspaceID, task); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "task_updated",
		EntityType:  "task",
		EntityID:    task.ID,
		Description: fmt.Sprintf("Updated task %s", task.Title),
	})

	return s.taskRepo.GetTaskByID(workspaceID, task.ID)
}

func (s *TaskService) ToggleComplete(workspaceID, currentUserID, id string) (*domain.Task, error) {
	task, err := s.taskRepo.ToggleCompleteTask(workspaceID, id)
	if err != nil {
		return nil, err
	}

	// If marked completed, log activity on contact
	if task.Status == domain.TaskStatusCompleted && task.ContactID != nil && *task.ContactID != "" {
		_ = s.activityRepo.CreateActivity(&domain.Activity{
			WorkspaceID: workspaceID,
			ContactID:   *task.ContactID,
			DealID:      task.DealID,
			UserID:      &currentUserID,
			Type:        domain.ActivityNote,
			Subject:     fmt.Sprintf("Tugas selesai: %s", task.Title),
			Description: "Tugas telah ditandai selesai oleh anggota tim.",
		})
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "task_status_toggled",
		EntityType:  "task",
		EntityID:    task.ID,
		Description: fmt.Sprintf("Task %s status changed to %s", task.Title, task.Status),
	})

	return task, nil
}

func (s *TaskService) DeleteTask(workspaceID, currentUserID, id string) error {
	if err := s.taskRepo.DeleteTask(workspaceID, id); err != nil {
		return err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "task_deleted",
		EntityType:  "task",
		EntityID:    id,
		Description: fmt.Sprintf("Deleted task %s", id),
	})

	return nil
}
