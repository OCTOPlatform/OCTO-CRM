package handler

import (
	"net/http"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type PillarHandler struct {
	pillarService *service.PillarService
}

func NewPillarHandler(pillarService *service.PillarService) *PillarHandler {
	return &PillarHandler{pillarService: pillarService}
}

func getWorkspaceID(c *gin.Context) string {
	wsID := c.GetString("workspaceID")
	if wsID == "" {
		wsID = c.Param("workspace_id")
	}
	if wsID == "" {
		wsID = c.Param("id")
	}
	return wsID
}

func getUserID(c *gin.Context) string {
	uID := c.GetString("userID")
	if uID == "" {
		uID = c.GetString("user_id")
	}
	return uID
}

// ==========================================
// PILAR 3: CPQ & QUOTATION HANDLERS
// ==========================================

func (h *PillarHandler) CreateQuotation(c *gin.Context) {
	wsID := getWorkspaceID(c)
	userID := getUserID(c)

	var req domain.CreateQuotationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Input data penawaran tidak valid: "+err.Error()))
		return
	}

	quo, err := h.pillarService.CreateQuotation(wsID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(quo))
}

func (h *PillarHandler) GetQuotation(c *gin.Context) {
	wsID := getWorkspaceID(c)
	quoID := c.Param("quotation_id")

	quo, err := h.pillarService.GetQuotation(wsID, quoID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Penawaran tidak ditemukan"))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(quo))
}

func (h *PillarHandler) ListQuotations(c *gin.Context) {
	wsID := getWorkspaceID(c)
	dealIDParam := c.Query("deal_id")
	var dealID *string
	if dealIDParam != "" {
		dealID = &dealIDParam
	}

	quotations, err := h.pillarService.ListQuotations(wsID, dealID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(quotations))
}

func (h *PillarHandler) UpdateQuotationStatus(c *gin.Context) {
	wsID := getWorkspaceID(c)
	userID := getUserID(c)
	quoID := c.Param("quotation_id")

	var body struct {
		Status domain.QuotationStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Status penawaran tidak valid"))
		return
	}

	if err := h.pillarService.UpdateQuotationStatus(wsID, userID, quoID, body.Status); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(map[string]string{"message": "Status penawaran berhasil diperbarui"}))
}

func (h *PillarHandler) SendQuotationWhatsApp(c *gin.Context) {
	wsID := getWorkspaceID(c)
	userID := getUserID(c)
	quoID := c.Param("quotation_id")

	var body struct {
		ChannelID string `json:"channel_id"`
	}
	_ = c.ShouldBindJSON(&body)

	textSent, err := h.pillarService.SendQuotationWhatsApp(wsID, userID, quoID, body.ChannelID)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(map[string]string{
		"message":   "Penawaran resmi berhasil dikirim ke WhatsApp klien!",
		"text_sent": textSent,
	}))
}

func (h *PillarHandler) SendDealOutreachWhatsApp(c *gin.Context) {
	wsID := getWorkspaceID(c)
	userID := getUserID(c)
	dealID := c.Param("deal_id")

	var req domain.DealOutreachRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("INVALID_REQUEST_BODY: "+err.Error()))
		return
	}

	resp, err := h.pillarService.SendDealOutreachWhatsApp(wsID, userID, dealID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(resp, "Outreach WhatsApp berhasil diproses"))
}

// ==========================================
// PILAR 2: WHATSAPP BROADCAST HANDLERS
// ==========================================

func (h *PillarHandler) CreateBroadcast(c *gin.Context) {
	wsID := getWorkspaceID(c)
	userID := getUserID(c)

	var req domain.CreateBroadcastCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Data broadcast tidak valid: "+err.Error()))
		return
	}

	camp, err := h.pillarService.CreateAndDispatchCampaign(wsID, userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(camp))
}

func (h *PillarHandler) ListBroadcasts(c *gin.Context) {
	wsID := getWorkspaceID(c)

	campaigns, err := h.pillarService.ListCampaigns(wsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(campaigns))
}

func (h *PillarHandler) GetBroadcast(c *gin.Context) {
	wsID := getWorkspaceID(c)
	campID := c.Param("campaign_id")

	camp, err := h.pillarService.GetCampaign(wsID, campID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Broadcast campaign tidak ditemukan"))
		return
	}

	recipients, _ := h.pillarService.ListCampaignRecipients(campID)

	c.JSON(http.StatusOK, domain.SuccessResponse(map[string]interface{}{
		"campaign":   camp,
		"recipients": recipients,
	}))
}

// ==========================================
// PILAR 1: WORKFLOW AUTOMATION HANDLERS
// ==========================================

func (h *PillarHandler) ListAutomations(c *gin.Context) {
	wsID := getWorkspaceID(c)

	automations, err := h.pillarService.GetAutomations(wsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(automations))
}

func (h *PillarHandler) UpdateAutomation(c *gin.Context) {
	wsID := getWorkspaceID(c)

	var req domain.UpdateAutomationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Format otomasi tidak valid"))
		return
	}

	if err := h.pillarService.UpdateAutomation(wsID, req); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(map[string]string{"message": "Pengaturan otomasi berhasil diperbarui"}))
}

// ==========================================
// PILAR 4: HELPDESK SLA HANDLERS
// ==========================================

func (h *PillarHandler) CheckSLAEscalation(c *gin.Context) {
	wsID := getWorkspaceID(c)

	escalatedCount, err := h.pillarService.CheckAndEscalateSLAs(wsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(map[string]interface{}{
		"escalated_count": escalatedCount,
		"message":         "Pengecekan SLA berhasil dijalankan",
	}))
}

// ==========================================
// PILAR 5: AI SALES & CS COPILOT HANDLERS
// ==========================================

func (h *PillarHandler) SummarizeChat(c *gin.Context) {
	wsID := getWorkspaceID(c)

	var req domain.AISummarizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Conversation ID harus diisi"))
		return
	}

	res, err := h.pillarService.SummarizeChat(wsID, req.ConversationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(res))
}

func (h *PillarHandler) SuggestReplies(c *gin.Context) {
	wsID := getWorkspaceID(c)

	var req domain.AISuggestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Conversation ID harus diisi"))
		return
	}

	res, err := h.pillarService.SuggestReplies(wsID, req.ConversationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(res))
}
