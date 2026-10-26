package service

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"octo-crm/backend/internal/config"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/utils"

	"github.com/google/uuid"
)

type InboxService struct {
	inboxRepo     *repository.InboxRepository
	contactRepo   *repository.ContactRepository
	dealService   *DealService
	activityRepo  *repository.ActivityRepository
	userRepo      *repository.UserRepository
	auditRepo        *repository.AuditRepository
	notificationRepo *repository.NotificationRepo
	pillarService    *PillarService
	ticketRepo       *repository.TicketRepository
	cfg              *config.Config
	mu               sync.Mutex
	subscribers      map[chan domain.InboxEvent]string
	subMu            sync.RWMutex
}

func (s *InboxService) SetPillarService(ps *PillarService) {
	s.pillarService = ps
}

func (s *InboxService) SetNotificationRepo(nr *repository.NotificationRepo) {
	s.notificationRepo = nr
}

func (s *InboxService) SetTicketRepo(tr *repository.TicketRepository) {
	s.ticketRepo = tr
}

func NewInboxService(
	inboxRepo *repository.InboxRepository,
	contactRepo *repository.ContactRepository,
	dealService *DealService,
	activityRepo *repository.ActivityRepository,
	userRepo *repository.UserRepository,
	auditRepo *repository.AuditRepository,
	cfg *config.Config,
) *InboxService {
	return &InboxService{
		inboxRepo:    inboxRepo,
		contactRepo:  contactRepo,
		dealService:  dealService,
		activityRepo: activityRepo,
		userRepo:     userRepo,
		auditRepo:    auditRepo,
		cfg:          cfg,
		subscribers:  make(map[chan domain.InboxEvent]string),
	}
}

func (s *InboxService) Subscribe(workspaceID string) chan domain.InboxEvent {
	s.subMu.Lock()
	defer s.subMu.Unlock()
	ch := make(chan domain.InboxEvent, 100)
	s.subscribers[ch] = workspaceID
	return ch
}

func (s *InboxService) Unsubscribe(ch chan domain.InboxEvent) {
	s.subMu.Lock()
	defer s.subMu.Unlock()
	if _, exists := s.subscribers[ch]; exists {
		delete(s.subscribers, ch)
		close(ch)
	}
}

func (s *InboxService) BroadcastEvent(event domain.InboxEvent) {
	s.subMu.RLock()
	defer s.subMu.RUnlock()
	for ch, wsID := range s.subscribers {
		if wsID == "" || wsID == event.WorkspaceID {
			select {
			case ch <- event:
			default:
			}
		}
	}
}

func (s *InboxService) GetWhatsAppConfig(workspaceID, userID, channelID string) map[string]interface{} {
	csNumber := ""
	sessionName := "default"
	status := "disconnected"
	channelIDOut := ""
	channelName := "WhatsApp CS Hotline"
	department := "support"
	var assignedUserID *string

	wahaURL := s.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	wahaURL = strings.TrimRight(wahaURL, "/")

	var targetChannel *domain.WorkspaceChannel

	if channelID != "" {
		if ch, err := s.inboxRepo.GetWorkspaceChannelByID(workspaceID, channelID); err == nil && ch != nil {
			targetChannel = ch
		}
	}

	if targetChannel == nil && userID != "" {
		if ch, err := s.inboxRepo.GetWorkspaceChannelByUserID(workspaceID, userID); err == nil && ch != nil {
			targetChannel = ch
		} else {
			// Auto provision channel for this user
			u, err := s.userRepo.GetUserByID(userID)
			if err == nil && u != nil {
				userSess := fmt.Sprintf("user_%s", strings.ReplaceAll(userID, "-", "")[:8])
				newCh := domain.WorkspaceChannel{
					ID:             uuid.New().String(),
					WorkspaceID:    workspaceID,
					ChannelName:    fmt.Sprintf("WhatsApp %s", u.FullName),
					ChannelType:    "whatsapp",
					Department:     "sales",
					PhoneNumber:    "",
					SessionName:    userSess,
					AssignedUserID: &userID,
					Status:         "disconnected",
					IsActive:       true,
				}
				if err := s.inboxRepo.UpsertWorkspaceChannel(&newCh); err == nil {
					targetChannel = &newCh
				}
			}
		}
	}

	if targetChannel == nil {
		if ch, err := s.inboxRepo.GetWorkspaceChannel(workspaceID, "whatsapp"); err == nil && ch != nil {
			targetChannel = ch
		}
	}

	if targetChannel != nil {
		channelIDOut = targetChannel.ID
		channelName = targetChannel.ChannelName
		department = targetChannel.Department
		sessionName = targetChannel.SessionName
		status = targetChannel.Status
		csNumber = targetChannel.PhoneNumber
		assignedUserID = targetChannel.AssignedUserID

		// Verify with WAHA live status
		client := &http.Client{Timeout: 2 * time.Second}
		statusReq, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/sessions/%s", wahaURL, sessionName), nil)
		if s.cfg.WhatsAppToken != "" {
			statusReq.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
		}
		if statusResp, err := client.Do(statusReq); err == nil && statusResp != nil {
			if statusResp.StatusCode == http.StatusOK {
				var sessInfo struct {
					Status string `json:"status"`
					Me     *struct {
						ID string `json:"id"`
					} `json:"me"`
				}
				if json.NewDecoder(statusResp.Body).Decode(&sessInfo) == nil {
					if sessInfo.Status == "WORKING" {
						status = "connected"
						if sessInfo.Me != nil && sessInfo.Me.ID != "" && csNumber == "" {
							csNumber = "+" + strings.TrimLeft(strings.TrimSuffix(sessInfo.Me.ID, "@c.us"), "+")
							targetChannel.PhoneNumber = csNumber
							targetChannel.Status = "connected"
							_ = s.inboxRepo.UpsertWorkspaceChannel(targetChannel)
						}
					} else {
						status = strings.ToLower(sessInfo.Status)
					}
				}
			} else if statusResp.StatusCode == http.StatusNotFound {
				status = "disconnected"
				csNumber = ""
			}
			statusResp.Body.Close()
		}
	}

	return map[string]interface{}{
		"channel_id":         channelIDOut,
		"channel_name":       channelName,
		"department":         department,
		"business_number":    csNumber,
		"session_name":       sessionName,
		"assigned_user_id":   assignedUserID,
		"status":             status,
		"verify_token":       s.cfg.WhatsAppVerifyToken,
		"waha_url":           wahaURL,
		"is_live_configured": status == "connected" && csNumber != "",
	}
}

func (s *InboxService) GetWorkspaceChannelByID(workspaceID, channelID string) (*domain.WorkspaceChannel, error) {
	return s.inboxRepo.GetWorkspaceChannelByID(workspaceID, channelID)
}

func (s *InboxService) GetWorkspaceChannelByUserID(workspaceID, userID string) (*domain.WorkspaceChannel, error) {
	return s.inboxRepo.GetWorkspaceChannelByUserID(workspaceID, userID)
}

func (s *InboxService) GetWorkspaceChannelBySession(sessionName string) (*domain.WorkspaceChannel, error) {
	return s.inboxRepo.GetWorkspaceChannelBySession(sessionName)
}

func (s *InboxService) UpsertWorkspaceChannel(c *domain.WorkspaceChannel) error {
	return s.inboxRepo.UpsertWorkspaceChannel(c)
}

func (s *InboxService) UpdateWorkspaceChannel(workspaceID string, req domain.UpdateWorkspaceChannelRequest) (*domain.WorkspaceChannel, error) {
	sessionName := req.SessionName
	if sessionName == "" {
		sessionName = "default"
	}
	cleanPhone := "+" + strings.TrimLeft(repository.NormalizePhone(req.PhoneNumber), "+")

	ch := domain.WorkspaceChannel{
		WorkspaceID: workspaceID,
		ChannelType: "whatsapp",
		PhoneNumber: cleanPhone,
		SessionName: sessionName,
		Status:      "connected",
		IsActive:    true,
	}

	if err := s.inboxRepo.UpsertWorkspaceChannel(&ch); err != nil {
		return nil, err
	}
	return &ch, nil
}

func (s *InboxService) GetWorkspaceChannelByPhoneNumber(phone string) (*domain.WorkspaceChannel, error) {
	return s.inboxRepo.GetWorkspaceChannelByPhoneNumber(phone)
}

func (s *InboxService) ListWorkspaceChannels(workspaceID string) ([]domain.WorkspaceChannel, error) {
	channels, err := s.inboxRepo.ListWorkspaceChannels(workspaceID)
	if err != nil {
		return nil, err
	}

	wahaURL := s.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	wahaURL = strings.TrimRight(wahaURL, "/")

	// Sync live WAHA status if available
	client := &http.Client{Timeout: 3 * time.Second}
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/sessions", wahaURL), nil)
	if s.cfg.WhatsAppToken != "" {
		req.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
	}
	if resp, err := client.Do(req); err == nil && resp != nil {
		var wahaSessions []struct {
			Name   string `json:"name"`
			Status string `json:"status"`
			Me     struct {
				ID string `json:"id"`
			} `json:"me"`
		}
		if json.NewDecoder(resp.Body).Decode(&wahaSessions) == nil {
			statusMap := make(map[string]string)
			phoneMap := make(map[string]string)
			for _, ws := range wahaSessions {
				statusMap[ws.Name] = ws.Status
				if ws.Me.ID != "" {
					phoneMap[ws.Name] = "+" + strings.TrimLeft(strings.TrimSuffix(ws.Me.ID, "@c.us"), "+")
				}
			}
			for i := range channels {
				sessName := channels[i].SessionName
				if st, ok := statusMap[sessName]; ok {
					if st == "WORKING" {
						channels[i].Status = "connected"
					} else if st == "SCAN_QR_CODE" {
						channels[i].Status = "scan_qr"
					} else {
						channels[i].Status = strings.ToLower(st)
					}
					if p, hasPhone := phoneMap[sessName]; hasPhone && channels[i].PhoneNumber == "" {
						channels[i].PhoneNumber = p
					}
				}
			}
		}
		resp.Body.Close()
	}

	return channels, nil
}

