package handler

import (
	"net/http"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type TaskHandler struct {
	taskService *service.TaskService
}

func NewTaskHandler(taskService *service.TaskService) *TaskHandler {
	return &TaskHandler{taskService: taskService}
}

func (h *TaskHandler) ListTasks(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var filter domain.TaskFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	tasks, err := h.taskService.ListTasks(workspaceID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(tasks))
}

func (h *TaskHandler) GetTask(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	taskID := c.Param("task_id")

	task, err := h.taskService.GetTask(workspaceID, taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Task not found"))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(task))
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	task, err := h.taskService.CreateTask(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(task, "Task created successfully"))
}

func (h *TaskHandler) UpdateTask(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	taskID := c.Param("task_id")

	var req domain.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	task, err := h.taskService.UpdateTask(workspaceID, userID, taskID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(task, "Task updated"))
}

func (h *TaskHandler) ToggleComplete(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	taskID := c.Param("task_id")

	task, err := h.taskService.ToggleComplete(workspaceID, userID, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(task, "Task status updated"))
}

func (h *TaskHandler) DeleteTask(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	taskID := c.Param("task_id")

	if err := h.taskService.DeleteTask(workspaceID, userID, taskID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Task deleted"))
}
