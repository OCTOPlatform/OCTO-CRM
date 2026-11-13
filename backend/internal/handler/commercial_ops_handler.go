package handler

import (
	"net/http"
	"strconv"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type CommercialOpsHandler struct {
	svc *service.CommercialOpsService
}

func NewCommercialOpsHandler(svc *service.CommercialOpsService) *CommercialOpsHandler {
	return &CommercialOpsHandler{svc: svc}
}

// -----------------------------------------------------------------------------
// Invoices & Quotations Handlers
// -----------------------------------------------------------------------------

func (h *CommercialOpsHandler) ListInvoices(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	invType := c.Query("type")
	status := c.Query("status")

	invoices, err := h.svc.ListInvoices(workspaceID, invType, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": invoices})
}

func (h *CommercialOpsHandler) GetInvoiceByID(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	id := c.Param("id")

	inv, err := h.svc.GetInvoiceByID(workspaceID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	if inv == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Invoice tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": inv})
}

func (h *CommercialOpsHandler) CreateInvoice(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	var req domain.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	inv, err := h.svc.CreateInvoice(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Dokumen penawaran / invoice berhasil dibuat",
		"data":    inv,
	})
}

func (h *CommercialOpsHandler) PayInvoice(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	id := c.Param("id")
	var req domain.PayInvoiceRequest
	_ = c.ShouldBindJSON(&req)

	inv, err := h.svc.PayInvoice(workspaceID, id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Pembayaran invoice berhasil dikonfirmasi lunas (QRIS/VA)!",
		"data":    inv,
	})
}

// -----------------------------------------------------------------------------
// Automation Workflows & Logs Handlers
// -----------------------------------------------------------------------------

func (h *CommercialOpsHandler) ListWorkflows(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	workflows, err := h.svc.ListWorkflows(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": workflows})
}

func (h *CommercialOpsHandler) CreateWorkflow(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	var req domain.CreateWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	wf, err := h.svc.CreateWorkflow(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Workflow otomatisasi follow-up berhasil dibuat",
		"data":    wf,
	})
}

func (h *CommercialOpsHandler) UpdateWorkflow(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	id := c.Param("id")
	var req domain.CreateWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	err := h.svc.UpdateWorkflow(workspaceID, id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Workflow berhasil diperbarui"})
}

func (h *CommercialOpsHandler) DeleteWorkflow(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	id := c.Param("id")

	err := h.svc.DeleteWorkflow(workspaceID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Workflow berhasil dihapus"})
}

func (h *CommercialOpsHandler) TriggerWorkflow(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	id := c.Param("id")
	var req domain.TriggerWorkflowRequest
	_ = c.ShouldBindJSON(&req)

	log, err := h.svc.TriggerWorkflow(workspaceID, id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Otomasi berhasil dieksekusi",
		"data":    log,
	})
}

func (h *CommercialOpsHandler) ListAutomationLogs(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	logs, err := h.svc.ListAutomationLogs(workspaceID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": logs})
}
