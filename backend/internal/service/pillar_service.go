package service

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	"octo-crm/backend/internal/config"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"

	"github.com/google/uuid"
)

type PillarService struct {
	pillarRepo   *repository.PillarRepository
	contactRepo  *repository.ContactRepository
	ticketRepo   *repository.TicketRepository
	inboxRepo    *repository.InboxRepository
	userRepo     *repository.UserRepository
	auditRepo    *repository.AuditRepository
	activityRepo *repository.ActivityRepository
	cfg          *config.Config
	rrMu         sync.Mutex
	rrIndex      map[string]int // workspaceID_department -> current index
}

func NewPillarService(
	pillarRepo *repository.PillarRepository,
	contactRepo *repository.ContactRepository,
	ticketRepo *repository.TicketRepository,
	inboxRepo *repository.InboxRepository,
	userRepo *repository.UserRepository,
	auditRepo *repository.AuditRepository,
	activityRepo *repository.ActivityRepository,
	cfg *config.Config,
) *PillarService {
	return &PillarService{
		pillarRepo:   pillarRepo,
		contactRepo:  contactRepo,
		ticketRepo:   ticketRepo,
		inboxRepo:    inboxRepo,
		userRepo:     userRepo,
		auditRepo:    auditRepo,
		activityRepo: activityRepo,
		cfg:          cfg,
		rrIndex:      make(map[string]int),
	}
}

// ==========================================
// PILAR 3: CPQ & QUOTATION SERVICE
// ==========================================

func (s *PillarService) CreateQuotation(workspaceID, userID string, req domain.CreateQuotationRequest) (*domain.Quotation, error) {
	// Generate Quote Number: QUO-YYYYMM-XXXX
	now := time.Now()
	b := make([]byte, 2)
	_, _ = rand.Read(b)
	quoteNum := fmt.Sprintf("QUO-%s-%s", now.Format("200601"), strings.ToUpper(hex.EncodeToString(b)))

	// Calculate totals
	var subtotal float64
	for i := range req.Items {
		item := &req.Items[i]
		if item.Quantity <= 0 {
			item.Quantity = 1
		}
		item.Subtotal = item.Quantity * item.UnitPrice
		subtotal += item.Subtotal
	}

	discountAmount := subtotal * (req.DiscountPercentage / 100.0)
	discountedSubtotal := subtotal - discountAmount
	if discountedSubtotal < 0 {
		discountedSubtotal = 0
	}

	taxAmount := discountedSubtotal * (req.TaxPercentage / 100.0)
	grandTotal := discountedSubtotal + taxAmount

	quo := &domain.Quotation{
		WorkspaceID:        workspaceID,
		DealID:             req.DealID,
		ContactID:          req.ContactID,
		QuoteNumber:        quoteNum,
		Title:              req.Title,
		Status:             domain.QuotationStatusDraft,
		ClientName:         req.ClientName,
		ClientEmail:        req.ClientEmail,
		ClientPhone:        req.ClientPhone,
		CompanyName:        req.CompanyName,
		Subtotal:           subtotal,
		DiscountPercentage: req.DiscountPercentage,
		DiscountAmount:     discountAmount,
		TaxPercentage:      req.TaxPercentage,
		TaxAmount:          taxAmount,
		GrandTotal:         grandTotal,
		ValidUntil:         req.ValidUntil,
		Notes:              req.Notes,
		TermsConditions:    req.TermsConditions,
		CreatedByID:        &userID,
		Items:              req.Items,
	}

	if err := s.pillarRepo.CreateQuotation(quo); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &userID,
		Action:      "quotation_created",
		EntityType:  "quotation",
		EntityID:    quo.ID,
		Description: fmt.Sprintf("Created quotation %s for %s (Rp %.0f)", quo.QuoteNumber, quo.ClientName, quo.GrandTotal),
	})

	return quo, nil
}

func (s *PillarService) GetQuotation(workspaceID, id string) (*domain.Quotation, error) {
	return s.pillarRepo.GetQuotationByID(workspaceID, id)
}

func (s *PillarService) ListQuotations(workspaceID string, dealID *string) ([]domain.Quotation, error) {
	return s.pillarRepo.ListQuotations(workspaceID, dealID)
}

func (s *PillarService) UpdateQuotationStatus(workspaceID, userID, id string, status domain.QuotationStatus) error {
	if err := s.pillarRepo.UpdateQuotationStatus(workspaceID, id, status); err != nil {
		return err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &userID,
		Action:      "quotation_status_updated",
		EntityType:  "quotation",
		EntityID:    id,
		Description: fmt.Sprintf("Updated quotation status to %s", status),
	})
	return nil
}

