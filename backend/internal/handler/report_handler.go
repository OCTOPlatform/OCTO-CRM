package handler

import (
	"net/http"
	"strconv"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	reportService *service.ReportService
}

func NewReportHandler(reportService *service.ReportService) *ReportHandler {
	return &ReportHandler{reportService: reportService}
}

func (h *ReportHandler) GetDashboardSummary(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	summary, err := h.reportService.GetDashboardSummary(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(summary))
}

func (h *ReportHandler) GetPipelineFunnel(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	funnel, err := h.reportService.GetPipelineFunnel(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(funnel))
}

func (h *ReportHandler) GetLeadSources(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	sources, err := h.reportService.GetLeadSources(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(sources))
}

func (h *ReportHandler) GetActivitySummary(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	activities, err := h.reportService.GetActivitySummary(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(activities))
}

func (h *ReportHandler) ListAuditLogs(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	logs, err := h.reportService.ListAuditLogs(workspaceID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(logs))
}
