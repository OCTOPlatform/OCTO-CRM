package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"octo-crm/backend/internal/domain"
)

type TicketRepository struct {
	db *sqlx.DB
}

func NewTicketRepository(db *sqlx.DB) *TicketRepository {
	return &TicketRepository{db: db}
}

func (r *TicketRepository) GenerateTicketNumber(workspaceID string) (string, error) {
	var count int
	prefix := fmt.Sprintf("TCK-%s", time.Now().Format("200601"))
	_ = r.db.Get(&count, "SELECT COUNT(*) FROM tickets WHERE workspace_id = $1 AND ticket_number LIKE $2", workspaceID, prefix+"%")

	nextSeq := count + 1
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("%s-%03d", prefix, nextSeq)
		var exists bool
		_ = r.db.Get(&exists, "SELECT EXISTS(SELECT 1 FROM tickets WHERE workspace_id = $1 AND ticket_number = $2)", workspaceID, candidate)
		if !exists {
			return candidate, nil
		}
		nextSeq++
	}
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano()%1000000), nil
}

func (r *TicketRepository) ListTickets(workspaceID string, filter domain.TicketFilter) ([]domain.Ticket, error) {
	baseQuery := `
		SELECT 
			t.id, t.workspace_id, t.ticket_number, t.conversation_id, t.contact_id,
			COALESCE(c.first_name || ' ' || c.last_name, '') AS contact_name,
			COALESCE(c.phone, '') AS contact_phone,
			COALESCE(c.email, '') AS contact_email,
			t.subject, t.description, t.category, t.priority, t.status,
			t.assigned_to_id, COALESCE(u.full_name, '') AS assigned_to_name,
			t.created_by_id, COALESCE(creator.full_name, '') AS created_by_name,
			t.department, t.sla_due_at, t.frt_due_at, t.first_responded_at, t.is_sla_breached, t.resolved_at, t.created_at, t.updated_at
		FROM tickets t
		LEFT JOIN contacts c ON t.contact_id = c.id
		LEFT JOIN users u ON t.assigned_to_id = u.id
		LEFT JOIN users creator ON t.created_by_id = creator.id
		WHERE t.workspace_id = $1
	`
	args := []interface{}{workspaceID}
	argIdx := 2

	if filter.Status != "" {
		baseQuery += fmt.Sprintf(" AND t.status = $%d", argIdx)
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.Priority != "" {
		baseQuery += fmt.Sprintf(" AND t.priority = $%d", argIdx)
		args = append(args, filter.Priority)
		argIdx++
	}

	if filter.Category != "" {
		baseQuery += fmt.Sprintf(" AND t.category = $%d", argIdx)
		args = append(args, filter.Category)
		argIdx++
	}

	if filter.Department != "" {
		baseQuery += fmt.Sprintf(" AND t.department = $%d", argIdx)
		args = append(args, filter.Department)
		argIdx++
	}

	if filter.AssignedToID != "" {
		baseQuery += fmt.Sprintf(" AND t.assigned_to_id = $%d", argIdx)
		args = append(args, filter.AssignedToID)
		argIdx++
	}

	if filter.Query != "" {
		q := "%" + strings.ToLower(filter.Query) + "%"
		baseQuery += fmt.Sprintf(" AND (LOWER(t.subject) LIKE $%d OR LOWER(t.ticket_number) LIKE $%d OR LOWER(t.description) LIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, q)
		argIdx++
	}

	baseQuery += " ORDER BY t.created_at DESC"

	tickets := make([]domain.Ticket, 0)
	err := r.db.Select(&tickets, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *TicketRepository) GetTicketByID(workspaceID, ticketID string) (*domain.Ticket, error) {
	query := `
		SELECT 
			t.id, t.workspace_id, t.ticket_number, t.conversation_id, t.contact_id,
			COALESCE(c.first_name || ' ' || c.last_name, '') AS contact_name,
			COALESCE(c.phone, '') AS contact_phone,
			COALESCE(c.email, '') AS contact_email,
			t.subject, t.description, t.category, t.priority, t.status,
			t.assigned_to_id, COALESCE(u.full_name, '') AS assigned_to_name,
			t.created_by_id, COALESCE(creator.full_name, '') AS created_by_name,
			t.department, t.sla_due_at, t.frt_due_at, t.first_responded_at, t.is_sla_breached, t.resolved_at, t.created_at, t.updated_at
		FROM tickets t
		LEFT JOIN contacts c ON t.contact_id = c.id
		LEFT JOIN users u ON t.assigned_to_id = u.id
		LEFT JOIN users creator ON t.created_by_id = creator.id
		WHERE t.workspace_id = $1 AND t.id = $2
	`
	var ticket domain.Ticket
	err := r.db.Get(&ticket, query, workspaceID, ticketID)
	if err != nil {
		return nil, err
	}

	activities, _ := r.GetTicketActivities(ticket.ID)
	ticket.Activities = activities
	return &ticket, nil
}

func (r *TicketRepository) CreateTicket(ticket *domain.Ticket) error {
	if ticket.ID == "" {
		ticket.ID = uuid.New().String()
	}
	now := time.Now()
	ticket.CreatedAt = now
	ticket.UpdatedAt = now

	// Sanitize UUID pointer fields so empty strings become nil (avoid pq: invalid input syntax for type uuid: "")
	if ticket.ConversationID != nil && strings.TrimSpace(*ticket.ConversationID) == "" {
		ticket.ConversationID = nil
	}
	if ticket.ContactID != nil && strings.TrimSpace(*ticket.ContactID) == "" {
		ticket.ContactID = nil
	}
	if ticket.AssignedToID != nil && strings.TrimSpace(*ticket.AssignedToID) == "" {
		ticket.AssignedToID = nil
	}
	if ticket.CreatedByID != nil && strings.TrimSpace(*ticket.CreatedByID) == "" {
		ticket.CreatedByID = nil
	}

	// Intelligent Enterprise Helpdesk SLA: First Response Time (FRT) & Resolution SLA
	if ticket.FRTDueAt == nil {
		frtDuration := 2 * time.Hour
		switch ticket.Priority {
		case domain.TicketPriorityUrgent:
			frtDuration = 15 * time.Minute
		case domain.TicketPriorityHigh:
			frtDuration = 30 * time.Minute
		case domain.TicketPriorityLow:
			frtDuration = 4 * time.Hour
		}
		frt := now.Add(frtDuration)
		ticket.FRTDueAt = &frt
	}

	if ticket.SLADueAt == nil {
		slaDuration := 24 * time.Hour
		switch ticket.Priority {
		case domain.TicketPriorityUrgent:
			slaDuration = 4 * time.Hour
		case domain.TicketPriorityHigh:
			slaDuration = 8 * time.Hour
		case domain.TicketPriorityLow:
			slaDuration = 48 * time.Hour
		}
		due := now.Add(slaDuration)
		ticket.SLADueAt = &due
	}

	query := `
		INSERT INTO tickets (
			id, workspace_id, ticket_number, conversation_id, contact_id,
			subject, description, category, priority, status,
			assigned_to_id, created_by_id, department, frt_due_at, sla_due_at, is_sla_breached, created_at, updated_at
		) VALUES (
			:id, :workspace_id, :ticket_number, :conversation_id, :contact_id,
			:subject, :description, :category, :priority, :status,
			:assigned_to_id, :created_by_id, :department, :frt_due_at, :sla_due_at, :is_sla_breached, :created_at, :updated_at
		)
	`
	_, err := r.db.NamedExec(query, ticket)
	return err
}

func (r *TicketRepository) UpdateTicket(workspaceID, ticketID string, req domain.UpdateTicketRequest) (*domain.Ticket, error) {
	setClauses := []string{"updated_at = NOW()"}
	args := []interface{}{workspaceID, ticketID}
	argIdx := 3

	if req.Subject != nil {
		setClauses = append(setClauses, fmt.Sprintf("subject = $%d", argIdx))
		args = append(args, *req.Subject)
		argIdx++
	}
	if req.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *req.Description)
		argIdx++
	}
	if req.Category != nil {
		setClauses = append(setClauses, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, *req.Category)
		argIdx++
	}
	if req.Priority != nil {
		setClauses = append(setClauses, fmt.Sprintf("priority = $%d", argIdx))
		args = append(args, *req.Priority)
		argIdx++
	}
	if req.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *req.Status)
		argIdx++

		if *req.Status == domain.TicketStatusResolved || *req.Status == domain.TicketStatusClosed {
			setClauses = append(setClauses, "resolved_at = NOW()")
		}
	}
	if req.Department != nil {
		setClauses = append(setClauses, fmt.Sprintf("department = $%d", argIdx))
		args = append(args, *req.Department)
		argIdx++
	}
	if req.AssignedToID != nil {
		if *req.AssignedToID == "" {
			setClauses = append(setClauses, "assigned_to_id = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("assigned_to_id = $%d", argIdx))
			args = append(args, *req.AssignedToID)
			argIdx++
		}
	}

	query := fmt.Sprintf("UPDATE tickets SET %s WHERE workspace_id = $1 AND id = $2", strings.Join(setClauses, ", "))
	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, err
	}

	return r.GetTicketByID(workspaceID, ticketID)
}

