package handler

import (
	"net/http"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type CommissionHandler struct {
	svc *service.CommissionService
}

func NewCommissionHandler(svc *service.CommissionService) *CommissionHandler {
	return &CommissionHandler{svc: svc}
}

// -----------------------------------------------------------------------------
// Commission Plans Handlers
// -----------------------------------------------------------------------------

func (h *CommissionHandler) ListPlans(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	plans, err := h.svc.ListPlans(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": plans})
}

func (h *CommissionHandler) CreatePlan(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	var req domain.CreateCommissionPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	plan, err := h.svc.CreatePlan(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": plan})
}

func (h *CommissionHandler) UpdatePlan(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	id := c.Param("id")
	var req domain.UpdateCommissionPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	plan, err := h.svc.UpdatePlan(workspaceID, id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": plan})
}

// -----------------------------------------------------------------------------
// Sales Commissions Handlers
// -----------------------------------------------------------------------------

func (h *CommissionHandler) ListCommissions(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	period := c.Query("period")
	status := c.Query("status")
	userID := c.Query("user_id")

	commissions, err := h.svc.ListCommissions(workspaceID, period, status, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": commissions})
}

func (h *CommissionHandler) GetCommissionSummary(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	period := c.Query("period")

	summary, err := h.svc.GetCommissionSummary(workspaceID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": summary})
}

func (h *CommissionHandler) UpdateCommissionStatus(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	id := c.Param("id")
	approverID := c.GetString("userID")

	var req domain.UpdateCommissionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	err := h.svc.UpdateCommissionStatus(workspaceID, id, req.Status, approverID, req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Status komisi berhasil diperbarui"})
}

// -----------------------------------------------------------------------------
// War-Room & Leaderboard Handlers
// -----------------------------------------------------------------------------

func (h *CommissionHandler) GetWarRoomStats(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	period := c.Query("period")

	stats, err := h.svc.GetWarRoomStats(workspaceID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": stats})
}

func (h *CommissionHandler) SetTeamTarget(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	var req domain.SetSalesTeamTargetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	err := h.svc.SetTeamTarget(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Target omset tim berhasil disimpan"})
}