func (s *PillarService) SendQuotationWhatsApp(workspaceID, userID, quotationID, channelID string) (string, error) {
	quo, err := s.pillarRepo.GetQuotationByID(workspaceID, quotationID)
	if err != nil {
		return "", fmt.Errorf("quotation not found: %w", err)
	}

	if quo.ClientPhone == "" {
		return "", fmt.Errorf("klien belum memiliki nomor telepon WhatsApp")
	}

	// Format professional WhatsApp message card
	var b strings.Builder
	b.WriteString(fmt.Sprintf("📄 *PENAWARAN RESMI / OFFICIAL QUOTATION*\n"))
	b.WriteString(fmt.Sprintf("No: *%s*\n", quo.QuoteNumber))
	b.WriteString(fmt.Sprintf("Kepada: *%s* %s\n", quo.ClientName, ternary(quo.CompanyName != "", "("+quo.CompanyName+")", "")))
	b.WriteString(fmt.Sprintf("Perihal: *%s*\n", quo.Title))
	if quo.ValidUntil != nil && *quo.ValidUntil != "" {
		b.WriteString(fmt.Sprintf("Berlaku hingga: %s\n", *quo.ValidUntil))
	}
	b.WriteString("----------------------------------------\n")
	b.WriteString("*RINCIAN PRODUK & LAYANAN:*\n")
	for i, item := range quo.Items {
		b.WriteString(fmt.Sprintf("%d. *%s* (x%.0f)\n   Harga: Rp %s | Subtotal: Rp %s\n",
			i+1, item.ItemName, item.Quantity, formatRupiah(item.UnitPrice), formatRupiah(item.Subtotal)))
		if item.Description != "" {
			b.WriteString(fmt.Sprintf("   _Ket: %s_\n", item.Description))
		}
	}
	b.WriteString("----------------------------------------\n")
	b.WriteString(fmt.Sprintf("Subtotal: Rp %s\n", formatRupiah(quo.Subtotal)))
	if quo.DiscountAmount > 0 {
		b.WriteString(fmt.Sprintf("Diskon (%.1f%%): -Rp %s\n", quo.DiscountPercentage, formatRupiah(quo.DiscountAmount)))
	}
	b.WriteString(fmt.Sprintf("PPN (%.0f%%): Rp %s\n", quo.TaxPercentage, formatRupiah(quo.TaxAmount)))
	b.WriteString(fmt.Sprintf("*TOTAL AKHIR: Rp %s*\n", formatRupiah(quo.GrandTotal)))
	b.WriteString("----------------------------------------\n")
	if quo.TermsConditions != "" {
		b.WriteString(fmt.Sprintf("*Syarat & Ketentuan:*\n%s\n\n", quo.TermsConditions))
	}
	if quo.Notes != "" {
		b.WriteString(fmt.Sprintf("*Catatan:*\n%s\n\n", quo.Notes))
	}
	b.WriteString("Silakan hubungi kami untuk konfirmasi pemesanan. Terima kasih atas kepercayaan Anda!")

	messageText := b.String()

	// Dispatch via WAHA
	sessionName := "default"
	if channelID != "" {
		if ch, err := s.inboxRepo.GetWorkspaceChannelByID(workspaceID, channelID); err == nil && ch != nil && ch.SessionName != "" {
			sessionName = ch.SessionName
		}
	} else {
		// Use user's or workspace channel
		if ch, err := s.inboxRepo.GetWorkspaceChannel(workspaceID, "whatsapp"); err == nil && ch != nil && ch.SessionName != "" {
			sessionName = ch.SessionName
		}
	}

	wahaURL := s.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}
	cleanPhone := repository.NormalizePhone(quo.ClientPhone)
	chatId := fmt.Sprintf("%s@c.us", cleanPhone)

	go func() {
		client := &http.Client{Timeout: 15 * time.Second}
		payload := map[string]interface{}{
			"session": sessionName,
			"chatId":  chatId,
			"text":    messageText,
		}
		body, _ := json.Marshal(payload)
		resp, err := client.Post(strings.TrimRight(wahaURL, "/")+"/api/sendText", "application/json", bytes.NewReader(body))
		if err != nil {
			log.Printf("[Quotation WAHA] send error: %v", err)
			return
		}
		defer resp.Body.Close()
		log.Printf("[Quotation WAHA] Quotation %s sent to %s (Status: %d)", quo.QuoteNumber, chatId, resp.StatusCode)
	}()

	_ = s.pillarRepo.UpdateQuotationStatus(workspaceID, quotationID, domain.QuotationStatusSent)

	return messageText, nil
}

// ==========================================
// PILAR 2: WHATSAPP BROADCAST ENGINE
// ==========================================

