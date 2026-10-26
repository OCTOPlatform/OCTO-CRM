package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"octo-crm/backend/internal/config"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InboxHandler struct {
	inboxService *service.InboxService
	cfg          *config.Config
	dedupCache   sync.Map
}

func NewInboxHandler(inboxService *service.InboxService, cfg *config.Config) *InboxHandler {
	return &InboxHandler{inboxService: inboxService, cfg: cfg}
}

func (h *InboxHandler) ListConversations(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var filter domain.ConversationFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	convs, err := h.inboxService.ListConversations(workspaceID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(convs))
}

func (h *InboxHandler) GetConversation(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	conversationID := c.Param("conversation_id")

	conv, err := h.inboxService.GetConversation(workspaceID, conversationID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Conversation not found"))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(conv))
}

func (h *InboxHandler) ListMessages(c *gin.Context) {
	conversationID := c.Param("conversation_id")

	messages, err := h.inboxService.ListMessages(conversationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(messages))
}

// StreamEvents streams real-time inbox events (new messages, status updates) via SSE
func (h *InboxHandler) StreamEvents(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	eventChan := h.inboxService.Subscribe(workspaceID)
	defer h.inboxService.Unsubscribe(eventChan)

	// Send initial connected event
	c.SSEvent("connected", map[string]string{
		"status":       "ok",
		"workspace_id": workspaceID,
	})
	c.Writer.Flush()

	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()

	notify := c.Request.Context().Done()

	for {
		select {
		case <-notify:
			return
		case <-ticker.C:
			c.SSEvent("ping", time.Now().Unix())
			c.Writer.Flush()
		case event, ok := <-eventChan:
			if !ok {
				return
			}
			c.SSEvent("message", event)
			c.Writer.Flush()
		}
	}
}

func (h *InboxHandler) SendReply(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	conversationID := c.Param("conversation_id")

	var req domain.SendReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	msg, err := h.inboxService.SendReply(workspaceID, userID, conversationID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(msg, "Reply sent successfully"))
}

// UploadAttachment handles file uploads for inbox messages (PDF, DOCX, XLSX, images, videos, etc.)
func (h *InboxHandler) UploadAttachment(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("File is required"))
		return
	}

	// 50MB limit check
	if file.Size > 50*1024*1024 {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("File size exceeds 50MB limit"))
		return
	}

	uploadDir := filepath.Join(".", "uploads", "inbox")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse("Failed to create upload directory"))
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	uniqueName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String()[:8], ext)
	dstPath := filepath.Join(uploadDir, uniqueName)

	if err := c.SaveUploadedFile(file, dstPath); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse("Failed to save uploaded file"))
		return
	}

	// Determine mime type and attachment category
	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = mime.TypeByExtension(ext)
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
	}

	attachType := "document"
	if strings.HasPrefix(mimeType, "image/") || ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".gif" || ext == ".webp" {
		attachType = "image"
	} else if strings.HasPrefix(mimeType, "video/") || ext == ".mp4" || ext == ".mov" || ext == ".webm" || ext == ".mkv" {
		attachType = "video"
	}

	urlPath := fmt.Sprintf("/uploads/inbox/%s", uniqueName)

	c.JSON(http.StatusOK, domain.SuccessResponse(domain.AttachmentUploadResponse{
		URL:      urlPath,
		FileName: file.Filename,
		FileType: attachType,
		MimeType: mimeType,
		FileSize: file.Size,
	}, "File uploaded successfully"))
}

