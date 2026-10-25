package service

import (
	"errors"
	"fmt"
	"strings"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
)

type TicketService struct {
	ticketRepo *repository.TicketRepository
	inboxRepo  *repository.InboxRepository
	auditRepo  *repository.AuditRepository
}

func NewTicketService(
	ticketRepo *repository.TicketRepository,
	inboxRepo *repository.InboxRepository,
	auditRepo *repository.AuditRepository,
) *TicketService {
	return &TicketService{
		ticketRepo: ticketRepo,
		inboxRepo:  inboxRepo,
		auditRepo:  auditRepo,
	}
}

func (s *TicketService) ListTickets(workspaceID string, filter domain.TicketFilter) ([]domain.Ticket, error) {
	return s.ticketRepo.ListTickets(workspaceID, filter)
}

func (s *TicketService) GetTicket(workspaceID, ticketID string) (*domain.Ticket, error) {
	return s.ticketRepo.GetTicketByID(workspaceID, ticketID)
}

func (s *TicketService) CreateTicket(workspaceID, currentUserID string, req domain.CreateTicketRequest) (*domain.Ticket, error) {
	ticketNumber, err := s.ticketRepo.GenerateTicketNumber(workspaceID)
	if err != nil {
		return nil, err
	}

	priority := req.Priority
	if priority == "" {
		priority = domain.TicketPriorityMedium
	}

	dept := req.Department
	if dept == "" {
		dept = "support"
	}

	var convID *string
	if req.ConversationID != nil && strings.TrimSpace(*req.ConversationID) != "" {
		trimmed := strings.TrimSpace(*req.ConversationID)
		convID = &trimmed
	}

	var contactID *string
	if req.ContactID != nil && strings.TrimSpace(*req.ContactID) != "" {
		trimmed := strings.TrimSpace(*req.ContactID)
		contactID = &trimmed
	}

	var assignedToID *string
	if req.AssignedToID != nil && strings.TrimSpace(*req.AssignedToID) != "" {
		trimmed := strings.TrimSpace(*req.AssignedToID)
		isAfterSales, err := s.ticketRepo.IsAfterSalesMember(workspaceID, trimmed)
		if err == nil && !isAfterSales {
			return nil, errors.New("penanggung jawab tiket bantuan CS harus dari departemen After-Sales (CS)")
		}
		assignedToID = &trimmed
	}

	var createdByID *string
	if strings.TrimSpace(currentUserID) != "" {
		trimmed := strings.TrimSpace(currentUserID)
		createdByID = &trimmed
	}

	ticket := domain.Ticket{
		WorkspaceID:    workspaceID,
		TicketNumber:   ticketNumber,
		ConversationID: convID,
		ContactID:      contactID,
		Subject:        strings.TrimSpace(req.Subject),
		Description:    strings.TrimSpace(req.Description),
		Category:       req.Category,
		Priority:       priority,
		Status:         domain.TicketStatusOpen,
		AssignedToID:   assignedToID,
		CreatedByID:    createdByID,
		Department:     dept,
	}

	if ticket.Category == "" {
		ticket.Category = "complaint"
	}

	if err := s.ticketRepo.CreateTicket(&ticket); err != nil {
		return nil, err
	}

	// Add initial creation note
	_ = s.ticketRepo.AddTicketActivity(&domain.TicketActivity{
		TicketID:     ticket.ID,
		UserID:       createdByID,
		ActivityType: "note",
		Note:         fmt.Sprintf("Tiket %s berhasil dibuat dengan prioritas %s (%s)", ticket.TicketNumber, strings.ToUpper(string(ticket.Priority)), dept),
	})

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      createdByID,
		Action:      "ticket_created",
		EntityType:  "ticket",
		EntityID:    ticket.ID,
		Description: fmt.Sprintf("Created support ticket %s: %s", ticket.TicketNumber, ticket.Subject),
	})

	return s.ticketRepo.GetTicketByID(workspaceID, ticket.ID)
}

func (s *TicketService) UpdateTicket(workspaceID, currentUserID, ticketID string, req domain.UpdateTicketRequest) (*domain.Ticket, error) {
	existing, err := s.ticketRepo.GetTicketByID(workspaceID, ticketID)
	if err != nil {
		return nil, err
	}

	if req.AssignedToID != nil && strings.TrimSpace(*req.AssignedToID) != "" {
		trimmed := strings.TrimSpace(*req.AssignedToID)
		isAfterSales, err := s.ticketRepo.IsAfterSalesMember(workspaceID, trimmed)
		if err == nil && !isAfterSales {
			return nil, errors.New("penanggung jawab tiket bantuan CS harus dari departemen After-Sales (CS)")
		}
	}

	updated, err := s.ticketRepo.UpdateTicket(workspaceID, ticketID, req)
	if err != nil {
		return nil, err
	}

	// Record activity logs
	if req.Status != nil && *req.Status != existing.Status {
		_ = s.ticketRepo.AddTicketActivity(&domain.TicketActivity{
			TicketID:     ticketID,
			UserID:       &currentUserID,
			ActivityType: "status_change",
			Note:         fmt.Sprintf("Status tiket diperbarui dari %s menjadi %s", strings.ToUpper(string(existing.Status)), strings.ToUpper(string(*req.Status))),
		})
	}

	if req.AssignedToID != nil {
		var oldAssignee, newAssignee string
		if existing.AssignedToName != nil {
			oldAssignee = *existing.AssignedToName
		} else {
			oldAssignee = "Belum di-assign"
		}
		if updated.AssignedToName != nil {
			newAssignee = *updated.AssignedToName
		} else {
			newAssignee = "Belum di-assign"
		}
		if oldAssignee != newAssignee {
			_ = s.ticketRepo.AddTicketActivity(&domain.TicketActivity{
				TicketID:     ticketID,
				UserID:       &currentUserID,
				ActivityType: "assignment_change",
				Note:         fmt.Sprintf("Tiket dialihkan dari %s ke %s", oldAssignee, newAssignee),
			})
		}
	}

	if req.Department != nil && *req.Department != existing.Department {
		_ = s.ticketRepo.AddTicketActivity(&domain.TicketActivity{
			TicketID:     ticketID,
			UserID:       &currentUserID,
			ActivityType: "escalation",
			Note:         fmt.Sprintf("Tiket dialihkan ke departemen %s", strings.ToUpper(*req.Department)),
		})
	}

	return updated, nil
}

func (s *TicketService) AddTicketNote(workspaceID, currentUserID, ticketID string, req domain.AddTicketNoteRequest) (*domain.TicketActivity, error) {
	_, err := s.ticketRepo.GetTicketByID(workspaceID, ticketID)
	if err != nil {
		return nil, err
	}

	activityType := req.ActivityType
	if activityType == "" {
		activityType = "note"
	}

	act := domain.TicketActivity{
		TicketID:     ticketID,
		UserID:       &currentUserID,
		ActivityType: activityType,
		Note:         strings.TrimSpace(req.Note),
	}

	if err := s.ticketRepo.AddTicketActivity(&act); err != nil {
		return nil, err
	}

	acts, _ := s.ticketRepo.GetTicketActivities(ticketID)
	if len(acts) > 0 {
		return &acts[len(acts)-1], nil
	}
	return &act, nil
}

func (s *TicketService) GetSupportStats(workspaceID string) (*domain.SupportReportResponse, error) {
	return s.ticketRepo.GetSupportStats(workspaceID)
}