func (s *PillarService) CreateAndDispatchCampaign(workspaceID, userID string, req domain.CreateBroadcastCampaignRequest) (*domain.BroadcastCampaign, error) {
	if req.MessageTemplate == "" {
		return nil, fmt.Errorf("pesan broadcast tidak boleh kosong")
	}

	// 1. Gather contacts to target
	var contacts []domain.Contact
	if len(req.ContactIDs) > 0 {
		for _, cid := range req.ContactIDs {
			if ct, err := s.contactRepo.GetContactByID(workspaceID, cid); err == nil && ct != nil {
				contacts = append(contacts, *ct)
			}
		}
	} else {
		// Target all contacts with valid phone number
		allContacts, _, err := s.contactRepo.ListContacts(workspaceID, domain.ContactFilter{})
		if err == nil {
			for _, ct := range allContacts {
				if ct.Phone != "" {
					contacts = append(contacts, ct)
				}
			}
		}
	}

	if len(contacts) == 0 {
		return nil, fmt.Errorf("tidak ada kontak dengan nomor WhatsApp yang valid untuk dijadikan target broadcast")
	}

	campaign := &domain.BroadcastCampaign{
		WorkspaceID:     workspaceID,
		ChannelID:       req.ChannelID,
		CreatedByID:     &userID,
		Name:            req.Name,
		MessageTemplate: req.MessageTemplate,
		Department:      ternary(req.Department != "", req.Department, "sales"),
		TargetFilter:    req.TargetFilter,
		Status:          domain.BroadcastStatusDraft,
		TotalRecipients: len(contacts),
	}

	if err := s.pillarRepo.CreateCampaign(campaign); err != nil {
		return nil, fmt.Errorf("create campaign: %w", err)
	}

	// 2. Prepare recipients with variable interpolation
	recipients := make([]domain.BroadcastRecipient, len(contacts))
	for i, ct := range contacts {
		interpolated := interpolateTemplate(req.MessageTemplate, ct)
		recipients[i] = domain.BroadcastRecipient{
			CampaignID:          campaign.ID,
			ContactID:           &ct.ID,
			PhoneNumber:         ct.Phone,
			RecipientName:       strings.TrimSpace(ct.FirstName + " " + ct.LastName),
			InterpolatedMessage: interpolated,
			Status:              domain.RecipientStatusPending,
		}
	}

	if err := s.pillarRepo.CreateRecipients(recipients); err != nil {
		log.Printf("[Broadcast] Failed creating recipients: %v", err)
	}

	// 3. Dispatch immediately if requested
	if req.SendNow {
		campaign.Status = domain.BroadcastStatusSending
		_ = s.pillarRepo.UpdateCampaignStatus(campaign.ID, domain.BroadcastStatusSending, 0, 0)

		go s.dispatchBroadcastAsync(workspaceID, campaign.ID, req.ChannelID)
	}

	return campaign, nil
}

func (s *PillarService) dispatchBroadcastAsync(workspaceID, campaignID string, channelID *string) {
	recs, err := s.pillarRepo.ListRecipients(campaignID)
	if err != nil {
		return
	}

	sessionName := "default"
	if channelID != nil && *channelID != "" {
		if ch, err := s.inboxRepo.GetWorkspaceChannelByID(workspaceID, *channelID); err == nil && ch != nil && ch.SessionName != "" {
			sessionName = ch.SessionName
		}
	} else {
		if ch, err := s.inboxRepo.GetWorkspaceChannel(workspaceID, "whatsapp"); err == nil && ch != nil && ch.SessionName != "" {
			sessionName = ch.SessionName
		}
	}

	wahaURL := s.cfg.WhatsAppGatewayURL
	if wahaURL == "" {
		wahaURL = "http://localhost:3005"
	}

	client := &http.Client{Timeout: 10 * time.Second}
	sentCount := 0
	failedCount := 0

	for _, r := range recs {
		cleanPhone := repository.NormalizePhone(r.PhoneNumber)
		chatId := fmt.Sprintf("%s@c.us", cleanPhone)

		payload := map[string]interface{}{
			"session": sessionName,
			"chatId":  chatId,
			"text":    r.InterpolatedMessage,
		}
		body, _ := json.Marshal(payload)
		resp, err := client.Post(strings.TrimRight(wahaURL, "/")+"/api/sendText", "application/json", bytes.NewReader(body))
		if err != nil || (resp != nil && resp.StatusCode >= 400) {
			errMsg := "Failed to dispatch"
			if err != nil {
				errMsg = err.Error()
			} else {
				errMsg = fmt.Sprintf("HTTP %d", resp.StatusCode)
			}
			failedCount++
			_ = s.pillarRepo.UpdateRecipientStatus(r.ID, domain.RecipientStatusFailed, errMsg)
		} else {
			sentCount++
			_ = s.pillarRepo.UpdateRecipientStatus(r.ID, domain.RecipientStatusSent, "")
		}
		if resp != nil {
			_ = resp.Body.Close()
		}

		// Anti-ban throttle pacing: 1.5 seconds per message
		time.Sleep(1500 * time.Millisecond)
	}

	finalStatus := domain.BroadcastStatusCompleted
	if sentCount == 0 && failedCount > 0 {
		finalStatus = domain.BroadcastStatusFailed
	}
	_ = s.pillarRepo.UpdateCampaignStatus(campaignID, finalStatus, sentCount, failedCount)
}