func (h *InboxHandler) UpdateStatus(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	conversationID := c.Param("conversation_id")

	var req struct {
		Status domain.ConversationStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	if err := h.inboxService.UpdateStatus(workspaceID, conversationID, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Status updated"))
}

func (h *InboxHandler) UpdateAssignment(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	currentUserID := c.GetString("userID")
	conversationID := c.Param("conversation_id")

	var req struct {
		AssignedToID *string `json:"assigned_to_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	if err := h.inboxService.UpdateAssignment(workspaceID, currentUserID, conversationID, req.AssignedToID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Assignment updated"))
}

func (h *InboxHandler) DeleteConversation(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	conversationID := c.Param("conversation_id")

	if err := h.inboxService.DeleteConversation(workspaceID, conversationID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Percakapan berhasil dihapus"))
}

func (h *InboxHandler) ClearAllConversations(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	clearContacts := c.DefaultQuery("clear_contacts", "true") == "true"

	res, err := h.inboxService.ClearAllConversations(workspaceID, clearContacts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(res, "Semua percakapan berhasil dibersihkan"))
}

func (h *InboxHandler) ConvertToDeal(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	conversationID := c.Param("conversation_id")

	var req domain.ConvertToDealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	deal, err := h.inboxService.ConvertToDeal(workspaceID, userID, conversationID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(deal, "Peluang berhasil dibuat dari percakapan"))
}

func (h *InboxHandler) ToggleBot(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	conversationID := c.Param("conversation_id")

	var req domain.ToggleBotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	err := h.inboxService.ToggleBot(workspaceID, conversationID, req.BotActive, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	msg := "Chatbot berhasil dinonaktifkan. Percakapan dialihkan ke agen CS."
	if req.BotActive {
		msg = "Chatbot berhasil diaktifkan kembali untuk membalas otomatis."
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, msg))
}

func (h *InboxHandler) GetBotSettings(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	settings, err := h.inboxService.GetBotSettings(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse("Gagal mengambil pengaturan chatbot: "+err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(settings, "Pengaturan chatbot berhasil diambil"))
}

func (h *InboxHandler) UpdateBotSettings(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")

	var req domain.UpdateBotSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Format payload tidak valid: "+err.Error()))
		return
	}

	updated, err := h.inboxService.UpdateBotSettings(workspaceID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse("Gagal memperbarui pengaturan chatbot: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(updated, "Pengaturan dan template chatbot berhasil diperbarui"))
}

func (h *InboxHandler) IncomingWebhook(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")

	var req domain.IncomingWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	msg, err := h.inboxService.HandleIncomingMessage(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(msg, "Pesan masuk berhasil diproses"))
}

// GetWhatsAppConfig returns connection and webhook details
func (h *InboxHandler) GetWhatsAppConfig(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.DefaultQuery("workspace_id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	}
	userID := c.GetString("userID")
	channelID := c.Query("channel_id")

	cfg := h.inboxService.GetWhatsAppConfig(workspaceID, userID, channelID)
	c.JSON(http.StatusOK, domain.SuccessResponse(cfg))
}

// UpdateWhatsAppConfig updates the WhatsApp CS channel for the workspace
func (h *InboxHandler) UpdateWhatsAppConfig(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("workspace_id is required"))
		return
	}

	var req domain.UpdateWorkspaceChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	ch, err := h.inboxService.UpdateWorkspaceChannel(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(ch, "WhatsApp channel updated successfully"))
}

// GetWhatsAppQR proxies the live QR code image from WAHA so frontend can render it directly
func (h *InboxHandler) GetWhatsAppQR(c *gin.Context) {
	wahaURL := h.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	wahaURL = strings.TrimRight(wahaURL, "/")

	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	channelID := c.Query("channel_id")
	sessionName := c.Query("session")

	if sessionName == "" && channelID != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelByID(workspaceID, channelID); err == nil && ch != nil {
			sessionName = ch.SessionName
		}
	}
	if sessionName == "" && userID != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelByUserID(workspaceID, userID); err == nil && ch != nil {
			sessionName = ch.SessionName
		}
	}
	if sessionName == "" {
		sessionName = "default"
	}

	client := &http.Client{Timeout: 5 * time.Second}

	// Ensure session exists and is started in WAHA
	sessCheckURL := fmt.Sprintf("%s/api/sessions/%s", wahaURL, sessionName)
	sessReq, _ := http.NewRequest("GET", sessCheckURL, nil)
	if h.cfg.WhatsAppToken != "" {
		sessReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
	}
	if sessResp, err := client.Do(sessReq); err == nil && sessResp != nil {
		if sessResp.StatusCode == http.StatusNotFound {
			startBody := fmt.Sprintf(`{"name":"%s"}`, sessionName)
			startReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/sessions", wahaURL), bytes.NewBufferString(startBody))
			startReq.Header.Set("Content-Type", "application/json")
			if h.cfg.WhatsAppToken != "" {
				startReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
			}
			_, _ = client.Do(startReq)

			startSessReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/sessions/%s/start", wahaURL, sessionName), nil)
			if h.cfg.WhatsAppToken != "" {
				startSessReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
			}
			_, _ = client.Do(startSessReq)
			time.Sleep(1000 * time.Millisecond)
		} else {
			var sessData struct {
				Status string `json:"status"`
			}
			if err := json.NewDecoder(sessResp.Body).Decode(&sessData); err == nil {
				if sessData.Status == "STOPPED" || sessData.Status == "FAILED" {
					startSessReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/sessions/%s/start", wahaURL, sessionName), nil)
					if h.cfg.WhatsAppToken != "" {
						startSessReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
					}
					_, _ = client.Do(startSessReq)
				}
			}
		}
		sessResp.Body.Close()
	}

	qrURL := fmt.Sprintf("%s/api/%s/auth/qr", wahaURL, sessionName)

	fetchQR := func() ([]byte, int, error) {
		req, err := http.NewRequest("GET", qrURL, nil)
		if err != nil {
			return nil, 0, err
		}
		if h.cfg.WhatsAppToken != "" {
			req.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
		}
		resp, err := client.Do(req)
		if err != nil {
			return nil, 0, err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, resp.StatusCode, fmt.Errorf("status code: %d", resp.StatusCode)
		}
		b, err := io.ReadAll(resp.Body)
		return b, resp.StatusCode, err
	}

	imgBytes, status, err := fetchQR()
	if err != nil || status != http.StatusOK {
		stopURL := fmt.Sprintf("%s/api/sessions/%s/stop", wahaURL, sessionName)
		stopReq, _ := http.NewRequest("POST", stopURL, nil)
		if h.cfg.WhatsAppToken != "" {
			stopReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
		}
		_, _ = client.Do(stopReq)

		startURL := fmt.Sprintf("%s/api/sessions/%s/start", wahaURL, sessionName)
		startReq, _ := http.NewRequest("POST", startURL, nil)
		if h.cfg.WhatsAppToken != "" {
			startReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
		}
		_, _ = client.Do(startReq)

		time.Sleep(1200 * time.Millisecond)
		imgBytes, _, err = fetchQR()
	}

	if err != nil || len(imgBytes) == 0 {
		c.JSON(http.StatusServiceUnavailable, domain.ErrorResponse("QR code sedang disiapkan atau WhatsApp sudah terhubung"))
		return
	}

	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Data(http.StatusOK, "image/png", imgBytes)
}

// GetWhatsAppStatus returns the live session connection status from WAHA
func (h *InboxHandler) GetWhatsAppStatus(c *gin.Context) {
	wahaURL := h.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	wahaURL = strings.TrimRight(wahaURL, "/")

	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	channelID := c.Query("channel_id")
	sessionName := c.Query("session")

	if sessionName == "" && channelID != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelByID(workspaceID, channelID); err == nil && ch != nil {
			sessionName = ch.SessionName
		}
	}
	if sessionName == "" && userID != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelByUserID(workspaceID, userID); err == nil && ch != nil {
			sessionName = ch.SessionName
		}
	}
	if sessionName == "" {
		sessionName = "default"
	}

	statusURL := fmt.Sprintf("%s/api/sessions/%s", wahaURL, sessionName)

	client := &http.Client{Timeout: 3 * time.Second}
	req, _ := http.NewRequest("GET", statusURL, nil)
	if h.cfg.WhatsAppToken != "" {
		req.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
	}

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode == http.StatusNotFound {
		c.JSON(http.StatusOK, domain.SuccessResponse(gin.H{
			"session": sessionName,
			"status":  "disconnected",
			"phone":   "",
		}))
		return
	}
	defer resp.Body.Close()

	var wahaResp struct {
		Name   string `json:"name"`
		Status string `json:"status"` // WORKING, SCAN_QR_CODE, STOPPED, FAILED
		Me     *struct {
			ID       string `json:"id"`
			PushName string `json:"pushName"`
		} `json:"me"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&wahaResp); err != nil {
		c.JSON(http.StatusOK, domain.SuccessResponse(gin.H{"session": sessionName, "status": "unknown"}))
		return
	}

	phone := ""
	pushName := ""
	if wahaResp.Me != nil {
		phone = "+" + strings.TrimSuffix(wahaResp.Me.ID, "@c.us")
		pushName = wahaResp.Me.PushName
	}

	// Update DB channel status if changed to working
	if wahaResp.Status == "WORKING" && phone != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelBySession(sessionName); err == nil && ch != nil {
			ch.Status = "connected"
			ch.PhoneNumber = phone
			_ = h.inboxService.UpsertWorkspaceChannel(ch)
		}
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(gin.H{
		"session":   wahaResp.Name,
		"status":    wahaResp.Status,
		"phone":     phone,
		"push_name": pushName,
	}))
}

// RestartWhatsAppSession resets the WAHA session (logout / start) so a fresh QR code is generated for pairing
func (h *InboxHandler) RestartWhatsAppSession(c *gin.Context) {
	wahaURL := h.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	wahaURL = strings.TrimRight(wahaURL, "/")

	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	channelID := c.Query("channel_id")
	sessionName := c.Query("session")

	if sessionName == "" && channelID != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelByID(workspaceID, channelID); err == nil && ch != nil {
			sessionName = ch.SessionName
		}
	}
	if sessionName == "" && userID != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelByUserID(workspaceID, userID); err == nil && ch != nil {
			sessionName = ch.SessionName
		}
	}
	if sessionName == "" {
		sessionName = "default"
	}

	client := &http.Client{Timeout: 6 * time.Second}

	// 1. Try logout to disconnect previous phone and clear credentials
	logoutURL := fmt.Sprintf("%s/api/sessions/%s/logout", wahaURL, sessionName)
	logoutReq, _ := http.NewRequest("POST", logoutURL, nil)
	if h.cfg.WhatsAppToken != "" {
		logoutReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
	}
	_, _ = client.Do(logoutReq)

	// 2. Stop session to clear any dead or failed sockets
	stopURL := fmt.Sprintf("%s/api/sessions/%s/stop", wahaURL, sessionName)
	stopReq, _ := http.NewRequest("POST", stopURL, nil)
	if h.cfg.WhatsAppToken != "" {
		stopReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
	}
	_, _ = client.Do(stopReq)

	// 3. Configure and start fresh session for QR pairing with NOWEB store enabled
	sessionConfig := map[string]interface{}{
		"config": map[string]interface{}{
			"noweb": map[string]interface{}{
				"store": map[string]interface{}{
					"enabled":  true,
					"fullSync": false,
				},
			},
		},
	}
	bodyBytes, _ := json.Marshal(sessionConfig)
	putURL := fmt.Sprintf("%s/api/sessions/%s", wahaURL, sessionName)
	putReq, _ := http.NewRequest("PUT", putURL, bytes.NewBuffer(bodyBytes))
	putReq.Header.Set("Content-Type", "application/json")
	if h.cfg.WhatsAppToken != "" {
		putReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
	}
	resp, err := client.Do(putReq)
	if err != nil || (resp != nil && resp.StatusCode >= 400) {
		startURL := fmt.Sprintf("%s/api/sessions/%s/start", wahaURL, sessionName)
		startReq, _ := http.NewRequest("POST", startURL, nil)
		if h.cfg.WhatsAppToken != "" {
			startReq.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
		}
		_, _ = client.Do(startReq)
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(nil, fmt.Sprintf("Sesi %s WhatsApp berhasil di-reset untuk pemindaian ulang", sessionName)))
}

