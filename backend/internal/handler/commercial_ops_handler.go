package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

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

// -----------------------------------------------------------------------------
// Payment & QRIS Settings Handlers
// -----------------------------------------------------------------------------

func (h *CommercialOpsHandler) GetPaymentSettings(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	settings, err := h.svc.GetPaymentSettings(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": settings})
}

func (h *CommercialOpsHandler) UpdatePaymentSettings(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	var req domain.UpdateWorkspacePaymentSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	settings, err := h.svc.UpdatePaymentSettings(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Pengaturan rekening dan QRIS perusahaan berhasil disimpan",
		"data":    settings,
	})
}

func (h *CommercialOpsHandler) UploadQRISImage(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "File gambar wajib diunggah"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Format file harus berupa gambar (.png, .jpg, .jpeg, .webp)"})
		return
	}

	uploadDir := filepath.Join(".", "uploads", "qris")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Gagal membuat direktori upload: " + err.Error()})
		return
	}

	fileName := fmt.Sprintf("%s_%d%s", workspaceID, time.Now().Unix(), ext)
	dstPath := filepath.Join(uploadDir, fileName)

	if err := c.SaveUploadedFile(file, dstPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Gagal menyimpan file: " + err.Error()})
		return
	}

	fileURL := fmt.Sprintf("/uploads/qris/%s", fileName)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Gambar QRIS berhasil diunggah",
		"url":     fileURL,
		"data": gin.H{
			"url": fileURL,
		},
	})
}

func (h *CommercialOpsHandler) GenerateAutoGopayQRIS(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	invoiceID := c.Param("id")

	tx, err := h.svc.GenerateAutoGopayQRIS(workspaceID, invoiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "QRIS GoPay Merchant berhasil dibuat",
		"data":    tx,
	})
}

func (h *CommercialOpsHandler) CheckAutoGopayQRISStatus(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	invoiceID := c.Param("id")

	tx, err := h.svc.CheckAutoGopayQRISStatus(workspaceID, invoiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tx,
	})
}

func (h *CommercialOpsHandler) HandleAutoGopayWebhook(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	signature := c.GetHeader("X-Signature")
	eventHeader := c.GetHeader("X-Callback-Event")

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "gagal membaca body"})
		return
	}

	if err := h.svc.HandleAutoGopayWebhook(workspaceID, body, signature, eventHeader); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *CommercialOpsHandler) GetPublicInvoicePayInfo(c *gin.Context) {
	identifier := c.Param("identifier")
	if identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Nomor atau ID invoice wajib diisi"})
		return
	}

	info, err := h.svc.GetPublicInvoicePayInfo(identifier)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": info})
}

func (h *CommercialOpsHandler) GetPublicInvoiceStatus(c *gin.Context) {
	identifier := c.Param("identifier")
	if identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Nomor atau ID invoice wajib diisi"})
		return
	}

	status, err := h.svc.GetPublicInvoiceStatus(identifier)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": status})
}