func (s *PillarService) ListCampaigns(workspaceID string) ([]domain.BroadcastCampaign, error) {
	return s.pillarRepo.ListCampaigns(workspaceID)
}

func (s *PillarService) GetCampaign(workspaceID, id string) (*domain.BroadcastCampaign, error) {
	return s.pillarRepo.GetCampaignByID(workspaceID, id)
}

func (s *PillarService) ListCampaignRecipients(campaignID string) ([]domain.BroadcastRecipient, error) {
	return s.pillarRepo.ListRecipients(campaignID)
}

// ==========================================
// PILAR 1: WORKFLOW AUTOMATIONS & TRIGGERS
// ==========================================

func (s *PillarService) GetAutomations(workspaceID string) ([]domain.WorkspaceAutomation, error) {
	automations, err := s.pillarRepo.ListAutomations(workspaceID)
	if err != nil {
		return nil, err
	}

	// Ensure default automations exist
	defaults := []string{"deal_won_handover", "out_of_hours_greeting", "round_robin_lead"}
	existingTypes := make(map[string]bool)
	for _, a := range automations {
		existingTypes[a.AutomationType] = true
	}

	for _, dt := range defaults {
		if !existingTypes[dt] {
			auto := domain.WorkspaceAutomation{
				WorkspaceID:    workspaceID,
				AutomationType: dt,
				IsEnabled:      true,
				Config:         map[string]any{},
			}
			_ = s.pillarRepo.UpsertAutomation(&auto)
			automations = append(automations, auto)
		}
	}

	return automations, nil
}

func (s *PillarService) UpdateAutomation(workspaceID string, req domain.UpdateAutomationRequest) error {
	auto := &domain.WorkspaceAutomation{
		WorkspaceID:    workspaceID,
		AutomationType: req.AutomationType,
		IsEnabled:      req.IsEnabled,
		Config:         req.Config,
	}
	return s.pillarRepo.UpsertAutomation(auto)
}

// Deal Won Auto Handover to CS Ticket
func (s *PillarService) HandleDealWonHandover(workspaceID string, deal *domain.Deal, currentUserID string) (*domain.Ticket, error) {
	// Check if automation enabled
	auto, err := s.pillarRepo.GetAutomation(workspaceID, "deal_won_handover")
	if err == nil && auto != nil && !auto.IsEnabled {
		return nil, nil // Automation turned off
	}

	// Avoid duplicate ticket creation if deal already handed over
	if deal.HandoverTicketID != nil && *deal.HandoverTicketID != "" {
		return nil, nil
	}

	// Generate ticket number: TICK-WON-XXXX
	b := make([]byte, 2)
	_, _ = rand.Read(b)
	ticketNum := fmt.Sprintf("TCK-WON-%s", strings.ToUpper(hex.EncodeToString(b)))

	clientName := "Klien Deal Won"
	if deal.ContactName != nil && *deal.ContactName != "" {
		clientName = *deal.ContactName
	}
	companyStr := ""
	if deal.CompanyName != nil && *deal.CompanyName != "" {
		companyStr = fmt.Sprintf(" (%s)", *deal.CompanyName)
	}
	contactEmail := ""
	if deal.ContactEmail != nil {
		contactEmail = *deal.ContactEmail
	}
	contactPhone := ""
	if deal.ContactPhone != nil {
		contactPhone = *deal.ContactPhone
	}

	description := fmt.Sprintf(
		"🚀 *AUTOMATED HANDOVER DARI PENUTUPAN DEAL WON*\n\n"+
			"Selamat! Tim Sales berhasil memenangkan peluang '%s' senilai Rp %s.\n\n"+
			"👤 *Kontak Klien:* %s%s\n"+
			"📧 *Email:* %s\n"+
			"📱 *WhatsApp:* %s\n"+
			"📝 *Catatan Handover dari Sales:* %s\n\n"+
			"👉 *Langkah Selanjutnya untuk CS:* Segera hubungi klien via WhatsApp/Email untuk Kickoff & Onboarding Layanan.",
		deal.Title,
		formatRupiah(deal.Value),
		clientName,
		companyStr,
		contactEmail,
		contactPhone,
		ternary(deal.Notes != "", deal.Notes, "Tidak ada catatan tambahan"),
	)

	// Pick round-robin CS agent
	csAgentID, _ := s.AssignLeadRoundRobin(workspaceID, "support")
	var assignedTo *string
	if csAgentID != "" {
		assignedTo = &csAgentID
	}

	ticket := &domain.Ticket{
		WorkspaceID:  workspaceID,
		TicketNumber: ticketNum,
		ContactID:    deal.ContactID,
		Subject:      fmt.Sprintf("[Handover Klien] Onboarding Deal Won: %s", deal.Title),
		Description:  description,
		Category:     "onboarding",
		Priority:     domain.TicketPriorityHigh,
		Status:       domain.TicketStatusOpen,
		Department:   "support",
		AssignedToID: assignedTo,
		CreatedByID:  &currentUserID,
	}

	if err := s.ticketRepo.CreateTicket(ticket); err != nil {
		log.Printf("[Deal Won Handover] Error creating ticket: %v", err)
		return nil, err
	}

	// Link ticket ID to deal
	_ = s.pillarRepo.LinkDealHandoverTicket(deal.ID, ticket.ID)

	// Add Chatter Activity
	_ = s.ticketRepo.AddTicketActivity(&domain.TicketActivity{
		TicketID:     ticket.ID,
		UserID:       &currentUserID,
		ActivityType: "note",
		Note:         fmt.Sprintf("Tiket handover otomatis digenerate dari Deals Pipeline setelah Deal '%s' ditandai WON.", deal.Title),
	})

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "deal_won_handover_triggered",
		EntityType:  "ticket",
		EntityID:    ticket.ID,
		Description: fmt.Sprintf("Auto-created handover ticket %s for won deal %s", ticket.TicketNumber, deal.Title),
	})

	return ticket, nil
}