// SyncWhatsAppHistory pulls historical chats and messages from WAHA store
func (h *InboxHandler) SyncWhatsAppHistory(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("id")
	}
	userID := c.GetString("userID")
	channelID := c.Query("channel_id")
	sessionName := c.Query("session")

	var req domain.WhatsAppSyncRequest
	_ = c.ShouldBindJSON(&req)
	if req.Limit <= 0 {
		req.Limit = 50
	}

	if sessionName == "" && channelID != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelByID(workspaceID, channelID); err == nil && ch != nil {
			sessionName = ch.SessionName
		}
	}
	if sessionName == "" && userID != "" {
		if ch, err := h.inboxService.GetWorkspaceChannelByUserID(workspaceID, userID); err == nil && ch != nil {
			sessionName = ch.SessionName
			channelID = ch.ID
		}
	}
	if sessionName == "" {
		sessionName = "default"
	}

	res, err := h.inboxService.SyncWhatsAppHistory(workspaceID, sessionName, channelID, req.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(res, res.Message))
}

// VerifyWhatsAppWebhook handles Meta Cloud API webhook verification challenge (GET)
func (h *InboxHandler) VerifyWhatsAppWebhook(c *gin.Context) {
	mode := c.Query("hub.mode")
	token := c.Query("hub.verify_token")
	challenge := c.Query("hub.challenge")

	if mode == "subscribe" && token == h.cfg.WhatsAppVerifyToken {
		c.String(http.StatusOK, challenge)
		return
	}

	c.String(http.StatusForbidden, "Verification failed: invalid token")
}

