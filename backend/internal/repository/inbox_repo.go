package repository

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type InboxRepository struct {
	db *sqlx.DB
}

func NewInboxRepository(db *sqlx.DB) *InboxRepository {
	return &InboxRepository{db: db}
}

func (r *InboxRepository) ListConversations(workspaceID string, filter domain.ConversationFilter) ([]domain.Conversation, error) {
	baseQuery := `
		SELECT 
			c.id, c.workspace_id, c.contact_id,
			TRIM(CONCAT(ct.first_name, ' ', ct.last_name)) AS contact_name,
			ct.email AS contact_email, ct.phone AS contact_phone,
			co.name AS company_name,
			c.channel, c.channel_identifier, c.channel_id, c.department, c.subject, c.status,
			c.sentiment, c.ai_summary,
			c.priority, c.is_sla_breached, c.frt_due_at, c.first_responded_at, c.sla_due_at,
			c.escalated_to_id, u_esc_to.full_name AS escalated_to_name,
			c.escalated_by_id, u_esc_by.full_name AS escalated_by_name,
			c.escalation_reason, c.escalated_at,
			c.assigned_to_id, u.full_name AS assigned_to_name,
			c.unread_count, c.bot_active, c.bot_handoff_reason,
			(
				SELECT m.content FROM messages m 
				WHERE m.conversation_id = c.id 
				ORDER BY m.created_at DESC LIMIT 1
			) AS last_message_content,
			c.last_message_at, c.created_at, c.updated_at
		FROM conversations c
		LEFT JOIN contacts ct ON c.contact_id = ct.id
		LEFT JOIN companies co ON ct.company_id = co.id
		LEFT JOIN users u ON c.assigned_to_id = u.id
		LEFT JOIN users u_esc_to ON c.escalated_to_id = u_esc_to.id
		LEFT JOIN users u_esc_by ON c.escalated_by_id = u_esc_by.id
		WHERE c.workspace_id = $1
	`
	args := []interface{}{workspaceID}
	argIdx := 2

	if filter.Channel != "" {
		baseQuery += fmt.Sprintf(" AND c.channel = $%d", argIdx)
		args = append(args, filter.Channel)
		argIdx++
	}

	if filter.ChannelID != "" {
		baseQuery += fmt.Sprintf(" AND c.channel_id = $%d", argIdx)
		args = append(args, filter.ChannelID)
		argIdx++
	}

	if filter.Department != "" {
		baseQuery += fmt.Sprintf(" AND c.department = $%d", argIdx)
		args = append(args, filter.Department)
		argIdx++
	}

	if filter.Status != "" {
		baseQuery += fmt.Sprintf(" AND c.status = $%d", argIdx)
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.AssignedToID != "" {
		baseQuery += fmt.Sprintf(" AND c.assigned_to_id = $%d", argIdx)
		args = append(args, filter.AssignedToID)
		argIdx++
	}

	if filter.Priority != "" {
		baseQuery += fmt.Sprintf(" AND c.priority = $%d", argIdx)
		args = append(args, filter.Priority)
		argIdx++
	}

	if filter.OnlyBreached {
		baseQuery += " AND c.is_sla_breached = true"
	}

	if filter.OnlyEscalated {
		baseQuery += " AND c.escalated_to_id IS NOT NULL"
	}

	if filter.OnlyUnassigned {
		baseQuery += " AND c.assigned_to_id IS NULL"
	}

	if filter.Query != "" {
		searchTerm := "%" + strings.ToLower(filter.Query) + "%"
		baseQuery += fmt.Sprintf(" AND (LOWER(c.subject) LIKE $%d OR LOWER(c.channel_identifier) LIKE $%d OR LOWER(ct.first_name) LIKE $%d OR LOWER(ct.last_name) LIKE $%d)", argIdx, argIdx, argIdx, argIdx)
		args = append(args, searchTerm)
		argIdx++
	}

	baseQuery += " ORDER BY c.last_message_at DESC"

	var conversations []domain.Conversation
	err := r.db.Select(&conversations, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	if conversations == nil {
		conversations = []domain.Conversation{}
	}
	return conversations, nil
}

func (r *InboxRepository) GetConversationByID(workspaceID, id string) (*domain.Conversation, error) {
	var c domain.Conversation
	query := `
		SELECT 
			c.id, c.workspace_id, c.contact_id,
			TRIM(CONCAT(ct.first_name, ' ', ct.last_name)) AS contact_name,
			ct.email AS contact_email, ct.phone AS contact_phone,
			co.name AS company_name,
			c.channel, c.channel_identifier, c.channel_id, c.department, c.subject, c.status,
			c.sentiment, c.ai_summary,
			c.priority, c.is_sla_breached, c.frt_due_at, c.first_responded_at, c.sla_due_at,
			c.escalated_to_id, u_esc_to.full_name AS escalated_to_name,
			c.escalated_by_id, u_esc_by.full_name AS escalated_by_name,
			c.escalation_reason, c.escalated_at,
			c.assigned_to_id, u.full_name AS assigned_to_name,
			c.unread_count, c.bot_active, c.bot_handoff_reason,
			(
				SELECT m.content FROM messages m 
				WHERE m.conversation_id = c.id 
				ORDER BY m.created_at DESC LIMIT 1
			) AS last_message_content,
			c.last_message_at, c.created_at, c.updated_at
		FROM conversations c
		LEFT JOIN contacts ct ON c.contact_id = ct.id
		LEFT JOIN companies co ON ct.company_id = co.id
		LEFT JOIN users u ON c.assigned_to_id = u.id
		LEFT JOIN users u_esc_to ON c.escalated_to_id = u_esc_to.id
		LEFT JOIN users u_esc_by ON c.escalated_by_id = u_esc_by.id
		WHERE c.workspace_id = $1 AND c.id = $2
	`
	err := r.db.Get(&c, query, workspaceID, id)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *InboxRepository) GetConversationByChannelIdentifier(workspaceID string, channel domain.ConversationChannel, identifier string) (*domain.Conversation, error) {
	var c domain.Conversation
	query := `
		SELECT id, workspace_id, contact_id, channel, channel_identifier, subject, status, assigned_to_id, unread_count, bot_active, bot_handoff_reason, last_message_at, created_at, updated_at
		FROM conversations
		WHERE workspace_id = $1 AND channel = $2 AND channel_identifier = $3
		ORDER BY last_message_at DESC
		LIMIT 1
	`
	err := r.db.Get(&c, query, workspaceID, channel, identifier)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *InboxRepository) CreateConversation(c *domain.Conversation) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now
	if c.LastMessageAt.IsZero() {
		c.LastMessageAt = now
	}
	if c.Status == "" {
		c.Status = domain.ConversationStatusOpen
	}
	if c.Priority == "" {
		c.Priority = "medium"
	}
	if c.FRTDueAt == nil {
		frt := now.Add(15 * time.Minute)
		c.FRTDueAt = &frt
	}
	if c.SLADueAt == nil {
		sla := now.Add(4 * time.Hour)
		c.SLADueAt = &sla
	}

	if c.Department == "" {
		c.Department = "support"
	}

	query := `
		INSERT INTO conversations (
			id, workspace_id, contact_id, channel, channel_identifier, channel_id, department,
			subject, status, priority, is_sla_breached, frt_due_at, sla_due_at,
			assigned_to_id, unread_count, bot_active, bot_handoff_reason, last_message_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13,
			$14, $15, $16, $17, $18, $19, $20
		)
	`
	_, err := r.db.Exec(
		query,
		c.ID, c.WorkspaceID, c.ContactID, c.Channel, c.ChannelIdentifier, c.ChannelID, c.Department,
		c.Subject, c.Status, c.Priority, c.IsSLABreached, c.FRTDueAt, c.SLADueAt,
		c.AssignedToID, c.UnreadCount, c.BotActive, c.BotHandoffReason, c.LastMessageAt, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *InboxRepository) UpdateConversationStatus(workspaceID, id string, status domain.ConversationStatus) error {
	query := `UPDATE conversations SET status = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = $3`
	_, err := r.db.Exec(query, status, workspaceID, id)
	return err
}

func (r *InboxRepository) UpdateConversationAssignment(workspaceID, id string, assignedToID *string) error {
	query := `UPDATE conversations SET assigned_to_id = $1, bot_active = false, updated_at = NOW() WHERE workspace_id = $2 AND id = $3`
	_, err := r.db.Exec(query, assignedToID, workspaceID, id)
	return err
}

func (r *InboxRepository) TakeoverConversation(workspaceID, id, newAssigneeID string) error {
	query := `
		UPDATE conversations 
		SET assigned_to_id = $1, bot_active = false, updated_at = NOW() 
		WHERE workspace_id = $2 AND id = $3
	`
	_, err := r.db.Exec(query, newAssigneeID, workspaceID, id)
	return err
}

func (r *InboxRepository) UpdateConversationBotStatus(workspaceID, id string, botActive bool, reason string) error {
	query := `UPDATE conversations SET bot_active = $1, bot_handoff_reason = $2, updated_at = NOW() WHERE workspace_id = $3 AND id = $4`
	_, err := r.db.Exec(query, botActive, reason, workspaceID, id)
	return err
}

func (r *InboxRepository) UpdateConversationSubject(workspaceID, id string, subject string) error {
	query := `UPDATE conversations SET subject = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = $3`
	_, err := r.db.Exec(query, subject, workspaceID, id)
	return err
}

func (r *InboxRepository) EscalateConversation(workspaceID, id, escalatedToID, escalatedByID, reason, priority string) error {
	if priority == "" {
		priority = "high"
	}
	query := `
		UPDATE conversations 
		SET 
			escalated_to_id = $1,
			escalated_by_id = $2,
			escalation_reason = $3,
			escalated_at = NOW(),
			priority = $4,
			updated_at = NOW()
		WHERE workspace_id = $5 AND id = $6
	`
	_, err := r.db.Exec(query, escalatedToID, escalatedByID, reason, priority, workspaceID, id)
	return err
}

func (r *InboxRepository) UpdatePriority(workspaceID, id, priority string) error {
	query := `UPDATE conversations SET priority = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = $3`
	_, err := r.db.Exec(query, priority, workspaceID, id)
	return err
}

func (r *InboxRepository) UpdateConversationChannelID(workspaceID, id string, channelID string) error {
	query := `UPDATE conversations SET channel_id = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = $3`
	_, err := r.db.Exec(query, channelID, workspaceID, id)
	return err
}

func (r *InboxRepository) MarkConversationRead(workspaceID, id string) error {
	query := `UPDATE conversations SET unread_count = 0, updated_at = NOW() WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, id)
	return err
}

func (r *InboxRepository) DeleteConversation(workspaceID, id string) error {
	query := `DELETE FROM conversations WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, id)
	return err
}

func (r *InboxRepository) ClearAllConversations(workspaceID string) (int64, error) {
	query := `DELETE FROM conversations WHERE workspace_id = $1`
	res, err := r.db.Exec(query, workspaceID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (r *InboxRepository) ClearSyncedContacts(workspaceID string) (int64, error) {
	query := `DELETE FROM contacts WHERE workspace_id = $1 AND lead_source = 'WhatsApp History Sync'`
	res, err := r.db.Exec(query, workspaceID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (r *InboxRepository) ListMessages(conversationID string) ([]domain.Message, error) {
	var messages []domain.Message
	query := `
		SELECT id, conversation_id, sender_type, sender_id, sender_name, content, channel, status, metadata, created_at
		FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at ASC
	`
	err := r.db.Select(&messages, query, conversationID)
	if err != nil {
		return nil, err
	}
	if messages == nil {
		messages = []domain.Message{}
	}
	return messages, nil
}

func (r *InboxRepository) CreateMessage(m *domain.Message) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	if m.CreatedAt.IsZero() {
		m.CreatedAt = time.Now()
	}
	if len(m.Metadata) == 0 {
		m.Metadata = json.RawMessage("{}")
	}
	if m.Status == "" {
		m.Status = "delivered"
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	msgQuery := `
		INSERT INTO messages (id, conversation_id, sender_type, sender_id, sender_name, content, channel, status, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err = tx.Exec(msgQuery, m.ID, m.ConversationID, m.SenderType, m.SenderID, m.SenderName, m.Content, m.Channel, m.Status, m.Metadata, m.CreatedAt)
	if err != nil {
		return err
	}

	// Update conversation last_message_at, SLA tracking, and increment unread_count if from customer
	var convUpdateQuery string
	if m.SenderType == "customer" {
		convUpdateQuery = `
			UPDATE conversations 
			SET 
				last_message_at = $1, 
				unread_count = unread_count + 1, 
				updated_at = NOW(),
				is_sla_breached = CASE 
					WHEN frt_due_at IS NOT NULL AND $1 > frt_due_at AND first_responded_at IS NULL THEN true 
					ELSE is_sla_breached 
				END
			WHERE id = $2
		`
	} else {
		convUpdateQuery = `
			UPDATE conversations 
			SET 
				last_message_at = $1, 
				updated_at = NOW(),
				first_responded_at = COALESCE(first_responded_at, $1),
				is_sla_breached = CASE 
					WHEN first_responded_at IS NULL AND frt_due_at IS NOT NULL AND $1 > frt_due_at THEN true 
					ELSE is_sla_breached 
				END
			WHERE id = $2
		`
	}
	_, err = tx.Exec(convUpdateQuery, m.CreatedAt, m.ConversationID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *InboxRepository) MessageExistsByMetadataID(convID, wahaMsgID string) (bool, error) {
	var count int
	query := `SELECT count(*) FROM messages WHERE conversation_id = $1 AND metadata->>'waha_message_id' = $2`
	err := r.db.Get(&count, query, convID, wahaMsgID)
	return count > 0, err
}

func (r *InboxRepository) CreateHistoricalMessage(m *domain.Message) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	if m.CreatedAt.IsZero() {
		m.CreatedAt = time.Now()
	}
	if len(m.Metadata) == 0 {
		m.Metadata = json.RawMessage("{}")
	}
	if m.Status == "" {
		m.Status = "delivered"
	}

	query := `
		INSERT INTO messages (id, conversation_id, sender_type, sender_id, sender_name, content, channel, status, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(query, m.ID, m.ConversationID, m.SenderType, m.SenderID, m.SenderName, m.Content, m.Channel, m.Status, m.Metadata, m.CreatedAt)
	return err
}

func (r *InboxRepository) RefreshConversationLastMessage(convID string) error {
	query := `
		UPDATE conversations c
		SET last_message_at = COALESCE((SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id), c.last_message_at),
		    updated_at = NOW()
		WHERE c.id = $1
	`
	_, err := r.db.Exec(query, convID)
	return err
}

func (r *InboxRepository) ListWorkspaceChannels(workspaceID string) ([]domain.WorkspaceChannel, error) {
	query := `
		SELECT 
			wc.id, wc.workspace_id, wc.channel_name, wc.channel_type, wc.department,
			wc.phone_number, wc.session_name, wc.assigned_user_id, COALESCE(u.full_name, '') AS assigned_user_name,
			wc.qr_code, wc.status, wc.is_active, wc.metadata, wc.created_at, wc.updated_at
		FROM workspace_channels wc
		LEFT JOIN users u ON wc.assigned_user_id = u.id
		WHERE wc.workspace_id = $1
		ORDER BY wc.created_at ASC
	`
	channels := make([]domain.WorkspaceChannel, 0)
	err := r.db.Select(&channels, query, workspaceID)
	if err != nil {
		return nil, err
	}
	return channels, nil
}

func (r *InboxRepository) GetWorkspaceChannelByID(workspaceID, channelID string) (*domain.WorkspaceChannel, error) {
	var c domain.WorkspaceChannel
	query := `
		SELECT 
			wc.id, wc.workspace_id, wc.channel_name, wc.channel_type, wc.department,
			wc.phone_number, wc.session_name, wc.assigned_user_id, COALESCE(u.full_name, '') AS assigned_user_name,
			wc.qr_code, wc.status, wc.is_active, wc.metadata, wc.created_at, wc.updated_at
		FROM workspace_channels wc
		LEFT JOIN users u ON wc.assigned_user_id = u.id
		WHERE wc.workspace_id = $1 AND wc.id = $2
		LIMIT 1
	`
	err := r.db.Get(&c, query, workspaceID, channelID)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *InboxRepository) GetWorkspaceChannel(workspaceID, channelType string) (*domain.WorkspaceChannel, error) {
	var c domain.WorkspaceChannel
	query := `
		SELECT 
			wc.id, wc.workspace_id, wc.channel_name, wc.channel_type, wc.department,
			wc.phone_number, wc.session_name, wc.assigned_user_id, COALESCE(u.full_name, '') AS assigned_user_name,
			wc.qr_code, wc.status, wc.is_active, wc.metadata, wc.created_at, wc.updated_at
		FROM workspace_channels wc
		LEFT JOIN users u ON wc.assigned_user_id = u.id
		WHERE wc.workspace_id = $1 AND wc.channel_type = $2 AND wc.is_active = true
		ORDER BY 
			CASE WHEN wc.status = 'connected' THEN 0 ELSE 1 END,
			wc.created_at DESC
		LIMIT 1
	`
	err := r.db.Get(&c, query, workspaceID, channelType)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *InboxRepository) GetWorkspaceChannelByPhoneNumber(phoneNumber string) (*domain.WorkspaceChannel, error) {
	norm := NormalizePhone(phoneNumber)
	var c domain.WorkspaceChannel
	query := `
		SELECT 
			wc.id, wc.workspace_id, wc.channel_name, wc.channel_type, wc.department,
			wc.phone_number, wc.session_name, wc.assigned_user_id, COALESCE(u.full_name, '') AS assigned_user_name,
			wc.qr_code, wc.status, wc.is_active, wc.metadata, wc.created_at, wc.updated_at
		FROM workspace_channels wc
		LEFT JOIN users u ON wc.assigned_user_id = u.id
		WHERE (wc.phone_number = $1 OR wc.phone_number = $2) AND wc.is_active = true
		LIMIT 1
	`
	err := r.db.Get(&c, query, phoneNumber, "+"+norm)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *InboxRepository) GetWorkspaceChannelByUserID(workspaceID, userID string) (*domain.WorkspaceChannel, error) {
	var c domain.WorkspaceChannel
	query := `
		SELECT 
			wc.id, wc.workspace_id, wc.channel_name, wc.channel_type, wc.department,
			wc.phone_number, wc.session_name, wc.assigned_user_id, COALESCE(u.full_name, '') AS assigned_user_name,
			wc.qr_code, wc.status, wc.is_active, wc.metadata, wc.created_at, wc.updated_at
		FROM workspace_channels wc
		LEFT JOIN users u ON wc.assigned_user_id = u.id
		WHERE wc.workspace_id = $1 AND wc.assigned_user_id = $2 AND wc.is_active = true
		ORDER BY wc.created_at DESC
		LIMIT 1
	`
	err := r.db.Get(&c, query, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *InboxRepository) GetWorkspaceChannelBySession(sessionName string) (*domain.WorkspaceChannel, error) {
	var c domain.WorkspaceChannel
	query := `
		SELECT 
			wc.id, wc.workspace_id, wc.channel_name, wc.channel_type, wc.department,
			wc.phone_number, wc.session_name, wc.assigned_user_id, COALESCE(u.full_name, '') AS assigned_user_name,
			wc.qr_code, wc.status, wc.is_active, wc.metadata, wc.created_at, wc.updated_at
		FROM workspace_channels wc
		LEFT JOIN users u ON wc.assigned_user_id = u.id
		WHERE wc.session_name = $1 AND wc.is_active = true
		LIMIT 1
	`
	err := r.db.Get(&c, query, sessionName)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *InboxRepository) UpsertWorkspaceChannel(c *domain.WorkspaceChannel) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	if c.ChannelName == "" {
		c.ChannelName = "WhatsApp Official"
	}
	if c.Department == "" {
		c.Department = "support"
	}
	query := `
		INSERT INTO workspace_channels (
			id, workspace_id, channel_name, channel_type, department, phone_number, session_name, assigned_user_id, qr_code, status, is_active, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
		) ON CONFLICT (workspace_id, channel_type, session_name) DO UPDATE
		SET channel_name = EXCLUDED.channel_name,
		    department = EXCLUDED.department,
		    phone_number = EXCLUDED.phone_number,
		    assigned_user_id = EXCLUDED.assigned_user_id,
		    qr_code = EXCLUDED.qr_code,
		    status = EXCLUDED.status,
		    is_active = EXCLUDED.is_active,
		    updated_at = NOW()
	`
	_, err := r.db.Exec(query, c.ID, c.WorkspaceID, c.ChannelName, c.ChannelType, c.Department, c.PhoneNumber, c.SessionName, c.AssignedUserID, c.QRCode, c.Status, c.IsActive)
	return err
}

func (r *InboxRepository) DeleteWorkspaceChannel(workspaceID, channelID string) error {
	query := `DELETE FROM workspace_channels WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, channelID)
	return err
}

func (r *InboxRepository) UpdateChannelQRCode(workspaceID, channelID, qrCode string) error {
	query := `UPDATE workspace_channels SET qr_code = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = $3`
	_, err := r.db.Exec(query, qrCode, workspaceID, channelID)
	return err
}

func (r *InboxRepository) GetMonitoringStats(workspaceID string, department string) (*domain.MonitoringStatsResponse, error) {
	// First mark breached conversations that passed frt_due_at without first response
	checkBreachQuery := `
		UPDATE conversations 
		SET is_sla_breached = true 
		WHERE workspace_id = $1 AND is_sla_breached = false AND status = 'open' 
		  AND first_responded_at IS NULL AND frt_due_at IS NOT NULL AND frt_due_at < NOW()
	`
	_, _ = r.db.Exec(checkBreachQuery, workspaceID)

	var stats domain.MonitoringStatsResponse

	deptCondition := ""
	args := []interface{}{workspaceID}
	if department != "" && department != "all" {
		deptCondition = " AND c.department = $2"
		args = append(args, department)
	}

	aggQuery := fmt.Sprintf(`
		SELECT 
			COUNT(*) AS total_conversations,
			COUNT(*) FILTER (WHERE c.status = 'open') AS open_conversations,
			COUNT(*) FILTER (WHERE c.status = 'pending') AS pending_conversations,
			COUNT(*) FILTER (WHERE c.status = 'closed') AS resolved_conversations,
			COUNT(*) FILTER (WHERE c.assigned_to_id IS NULL AND c.status = 'open') AS unassigned_count,
			COUNT(*) FILTER (WHERE c.is_sla_breached = true AND c.status = 'open') AS sla_breached_count,
			COUNT(*) FILTER (WHERE (c.sentiment IN ('negative', 'critical') OR c.priority = 'urgent') AND c.status = 'open') AS complaints_count,
			COUNT(*) FILTER (WHERE c.escalated_to_id IS NOT NULL AND c.status = 'open') AS escalated_count,
			COALESCE(AVG(EXTRACT(EPOCH FROM (c.first_responded_at - c.created_at))/60.0) FILTER (WHERE c.first_responded_at IS NOT NULL), 0) AS avg_first_response_minutes
		FROM conversations c
		WHERE c.workspace_id = $1 %s
	`, deptCondition)

	type AggResult struct {
		TotalConversations      int     `db:"total_conversations"`
		OpenConversations       int     `db:"open_conversations"`
		PendingConversations    int     `db:"pending_conversations"`
		ResolvedConversations   int     `db:"resolved_conversations"`
		UnassignedCount         int     `db:"unassigned_count"`
		SLABreachedCount        int     `db:"sla_breached_count"`
		ComplaintsCount         int     `db:"complaints_count"`
		EscalatedCount          int     `db:"escalated_count"`
		AvgFirstResponseMinutes float64 `db:"avg_first_response_minutes"`
	}

	var agg AggResult
	if err := r.db.Get(&agg, aggQuery, args...); err != nil {
		return nil, err
	}

	stats.TotalConversations = agg.TotalConversations
	stats.OpenConversations = agg.OpenConversations
	stats.PendingConversations = agg.PendingConversations
	stats.ResolvedConversations = agg.ResolvedConversations
	stats.UnassignedCount = agg.UnassignedCount
	stats.SLABreachedCount = agg.SLABreachedCount
	stats.ComplaintsCount = agg.ComplaintsCount
	stats.EscalatedCount = agg.EscalatedCount
	stats.AvgFirstResponseMinutes = math.Round(agg.AvgFirstResponseMinutes*10) / 10

	if stats.TotalConversations > 0 {
		compliantCount := stats.TotalConversations - stats.SLABreachedCount
		if compliantCount < 0 {
			compliantCount = 0
		}
		stats.SLAComplianceRate = math.Round((float64(compliantCount)/float64(stats.TotalConversations))*1000) / 10
	} else {
		stats.SLAComplianceRate = 100.0
	}

	// Agent Workloads
	workloadQuery := `
		SELECT 
			u.id AS user_id,
			u.full_name,
			u.email,
			wm.role,
			wm.department,
			COUNT(c.id) FILTER (WHERE c.status = 'open') AS active_chats,
			COUNT(c.id) FILTER (WHERE c.status = 'pending') AS pending_chats,
			COUNT(c.id) FILTER (WHERE c.status = 'closed') AS resolved_chats,
			COUNT(c.id) FILTER (WHERE c.is_sla_breached = true) AS sla_breached,
			COALESCE(AVG(EXTRACT(EPOCH FROM (c.first_responded_at - c.created_at))/60.0) FILTER (WHERE c.first_responded_at IS NOT NULL), 0) AS avg_response_min
		FROM workspace_members wm
		JOIN users u ON wm.user_id = u.id
		LEFT JOIN conversations c ON c.assigned_to_id = u.id AND c.workspace_id = wm.workspace_id
		WHERE wm.workspace_id = $1
		GROUP BY u.id, u.full_name, u.email, wm.role, wm.department
		ORDER BY active_chats DESC, u.full_name ASC
	`
	var workloads []domain.AgentWorkload
	if err := r.db.Select(&workloads, workloadQuery, workspaceID); err == nil && workloads != nil {
		for i := range workloads {
			workloads[i].AvgResponseMin = math.Round(workloads[i].AvgResponseMin*10) / 10
		}
		stats.AgentWorkloads = workloads
	} else {
		stats.AgentWorkloads = []domain.AgentWorkload{}
	}

	return &stats, nil
}

// GetWorkspaceBotSettings fetches the custom chatbot template & configuration for a workspace.
// If none exists yet, it seeds a default one and returns it.
func (r *InboxRepository) GetWorkspaceBotSettings(workspaceID string) (*domain.WorkspaceBotSettings, error) {
	var settings domain.WorkspaceBotSettings
	query := `
		SELECT 
			id, workspace_id, bot_enabled, bot_name, greeting_message,
			menu_1_title, menu_1_keywords, menu_1_response,
			menu_2_title, menu_2_keywords, menu_2_response,
			menu_3_title, menu_3_keywords, menu_3_response,
			menu_4_title, menu_4_keywords, menu_4_response,
			handoff_message, custom_faqs, created_at, updated_at
		FROM workspace_bot_settings
		WHERE workspace_id = $1
		LIMIT 1
	`
	err := r.db.Get(&settings, query, workspaceID)
	if err == nil {
		return &settings, nil
	}

	// If not found, insert default
	insertQuery := `
		INSERT INTO workspace_bot_settings (
			workspace_id, bot_enabled, bot_name, greeting_message,
			menu_1_title, menu_1_keywords, menu_1_response,
			menu_2_title, menu_2_keywords, menu_2_response,
			menu_3_title, menu_3_keywords, menu_3_response,
			menu_4_title, menu_4_keywords, menu_4_response,
			handoff_message, custom_faqs, created_at, updated_at
		) VALUES (
			$1, true, 'Asisten Virtual OCTO', 
			'Halo {name}! 👋 Selamat datang di Layanan Pelanggan {company}.\n\nSaya adalah Asisten Virtual Otomatis. Saya siap membantu Anda 24/7. Silakan pilih menu informasi berikut:\n\n1️⃣ {menu_1_title}\n2️⃣ {menu_2_title}\n3️⃣ {menu_3_title}\n4️⃣ {menu_4_title}\n\nSilakan ketik nomor (1-4) atau tuliskan pertanyaan Anda langsung ya!',
			'Informasi Produk & Layanan', 'produk,fitur,layanan,keunggulan,kemampuan,apa itu', 'Berikut adalah informasi produk dan layanan unggulan kami. Kami berkomitmen memberikan solusi terbaik untuk kebutuhan Anda.\n\nKetik *2* untuk melihat paket harga, atau ketik *CS* jika ingin berbicara langsung dengan tim kami!',
			'Paket Harga & Penawaran', 'harga,paket,biaya,tarif,langganan,pricelist,berapa', 'Kami menyediakan berbagai paket penawaran fleksibel yang dapat disesuaikan dengan kebutuhan Anda.\n\nKetik *CS* untuk mendapatkan simulasi perhitungan biaya dan proposal penawaran resmi dari tim Sales kami!',
			'Jam Operasional & Alamat Kantor', 'jam operasional,jam kerja,alamat,kantor,lokasi,jadwal', '⏰ *Jam Operasional Kantor:* \nSenin - Jumat: 08:00 - 18:00 WIB\nSabtu: 09:00 - 15:00 WIB\n(Layanan Chatbot & Monitoring Darurat aktif 24/7)\n\n📍 *Alamat Kantor:* \nSilakan hubungi tim kami untuk jadwal kunjungan atau temu langsung.',
			'Hubungi Tim Customer Service (CS) Manusia', 'cs,agen,manusia,bantuan,komplain,keluhan,kendala,bicara', 'Pesan Anda telah kami teruskan ke agen Customer Service (CS) manusia kami. Mohon ditunggu sebentar ya!',
			'Baik {name}, pertanyaan Anda memerlukan penanganan langsung dari tim Customer Service (CS) kami. 👨‍💼👩‍💼\n\nPesan Anda telah kami alihkan ke agen manusia kami dan tim kami sudah menerima notifikasi prioritas untuk segera membalas percakapan ini.\n\nMohon ditunggu sebentar ya kak, agen CS kami akan segera bergabung dalam obrolan ini! 🙏',
			'[]'::jsonb, NOW(), NOW()
		)
		ON CONFLICT (workspace_id) DO NOTHING
		RETURNING 
			id, workspace_id, bot_enabled, bot_name, greeting_message,
			menu_1_title, menu_1_keywords, menu_1_response,
			menu_2_title, menu_2_keywords, menu_2_response,
			menu_3_title, menu_3_keywords, menu_3_response,
			menu_4_title, menu_4_keywords, menu_4_response,
			handoff_message, custom_faqs, created_at, updated_at
	`
	err = r.db.Get(&settings, insertQuery, workspaceID)
	if err == nil {
		return &settings, nil
	}

	// Retry get in case conflict occurred
	err = r.db.Get(&settings, query, workspaceID)
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

// UpdateWorkspaceBotSettings updates chatbot templates and settings for a company/workspace
func (r *InboxRepository) UpdateWorkspaceBotSettings(workspaceID string, req *domain.UpdateBotSettingsRequest) (*domain.WorkspaceBotSettings, error) {
	current, err := r.GetWorkspaceBotSettings(workspaceID)
	if err != nil {
		return nil, err
	}

	if req.BotEnabled != nil {
		current.BotEnabled = *req.BotEnabled
	}
	if req.BotName != nil && *req.BotName != "" {
		current.BotName = *req.BotName
	}
	if req.GreetingMessage != nil && *req.GreetingMessage != "" {
		current.GreetingMessage = *req.GreetingMessage
	}
	if req.Menu1Title != nil && *req.Menu1Title != "" {
		current.Menu1Title = *req.Menu1Title
	}
	if req.Menu1Keywords != nil {
		current.Menu1Keywords = *req.Menu1Keywords
	}
	if req.Menu1Response != nil && *req.Menu1Response != "" {
		current.Menu1Response = *req.Menu1Response
	}
	if req.Menu2Title != nil && *req.Menu2Title != "" {
		current.Menu2Title = *req.Menu2Title
	}
	if req.Menu2Keywords != nil {
		current.Menu2Keywords = *req.Menu2Keywords
	}
	if req.Menu2Response != nil && *req.Menu2Response != "" {
		current.Menu2Response = *req.Menu2Response
	}
	if req.Menu3Title != nil && *req.Menu3Title != "" {
		current.Menu3Title = *req.Menu3Title
	}
	if req.Menu3Keywords != nil {
		current.Menu3Keywords = *req.Menu3Keywords
	}
	if req.Menu3Response != nil && *req.Menu3Response != "" {
		current.Menu3Response = *req.Menu3Response
	}
	if req.Menu4Title != nil && *req.Menu4Title != "" {
		current.Menu4Title = *req.Menu4Title
	}
	if req.Menu4Keywords != nil {
		current.Menu4Keywords = *req.Menu4Keywords
	}
	if req.Menu4Response != nil && *req.Menu4Response != "" {
		current.Menu4Response = *req.Menu4Response
	}
	if req.HandoffMessage != nil && *req.HandoffMessage != "" {
		current.HandoffMessage = *req.HandoffMessage
	}
	if req.CustomFAQs != nil {
		current.CustomFAQs = req.CustomFAQs
	}

	updateQuery := `
		UPDATE workspace_bot_settings SET
			bot_enabled = $1,
			bot_name = $2,
			greeting_message = $3,
			menu_1_title = $4,
			menu_1_keywords = $5,
			menu_1_response = $6,
			menu_2_title = $7,
			menu_2_keywords = $8,
			menu_2_response = $9,
			menu_3_title = $10,
			menu_3_keywords = $11,
			menu_3_response = $12,
			menu_4_title = $13,
			menu_4_keywords = $14,
			menu_4_response = $15,
			handoff_message = $16,
			custom_faqs = $17,
			updated_at = NOW()
		WHERE workspace_id = $18
		RETURNING 
			id, workspace_id, bot_enabled, bot_name, greeting_message,
			menu_1_title, menu_1_keywords, menu_1_response,
			menu_2_title, menu_2_keywords, menu_2_response,
			menu_3_title, menu_3_keywords, menu_3_response,
			menu_4_title, menu_4_keywords, menu_4_response,
			handoff_message, custom_faqs, created_at, updated_at
	`
	var updated domain.WorkspaceBotSettings
	err = r.db.Get(&updated, updateQuery,
		current.BotEnabled,
		current.BotName,
		current.GreetingMessage,
		current.Menu1Title,
		current.Menu1Keywords,
		current.Menu1Response,
		current.Menu2Title,
		current.Menu2Keywords,
		current.Menu2Response,
		current.Menu3Title,
		current.Menu3Keywords,
		current.Menu3Response,
		current.Menu4Title,
		current.Menu4Keywords,
		current.Menu4Response,
		current.HandoffMessage,
		current.CustomFAQs,
		workspaceID,
	)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}