// Out-of-hours Auto Greeting
func (s *PillarService) HandleOutOfHoursGreeting(workspaceID string, conv *domain.Conversation) {
	auto, err := s.pillarRepo.GetAutomation(workspaceID, "out_of_hours_greeting")
	if err == nil && auto != nil && !auto.IsEnabled {
		return
	}

	// Business hours: Mon-Fri 08:00 - 18:00 WIB (UTC+7)
	loc, _ := time.LoadLocation("Asia/Jakarta")
	if loc == nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	nowWIB := time.Now().In(loc)

	isWeekend := nowWIB.Weekday() == time.Saturday || nowWIB.Weekday() == time.Sunday
	isOutsideHours := nowWIB.Hour() < 8 || nowWIB.Hour() >= 18

	if !isWeekend && !isOutsideHours {
		return // Inside business hours, no auto greeting needed
	}

	// Check if we already greeted recently
	messages, err := s.inboxRepo.ListMessages(conv.ID)
	if err == nil {
		for _, m := range messages {
			if m.SenderType == "agent" && strings.Contains(m.Content, "jam operasional") && time.Since(m.CreatedAt) < 12*time.Hour {
				return // Already greeted in last 12 hours
			}
		}
	}

	greeting := "Halo! Terima kasih telah menghubungi kami. 🙏\n\nSaat ini pesan Anda kami terima di luar jam operasional (Senin-Jumat 08:00 - 18:00 WIB). Pesan Anda telah tercatat dengan aman dan tim kami akan segera membalas saat kantor dibuka kembali.\n\nSalam hangat, Tim OCTO!"

	// Insert message
	msg := &domain.Message{
		ID:             uuid.New().String(),
		ConversationID: conv.ID,
		SenderType:     "agent",
		SenderName:     "OCTO Auto-Greeting Bot",
		Content:        greeting,
		Channel:        conv.Channel,
		Status:         "sent",
		CreatedAt:      time.Now(),
	}
	_ = s.inboxRepo.CreateMessage(msg)

	// Dispatch to WAHA if WhatsApp
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
		chatId := fmt.Sprintf("%s@c.us", repository.NormalizePhone(conv.ChannelIdentifier))

		go func() {
			client := &http.Client{Timeout: 10 * time.Second}
			payload := map[string]interface{}{
				"session": sessionName,
				"chatId":  chatId,
				"text":    greeting,
			}
			b, _ := json.Marshal(payload)
			_, _ = client.Post(strings.TrimRight(wahaURL, "/")+"/api/sendText", "application/json", bytes.NewReader(b))
		}()
	}
}

// Round-Robin Lead Assignment
func (s *PillarService) AssignLeadRoundRobin(workspaceID, department string) (string, error) {
	members, err := s.userRepo.GetWorkspaceMembers(workspaceID)
	if err != nil || len(members) == 0 {
		return "", err
	}

	// Filter members by department
	var deptMembers []domain.WorkspaceMember
	for _, m := range members {
		if department == "" || m.Department == department || m.Department == "all" || m.Role == "admin" || m.Role == "owner" {
			deptMembers = append(deptMembers, m)
		}
	}

	if len(deptMembers) == 0 {
		deptMembers = members
	}

	s.rrMu.Lock()
	defer s.rrMu.Unlock()

	key := fmt.Sprintf("%s_%s", workspaceID, department)
	curr := s.rrIndex[key]
	assigned := deptMembers[curr%len(deptMembers)]
	s.rrIndex[key] = (curr + 1) % len(deptMembers)

	return assigned.UserID, nil
}

// ==========================================
// PILAR 4: HELPDESK SLA ESCALATION ENGINE
// ==========================================