// ReceiveWhatsAppWebhook is the universal live webhook for incoming WhatsApp messages
// Supports: Meta Cloud API, Fonnte, Wablas, Waha, and generic WhatsApp bridges
func (h *InboxHandler) ReceiveWhatsAppWebhook(c *gin.Context) {
	bodyBytes, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body"})
		return
	}

	var rawMap map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &rawMap); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json payload"})
		return
	}

	// 1. Filter WAHA events: only process "message" event to prevent duplicate rooms (ignore "message.any", "message.ack", etc.)
	if event, ok := rawMap["event"].(string); ok && event != "" {
		if event != "message" {
			c.JSON(http.StatusOK, gin.H{"status": "ignored_non_message_event", "event": event})
			return
		}
	}

	// 2. Message Deduplication using message ID (prevents double processing)
	if payload, ok := rawMap["payload"].(map[string]interface{}); ok {
		if id, ok := payload["id"].(string); ok && id != "" {
			if _, exists := h.dedupCache.Load(id); exists {
				c.JSON(http.StatusOK, gin.H{"status": "duplicate_message_ignored", "id": id})
				return
			}
			h.dedupCache.Store(id, time.Now())
		}
	}

	// Workspace fallback (default workspace if not in query param)
	workspaceID := c.DefaultQuery("workspace_id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

	senderPhone := ""
	senderName := ""
	messageText := ""
	attachURL := ""
	attachName := ""
	attachType := ""
	mimeType := ""
	var fileSize int64

	// 1. Meta WhatsApp Cloud API format
	if entries, ok := rawMap["entry"].([]interface{}); ok && len(entries) > 0 {
		if entryMap, ok := entries[0].(map[string]interface{}); ok {
			if changes, ok := entryMap["changes"].([]interface{}); ok && len(changes) > 0 {
				if changeMap, ok := changes[0].(map[string]interface{}); ok {
					if valMap, ok := changeMap["value"].(map[string]interface{}); ok {
						if contacts, ok := valMap["contacts"].([]interface{}); ok && len(contacts) > 0 {
							if cMap, ok := contacts[0].(map[string]interface{}); ok {
								if profile, ok := cMap["profile"].(map[string]interface{}); ok {
									if name, ok := profile["name"].(string); ok {
										senderName = name
									}
								}
							}
						}
						if msgs, ok := valMap["messages"].([]interface{}); ok && len(msgs) > 0 {
							if msgMap, ok := msgs[0].(map[string]interface{}); ok {
								if from, ok := msgMap["from"].(string); ok {
									senderPhone = from
								}
								if textMap, ok := msgMap["text"].(map[string]interface{}); ok {
									if body, ok := textMap["body"].(string); ok {
										messageText = body
									}
								}
							}
						}
					}
				}
			}
		}
	}

	// 2. Fonnte / Wablas format
	if senderPhone == "" {
		if sender, ok := rawMap["sender"].(string); ok && sender != "" {
			senderPhone = sender
			if msg, ok := rawMap["message"].(string); ok {
				messageText = msg
			}
			if name, ok := rawMap["name"].(string); ok {
				senderName = name
			}
		}
	}

	// 3. Waha / Baileys format
	if senderPhone == "" {
		if payload, ok := rawMap["payload"].(map[string]interface{}); ok {
			// Ignore outbound messages sent by agent/system to avoid echoing
			if fromMe, ok := payload["fromMe"].(bool); ok && fromMe {
				c.JSON(http.StatusOK, gin.H{"status": "ignored_outbound_echo"})
				return
			}

			sessionName := "default"
			if s, ok := rawMap["session"].(string); ok && s != "" {
				sessionName = s
			}

			if from, ok := payload["from"].(string); ok {
				// Handle WhatsApp LID (Local Identifier) format
				if strings.HasSuffix(from, "@lid") {
					lidNum := strings.TrimSuffix(from, "@lid")
					resolvedPN := service.ResolveLID(sessionName, lidNum)
					if resolvedPN != "" {
						senderPhone = resolvedPN
					} else {
						senderPhone = from
					}
				} else {
					senderPhone = strings.TrimSuffix(from, "@c.us")
				}
			}

			if body, ok := payload["body"].(string); ok {
				messageText = body
			}

			// Check media / attachments
			hasMedia, _ := payload["hasMedia"].(bool)
			if hasMedia || payload["mediaUrl"] != nil || payload["media"] != nil {
				if mUrl, ok := payload["mediaUrl"].(string); ok && mUrl != "" {
					attachURL = mUrl
				}
				if mediaMap, ok := payload["media"].(map[string]interface{}); ok {
					if u, ok := mediaMap["url"].(string); ok && u != "" {
						attachURL = u
					}
					if mt, ok := mediaMap["mimetype"].(string); ok {
						mimeType = mt
					}
					if fn, ok := mediaMap["filename"].(string); ok {
						attachName = fn
					}
				}
				if mimeType == "" {
					if mt, ok := payload["mimetype"].(string); ok {
						mimeType = mt
					}
				}
				if attachName == "" {
					if fn, ok := payload["filename"].(string); ok {
						attachName = fn
					}
				}

				if strings.HasPrefix(mimeType, "image/") {
					attachType = "image"
				} else if strings.HasPrefix(mimeType, "video/") {
					attachType = "video"
				} else {
					attachType = "document"
				}

				if messageText == "" {
					if attachName != "" {
						messageText = attachName
					} else {
						messageText = "[Berkas Lampiran]"
					}
				}
			}

			if data, ok := payload["_data"].(map[string]interface{}); ok {
				if notifyName, ok := data["notifyName"].(string); ok && strings.TrimSpace(notifyName) != "" {
					senderName = strings.TrimSpace(notifyName)
				} else if pushname, ok := data["pushname"].(string); ok && strings.TrimSpace(pushname) != "" {
					senderName = strings.TrimSpace(pushname)
				}
				if senderName == "" {
					if info, ok := data["Info"].(map[string]interface{}); ok {
						if pn, ok := info["PushName"].(string); ok && strings.TrimSpace(pn) != "" {
							senderName = strings.TrimSpace(pn)
						}
					}
				}
			}
			if senderName == "" {
				if pn, ok := payload["pushName"].(string); ok && strings.TrimSpace(pn) != "" {
					senderName = strings.TrimSpace(pn)
				} else if pn, ok := payload["pushname"].(string); ok && strings.TrimSpace(pn) != "" {
					senderName = strings.TrimSpace(pn)
				} else if pn, ok := payload["notifyName"].(string); ok && strings.TrimSpace(pn) != "" {
					senderName = strings.TrimSpace(pn)
				} else if sName, ok := payload["sender_name"].(string); ok && strings.TrimSpace(sName) != "" {
					senderName = strings.TrimSpace(sName)
				}
			}

			// Multi-tenant check: map recipient phone to workspace
			if to, ok := payload["to"].(string); ok && to != "" {
				recipientPhone := strings.TrimSuffix(to, "@c.us")
				if ch, err := h.inboxService.GetWorkspaceChannelByPhoneNumber(recipientPhone); err == nil && ch != nil {
					workspaceID = ch.WorkspaceID
				}
			}
		}
	}

	// 4. Standard JSON format
	if senderPhone == "" {
		if sIdent, ok := rawMap["sender_identifier"].(string); ok && sIdent != "" {
			senderPhone = sIdent
		}
		if sContent, ok := rawMap["content"].(string); ok {
			messageText = sContent
		}
		if sName, ok := rawMap["sender_name"].(string); ok && strings.TrimSpace(sName) != "" {
			senderName = strings.TrimSpace(sName)
		}
		if sName, ok := rawMap["push_name"].(string); ok && strings.TrimSpace(sName) != "" && senderName == "" {
			senderName = strings.TrimSpace(sName)
		}
	}

	// If no text or delivery receipt event from Meta, return 200 OK so Meta doesn't retry
	if senderPhone == "" || messageText == "" {
		c.JSON(http.StatusOK, gin.H{"status": "event_acknowledged"})
		return
	}

	// Normalize phone (with LID fallback resolution)
	cleanPhone := repository.NormalizePhone(senderPhone)
	if len(cleanPhone) >= 14 && strings.HasPrefix(cleanPhone, "2") {
		// Attempt reverse lookup for LID
		pn := service.ResolveLID("default", cleanPhone)
		if pn != "" {
			cleanPhone = repository.NormalizePhone(pn)
		}
	}

	cleanPhone = "+" + strings.TrimLeft(cleanPhone, "+")

	// Determine sessionName early so we can query WAHA contact profile if needed
	sessionName := "default"
	if s, ok := rawMap["session"].(string); ok && s != "" {
		sessionName = s
	}

	// If senderName is empty, phone number, or placeholder, fetch from WAHA contact profile API
	if senderName == "" || senderName == senderPhone || strings.HasPrefix(senderName, "+") || strings.EqualFold(senderName, "test") || strings.EqualFold(senderName, "tester") {
		wahaURL := h.cfg.WhatsAppGatewayURL
		if wahaURL == "" {
			wahaURL = "http://localhost:3005"
		}
		wahaURL = strings.TrimRight(wahaURL, "/")
		phoneDigits := repository.NormalizePhone(senderPhone)
		reqContact, errReq := http.NewRequest("GET", fmt.Sprintf("%s/api/contacts?contactId=%s@c.us&session=%s", wahaURL, phoneDigits, sessionName), nil)
		if errReq == nil {
			if h.cfg.WhatsAppToken != "" {
				reqContact.Header.Set("X-Api-Key", h.cfg.WhatsAppToken)
			}
			client := &http.Client{Timeout: 2 * time.Second}
			respContact, errDo := client.Do(reqContact)
			if errDo == nil && respContact.StatusCode == http.StatusOK {
				var contactData struct {
					Name     string `json:"name"`
					Pushname string `json:"pushname"`
					PushName string `json:"pushName"`
				}
				if json.NewDecoder(respContact.Body).Decode(&contactData) == nil {
					if strings.TrimSpace(contactData.Pushname) != "" {
						senderName = strings.TrimSpace(contactData.Pushname)
					} else if strings.TrimSpace(contactData.PushName) != "" {
						senderName = strings.TrimSpace(contactData.PushName)
					} else if strings.TrimSpace(contactData.Name) != "" {
						senderName = strings.TrimSpace(contactData.Name)
					}
				}
				respContact.Body.Close()
			}
		}
	}

	if senderName == "" || senderName == senderPhone {
		senderName = cleanPhone
	}

	var channelID string
	dept := "support"
	var assignedUserID *string

	if ch, err := h.inboxService.GetWorkspaceChannelBySession(sessionName); err == nil && ch != nil {
		channelID = ch.ID
		dept = ch.Department
		assignedUserID = ch.AssignedUserID
		workspaceID = ch.WorkspaceID
	}

	incomingReq := domain.IncomingWebhookRequest{
		Channel:          domain.ChannelWhatsApp,
		ChannelID:        channelID,
		Department:       dept,
		AssignedToID:     assignedUserID,
		SenderName:       senderName,
		SenderIdentifier: cleanPhone,
		Content:          messageText,
		Subject:          fmt.Sprintf("Pesan WhatsApp dari %s", senderName),
		AttachmentURL:    attachURL,
		AttachmentName:   attachName,
		AttachmentType:   attachType,
		MimeType:         mimeType,
		FileSize:         fileSize,
	}

	msg, err := h.inboxService.HandleIncomingMessage(workspaceID, incomingReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "success",
		"message_id": msg.ID,
		"from":       cleanPhone,
		"channel":    "whatsapp",
		"business":   h.cfg.WhatsAppBusinessNumber,
	})
}