func (r *TicketRepository) AddTicketActivity(act *domain.TicketActivity) error {
	if act.ID == "" {
		act.ID = uuid.New().String()
	}
	if act.CreatedAt.IsZero() {
		act.CreatedAt = time.Now()
	}
	if len(act.Metadata) == 0 {
		act.Metadata = []byte("{}")
	}
	if act.UserID != nil && strings.TrimSpace(*act.UserID) == "" {
		act.UserID = nil
	}

	query := `
		INSERT INTO ticket_activities (id, ticket_id, user_id, activity_type, note, metadata, created_at)
		VALUES (:id, :ticket_id, :user_id, :activity_type, :note, :metadata, :created_at)
	`
	_, err := r.db.NamedExec(query, act)
	return err
}

func (r *TicketRepository) GetTicketActivities(ticketID string) ([]domain.TicketActivity, error) {
	query := `
		SELECT 
			ta.id, ta.ticket_id, ta.user_id, COALESCE(u.full_name, 'Sistem') AS user_name,
			ta.activity_type, ta.note, ta.metadata, ta.created_at
		FROM ticket_activities ta
		LEFT JOIN users u ON ta.user_id = u.id
		WHERE ta.ticket_id = $1
		ORDER BY ta.created_at ASC
	`
	acts := make([]domain.TicketActivity, 0)
	err := r.db.Select(&acts, query, ticketID)
	if err != nil {
		return nil, err
	}
	return acts, nil
}