func (s *InboxService) CreateWorkspaceChannel(workspaceID string, req domain.CreateWorkspaceChannelRequest) (*domain.WorkspaceChannel, error) {
	sessionName := strings.TrimSpace(req.SessionName)
	if sessionName == "" {
		cleanName := strings.ToLower(strings.ReplaceAll(req.ChannelName, " ", "_"))
		sessionName = fmt.Sprintf("ws_%s_%s", workspaceID[:8], cleanName)
	}

	dept := req.Department
	if dept == "" {
		dept = "support"
	}

	cleanPhone := ""
	if req.PhoneNumber != "" {
		cleanPhone = "+" + strings.TrimLeft(repository.NormalizePhone(req.PhoneNumber), "+")
	}

	ch := domain.WorkspaceChannel{
		ID:             uuid.New().String(),
		WorkspaceID:    workspaceID,
		ChannelName:    req.ChannelName,
		ChannelType:    "whatsapp",
		Department:     dept,
		PhoneNumber:    cleanPhone,
		SessionName:    sessionName,
		AssignedUserID: req.AssignedUserID,
		Status:         "scan_qr",
		IsActive:       true,
	}

	// Create session in WAHA
	wahaURL := s.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	wahaURL = strings.TrimRight(wahaURL, "/")

	sessPayload := map[string]interface{}{
		"name": sessionName,
		"config": map[string]interface{}{
			"noweb": map[string]interface{}{
				"store": map[string]interface{}{
					"enabled": true,
				},
			},
		},
	}
	bodyBytes, _ := json.Marshal(sessPayload)
	client := &http.Client{Timeout: 5 * time.Second}
	wahaReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/sessions", wahaURL), bytes.NewBuffer(bodyBytes))
	wahaReq.Header.Set("Content-Type", "application/json")
	if s.cfg.WhatsAppToken != "" {
		wahaReq.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
	}
	_, _ = client.Do(wahaReq)

	if err := s.inboxRepo.UpsertWorkspaceChannel(&ch); err != nil {
		return nil, err
	}

	return &ch, nil
}

func (s *InboxService) DeleteWorkspaceChannel(workspaceID, channelID string) error {
	ch, err := s.inboxRepo.GetWorkspaceChannelByID(workspaceID, channelID)
	if err != nil {
		return err
	}

	if ch.SessionName != "default" {
		wahaURL := s.cfg.WhatsAppGatewayURL
		if wahaURL == "" {
			wahaURL = "http://localhost:3005"
		}
		wahaURL = strings.TrimRight(wahaURL, "/")
		client := &http.Client{Timeout: 5 * time.Second}
		delReq, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/api/sessions/%s", wahaURL, ch.SessionName), nil)
		if s.cfg.WhatsAppToken != "" {
			delReq.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
		}
		_, _ = client.Do(delReq)
	}

	return s.inboxRepo.DeleteWorkspaceChannel(workspaceID, channelID)
}