func (h *InboxHandler) ListChannels(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	channels, err := h.inboxService.ListWorkspaceChannels(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(channels))
}

func (h *InboxHandler) CreateChannel(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var req domain.CreateWorkspaceChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	channel, err := h.inboxService.CreateWorkspaceChannel(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(channel, "Channel created"))
}

func (h *InboxHandler) DeleteChannel(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	channelID := c.Param("channel_id")

	if err := h.inboxService.DeleteWorkspaceChannel(workspaceID, channelID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Channel deleted"))
}

func (h *InboxHandler) GetChannelQR(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	channelID := c.Param("channel_id")

	qrData, err := h.inboxService.GetChannelQRCode(workspaceID, channelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(qrData))
}

func (h *InboxHandler) GetMonitoringStats(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	dept := c.Query("department")

	stats, err := h.inboxService.GetMonitoringStats(workspaceID, dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(stats))
}

func (h *InboxHandler) TakeoverConversation(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	currentUserID := c.GetString("userID")
	conversationID := c.Param("conversation_id")

	var req domain.TakeoverConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Alasan pengambilalihan wajib diisi"))
		return
	}

	conv, err := h.inboxService.TakeoverConversation(workspaceID, currentUserID, conversationID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(conv, "Percakapan berhasil diambil alih"))
}