func (s *PillarService) CheckAndEscalateSLAs(workspaceID string) (int, error) {
	breached, err := s.pillarRepo.GetBreachedTickets(workspaceID)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, t := range breached {
		if err := s.pillarRepo.MarkTicketSLABreached(t.ID); err == nil {
			count++
			_ = s.ticketRepo.AddTicketActivity(&domain.TicketActivity{
				TicketID:     t.ID,
				ActivityType: "escalation",
				Note:         "[SLA BREACH ALERT] Waktu respon atau penyelesaian terlampaui. Status tiket otomatis dieskalasikan menjadi 'escalated' dengan prioritas 'urgent'.",
			})
			_ = s.auditRepo.LogEvent(&domain.AuditEvent{
				WorkspaceID: workspaceID,
				Action:      "ticket_sla_breached_auto_escalated",
				EntityType:  "ticket",
				EntityID:    t.ID,
				Description: fmt.Sprintf("Ticket %s breached SLA and was auto-escalated to urgent", t.TicketNumber),
			})
		}
	}

	return count, nil
}

// ==========================================
// PILAR 5: AI SALES & CS COPILOT
// ==========================================

func (s *PillarService) SummarizeChat(workspaceID, conversationID string) (*domain.AISummarizeResponse, error) {
	messages, err := s.inboxRepo.ListMessages(conversationID)
	if err != nil || len(messages) == 0 {
		return nil, fmt.Errorf("tidak ada pesan untuk diringkas")
	}

	var transcriptBuilder strings.Builder
	for _, m := range messages {
		transcriptBuilder.WriteString(fmt.Sprintf("%s (%s): %s\n", m.SenderName, m.SenderType, m.Content))
	}
	transcript := transcriptBuilder.String()

	// NLP Sentiment & Key Extraction Engine
	sentiment, score := analyzeSentimentText(transcript)

	// Generate 3 Key Bullet Points
	keyPoints := generateBulletPoints(messages, sentiment)
	summaryText := fmt.Sprintf("Obrolan terdiri dari %d pesan. Klien terdeteksi dalam suasana %s (Skor: %.1f). Kebutuhan utama seputar solusi layanan & tindak lanjut tim.", len(messages), sentiment, score)

	nextAction := "Segera hubungi kembali pelanggan untuk konfirmasi pemesanan atau solusi kendala."
	if sentiment == "critical" || sentiment == "negative" {
		nextAction = "Eskalasikan ke CS Lead / Supervisor dan tawarkan solusi penggantian atau permintaan maaf resmi."
	} else if sentiment == "positive" {
		nextAction = "Tawarkan penawaran harga (Quotation) atau tanyakan kesiapan penandatanganan kontrak."
	}

	res := &domain.AISummarizeResponse{
		ConversationID: conversationID,
		Summary:        summaryText,
		KeyPoints:      keyPoints,
		Sentiment:      sentiment,
		SentimentScore: score,
		NextAction:     nextAction,
	}

	// Update conversation in database
	_ = s.pillarRepo.UpdateConversationSentiment(conversationID, sentiment, summaryText)

	return res, nil
}