func (s *InboxService) GetChannelQRCode(workspaceID, channelID string) (map[string]interface{}, error) {
	ch, err := s.inboxRepo.GetWorkspaceChannelByID(workspaceID, channelID)
	if err != nil {
		return nil, err
	}

	wahaURL := s.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	wahaURL = strings.TrimRight(wahaURL, "/")

	client := &http.Client{Timeout: 5 * time.Second}
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/sessions/%s", wahaURL, ch.SessionName), nil)
	if s.cfg.WhatsAppToken != "" {
		req.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
	}
	resp, err := client.Do(req)
	if err == nil && resp != nil {
		var sessInfo struct {
			Status string `json:"status"`
			Me     struct {
				ID string `json:"id"`
			} `json:"me"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&sessInfo)
		resp.Body.Close()

		if sessInfo.Status == "WORKING" {
			phone := ch.PhoneNumber
			if sessInfo.Me.ID != "" {
				phone = "+" + strings.TrimLeft(strings.TrimSuffix(sessInfo.Me.ID, "@c.us"), "+")
			}
			return map[string]interface{}{
				"status":       "connected",
				"phone_number": phone,
				"session_name": ch.SessionName,
			}, nil
		}
	}

	// If needing QR code
	return map[string]interface{}{
		"status":       "scan_qr",
		"session_name": ch.SessionName,
		"qr_image_url": fmt.Sprintf("%s/api/%s/auth/qr", wahaURL, ch.SessionName),
	}, nil
}

func (s *InboxService) ListConversations(workspaceID string, filter domain.ConversationFilter) ([]domain.Conversation, error) {
	return s.inboxRepo.ListConversations(workspaceID, filter)
}

func (s *InboxService) GetConversation(workspaceID, conversationID string) (*domain.Conversation, error) {
	conv, err := s.inboxRepo.GetConversationByID(workspaceID, conversationID)
	if err != nil {
		return nil, err
	}
	// Mark conversation as read
	_ = s.inboxRepo.MarkConversationRead(workspaceID, conversationID)
	return conv, nil
}

func (s *InboxService) ListMessages(conversationID string) ([]domain.Message, error) {
	return s.inboxRepo.ListMessages(conversationID)
}

// SendReply sends an outbound reply from an agent via WhatsApp or Email
func (s *InboxService) SendReply(workspaceID, currentUserID, conversationID string, req domain.SendReplyRequest) (*domain.Message, error) {
	conv, err := s.inboxRepo.GetConversationByID(workspaceID, conversationID)
	if err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	user, err := s.userRepo.GetUserByID(currentUserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	channel := req.Channel
	if channel == "" {
		channel = conv.Channel
	}

	content := strings.TrimSpace(req.Content)
	if content == "" && req.AttachmentName != "" {
		content = req.AttachmentName
	}
	if content == "" {
		content = "[Lampiran Berkas]"
	}

	var metadataBytes []byte
	if req.AttachmentURL != "" {
		metaMap := map[string]interface{}{
			"attachment_url":  req.AttachmentURL,
			"attachment_name": req.AttachmentName,
			"attachment_type": req.AttachmentType,
			"mime_type":       req.MimeType,
			"file_size":       req.FileSize,
		}
		metadataBytes, _ = json.Marshal(metaMap)
	} else {
		metadataBytes = []byte("{}")
	}

	msg := domain.Message{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		SenderType:     "agent",
		SenderID:       &currentUserID,
		SenderName:     user.FullName,
		Content:        content,
		Channel:        channel,
		Status:         "sent",
		Metadata:       json.RawMessage(metadataBytes),
		CreatedAt:      time.Now(),
	}

	if err := s.inboxRepo.CreateMessage(&msg); err != nil {
		return nil, err
	}

	// Real-time broadcast
	s.BroadcastEvent(domain.InboxEvent{
		Type:           "new_message",
		WorkspaceID:    workspaceID,
		ConversationID: conversationID,
		Message:        &msg,
	})

	// Auto log activity in customer's timeline if contact linked
	if conv.ContactID != nil && *conv.ContactID != "" {
		actType := domain.ActivityWhatsApp
		if channel == domain.ChannelEmail {
			actType = domain.ActivityEmail
		}
		_ = s.activityRepo.CreateActivity(&domain.Activity{
			WorkspaceID: workspaceID,
			ContactID:   *conv.ContactID,
			UserID:      &currentUserID,
			Type:        actType,
			Subject:     fmt.Sprintf("Balasan %s dikirim oleh %s", strings.ToUpper(string(channel)), user.FullName),
			Description: msg.Content,
		})
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "inbox_reply_sent",
		EntityType:  "conversation",
		EntityID:    conversationID,
		Description: fmt.Sprintf("Sent %s reply to %s", channel, conv.ChannelIdentifier),
	})

	// If a human CS sends a reply, automatically disable bot mode and assign to current user
	if conv.BotActive || conv.AssignedToID == nil {
		_ = s.inboxRepo.UpdateConversationBotStatus(workspaceID, conversationID, false, "Taken over by CS reply")
		if conv.AssignedToID == nil && currentUserID != "" {
			_ = s.inboxRepo.UpdateConversationAssignment(workspaceID, conversationID, &currentUserID)
		}
	}

	// Real Outbound WhatsApp dispatch
	if channel == domain.ChannelWhatsApp {
		sessionName := "default"
		// 1. Highest priority: The specific channel linked to this conversation
		if conv.ChannelID != nil && *conv.ChannelID != "" {
			if ch, err := s.inboxRepo.GetWorkspaceChannelByID(workspaceID, *conv.ChannelID); err == nil && ch != nil && ch.SessionName != "" {
				sessionName = ch.SessionName
			}
		}
		// 2. Fallback to active/connected channel
		if sessionName == "default" {
			if ch, err := s.inboxRepo.GetWorkspaceChannel(workspaceID, "whatsapp"); err == nil && ch != nil {
				if ch.SessionName != "" {
					sessionName = ch.SessionName
				}
			}
		}

		if s.cfg.WhatsAppToken != "" && s.cfg.WhatsAppPhoneNumberID != "" {
			go s.dispatchMetaWhatsApp(conv.ChannelIdentifier, msg.Content)
		} else {
			// WAHA or gateway dispatch
			wahaURL := s.cfg.WhatsAppGatewayURL
			if wahaURL == "" {
				wahaURL = "http://localhost:3005"
			}
			go s.dispatchWAHAWithAttachment(wahaURL, sessionName, conv.ChannelIdentifier, msg.Content, req)
		}
	}

	return &msg, nil
}

func ResolveLID(sessionName, lidNum string) string {
	cleanLid := strings.TrimSuffix(strings.TrimSuffix(lidNum, "@lid"), "@c.us")
	cleanLid = strings.TrimPrefix(cleanLid, "+")
	if sessionName == "" {
		sessionName = "default"
	}
	candidates := []string{
		filepath.Join("waha-sessions", "noweb", sessionName, fmt.Sprintf("lid-mapping-%s_reverse.json", cleanLid)),
		filepath.Join("..", "waha-sessions", "noweb", sessionName, fmt.Sprintf("lid-mapping-%s_reverse.json", cleanLid)),
		filepath.Join("/app", "waha-sessions", "noweb", sessionName, fmt.Sprintf("lid-mapping-%s_reverse.json", cleanLid)),
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err == nil {
			var pn string
			if err := json.Unmarshal(data, &pn); err == nil && pn != "" {
				return pn
			}
		}
	}
	return ""
}

func (s *InboxService) dispatchWAHA(wahaBaseURL, sessionName, toPhone, messageText string) {
	cleanPhone := repository.NormalizePhone(toPhone)
	chatId := fmt.Sprintf("%s@c.us", cleanPhone)

	// If identifier is an LID or has LID format
	if strings.HasSuffix(toPhone, "@lid") {
		chatId = toPhone
	} else if len(cleanPhone) >= 14 && strings.HasPrefix(cleanPhone, "2") {
		pn := ResolveLID(sessionName, cleanPhone)
		if pn != "" {
			chatId = fmt.Sprintf("%s@c.us", repository.NormalizePhone(pn))
		} else {
			chatId = fmt.Sprintf("%s@lid", cleanPhone)
		}
	}

	if sessionName == "" {
		sessionName = "default"
	}
	if wahaBaseURL == "" {
		wahaBaseURL = "http://localhost:3005"
	}
	wahaBaseURL = strings.TrimRight(wahaBaseURL, "/")
	apiURL := fmt.Sprintf("%s/api/sendText", wahaBaseURL)

	cleanText := strings.ReplaceAll(messageText, `\r\n`, "\n")
	cleanText = strings.ReplaceAll(cleanText, `\n`, "\n")

	payload := map[string]interface{}{
		"chatId":  chatId,
		"text":    cleanText,
		"session": sessionName,
	}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[WAHA WhatsApp] marshal payload error: %v", err)
		return
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		log.Printf("[WAHA WhatsApp] create request error: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if s.cfg.WhatsAppToken != "" {
		req.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[WAHA WhatsApp] send error to %s: %v", chatId, err)
		return
	}
	defer resp.Body.Close()

	log.Printf("[WAHA WhatsApp] Outbound message delivered to %s (Status: %d)", chatId, resp.StatusCode)
}

func (s *InboxService) dispatchWAHAWithAttachment(wahaBaseURL, sessionName, toPhone, messageText string, req domain.SendReplyRequest) {
	cleanPhone := repository.NormalizePhone(toPhone)
	chatId := fmt.Sprintf("%s@c.us", cleanPhone)

	// If identifier is an LID or has LID format
	if strings.HasSuffix(toPhone, "@lid") {
		chatId = toPhone
	} else if len(cleanPhone) >= 14 && strings.HasPrefix(cleanPhone, "2") {
		pn := ResolveLID(sessionName, cleanPhone)
		if pn != "" {
			chatId = fmt.Sprintf("%s@c.us", repository.NormalizePhone(pn))
		} else {
			chatId = fmt.Sprintf("%s@lid", cleanPhone)
		}
	}

	if sessionName == "" {
		sessionName = "default"
	}
	if wahaBaseURL == "" {
		wahaBaseURL = "http://localhost:3005"
	}
	wahaBaseURL = strings.TrimRight(wahaBaseURL, "/")

	client := &http.Client{Timeout: 30 * time.Second}

	// Check if this reply includes an attachment
	if req.AttachmentURL != "" {
		localPath := filepath.Join(".", strings.TrimPrefix(req.AttachmentURL, "/"))
		fileBytes, err := os.ReadFile(localPath)
		if err == nil && len(fileBytes) > 0 {
			base64Data := base64.StdEncoding.EncodeToString(fileBytes)
			mimeType := req.MimeType
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}
			fileName := req.AttachmentName
			if fileName == "" {
				fileName = filepath.Base(localPath)
			}

			apiURL := fmt.Sprintf("%s/api/sendFile", wahaBaseURL)
			if strings.HasPrefix(mimeType, "image/") {
				apiURL = fmt.Sprintf("%s/api/sendImage", wahaBaseURL)
			} else if strings.HasPrefix(mimeType, "video/") {
				apiURL = fmt.Sprintf("%s/api/sendVideo", wahaBaseURL)
			}

			payload := map[string]interface{}{
				"chatId":  chatId,
				"caption": req.Content,
				"session": sessionName,
				"file": map[string]interface{}{
					"mimetype": mimeType,
					"filename": fileName,
					"data":     base64Data,
				},
			}
			bodyBytes, _ := json.Marshal(payload)
			httpReq, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(bodyBytes))
			if err == nil {
				httpReq.Header.Set("Content-Type", "application/json")
				if s.cfg.WhatsAppToken != "" {
					httpReq.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
				}
				resp, err := client.Do(httpReq)
				if err == nil {
					defer resp.Body.Close()
					log.Printf("[WAHA WhatsApp] Outbound attachment delivered to %s (Status: %d)", chatId, resp.StatusCode)
					return
				} else {
					log.Printf("[WAHA WhatsApp] Outbound attachment error to %s: %v", chatId, err)
				}
			}
		} else {
			log.Printf("[WAHA WhatsApp] Failed to read attachment file %s: %v", localPath, err)
		}
	}

	// Fallback to text message if no attachment or attachment send failed
	s.dispatchWAHA(wahaBaseURL, sessionName, toPhone, messageText)
}

func (s *InboxService) dispatchMetaWhatsApp(toPhone, messageText string) {
	cleanPhone := repository.NormalizePhone(toPhone)
	apiURL := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/messages", s.cfg.WhatsAppPhoneNumberID)
	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                cleanPhone,
		"type":              "text",
		"text": map[string]string{
			"body": messageText,
		},
	}
	bodyBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		log.Printf("[WhatsApp Meta API] create request error: %v", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.WhatsAppToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[WhatsApp Meta API] send request error: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("[WhatsApp Meta API] Delivered to %s (Status: %d)", cleanPhone, resp.StatusCode)
}

func (s *InboxService) dispatchGatewayWhatsApp(toPhone, messageText string) {
	cleanPhone := repository.NormalizePhone(toPhone)
	payload := map[string]interface{}{
		"target":  cleanPhone,
		"message": messageText,
	}
	bodyBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", s.cfg.WhatsAppGatewayURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		log.Printf("[WhatsApp Gateway] create request error: %v", err)
		return
	}
	if s.cfg.WhatsAppToken != "" {
		req.Header.Set("Authorization", s.cfg.WhatsAppToken)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[WhatsApp Gateway] send request error: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("[WhatsApp Gateway] Delivered to %s (Status: %d)", cleanPhone, resp.StatusCode)
}

// HandleIncomingMessage processes an incoming message from WhatsApp / Email webhook
func (s *InboxService) HandleIncomingMessage(workspaceID string, req domain.IncomingWebhookRequest) (*domain.Message, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	identifier := strings.TrimSpace(req.SenderIdentifier)
	senderName := strings.TrimSpace(req.SenderName)
	if senderName == "" {
		senderName = identifier
	}

	// 1. Find or create Contact in CRM
	var contactID *string
	if req.Channel == domain.ChannelWhatsApp {
		c, _ := s.contactRepo.FindContactByPhone(workspaceID, identifier)
		if c != nil {
			contactID = &c.ID
			// If senderName has real profile name and current contact only has phone number/empty name/placeholder, update contact!
			currName := strings.TrimSpace(c.FirstName + " " + c.LastName)
			isPlaceholderName := currName == "" || currName == identifier || currName == c.Phone ||
				strings.HasPrefix(currName, "+") || strings.EqualFold(currName, "test") ||
				strings.EqualFold(currName, "tester") || strings.EqualFold(currName, "unknown") ||
				strings.EqualFold(currName, "dummy") || strings.EqualFold(currName, "user") ||
				strings.EqualFold(currName, "pelanggan") || strings.EqualFold(currName, "kontak")
			if senderName != identifier && !strings.HasPrefix(senderName, "+") && isPlaceholderName {
				parts := strings.SplitN(senderName, " ", 2)
				c.FirstName = parts[0]
				if len(parts) > 1 {
					c.LastName = parts[1]
				} else {
					c.LastName = ""
				}
				_ = s.contactRepo.UpdateContact(workspaceID, c)
			}
		} else {
			// Auto create contact with profile name
			parts := strings.SplitN(senderName, " ", 2)
			firstName := parts[0]
			lastName := ""
			if len(parts) > 1 {
				lastName = parts[1]
			}
			newContact := domain.Contact{
				WorkspaceID: workspaceID,
				FirstName:   firstName,
				LastName:    lastName,
				Phone:       identifier,
				LeadSource:  "WhatsApp Inbound",
			}
			_ = s.contactRepo.CreateContact(&newContact)
			contactID = &newContact.ID
		}
	} else if req.Channel == domain.ChannelEmail {
		c, _ := s.contactRepo.FindContactByEmail(workspaceID, identifier)
		if c != nil {
			contactID = &c.ID
		} else {
			// Auto create contact
			parts := strings.SplitN(senderName, " ", 2)
			firstName := parts[0]
			lastName := ""
			if len(parts) > 1 {
				lastName = parts[1]
			}
			newContact := domain.Contact{
				WorkspaceID: workspaceID,
				FirstName:   firstName,
				LastName:    lastName,
				Email:       identifier,
				LeadSource:  "Email Inbound",
			}
			_ = s.contactRepo.CreateContact(&newContact)
			contactID = &newContact.ID
		}
	} else if req.Channel == domain.ChannelWebChat {
		var c *domain.Contact
		if req.Email != "" {
			c, _ = s.contactRepo.FindContactByEmail(workspaceID, req.Email)
		}
		if c == nil && req.Phone != "" {
			c, _ = s.contactRepo.FindContactByPhone(workspaceID, req.Phone)
		}
		if c != nil {
			contactID = &c.ID
		} else {
			parts := strings.SplitN(senderName, " ", 2)
			firstName := parts[0]
			lastName := ""
			if len(parts) > 1 {
				lastName = parts[1]
			}
			newContact := domain.Contact{
				WorkspaceID: workspaceID,
				FirstName:   firstName,
				LastName:    lastName,
				Email:       req.Email,
				Phone:       req.Phone,
				LeadSource:  "WebChat Inbound",
			}
			_ = s.contactRepo.CreateContact(&newContact)
			contactID = &newContact.ID
		}
	}

	// 2. Find or create Conversation
	conv, _ := s.inboxRepo.GetConversationByChannelIdentifier(workspaceID, req.Channel, identifier)
	var convID string
	if conv == nil {
		newConv := domain.Conversation{
			ID:                uuid.New().String(),
			WorkspaceID:       workspaceID,
			ContactID:         contactID,
			Channel:           req.Channel,
			ChannelIdentifier: identifier,
			Subject:           senderName,
			Status:            domain.ConversationStatusOpen,
			UnreadCount:       0,
			LastMessageAt:     time.Now(),
			BotActive:         true,
		}
		if req.ChannelID != "" {
			newConv.ChannelID = &req.ChannelID
		}
		if req.Department != "" {
			newConv.Department = req.Department
		} else {
			newConv.Department = "support"
		}
		if req.AssignedToID != nil {
			newConv.AssignedToID = req.AssignedToID
		}
		if err := s.inboxRepo.CreateConversation(&newConv); err != nil {
			return nil, err
		}
		convID = newConv.ID
	} else {
		convID = conv.ID
		// Re-open conversation if it was closed
		if conv.Status == domain.ConversationStatusClosed {
			_ = s.inboxRepo.UpdateConversationStatus(workspaceID, convID, domain.ConversationStatusOpen)
		}
		if conv.ContactID == nil && contactID != nil {
			// Attach contact
			_ = s.inboxRepo.CreateConversation(&domain.Conversation{ID: convID, ContactID: contactID})
		}
		if conv.ChannelID == nil && req.ChannelID != "" {
			_ = s.inboxRepo.UpdateConversationChannelID(workspaceID, convID, req.ChannelID)
		}
		// If subject was just phone number or placeholder, update to profile name
		isPlaceholderSubject := conv.Subject == "" || conv.Subject == identifier || strings.Contains(conv.Subject, identifier) ||
			strings.EqualFold(conv.Subject, "test") || strings.EqualFold(conv.Subject, "tester") || strings.EqualFold(conv.Subject, "unknown")
		if senderName != identifier && !strings.HasPrefix(senderName, "+") && isPlaceholderSubject {
			_ = s.inboxRepo.UpdateConversationSubject(workspaceID, convID, senderName)
			conv.Subject = senderName
		}
	}

	// 3. Create message
	content := strings.TrimSpace(req.Content)
	if content == "" && req.AttachmentName != "" {
		content = req.AttachmentName
	}
	if content == "" {
		content = "[Lampiran Berkas]"
	}

	var metaBytes []byte
	if req.AttachmentURL != "" {
		metaMap := map[string]interface{}{
			"attachment_url":  req.AttachmentURL,
			"attachment_name": req.AttachmentName,
			"attachment_type": req.AttachmentType,
			"mime_type":       req.MimeType,
			"file_size":       req.FileSize,
		}
		metaBytes, _ = json.Marshal(metaMap)
	} else {
		metaBytes = []byte("{}")
	}

	msg := domain.Message{
		ID:             uuid.New().String(),
		ConversationID: convID,
		SenderType:     "customer",
		SenderName:     senderName,
		Content:        content,
		Channel:        req.Channel,
		Status:         "delivered",
		Metadata:       json.RawMessage(metaBytes),
		CreatedAt:      time.Now(),
	}

	if err := s.inboxRepo.CreateMessage(&msg); err != nil {
		return nil, err
	}

	// Real-time broadcast
	s.BroadcastEvent(domain.InboxEvent{
		Type:           "new_message",
		WorkspaceID:    workspaceID,
		ConversationID: convID,
		Message:        &msg,
	})

	// 4. Record Activity in customer's timeline
	if contactID != nil {
		actType := domain.ActivityWhatsApp
		if req.Channel == domain.ChannelEmail {
			actType = domain.ActivityEmail
		}
		_ = s.activityRepo.CreateActivity(&domain.Activity{
			WorkspaceID: workspaceID,
			ContactID:   *contactID,
			Type:        actType,
			Subject:     fmt.Sprintf("Pesan masuk via %s dari %s", strings.ToUpper(string(req.Channel)), senderName),
			Description: msg.Content,
		})
	}

	// 5. Helpdesk Auto-Ticketing & Round-Robin Routing (After-Sales / Support)
	convDept := "support"
	if conv != nil && conv.Department != "" {
		convDept = conv.Department
	} else if req.Department != "" {
		convDept = req.Department
	}

	if s.ticketRepo != nil && convDept == "support" {
		// Rule C: Check if there is already an active ticket for this conversation
		activeTicket, _ := s.ticketRepo.GetActiveTicketByConversation(workspaceID, convID)
		if activeTicket != nil {
			// Rule C: Message belongs to same ongoing ticket
			_ = s.ticketRepo.AddTicketActivity(&domain.TicketActivity{
				TicketID:     activeTicket.ID,
				ActivityType: "note",
				Note:         fmt.Sprintf("Pesan masuk dari pelanggan (%s): %s", strings.ToUpper(string(req.Channel)), msg.Content),
			})
		} else {
			// Rule C: Otomatis 1 tiket saat pelanggan memulai percakapan baru
			ticketNumber, err := s.ticketRepo.GenerateTicketNumber(workspaceID)
			if err == nil {
				// Rule A: Hybrid — Round-Robin / Least-Busy assignment ke staf CS After-Sales
				var assignedCSID *string
				var assignedCSName string

				csAgents, _ := s.ticketRepo.GetAfterSalesAgents(workspaceID)
				if len(csAgents) > 0 {
					activeCounts, _ := s.ticketRepo.GetCSActiveTicketCounts(workspaceID)
					bestAgent := csAgents[0]
					minTickets := activeCounts[bestAgent.ID]

					for _, ag := range csAgents[1:] {
						count := activeCounts[ag.ID]
						if count < minTickets {
							minTickets = count
							bestAgent = ag
						}
					}
					assignedCSID = &bestAgent.ID
					assignedCSName = bestAgent.FullName
				}

				subject := fmt.Sprintf("[%s] Bantuan: %s", strings.ToUpper(string(req.Channel)), senderName)
				newTicket := domain.Ticket{
					ID:             uuid.New().String(),
					WorkspaceID:    workspaceID,
					TicketNumber:   ticketNumber,
					ConversationID: &convID,
					ContactID:      contactID,
					Subject:        subject,
					Description:    msg.Content,
					Category:       "general",
					Priority:       domain.TicketPriorityMedium,
					Status:         domain.TicketStatusOpen,
					AssignedToID:   assignedCSID,
					Department:     "support",
				}

				if err := s.ticketRepo.CreateTicket(&newTicket); err == nil {
					if assignedCSID != nil {
						_ = s.inboxRepo.UpdateConversationAssignment(workspaceID, convID, assignedCSID)
					}

					noteMsg := fmt.Sprintf("Tiket %s berhasil dibuat otomatis dari pesan masuk %s", ticketNumber, strings.ToUpper(string(req.Channel)))
					if assignedCSName != "" {
						noteMsg += fmt.Sprintf(" dan ditugaskan ke %s via Round-Robin", assignedCSName)
					}
					_ = s.ticketRepo.AddTicketActivity(&domain.TicketActivity{
						TicketID:     newTicket.ID,
						UserID:       assignedCSID,
						ActivityType: "note",
						Note:         noteMsg,
					})

					s.BroadcastEvent(domain.InboxEvent{
						Type:           "conversation_updated",
						WorkspaceID:    workspaceID,
						ConversationID: convID,
					})
				}
			}
		}
	}

	// 6. Bot Auto-Reply & Handoff Engine
	cFresh, _ := s.inboxRepo.GetConversationByID(workspaceID, convID)
	if cFresh != nil && cFresh.BotActive {
		go s.ProcessBotReply(workspaceID, cFresh, &msg, senderName)
	} else if s.pillarService != nil && req.Channel == domain.ChannelWhatsApp {
		if cFresh != nil {
			go s.pillarService.HandleOutOfHoursGreeting(workspaceID, cFresh)
		}
	}

	return &msg, nil
}

// GetPublicWebChatHistory retrieves public message history for visitor web chat widget
func (s *InboxService) GetPublicWebChatHistory(workspaceID, visitorID string) (*domain.PublicWebChatHistoryResponse, error) {
	conv, err := s.inboxRepo.GetConversationByChannelIdentifier(workspaceID, domain.ChannelWebChat, visitorID)
	if err != nil || conv == nil {
		return &domain.PublicWebChatHistoryResponse{
			Status:   "new",
			Messages: []domain.PublicWebChatMessageItem{},
		}, nil
	}

	msgs, err := s.inboxRepo.ListMessages(conv.ID)
	if err != nil {
		return nil, err
	}

	items := make([]domain.PublicWebChatMessageItem, 0, len(msgs))
	for _, m := range msgs {
		items = append(items, domain.PublicWebChatMessageItem{
			ID:         m.ID,
			SenderType: m.SenderType,
			SenderName: m.SenderName,
			Content:    m.Content,
			CreatedAt:  m.CreatedAt,
		})
	}

	assignedName := ""
	if conv.AssignedToName != nil {
		assignedName = *conv.AssignedToName
	}

	ticketNum := ""
	if s.ticketRepo != nil {
		if actTicket, _ := s.ticketRepo.GetActiveTicketByConversation(workspaceID, conv.ID); actTicket != nil {
			ticketNum = actTicket.TicketNumber
		}
	}

	return &domain.PublicWebChatHistoryResponse{
		ConversationID: conv.ID,
		TicketNumber:   ticketNum,
		AssignedToName: assignedName,
		Status:         string(conv.Status),
		Messages:       items,
	}, nil
}

// ToggleBot enables or disables the automated chatbot for a conversation
func (s *InboxService) ToggleBot(workspaceID, conversationID string, botActive bool, reason string) error {
	err := s.inboxRepo.UpdateConversationBotStatus(workspaceID, conversationID, botActive, reason)
	if err == nil {
		s.BroadcastEvent(domain.InboxEvent{
			Type:           "conversation_updated",
			WorkspaceID:    workspaceID,
			ConversationID: conversationID,
		})
	}
	return err
}

// GetBotSettings returns the chatbot configuration for a specific workspace
func (s *InboxService) GetBotSettings(workspaceID string) (*domain.WorkspaceBotSettings, error) {
	return s.inboxRepo.GetWorkspaceBotSettings(workspaceID)
}

// UpdateBotSettings updates the chatbot templates and rules for a workspace
func (s *InboxService) UpdateBotSettings(workspaceID string, req *domain.UpdateBotSettingsRequest) (*domain.WorkspaceBotSettings, error) {
	return s.inboxRepo.UpdateWorkspaceBotSettings(workspaceID, req)
}

// ProcessBotReply handles 24/7 intelligent automated greeting, menu navigation, FAQ answers,
// and seamless handoff to human CS agents with real-time alerting when questions require human help.
func (s *InboxService) ProcessBotReply(workspaceID string, conv *domain.Conversation, customerMsg *domain.Message, senderName string) {
	time.Sleep(800 * time.Millisecond) // realistic natural reply delay

	// 1. Fetch company-specific chatbot settings
	settings, err := s.inboxRepo.GetWorkspaceBotSettings(workspaceID)
	if err == nil && settings != nil && !settings.BotEnabled {
		// Bot is disabled by company admin
		return
	}

	content := strings.TrimSpace(customerMsg.Content)
	text := strings.ToLower(content)

	displayName := senderName
	if displayName == "" || displayName == conv.ChannelIdentifier {
		displayName = "Kak"
	}

	// Resolve company name
	companyName := "OCTO-CRM"
	if ws, _ := s.userRepo.GetWorkspaceByID(workspaceID); ws != nil && ws.Name != "" {
		companyName = ws.Name
	}

	botSenderName := "Asisten Virtual"
	if settings != nil && settings.BotName != "" {
		botSenderName = settings.BotName
	}

	// Helper to interpolate placeholders
	interpolate := func(tmpl string) string {
		out := strings.ReplaceAll(tmpl, "{name}", displayName)
		out = strings.ReplaceAll(out, "{company}", companyName)
		if settings != nil {
			out = strings.ReplaceAll(out, "{menu_1_title}", settings.Menu1Title)
			out = strings.ReplaceAll(out, "{menu_2_title}", settings.Menu2Title)
			out = strings.ReplaceAll(out, "{menu_3_title}", settings.Menu3Title)
			out = strings.ReplaceAll(out, "{menu_4_title}", settings.Menu4Title)
		}
		out = strings.ReplaceAll(out, `\r\n`, "\n")
		out = strings.ReplaceAll(out, `\n`, "\n")
		return out
	}

	matchKeywords := func(csvKeywords string) bool {
		if csvKeywords == "" {
			return false
		}
		for _, kw := range strings.Split(csvKeywords, ",") {
			kw = strings.TrimSpace(strings.ToLower(kw))
			if kw != "" && strings.Contains(text, kw) {
				return true
			}
		}
		return false
	}

	var botReply string
	isHandoff := false
	handoffReason := ""

	// Check custom FAQs first if configured
	customFAQMatched := false
	if settings != nil && len(settings.CustomFAQs) > 2 {
		var faqs []struct {
			Keywords string `json:"keywords"`
			Response string `json:"response"`
		}
		if json.Unmarshal(settings.CustomFAQs, &faqs) == nil {
			for _, item := range faqs {
				if matchKeywords(item.Keywords) {
					botReply = interpolate(item.Response)
					customFAQMatched = true
					break
				}
			}
		}
	}

	if customFAQMatched {
		// Custom FAQ reply
	} else if text == "menu" || text == "bantuan" || text == "info" || text == "help" ||
		text == "halo" || text == "hi" || text == "hai" || text == "halo bot" ||
		text == "start" || text == "mulai" || text == "p" ||
		strings.HasPrefix(text, "halo") || strings.HasPrefix(text, "hai") || strings.HasPrefix(text, "hi ") ||
		strings.Contains(text, "pagi") || strings.Contains(text, "siang") || strings.Contains(text, "sore") || strings.Contains(text, "malam") ||
		strings.Contains(text, "assalam") || strings.Contains(text, "permisi") || strings.Contains(text, "tes") || strings.Contains(text, "test") {
		if settings != nil && settings.GreetingMessage != "" {
			botReply = interpolate(settings.GreetingMessage)
		} else {
			botReply = fmt.Sprintf("Halo %s! 👋 Selamat datang di Layanan Pelanggan %s.\n\nSaya adalah Asisten Virtual Otomatis. Saya siap membantu Anda 24/7. Silakan pilih menu informasi berikut:\n\n1️⃣ Informasi Produk & Layanan\n2️⃣ Paket Harga & Penawaran\n3️⃣ Jam Operasional & Alamat Kantor\n4️⃣ Hubungi Tim Customer Service (CS) Manusia\n\nSilakan ketik nomor (1-4) atau tuliskan pertanyaan Anda langsung ya!", displayName, companyName)
		}

	} else if text == "1" || strings.HasPrefix(text, "1.") || strings.HasPrefix(text, "1 ") ||
		(settings != nil && matchKeywords(settings.Menu1Keywords)) ||
		strings.Contains(text, "produk") || strings.Contains(text, "fitur") || strings.Contains(text, "layanan") {
		if settings != nil && settings.Menu1Response != "" {
			botReply = interpolate(settings.Menu1Response)
		} else {
			botReply = fmt.Sprintf("Berikut adalah informasi produk dan layanan unggulan dari %s. Kami berkomitmen memberikan solusi terbaik untuk kebutuhan Anda.\n\nKetik *2* untuk melihat paket harga, atau ketik *CS* jika ingin berbicara langsung dengan tim kami!", companyName)
		}

	} else if text == "2" || strings.HasPrefix(text, "2.") || strings.HasPrefix(text, "2 ") ||
		(settings != nil && matchKeywords(settings.Menu2Keywords)) ||
		strings.Contains(text, "harga") || strings.Contains(text, "paket") || strings.Contains(text, "biaya") || strings.Contains(text, "tarif") || strings.Contains(text, "pricelist") {
		if settings != nil && settings.Menu2Response != "" {
			botReply = interpolate(settings.Menu2Response)
		} else {
			botReply = "Kami menyediakan berbagai paket penawaran fleksibel yang dapat disesuaikan dengan kebutuhan Anda.\n\nKetik *CS* untuk mendapatkan simulasi perhitungan biaya dan proposal penawaran resmi dari tim Sales kami!"
		}

	} else if text == "3" || strings.HasPrefix(text, "3.") || strings.HasPrefix(text, "3 ") ||
		(settings != nil && matchKeywords(settings.Menu3Keywords)) ||
		strings.Contains(text, "jam operasional") || strings.Contains(text, "jam kerja") || strings.Contains(text, "alamat") || strings.Contains(text, "kantor") || strings.Contains(text, "lokasi") {
		if settings != nil && settings.Menu3Response != "" {
			botReply = interpolate(settings.Menu3Response)
		} else {
			botReply = "⏰ *Jam Operasional Kantor:* \nSenin - Jumat: 08:00 - 18:00 WIB\nSabtu: 09:00 - 15:00 WIB\n(Layanan Chatbot & Monitoring Darurat aktif 24/7)\n\n📍 *Alamat Kantor:* \nSilakan hubungi tim kami untuk jadwal kunjungan atau panduan lokasi."
		}

	} else if text == "4" || strings.HasPrefix(text, "4.") || strings.HasPrefix(text, "4 ") ||
		(settings != nil && matchKeywords(settings.Menu4Keywords)) ||
		text == "cs" || strings.HasPrefix(text, "cs ") || strings.Contains(text, "customer service") ||
		strings.Contains(text, "komplain") || strings.Contains(text, "keluhan") ||
		strings.Contains(text, "bicara dengan orang") || strings.Contains(text, "bicara dengan cs") ||
		strings.Contains(text, "manusia") || strings.Contains(text, "bantuan admin") ||
		strings.Contains(text, "bicara dengan agen") {
		// Explicit request to talk to human CS
		isHandoff = true
		handoffReason = content
		if settings != nil && settings.HandoffMessage != "" {
			botReply = interpolate(settings.HandoffMessage)
		} else {
			botReply = fmt.Sprintf("Baik %s, pertanyaan Anda memerlukan penanganan langsung dari tim Customer Service (CS) kami. 👨‍💼👩‍💼\n\nPesan Anda telah kami alihkan ke agen manusia kami dan tim kami sudah menerima notifikasi prioritas untuk segera membalas percakapan ini.\n\nMohon ditunggu sebentar ya kak, agen CS kami akan segera bergabung dalam obrolan ini! 🙏", displayName)
		}

	} else {
		// Fallback: If not recognized, send interactive menu without immediately deactivating the bot
		if settings != nil && settings.GreetingMessage != "" {
			botReply = interpolate(settings.GreetingMessage)
		} else {
			botReply = fmt.Sprintf("Halo %s! 👋 Terima kasih telah menghubungi Layanan Pelanggan %s.\n\nSaya adalah Asisten Virtual Otomatis. Silakan pilih menu informasi berikut:\n\n1️⃣ Informasi Produk & Layanan\n2️⃣ Paket Harga & Penawaran\n3️⃣ Jam Operasional & Alamat Kantor\n4️⃣ Hubungi Tim Customer Service (CS) Manusia\n\nSilakan ketik angka (1-4) atau ketik *CS* jika Anda membutuhkan penanganan langsung oleh tim kami!", displayName, companyName)
		}
	}

	botReply = strings.ReplaceAll(botReply, `\r\n`, "\n")
	botReply = strings.ReplaceAll(botReply, `\n`, "\n")

	// 1. Create Bot Message in DB
	botMsg := domain.Message{
		ID:             uuid.New().String(),
		ConversationID: conv.ID,
		SenderType:     "bot",
		SenderName:     botSenderName,
		Content:        botReply,
		Channel:        conv.Channel,
		Status:         "delivered",
		Metadata:       json.RawMessage(`{"is_bot": true}`),
		CreatedAt:      time.Now(),
	}
	_ = s.inboxRepo.CreateMessage(&botMsg)

	// Broadcast bot message in real-time
	s.BroadcastEvent(domain.InboxEvent{
		Type:           "new_message",
		WorkspaceID:    workspaceID,
		ConversationID: conv.ID,
		Message:        &botMsg,
	})

	// 2. Dispatch to WhatsApp gateway if applicable
	if conv.Channel == domain.ChannelWhatsApp {
		sessionName := "default"
		if conv.ChannelID != nil && *conv.ChannelID != "" {
			if ch, err := s.inboxRepo.GetWorkspaceChannelByID(workspaceID, *conv.ChannelID); err == nil && ch != nil && ch.SessionName != "" {
				sessionName = ch.SessionName
			}
		}
		wahaURL := s.cfg.WhatsAppGatewayURL
		if wahaURL == "" {
			wahaURL = "http://localhost:3005"
		}
		go s.dispatchWAHA(wahaURL, sessionName, conv.ChannelIdentifier, botReply)
	}

	// 3. If Handoff to human CS:
	if isHandoff {
		_ = s.inboxRepo.UpdateConversationBotStatus(workspaceID, conv.ID, false, handoffReason)
		_ = s.inboxRepo.UpdatePriority(workspaceID, conv.ID, "high")

		// Create In-App Notification for CS / Supervisor
		custLabel := displayName
		if custLabel != conv.ChannelIdentifier {
			custLabel = fmt.Sprintf("%s (%s)", displayName, conv.ChannelIdentifier)
		}
		notif := &domain.Notification{
			WorkspaceID: workspaceID,
			Type:        "bot_handoff",
			Title:       "🚨 Chat Perlu Dibalas: Handoff dari Bot",
			Message:     fmt.Sprintf("Pelanggan %s membutuhkan bantuan CS: \"%s\"", custLabel, content),
			Data: map[string]interface{}{
				"conversation_id": conv.ID,
				"sender_name":     displayName,
				"channel":         conv.Channel,
				"question":        content,
			},
		}
		_ = s.notificationRepo.CreateNotification(notif)

		// Broadcast real-time SSE bot_handoff alert event to all browsers
		s.BroadcastEvent(domain.InboxEvent{
			Type:           "bot_handoff",
			WorkspaceID:    workspaceID,
			ConversationID: conv.ID,
			Data: map[string]interface{}{
				"conversation_id":    conv.ID,
				"sender_name":        displayName,
				"channel_identifier": conv.ChannelIdentifier,
				"question":           content,
				"message":            fmt.Sprintf("Pelanggan %s dialihkan dari Bot ke CS: \"%s\"", displayName, content),
			},
		})

		s.BroadcastEvent(domain.InboxEvent{
			Type:           "conversation_updated",
			WorkspaceID:    workspaceID,
			ConversationID: conv.ID,
		})
	}
}

// ConvertToDeal creates a Deal in Pipeline directly from a conversation
func (s *InboxService) ConvertToDeal(workspaceID, currentUserID, conversationID string, req domain.ConvertToDealRequest) (*domain.Deal, error) {
	conv, err := s.inboxRepo.GetConversationByID(workspaceID, conversationID)
	if err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	dealReq := domain.CreateDealRequest{
		PipelineID: req.PipelineID,
		StageID:    req.StageID,
		ContactID:  conv.ContactID,
		OwnerID:    &currentUserID,
		Title:      strings.TrimSpace(req.Title),
		Value:      req.Value,
		Priority:   2, // High priority from live chat
		Tags:       []string{"Live Chat Lead", strings.ToUpper(string(conv.Channel))},
		Notes:      fmt.Sprintf("Dibuat langsung dari percakapan live chat (%s: %s)", conv.Channel, conv.ChannelIdentifier),
	}

	deal, err := s.dealService.CreateDeal(workspaceID, currentUserID, dealReq)
	if err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "conversation_converted_to_deal",
		EntityType:  "deal",
		EntityID:    deal.ID,
		Description: fmt.Sprintf("Converted conversation %s to deal %s", conversationID, deal.Title),
	})

	return deal, nil
}

func (s *InboxService) UpdateStatus(workspaceID, conversationID string, status domain.ConversationStatus) error {
	err := s.inboxRepo.UpdateConversationStatus(workspaceID, conversationID, status)
	if err == nil {
		s.BroadcastEvent(domain.InboxEvent{
			Type:           "conversation_updated",
			WorkspaceID:    workspaceID,
			ConversationID: conversationID,
		})
	}
	return err
}

func (s *InboxService) UpdateAssignment(workspaceID, currentUserID, conversationID string, assignedToID *string) error {
	err := s.inboxRepo.UpdateConversationAssignment(workspaceID, conversationID, assignedToID)
	if err == nil {
		var targetName = "Belum Ditugaskan"
		var targetUser *domain.User
		if assignedToID != nil && *assignedToID != "" {
			if u, err := s.userRepo.GetUserByID(*assignedToID); err == nil && u != nil {
				targetName = u.FullName
				targetUser = u
			}
		}
		actorName := "Admin/Supervisor"
		if currentUserID != "" {
			if u, err := s.userRepo.GetUserByID(currentUserID); err == nil && u != nil {
				actorName = u.FullName
			}
		}
		meta, _ := json.Marshal(map[string]interface{}{
			"assigned_to_id": assignedToID,
			"target_name":    targetName,
		})
		_ = s.auditRepo.LogEvent(&domain.AuditEvent{
			WorkspaceID: workspaceID,
			UserID:      &currentUserID,
			Action:      "inbox.reassign",
			EntityType:  "conversation",
			EntityID:    conversationID,
			Description: fmt.Sprintf("Penugasan percakapan diubah oleh %s ke %s", actorName, targetName),
			Metadata:    meta,
		})

		// Notify assigned agent via In-App Notification & Email
		if assignedToID != nil && *assignedToID != "" && *assignedToID != currentUserID && targetUser != nil {
			conv, _ := s.inboxRepo.GetConversationByID(workspaceID, conversationID)
			contactName := "Pelanggan"
			channelIdentifier := ""
			priority := "medium"
			if conv != nil {
				channelIdentifier = conv.ChannelIdentifier
				if conv.ContactName != nil && *conv.ContactName != "" {
					contactName = *conv.ContactName
				} else if conv.ChannelIdentifier != "" {
					contactName = conv.ChannelIdentifier
				}
				if conv.Priority != "" {
					priority = conv.Priority
				}
			}

			if s.notificationRepo != nil {
				notif := &domain.Notification{
					WorkspaceID: workspaceID,
					UserID:      *assignedToID,
					Type:        string(domain.NotificationTypeConversationAssigned),
					Title:       fmt.Sprintf("👤 Penugasan Percakapan: %s", contactName),
					Message:     fmt.Sprintf("Anda ditugaskan oleh %s untuk menangani percakapan dari %s.", actorName, contactName),
					Data: map[string]interface{}{
						"conversation_id": conversationID,
						"contact_name":    contactName,
						"assigned_by":     actorName,
						"priority":        priority,
					},
				}
				_ = s.notificationRepo.CreateNotification(notif)
			}

			// Email notification
			if targetUser.Email != "" {
				go func(toEmail, recName, actName, cName, cId, prio string) {
					chatURL := fmt.Sprintf("%s/inbox?conversation_id=%s", utils.GetFrontendURL(), conversationID)
					_ = utils.SendAssignmentEmail(toEmail, recName, actName, cName, cId, prio, chatURL, "OCTO CRM")
				}(targetUser.Email, targetUser.FullName, actorName, contactName, channelIdentifier, priority)
			}
		}

		s.BroadcastEvent(domain.InboxEvent{
			Type:           "conversation_updated",
			WorkspaceID:    workspaceID,
			ConversationID: conversationID,
		})
	}
	return err
}

// DeleteConversation removes a conversation and its messages
func (s *InboxService) DeleteConversation(workspaceID, conversationID string) error {
	err := s.inboxRepo.DeleteConversation(workspaceID, conversationID)
	if err == nil {
		s.BroadcastEvent(domain.InboxEvent{
			Type:           "conversation_deleted",
			WorkspaceID:    workspaceID,
			ConversationID: conversationID,
		})
	}
	return err
}

// ClearAllConversations wipes all conversations and messages in the workspace, and optionally clears POC synced contacts
func (s *InboxService) ClearAllConversations(workspaceID string, clearContacts bool) (map[string]interface{}, error) {
	deletedConvs, err := s.inboxRepo.ClearAllConversations(workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to clear conversations: %w", err)
	}

	var deletedContacts int64
	if clearContacts {
		deletedContacts, _ = s.inboxRepo.ClearSyncedContacts(workspaceID)
	}

	s.BroadcastEvent(domain.InboxEvent{
		Type:        "conversation_updated",
		WorkspaceID: workspaceID,
	})

	return map[string]interface{}{
		"deleted_conversations": deletedConvs,
		"deleted_contacts":      deletedContacts,
		"message":               fmt.Sprintf("Berhasil menghapus %d percakapan dari CRM", deletedConvs),
	}, nil
}

// SyncWhatsAppHistory pulls chat history and recent messages from WAHA into OCTO-CRM inbox
func (s *InboxService) SyncWhatsAppHistory(workspaceID, sessionName, channelID string, limit int) (*domain.WhatsAppSyncResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	wahaURL := s.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	wahaURL = strings.TrimRight(wahaURL, "/")
	if sessionName == "" {
		sessionName = "default"
	}
	if channelID == "" {
		if ch, err := s.inboxRepo.GetWorkspaceChannelBySession(sessionName); err == nil && ch != nil {
			channelID = ch.ID
		}
	}

	targetChannel, _ := s.inboxRepo.GetWorkspaceChannelByID(workspaceID, channelID)

	client := &http.Client{Timeout: 15 * time.Second}

	// 1. Check if WAHA store is already enabled, only update if needed to avoid restarting running session
	getSessReq, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/sessions/%s", wahaURL, sessionName), nil)
	if s.cfg.WhatsAppToken != "" {
		getSessReq.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
	}
	if sessResp, err := client.Do(getSessReq); err == nil && sessResp != nil {
		var sessInfo struct {
			Config struct {
				Noweb struct {
					Store struct {
						Enabled bool `json:"enabled"`
					} `json:"store"`
				} `json:"noweb"`
			} `json:"config"`
		}
		_ = json.NewDecoder(sessResp.Body).Decode(&sessInfo)
		sessResp.Body.Close()

		if !sessInfo.Config.Noweb.Store.Enabled {
			storeCfgReq, _ := http.NewRequest("PUT", fmt.Sprintf("%s/api/sessions/%s", wahaURL, sessionName), bytes.NewBufferString(`{"config":{"noweb":{"store":{"enabled":true,"fullSync":false}}}}`))
			storeCfgReq.Header.Set("Content-Type", "application/json")
			if s.cfg.WhatsAppToken != "" {
				storeCfgReq.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
			}
			_, _ = client.Do(storeCfgReq)
		}
	}

	// 2. Fetch chats from WAHA (try overview first for contact names, fall back to /chats)
	type wahaChatSummary struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		PushName string `json:"pushName"`
		Pushname string `json:"pushname"`
	}

	chatsURL := fmt.Sprintf("%s/api/%s/chats/overview?limit=%d", wahaURL, sessionName, limit)
	req, _ := http.NewRequest("GET", chatsURL, nil)
	if s.cfg.WhatsAppToken != "" {
		req.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
	}
	resp, err := client.Do(req)
	var chats []wahaChatSummary
	if err == nil && resp != nil && resp.StatusCode == http.StatusOK {
		_ = json.NewDecoder(resp.Body).Decode(&chats)
		resp.Body.Close()
	}

	if len(chats) == 0 {
		fallbackURL := fmt.Sprintf("%s/api/%s/chats?limit=%d", wahaURL, sessionName, limit)
		reqFB, _ := http.NewRequest("GET", fallbackURL, nil)
		if s.cfg.WhatsAppToken != "" {
			reqFB.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
		}
		respFB, errFB := client.Do(reqFB)
		if errFB == nil && respFB != nil && respFB.StatusCode == http.StatusOK {
			_ = json.NewDecoder(respFB.Body).Decode(&chats)
			respFB.Body.Close()
		}
	}

	if len(chats) == 0 {
		return &domain.WhatsAppSyncResult{
			TotalChats:     0,
			SyncedChats:    0,
			SyncedMessages: 0,
			Message:        "Tidak ada percakapan baru di WhatsApp store. Jika baru menghubungkan QR, tunggu 1-2 menit hingga WhatsApp menyelesaikan sinkronisasi data dari ponsel.",
		}, nil
	}

	syncedChats := 0
	syncedMessages := 0

	for _, ch := range chats {
		chatID := ch.ID
		if chatID == "" || chatID == "status@broadcast" || strings.HasSuffix(chatID, "@broadcast") {
			continue
		}

		isGroup := strings.HasSuffix(chatID, "@g.us")
		var phone string
		if isGroup {
			phone = chatID
		} else if strings.HasSuffix(chatID, "@lid") {
			lidNum := strings.TrimSuffix(chatID, "@lid")
			resolved := ResolveLID(sessionName, lidNum)
			if resolved != "" {
				phone = resolved
			} else {
				phone = chatID
			}
		} else {
			phone = strings.TrimSuffix(chatID, "@c.us")
		}

		contactName := strings.TrimSpace(ch.Name)
		if contactName == "" {
			if ch.PushName != "" {
				contactName = strings.TrimSpace(ch.PushName)
			} else if ch.Pushname != "" {
				contactName = strings.TrimSpace(ch.Pushname)
			}
		}

		// Try querying WAHA contact profile if name is still empty or phone
		if (contactName == "" || contactName == phone) && !isGroup {
			phoneDigits := repository.NormalizePhone(phone)
			reqContact, errReq := http.NewRequest("GET", fmt.Sprintf("%s/api/contacts?contactId=%s@c.us&session=%s", wahaURL, phoneDigits, sessionName), nil)
			if errReq == nil {
				if s.cfg.WhatsAppToken != "" {
					reqContact.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
				}
				respContact, errDo := client.Do(reqContact)
				if errDo == nil && respContact.StatusCode == http.StatusOK {
					var contactData struct {
						Name     string `json:"name"`
						Pushname string `json:"pushname"`
						PushName string `json:"pushName"`
					}
					if json.NewDecoder(respContact.Body).Decode(&contactData) == nil {
						if strings.TrimSpace(contactData.Pushname) != "" {
							contactName = strings.TrimSpace(contactData.Pushname)
						} else if strings.TrimSpace(contactData.PushName) != "" {
							contactName = strings.TrimSpace(contactData.PushName)
						} else if strings.TrimSpace(contactData.Name) != "" {
							contactName = strings.TrimSpace(contactData.Name)
						}
					}
					respContact.Body.Close()
				}
			}
		}

		if contactName == "" {
			if isGroup {
				contactName = "Grup WhatsApp"
			} else {
				contactName = phone
			}
		}

		// Find or create Contact
		var contactID *string
		if !isGroup {
			c, _ := s.contactRepo.FindContactByPhone(workspaceID, phone)
			if c != nil {
				contactID = &c.ID
				// If contactName has real profile name and current contact only has phone number/empty name/placeholder, update contact!
				currName := strings.TrimSpace(c.FirstName + " " + c.LastName)
				isPlaceholderName := currName == "" || currName == phone || strings.HasPrefix(currName, "+") ||
					strings.EqualFold(currName, "test") || strings.EqualFold(currName, "tester") || strings.EqualFold(currName, "unknown") ||
					strings.EqualFold(currName, "dummy") || strings.EqualFold(currName, "user") ||
					strings.EqualFold(currName, "pelanggan") || strings.EqualFold(currName, "kontak")
				if contactName != phone && !strings.HasPrefix(contactName, "+") && isPlaceholderName {
					parts := strings.SplitN(contactName, " ", 2)
					c.FirstName = parts[0]
					if len(parts) > 1 {
						c.LastName = parts[1]
					} else {
						c.LastName = ""
					}
					_ = s.contactRepo.UpdateContact(workspaceID, c)
				}
			} else {
				parts := strings.SplitN(contactName, " ", 2)
				firstName := parts[0]
				lastName := ""
				if len(parts) > 1 {
					lastName = parts[1]
				}
				newContact := domain.Contact{
					WorkspaceID: workspaceID,
					FirstName:   firstName,
					LastName:    lastName,
					Phone:       phone,
					LeadSource:  "WhatsApp History Sync",
				}
				_ = s.contactRepo.CreateContact(&newContact)
				contactID = &newContact.ID
			}
		}

		// Find or create Conversation
		conv, _ := s.inboxRepo.GetConversationByChannelIdentifier(workspaceID, domain.ChannelWhatsApp, phone)
		var convID string
		if conv == nil {
			newConv := domain.Conversation{
				WorkspaceID:       workspaceID,
				ContactID:         contactID,
				Channel:           domain.ChannelWhatsApp,
				ChannelIdentifier: phone,
				Subject:           contactName,
				Status:            domain.ConversationStatusOpen,
				UnreadCount:       0,
			}
			if channelID != "" {
				newConv.ChannelID = &channelID
			}
			if targetChannel != nil {
				newConv.Department = targetChannel.Department
				newConv.AssignedToID = targetChannel.AssignedUserID
			} else {
				newConv.Department = "support"
			}
			if err := s.inboxRepo.CreateConversation(&newConv); err != nil {
				continue
			}
			convID = newConv.ID
		} else {
			convID = conv.ID
			if conv.ChannelID == nil && channelID != "" {
				_ = s.inboxRepo.UpdateConversationChannelID(workspaceID, convID, channelID)
			}
			isPlaceholderSubj := conv.Subject == "" || conv.Subject == phone || strings.Contains(conv.Subject, phone) ||
				strings.EqualFold(conv.Subject, "test") || strings.EqualFold(conv.Subject, "tester") || strings.EqualFold(conv.Subject, "unknown")
			if contactName != phone && !strings.HasPrefix(contactName, "+") && isPlaceholderSubj {
				_ = s.inboxRepo.UpdateConversationSubject(workspaceID, convID, contactName)
			}
		}

		// Fetch messages for this chat
		msgsURL := fmt.Sprintf("%s/api/%s/chats/%s/messages?limit=50&downloadMedia=false", wahaURL, sessionName, url.PathEscape(chatID))
		msgReq, _ := http.NewRequest("GET", msgsURL, nil)
		if s.cfg.WhatsAppToken != "" {
			msgReq.Header.Set("X-Api-Key", s.cfg.WhatsAppToken)
		}
		msgResp, err := client.Do(msgReq)
		if err != nil || msgResp == nil || msgResp.StatusCode != http.StatusOK {
			if msgResp != nil {
				msgResp.Body.Close()
			}
			continue
		}

		var wahaMsgs []struct {
			ID        string `json:"id"`
			Timestamp int64  `json:"timestamp"`
			FromMe    bool   `json:"fromMe"`
			Body      string `json:"body"`
			HasMedia  bool   `json:"hasMedia"`
		}
		_ = json.NewDecoder(msgResp.Body).Decode(&wahaMsgs)
		msgResp.Body.Close()

		chatSyncedCount := 0
		for _, wm := range wahaMsgs {
			if wm.ID == "" {
				continue
			}

			// Check duplicate
			exists, _ := s.inboxRepo.MessageExistsByMetadataID(convID, wm.ID)
			if exists {
				continue
			}

			content := strings.TrimSpace(wm.Body)
			if content == "" {
				if wm.HasMedia {
					content = "[Berkas / Media Gambar]"
				} else {
					continue
				}
			}

			senderType := "customer"
			senderName := contactName
			if wm.FromMe {
				senderType = "agent"
				senderName = "CS Agent"
			}

			msgTime := time.Now()
			if wm.Timestamp > 0 {
				msgTime = time.Unix(wm.Timestamp, 0)
			}

			metaMap := map[string]interface{}{
				"waha_message_id": wm.ID,
				"from_me":         wm.FromMe,
				"source":          "history_sync",
			}
			metaBytes, _ := json.Marshal(metaMap)

			msgEntity := domain.Message{
				ConversationID: convID,
				SenderType:     senderType,
				SenderName:     senderName,
				Content:        content,
				Channel:        domain.ChannelWhatsApp,
				Status:         "delivered",
				Metadata:       json.RawMessage(metaBytes),
				CreatedAt:      msgTime,
			}

			if err := s.inboxRepo.CreateHistoricalMessage(&msgEntity); err == nil {
				chatSyncedCount++
				syncedMessages++
			}
		}

		_ = s.inboxRepo.RefreshConversationLastMessage(convID)
		syncedChats++
	}

	s.BroadcastEvent(domain.InboxEvent{
		Type:        "conversation_updated",
		WorkspaceID: workspaceID,
	})

	return &domain.WhatsAppSyncResult{
		TotalChats:     len(chats),
		SyncedChats:    syncedChats,
		SyncedMessages: syncedMessages,
		Message:        fmt.Sprintf("Sinkronisasi selesai: %d percakapan dan %d pesan berhasil ditarik ke Inbox CRM", syncedChats, syncedMessages),
	}, nil
}

// GetMonitoringStats aggregates KPI metrics, SLA breaches, and agent workload distribution
func (s *InboxService) GetMonitoringStats(workspaceID string, department string) (*domain.MonitoringStatsResponse, error) {
	return s.inboxRepo.GetMonitoringStats(workspaceID, department)
}

// TakeoverConversation allows an Owner or Supervisor to immediately take over a conversation
func (s *InboxService) TakeoverConversation(workspaceID, currentUserID, conversationID string, req domain.TakeoverConversationRequest) (*domain.Conversation, error) {
	conv, err := s.inboxRepo.GetConversationByID(workspaceID, conversationID)
	if err != nil {
		return nil, fmt.Errorf("percakapan tidak ditemukan: %w", err)
	}

	prevAssignee := "Belum Ditugaskan"
	if conv.AssignedToName != nil && *conv.AssignedToName != "" {
		prevAssignee = *conv.AssignedToName
	}

	user, _ := s.userRepo.GetUserByID(currentUserID)
	userName := "Supervisor/Owner"
	if user != nil {
		userName = user.FullName
	}

	if err := s.inboxRepo.TakeoverConversation(workspaceID, conversationID, currentUserID); err != nil {
		return nil, fmt.Errorf("gagal mengambil alih percakapan: %w", err)
	}

	contactName := conv.ChannelIdentifier
	if conv.ContactName != nil && *conv.ContactName != "" {
		contactName = *conv.ContactName
	}

	// In-App Notification to previous assignee if any
	if s.notificationRepo != nil && conv.AssignedToID != nil && *conv.AssignedToID != "" && *conv.AssignedToID != currentUserID {
		notif := &domain.Notification{
			WorkspaceID: workspaceID,
			UserID:      *conv.AssignedToID,
			Type:        string(domain.NotificationTypeConversationTakeover),
			Title:       fmt.Sprintf("🔄 Percakapan Diambil Alih: %s", contactName),
			Message:     fmt.Sprintf("Percakapan dengan %s telah diambil alih oleh %s. Alasan: %s", contactName, userName, req.Reason),
			Data: map[string]interface{}{
				"conversation_id": conversationID,
				"taken_by":        userName,
				"contact_name":    contactName,
				"reason":          req.Reason,
			},
		}
		_ = s.notificationRepo.CreateNotification(notif)
	}

	// Audit Log
	meta, _ := json.Marshal(map[string]interface{}{
		"previous_assigned_to": prevAssignee,
		"new_assigned_to_id":   currentUserID,
		"new_assigned_to_name": userName,
		"reason":               req.Reason,
		"channel_identifier":   conv.ChannelIdentifier,
	})
	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "inbox.takeover",
		EntityType:  "conversation",
		EntityID:    conversationID,
		Description: fmt.Sprintf("Percakapan diambil alih oleh %s dari %s. Alasan: %s", userName, prevAssignee, req.Reason),
		Metadata:    meta,
	})

	s.BroadcastEvent(domain.InboxEvent{
		Type:           "conversation_updated",
		WorkspaceID:    workspaceID,
		ConversationID: conversationID,
	})

	return s.inboxRepo.GetConversationByID(workspaceID, conversationID)
}

// EscalateConversation allows an agent or system to escalate a conversation to Supervisor/Owner
func (s *InboxService) EscalateConversation(workspaceID, currentUserID, conversationID string, req domain.EscalateConversationRequest) (*domain.Conversation, error) {
	conv, err := s.inboxRepo.GetConversationByID(workspaceID, conversationID)
	if err != nil {
		return nil, fmt.Errorf("percakapan tidak ditemukan: %w", err)
	}

	user, _ := s.userRepo.GetUserByID(currentUserID)
	actorName := "Agent"
	if user != nil {
		actorName = user.FullName
	}

	targetUser, _ := s.userRepo.GetUserByID(req.EscalateToID)
	targetName := "Supervisor/Owner"
	if targetUser != nil {
		targetName = targetUser.FullName
	}

	priority := req.Priority
	if priority == "" {
		priority = "urgent"
	}

	if err := s.inboxRepo.EscalateConversation(workspaceID, conversationID, req.EscalateToID, currentUserID, req.Reason, priority); err != nil {
		return nil, fmt.Errorf("gagal mengekskalasi percakapan: %w", err)
	}

	contactName := conv.ChannelIdentifier
	if conv.ContactName != nil && *conv.ContactName != "" {
		contactName = *conv.ContactName
	}

	// 1. In-App Notification to Supervisor/Owner
	if s.notificationRepo != nil {
		notif := &domain.Notification{
			WorkspaceID: workspaceID,
			UserID:      req.EscalateToID,
			Type:        string(domain.NotificationTypeConversationEscalated),
			Title:       fmt.Sprintf("⚡ Kasus Dieskalasi: %s", contactName),
			Message:     fmt.Sprintf("%s mengekskalasi percakapan (%s) ke Anda. Alasan: %s", actorName, strings.ToUpper(priority), req.Reason),
			Data: map[string]interface{}{
				"conversation_id": conversationID,
				"priority":        priority,
				"escalated_by":    actorName,
				"contact_name":    contactName,
				"reason":          req.Reason,
			},
		}
		_ = s.notificationRepo.CreateNotification(notif)
	}

	// 2. Email Notification to Supervisor/Owner
	if targetUser != nil && targetUser.Email != "" {
		go func(toEmail, recName, actName, cName, cId, rsn, prio string) {
			chatURL := fmt.Sprintf("%s/inbox?conversation_id=%s", utils.GetFrontendURL(), conversationID)
			_ = utils.SendEscalationEmail(
				toEmail,
				recName,
				actName,
				cName,
				cId,
				rsn,
				prio,
				chatURL,
				"OCTO CRM",
			)
		}(targetUser.Email, targetUser.FullName, actorName, contactName, conv.ChannelIdentifier, req.Reason, priority)
	}

	// Audit Log
	meta, _ := json.Marshal(map[string]interface{}{
		"escalated_by":       actorName,
		"escalated_to":       targetName,
		"reason":             req.Reason,
		"priority":           priority,
		"channel_identifier": conv.ChannelIdentifier,
	})
	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "inbox.escalate",
		EntityType:  "conversation",
		EntityID:    conversationID,
		Description: fmt.Sprintf("Percakapan dieskalasi oleh %s kepada %s (%s). Alasan: %s", actorName, targetName, strings.ToUpper(priority), req.Reason),
		Metadata:    meta,
	})

	s.BroadcastEvent(domain.InboxEvent{
		Type:           "conversation_updated",
		WorkspaceID:    workspaceID,
		ConversationID: conversationID,
	})

	return s.inboxRepo.GetConversationByID(workspaceID, conversationID)
}

// LogConversationAccess logs On-Demand access to conversation for auditability & governance
func (s *InboxService) LogConversationAccess(workspaceID, currentUserID, conversationID string, req domain.LogConversationAccessRequest, ipAddress string) error {
	conv, err := s.inboxRepo.GetConversationByID(workspaceID, conversationID)
	if err != nil {
		return fmt.Errorf("percakapan tidak ditemukan: %w", err)
	}

	user, _ := s.userRepo.GetUserByID(currentUserID)
	userName := "User"
	if user != nil {
		userName = user.FullName
	}

	meta, _ := json.Marshal(map[string]interface{}{
		"channel_identifier": conv.ChannelIdentifier,
		"contact_name":       conv.ContactName,
		"purpose":            req.Purpose,
		"reason":             req.Reason,
	})

	return s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "inbox.access_conversation",
		EntityType:  "conversation",
		EntityID:    conversationID,
		Description: fmt.Sprintf("Akses isi percakapan (On-Demand) oleh %s. Alasan: %s", userName, req.Reason),
		Metadata:    meta,
		IPAddress:   ipAddress,
	})
}

// UpdatePriority updates the priority tag of a conversation
func (s *InboxService) UpdatePriority(workspaceID, conversationID, priority string) error {
	err := s.inboxRepo.UpdatePriority(workspaceID, conversationID, priority)
	if err == nil {
		s.BroadcastEvent(domain.InboxEvent{
			Type:           "conversation_updated",
			WorkspaceID:    workspaceID,
			ConversationID: conversationID,
		})
	}
	return err
}

// ListInboxAuditTrail retrieves audit events filtered or relevant to Inbox & Governance
func (s *InboxService) ListInboxAuditTrail(workspaceID string, limit int) ([]domain.AuditEvent, error) {
	if limit <= 0 {
		limit = 50
	}
	events, err := s.auditRepo.ListAuditEvents(workspaceID, limit)
	if err != nil {
		return nil, err
	}
	var inboxEvents []domain.AuditEvent
	for _, e := range events {
		if strings.HasPrefix(e.Action, "inbox.") || e.EntityType == "conversation" || e.Action == "role.change" {
			inboxEvents = append(inboxEvents, e)
		}
	}
	if len(inboxEvents) == 0 && len(events) > 0 {
		return events, nil
	}
	return inboxEvents, nil
}