func (h *InboxHandler) EscalateConversation(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	currentUserID := c.GetString("userID")
	conversationID := c.Param("conversation_id")

	var req domain.EscalateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Tujuan eskalasi dan alasan wajib diisi"))
		return
	}

	conv, err := h.inboxService.EscalateConversation(workspaceID, currentUserID, conversationID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(conv, "Percakapan berhasil dieskalasi"))
}

func (h *InboxHandler) LogConversationAccess(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	currentUserID := c.GetString("userID")
	conversationID := c.Param("conversation_id")
	ipAddress := c.ClientIP()

	var req domain.LogConversationAccessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Alasan akses wajib diisi"))
		return
	}

	if err := h.inboxService.LogConversationAccess(workspaceID, currentUserID, conversationID, req, ipAddress); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Akses berhasil dicatat"))
}

func (h *InboxHandler) UpdatePriority(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	conversationID := c.Param("conversation_id")

	var req struct {
		Priority string `json:"priority" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Prioritas wajib diisi"))
		return
	}

	if err := h.inboxService.UpdatePriority(workspaceID, conversationID, req.Priority); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Prioritas berhasil diperbarui"))
}

func (h *InboxHandler) ListInboxAuditTrail(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	limitStr := c.DefaultQuery("limit", "50")
	var limit int
	fmt.Sscanf(limitStr, "%d", &limit)
	if limit <= 0 {
		limit = 50
	}

	trail, err := h.inboxService.ListInboxAuditTrail(workspaceID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(trail))
}

// PublicWebChatSend handles incoming public webchat messages from the website widget (OCTO-WEB)
func (h *InboxHandler) PublicWebChatSend(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("workspace_id wajib disertakan"))
		return
	}

	var req domain.PublicWebChatSendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	incomingReq := domain.IncomingWebhookRequest{
		Channel:          domain.ChannelWebChat,
		SenderIdentifier: req.VisitorID,
		SenderName:       req.Name,
		Email:            req.Email,
		Phone:            req.Phone,
		Content:          req.Message,
		Department:       "support",
	}

	msg, err := h.inboxService.HandleIncomingMessage(workspaceID, incomingReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(gin.H{
		"conversation_id": msg.ConversationID,
		"message_id":      msg.ID,
		"sender_name":     msg.SenderName,
		"content":         msg.Content,
		"created_at":      msg.CreatedAt,
	}, "Pesan webchat berhasil dikirim"))
}

// PublicWebChatMessages retrieves the chat message history for the visitor
func (h *InboxHandler) PublicWebChatMessages(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	visitorID := c.Query("visitor_id")
	if workspaceID == "" || visitorID == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("workspace_id dan visitor_id wajib disertakan"))
		return
	}

	history, err := h.inboxService.GetPublicWebChatHistory(workspaceID, visitorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(history))
}
