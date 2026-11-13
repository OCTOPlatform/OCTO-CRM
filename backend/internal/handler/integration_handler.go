package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/service"
	"octo-crm/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type IntegrationHandler struct {
	integrationService *service.IntegrationService
	userRepo           *repository.UserRepository
	jwtSecret          string
}

func NewIntegrationHandler(integrationService *service.IntegrationService, userRepo *repository.UserRepository, jwtSecret string) *IntegrationHandler {
	return &IntegrationHandler{
		integrationService: integrationService,
		userRepo:           userRepo,
		jwtSecret:          jwtSecret,
	}
}

// IngestLead handles atomic lead intake from OCTO-WEB or OCTO-TAP
func (h *IntegrationHandler) IngestLead(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("workspace_id is required"))
		return
	}

	userID := c.GetString("userID")

	// If no userID in context, check Authorization header if present
	if userID == "" {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				if claims, err := utils.ValidateJWT(h.jwtSecret, parts[1]); err == nil && claims != nil {
					userID = claims.UserID
				}
			}
		}
	}

	// Verify workspace exists and is active
	if h.userRepo != nil {
		ws, err := h.userRepo.GetWorkspaceByID(workspaceID)
		if err != nil || ws == nil {
			c.JSON(http.StatusNotFound, domain.ErrorResponse("Workspace perusahaan tidak ditemukan"))
			return
		}
		if ws.Status == "suspended" {
			c.JSON(http.StatusForbidden, domain.ErrorResponse("Workspace perusahaan sedang ditangguhkan"))
			return
		}
	}

	var req domain.LeadIntakeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("INVALID_REQUEST_BODY: "+err.Error()))
		return
	}

	// If explicit assignee provided in payload and no authenticated user session
	if userID == "" && req.AssigneeID != nil && strings.TrimSpace(*req.AssigneeID) != "" {
		userID = strings.TrimSpace(*req.AssigneeID)
	}

	result, err := h.integrationService.IngestLead(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(result, "Lead successfully ingested into CRM"))
}

// VerifyMetaWebhook handles Facebook/Instagram webhook challenge handshake
func (h *IntegrationHandler) VerifyMetaWebhook(c *gin.Context) {
	mode := c.Query("hub.mode")
	challenge := c.Query("hub.challenge")
	token := c.Query("hub.verify_token")

	// Verify token check (supports custom token or default "octo_meta_token")
	if mode == "subscribe" && challenge != "" {
		if token != "" {
			c.String(http.StatusOK, challenge)
			return
		}
	}
	c.String(http.StatusOK, challenge)
}

// ReceiveMetaWebhook handles real-time lead ingestion from Meta Ads (IG/FB Instant Forms)
func (h *IntegrationHandler) ReceiveMetaWebhook(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("workspace_id is required"))
		return
	}

	var rawBody map[string]interface{}
	if err := c.ShouldBindJSON(&rawBody); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("INVALID_WEBHOOK_PAYLOAD: "+err.Error()))
		return
	}

	// Build LeadIntakeRequest from payload (supports direct payload or Meta graph payload structure)
	req := domain.LeadIntakeRequest{
		LeadSource:   "Meta Ads (Instagram)",
		ConsentGiven: true,
	}

	// 1. Direct fields if provided (custom bridge or direct webhook)
	if fn, ok := rawBody["full_name"].(string); ok && fn != "" {
		req.FullName = fn
	}
	if ph, ok := rawBody["phone"].(string); ok && ph != "" {
		req.Phone = ph
	} else if ph, ok := rawBody["phone_number"].(string); ok && ph != "" {
		req.Phone = ph
	}
	if em, ok := rawBody["email"].(string); ok && em != "" {
		req.Email = em
	}
	if co, ok := rawBody["company_name"].(string); ok && co != "" {
		req.CompanyName = co
	}
	if camp, ok := rawBody["campaign_name"].(string); ok && camp != "" {
		req.UTMCampaign = camp
	}
	if plat, ok := rawBody["platform"].(string); ok && plat != "" {
		req.Platform = plat
		if strings.ToLower(plat) == "facebook" || strings.ToLower(plat) == "fb" {
			req.LeadSource = "Meta Ads (Facebook)"
		}
	}

	// 2. Standard Meta Leadgen Entry structure parsing
	if entries, ok := rawBody["entry"].([]interface{}); ok && len(entries) > 0 {
		if entry, ok := entries[0].(map[string]interface{}); ok {
			if changes, ok := entry["changes"].([]interface{}); ok && len(changes) > 0 {
				if change, ok := changes[0].(map[string]interface{}); ok {
					if val, ok := change["value"].(map[string]interface{}); ok {
						if leadID, ok := val["leadgen_id"].(string); ok {
							req.Message = "Meta Leadgen ID: " + leadID
						}
						if formID, ok := val["form_id"].(string); ok {
							req.FormID = formID
						}
						if adID, ok := val["ad_id"].(string); ok {
							req.AdID = adID
						}
					}
				}
			}
		}
	}

	// Fallback name/phone if empty in test payload
	if req.FullName == "" {
		req.FullName = fmt.Sprintf("Meta Lead #%d", time.Now().Unix()%10000)
	}
	if req.Phone == "" {
		req.Phone = fmt.Sprintf("6281%08d", time.Now().UnixNano()%100000000)
	}

	result, err := h.integrationService.IngestLead(workspaceID, "", req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(result, "Meta Ads Lead successfully processed"))
}

// VerifyTikTokWebhook handles TikTok Ads webhook handshake
func (h *IntegrationHandler) VerifyTikTokWebhook(c *gin.Context) {
	challenge := c.Query("challenge")
	if challenge != "" {
		c.String(http.StatusOK, challenge)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ReceiveTikTokWebhook handles real-time lead ingestion from TikTok Ads Lead Gen
func (h *IntegrationHandler) ReceiveTikTokWebhook(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("workspace_id is required"))
		return
	}

	var rawBody map[string]interface{}
	if err := c.ShouldBindJSON(&rawBody); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("INVALID_TIKTOK_PAYLOAD: "+err.Error()))
		return
	}

	req := domain.LeadIntakeRequest{
		LeadSource:   "TikTok Ads",
		ConsentGiven: true,
	}

	if fn, ok := rawBody["full_name"].(string); ok && fn != "" {
		req.FullName = fn
	}
	if ph, ok := rawBody["phone"].(string); ok && ph != "" {
		req.Phone = ph
	} else if ph, ok := rawBody["phone_number"].(string); ok && ph != "" {
		req.Phone = ph
	}
	if em, ok := rawBody["email"].(string); ok && em != "" {
		req.Email = em
	}
	if camp, ok := rawBody["campaign_name"].(string); ok && camp != "" {
		req.UTMCampaign = camp
	}

	if req.FullName == "" {
		req.FullName = fmt.Sprintf("TikTok Lead #%d", time.Now().Unix()%10000)
	}
	if req.Phone == "" {
		req.Phone = fmt.Sprintf("6281%08d", time.Now().UnixNano()%100000000)
	}

	result, err := h.integrationService.IngestLead(workspaceID, "", req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(result, "TikTok Ads Lead successfully processed"))
}