func (s *PillarService) SuggestReplies(workspaceID, conversationID string) (*domain.AISuggestionResponse, error) {
	messages, err := s.inboxRepo.ListMessages(conversationID)
	if err != nil || len(messages) == 0 {
		return nil, fmt.Errorf("belum ada percakapan")
	}

	// Find the last customer message
	var lastCustomerMsg *domain.Message
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].SenderType == "customer" {
			lastCustomerMsg = &messages[i]
			break
		}
	}

	customerText := ""
	if lastCustomerMsg != nil {
		customerText = strings.ToLower(lastCustomerMsg.Content)
	}

	custName := "kak"
	if conv, err := s.inboxRepo.GetConversationByID(workspaceID, conversationID); err == nil && conv != nil {
		if conv.ContactName != nil && *conv.ContactName != "" && *conv.ContactName != conv.ChannelIdentifier {
			custName = *conv.ContactName
		} else if conv.Subject != "" && conv.Subject != conv.ChannelIdentifier && !strings.Contains(conv.Subject, conv.ChannelIdentifier) {
			custName = conv.Subject
		}
	}

	var suggestions []domain.AISmartReplyOption
	intent := "general_inquiry"

	// Match intents
	if strings.Contains(customerText, "cs") || strings.Contains(customerText, "operator") || strings.Contains(customerText, "manusia") || strings.Contains(customerText, "admin") || strings.Contains(customerText, "orang") || strings.Contains(customerText, "bicara") || strings.Contains(customerText, "bantuan cs") {
		intent = "cs_handoff"
		suggestions = []domain.AISmartReplyOption{
			{
				Title:   "Sapaan CS (Ambil Alih)",
				Tone:    "professional",
				Content: fmt.Sprintf("Halo %s! Saya dari tim Customer Support OCTO yang mengambil alih percakapan ini. Saya siap membantu kendala Anda secara langsung. Boleh diceritakan apa yang sedang dihadapi?", custName),
			},
			{
				Title:   "Verifikasi Akun & Kasus",
				Tone:    "consultative",
				Content: fmt.Sprintf("Halo %s! Terima kasih telah terhubung dengan CS. Agar kami dapat mengecek di sistem secara akurat, boleh dibantu nomor akun atau nama perusahaan Anda?", custName),
			},
			{
				Title:   "Konfirmasi Penanganan Segera",
				Tone:    "reassuring",
				Content: fmt.Sprintf("Halo %s! Pesan Anda sudah terhubung langsung ke meja kerja Customer Support kami. Mohon berikan waktu 1-2 menit untuk kami cek riwayat kendala Anda ya.", custName),
			},
		}
	} else if strings.Contains(customerText, "harga") || strings.Contains(customerText, "biaya") || strings.Contains(customerText, "pric") || strings.Contains(customerText, "paket") {
		intent = "pricing_inquiry"
		suggestions = []domain.AISmartReplyOption{
			{
				Title:   "Kirim Paket & Penawaran Resmi",
				Tone:    "professional",
				Content: fmt.Sprintf("Halo %s! Terima kasih atas pertanyaannya. Kami memiliki beberapa paket fleksibel yang disesuaikan dengan skala bisnis Anda. Boleh kami kirimkan Official Quotation lengkap beserta promo bulan ini ke nomor ini?", custName),
			},
			{
				Title:   "Ajak Konsultasi / Demo Gratis",
				Tone:    "closing",
				Content: fmt.Sprintf("Tentu %s! Untuk memastikan paket yang paling hemat dan tepat sasaran bagi bisnis Anda, apakah bersedia jika tim kami jadwalkan sesi demo singkat 15 menit via Google Meet?", custName),
			},
			{
				Title:   "Rangkuman Singkat Tiering",
				Tone:    "informative",
				Content: "Paket kami mulai dari Paket Starter untuk tim kecil hingga Enterprise untuk automasi skala besar. Apakah ada modul spesifik (seperti WhatsApp Multi-Agent atau Kanban Pipeline) yang sedang Anda prioritaskan?",
			},
		}
	} else if strings.Contains(customerText, "rusak") || strings.Contains(customerText, "komplain") || strings.Contains(customerText, "error") || strings.Contains(customerText, "kendala") || strings.Contains(customerText, "lama") || strings.Contains(customerText, "kecewa") || strings.Contains(customerText, "tidak bisa") || strings.Contains(customerText, "gagal") {
		intent = "issue_complaint"
		suggestions = []domain.AISmartReplyOption{
			{
				Title:   "Permintaan Maaf & Investigasi Cepat",
				Tone:    "empathetic",
				Content: fmt.Sprintf("Mohon maaf yang sebesar-besarnya atas ketidaknyamanan yang Anda alami kak %s. 🙏 Keluhan Anda sudah kami prioritaskan dan tim teknis kami saat ini sedang melakukan pengecekan mendalam.", custName),
			},
			{
				Title:   "Minta Bukti / Screenshot Kendala",
				Tone:    "technical",
				Content: "Terima kasih telah melaporkan hal ini. Agar tim After-Sales kami dapat segera menyelesaikan kendala ini dengan tepat, apakah bisa dibantu mengirimkan tangkapan layar (screenshot) pesan error yang muncul?",
			},
			{
				Title:   "Eskalasi Langsung ke Senior Support",
				Tone:    "reassuring",
				Content: fmt.Sprintf("Kenyamanan %s adalah prioritas kami. Kasus ini telah kami eskalasikan ke Service Manager dan kami akan memperbarui status penanganannya dalam waktu maksimal 30 menit ke depan.", custName),
			},
		}
	} else if strings.Contains(customerText, "terima kasih") || strings.Contains(customerText, "makasih") || strings.Contains(customerText, "ok") || strings.Contains(customerText, "siap") || strings.Contains(customerText, "deal") {
		intent = "closing_positive"
		suggestions = []domain.AISmartReplyOption{
			{
				Title:   "Penutup Hangat & Kepuasan Pelanggan",
				Tone:    "warm",
				Content: fmt.Sprintf("Sama-sama %s! Senang sekali bisa membantu Anda. Jika ada hal lain yang perlu ditanyakan seputar layanan kami, jangan ragu untuk kembali menghubungi kami kapan saja. Semoga hari Anda menyenangkan! ✨", custName),
			},
			{
				Title:   "Konfirmasi Pemesanan & Invoice",
				Tone:    "closing",
				Content: "Baik, luar biasa! Kami akan segera menyiapkan invoice dan dokumen onboarding resminya. Mohon ditunggu sebentar ya.",
			},
			{
				Title:   "Minta Ulasan Layanan",
				Tone:    "friendly",
				Content: "Terima kasih banyak atas kepercayaannya! Jika berkenan, boleh berikan masukan atau ulasan singkat terkait pengalaman Anda berbicara dengan kami hari ini. Sangat berarti bagi kami!",
			},
		}
	} else {
		suggestions = []domain.AISmartReplyOption{
			{
				Title:   "Sambutan Ramah & Bantuan",
				Tone:    "professional",
				Content: fmt.Sprintf("Halo %s! Terima kasih telah menghubungi OCTO-CRM. Ada yang bisa kami bantu seputar kebutuhan bisnis Anda hari ini?", custName),
			},
			{
				Title:   "Follow-up Kebutuhan Tim",
				Tone:    "consultative",
				Content: "Halo! Kami siap membantu. Apakah Anda mencari solusi CRM untuk tim penjualan (Pre-Sales) atau tim layanan pelanggan (After-Sales Helpdesk)?",
			},
			{
				Title:   "Bagikan Brosur & Profil Singkat",
				Tone:    "informative",
				Content: "Halo! Senang bisa terhubung. Terlampir ringkasan profil fitur unggulan kami untuk membantu mempercepat omzet dan efisiensi tim Anda.",
			},
		}
	}

	return &domain.AISuggestionResponse{
		ConversationID: conversationID,
		Suggestions:    suggestions,
		DetectedIntent: intent,
	}, nil
}

