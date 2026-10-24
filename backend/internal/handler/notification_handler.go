package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"
)

type NotificationHandler struct {
	notificationService *service.NotificationService
}

func NewNotificationHandler(notificationService *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// ListNotifications retrieves notifications for the current authenticated user in the workspace
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	userID := c.GetString("userID")
	if userID == "" {
		userID = c.GetString("user_id")
	}

	limit := 30
	if l := c.Query("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	res, err := h.notificationService.ListNotifications(workspaceID, userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(res))
}

// MarkAsRead marks a specific notification as read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	notificationID := c.Param("notification_id")
	userID := c.GetString("userID")
	if userID == "" {
		userID = c.GetString("user_id")
	}

	if err := h.notificationService.MarkAsRead(workspaceID, userID, notificationID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Notification marked as read"))
}

// MarkAllAsRead marks all unread notifications for the user as read
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	userID := c.GetString("userID")
	if userID == "" {
		userID = c.GetString("user_id")
	}

	if err := h.notificationService.MarkAllAsRead(workspaceID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "All notifications marked as read"))
}