func (r *TicketRepository) GetSupportStats(workspaceID string) (*domain.SupportReportResponse, error) {
	stats := &domain.SupportReportResponse{
		CategoryBreakdown:   make(map[string]int),
		PriorityBreakdown:   make(map[string]int),
		DepartmentBreakdown: make(map[string]int),
	}

	// 1. Total & status counts
	rows, err := r.db.Query(`
		SELECT status, COUNT(*) 
		FROM tickets 
		WHERE workspace_id = $1 
		GROUP BY status
	`, workspaceID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int
			if err := rows.Scan(&status, &count); err == nil {
				stats.TotalTickets += count
				switch status {
				case "open":
					stats.OpenTickets = count
				case "in_progress":
					stats.InProgressTickets = count
				case "escalated":
					stats.EscalatedTickets = count
				case "resolved", "closed":
					stats.ResolvedTickets += count
				}
			}
		}
	}

	if stats.TotalTickets > 0 {
		stats.ResolutionRate = float64(stats.ResolvedTickets) / float64(stats.TotalTickets) * 100.0
	}

	// 2. Average resolution hours
	var avgHours sql.NullFloat64
	_ = r.db.Get(&avgHours, `
		SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)
		FROM tickets
		WHERE workspace_id = $1 AND resolved_at IS NOT NULL
	`, workspaceID)
	if avgHours.Valid {
		stats.AvgResolutionHours = avgHours.Float64
	}

	// 3. Category breakdown
	catRows, err := r.db.Query(`
		SELECT category, COUNT(*) 
		FROM tickets 
		WHERE workspace_id = $1 
		GROUP BY category
	`, workspaceID)
	if err == nil {
		defer catRows.Close()
		for catRows.Next() {
			var cat string
			var count int
			if err := catRows.Scan(&cat, &count); err == nil {
				stats.CategoryBreakdown[cat] = count
			}
		}
	}

	// 4. Priority breakdown
	prioRows, err := r.db.Query(`
		SELECT priority, COUNT(*) 
		FROM tickets 
		WHERE workspace_id = $1 
		GROUP BY priority
	`, workspaceID)
	if err == nil {
		defer prioRows.Close()
		for prioRows.Next() {
			var prio string
			var count int
			if err := prioRows.Scan(&prio, &count); err == nil {
				stats.PriorityBreakdown[prio] = count
			}
		}
	}

	// 5. Department breakdown
	deptRows, err := r.db.Query(`
		SELECT department, COUNT(*) 
		FROM tickets 
		WHERE workspace_id = $1 
		GROUP BY department
	`, workspaceID)
	if err == nil {
		defer deptRows.Close()
		for deptRows.Next() {
			var dept string
			var count int
			if err := deptRows.Scan(&dept, &count); err == nil {
				stats.DepartmentBreakdown[dept] = count
			}
		}
	}

	return stats, nil
}