// Helpers
func analyzeSentimentText(text string) (string, float64) {
	lower := strings.ToLower(text)
	criticalWords := []string{"parah", "kecewa berat", "tuntut", "laporkan", "penipu", "rugi besar", "batal", "uang kembali", "refund"}
	negativeWords := []string{"rusak", "error", "lambat", "lama", "kecewa", "masalah", "bug", "komplain", "tidak bisa", "gagal", "kendala"}
	positiveWords := []string{"terima kasih", "makasih", "mantap", "bagus", "puas", "keren", "cepat", "suka", "bisa", "selesai", "deal", "setuju"}

	for _, w := range criticalWords {
		if strings.Contains(lower, w) {
			return "critical", 0.95
		}
	}

	negCount := 0
	for _, w := range negativeWords {
		if strings.Contains(lower, w) {
			negCount++
		}
	}

	posCount := 0
	for _, w := range positiveWords {
		if strings.Contains(lower, w) {
			posCount++
		}
	}

	if negCount > posCount {
		score := math.Min(0.5+(float64(negCount)*0.1), 0.9)
		return "negative", score
	} else if posCount > negCount {
		score := math.Min(0.6+(float64(posCount)*0.1), 0.95)
		return "positive", score
	}
	return "neutral", 0.5
}

func generateBulletPoints(messages []domain.Message, sentiment string) []string {
	var points []string
	if len(messages) >= 1 {
		points = append(points, fmt.Sprintf("Klien memulai percakapan: \"%s\"", truncateText(messages[0].Content, 60)))
	}
	if len(messages) >= 2 {
		points = append(points, fmt.Sprintf("Tanggapan terkini: \"%s\"", truncateText(messages[len(messages)-1].Content, 60)))
	}
	if sentiment == "critical" || sentiment == "negative" {
		points = append(points, "Sentimen komplain: Perlu perhatian khusus dan mitigasi eskalasi cepat.")
	} else if sentiment == "positive" {
		points = append(points, "Sentimen prospek tinggi: Peluang besar untuk penawaran produk atau closing.")
	} else {
		points = append(points, "Status percakapan berjalan netral dalam tahap eksplorasi informasi.")
	}
	return points
}

func interpolateTemplate(template string, c domain.Contact) string {
	res := template
	fullName := strings.TrimSpace(c.FirstName + " " + c.LastName)
	res = strings.ReplaceAll(res, "{{first_name}}", c.FirstName)
	res = strings.ReplaceAll(res, "{{full_name}}", fullName)
	res = strings.ReplaceAll(res, "{{phone}}", c.Phone)
	res = strings.ReplaceAll(res, "{{email}}", c.Email)
	res = strings.ReplaceAll(res, "{{company}}", ternary(c.CompanyName != nil, *c.CompanyName, "Perusahaan Anda"))
	res = strings.ReplaceAll(res, "{{job_title}}", c.JobTitle)
	return res
}

func formatRupiah(val float64) string {
	intVal := int64(val)
	str := fmt.Sprintf("%d", intVal)
	if len(str) <= 3 {
		return str
	}
	var res []string
	for len(str) > 3 {
		res = append([]string{str[len(str)-3:]}, res...)
		str = str[:len(str)-3]
	}
	if len(str) > 0 {
		res = append([]string{str}, res...)
	}
	return strings.Join(res, ".")
}

func truncateText(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

func ternary[T any](cond bool, a, b T) T {
	if cond {
		return a
	}
	return b
}
