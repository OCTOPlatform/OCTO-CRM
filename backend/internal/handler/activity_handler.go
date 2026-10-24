package handler

import (
	"net/http"
	"strconv"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type ActivityHandler struct {
	activityService *service.ActivityService
}

func NewActivityHandler(activityService *service.ActivityService) *ActivityHandler {
	return &ActivityHandler{activityService: activityService}
}

func (h *ActivityHandler) ListContactActivities(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	contactID := c.Param("contact_id")

	activities, err := h.activityService.ListContactActivities(workspaceID, contactID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(activities))
}

func (h *ActivityHandler) ListDealActivities(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	dealID := c.Param("deal_id")

	activities, err := h.activityService.ListDealActivities(workspaceID, dealID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(activities))
}

func (h *ActivityHandler) ListRecentActivities(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	limitStr := c.DefaultQuery("limit", "10")
	limit, _ := strconv.Atoi(limitStr)

	activities, err := h.activityService.ListRecentActivities(workspaceID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(activities))
}

func (h *ActivityHandler) CreateActivity(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.CreateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	activity, err := h.activityService.CreateActivity(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(activity, "Activity logged successfully"))
}