// IsAfterSalesMember checks if a user belongs to the After-Sales (CS / support) department or is workspace owner/admin
func (r *TicketRepository) IsAfterSalesMember(workspaceID, userID string) (bool, error) {
	var count int
	query := `
		SELECT COUNT(*) 
		FROM workspace_members 
		WHERE workspace_id = $1 AND user_id = $2
		AND (department = 'support' OR department = 'cs' OR role IN ('owner', 'admin'))
	`
	err := r.db.Get(&count, query, workspaceID, userID)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetActiveTicketByConversation checks if an active ticket exists for a conversation
func (r *TicketRepository) GetActiveTicketByConversation(workspaceID, conversationID string) (*domain.Ticket, error) {
	query := `
		SELECT 
			t.id, t.workspace_id, t.ticket_number, t.conversation_id, t.contact_id,
			COALESCE(c.first_name || ' ' || c.last_name, '') AS contact_name,
			COALESCE(c.phone, '') AS contact_phone,
			COALESCE(c.email, '') AS contact_email,
			t.subject, t.description, t.category, t.priority, t.status,
			t.assigned_to_id, COALESCE(u.full_name, '') AS assigned_to_name,
			t.created_by_id, COALESCE(creator.full_name, '') AS created_by_name,
			t.department, t.sla_due_at, t.frt_due_at, t.first_responded_at, t.is_sla_breached, t.resolved_at, t.created_at, t.updated_at
		FROM tickets t
		LEFT JOIN contacts c ON t.contact_id = c.id
		LEFT JOIN users u ON t.assigned_to_id = u.id
		LEFT JOIN users creator ON t.created_by_id = creator.id
		WHERE t.workspace_id = $1 AND t.conversation_id = $2
		  AND t.status IN ('open', 'in_progress', 'escalated')
		ORDER BY t.created_at DESC
		LIMIT 1
	`
	var ticket domain.Ticket
	err := r.db.Get(&ticket, query, workspaceID, conversationID)
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

// GetAfterSalesAgents returns all members in the workspace eligible for CS support ticket assignment
func (r *TicketRepository) GetAfterSalesAgents(workspaceID string) ([]domain.User, error) {
	query := `
		SELECT u.id, u.email, u.full_name, COALESCE(u.avatar_url, '') AS avatar_url, u.is_superadmin, u.created_at, u.updated_at
		FROM workspace_members wm
		JOIN users u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1
		  AND (wm.department = 'support' OR wm.department = 'cs' OR wm.role = 'owner')
		ORDER BY wm.joined_at ASC
	`
	var agents []domain.User
	err := r.db.Select(&agents, query, workspaceID)
	if err != nil {
		return nil, err
	}
	return agents, nil
}

// GetCSActiveTicketCounts counts active tickets per assigned CS user
func (r *TicketRepository) GetCSActiveTicketCounts(workspaceID string) (map[string]int, error) {
	query := `
		SELECT assigned_to_id, COUNT(*) 
		FROM tickets
		WHERE workspace_id = $1 AND status IN ('open', 'in_progress', 'escalated')
		  AND assigned_to_id IS NOT NULL
		GROUP BY assigned_to_id
	`
	rows, err := r.db.Query(query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var uid string
		var c int
		if err := rows.Scan(&uid, &c); err == nil {
			counts[uid] = c
		}
	}
	return counts, nil
}
