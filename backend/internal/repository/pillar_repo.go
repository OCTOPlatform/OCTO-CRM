package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"octo-crm/backend/internal/domain"
)

type PillarRepository struct {
	db *sqlx.DB
}

func NewPillarRepository(db *sqlx.DB) *PillarRepository {
	return &PillarRepository{db: db}
}

// ==========================================
// PILAR 3: CPQ & QUOTATION REPOSITORY
// ==========================================

func (r *PillarRepository) CreateQuotation(q *domain.Quotation) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO quotations (
			workspace_id, deal_id, contact_id, quote_number, title, status,
			client_name, client_email, client_phone, company_name,
			subtotal, discount_percentage, discount_amount, tax_percentage, tax_amount, grand_total,
			valid_until, notes, terms_conditions, created_by_id
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16,
			$17, $18, $19, $20
		) RETURNING id, created_at, updated_at
	`
	err = tx.QueryRow(
		query,
		q.WorkspaceID, q.DealID, q.ContactID, q.QuoteNumber, q.Title, q.Status,
		q.ClientName, q.ClientEmail, q.ClientPhone, q.CompanyName,
		q.Subtotal, q.DiscountPercentage, q.DiscountAmount, q.TaxPercentage, q.TaxAmount, q.GrandTotal,
		q.ValidUntil, q.Notes, q.TermsConditions, q.CreatedByID,
	).Scan(&q.ID, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert quotation: %w", err)
	}

	for i := range q.Items {
		item := &q.Items[i]
		itemQuery := `
			INSERT INTO quotation_items (
				quotation_id, item_name, description, quantity, unit_price, subtotal, order_index
			) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
		`
		err = tx.QueryRow(
			itemQuery,
			q.ID, item.ItemName, item.Description, item.Quantity, item.UnitPrice, item.Subtotal, i,
		).Scan(&item.ID)
		if err != nil {
			return fmt.Errorf("insert quotation item: %w", err)
		}
	}

	return tx.Commit()
}

func (r *PillarRepository) GetQuotationByID(workspaceID, id string) (*domain.Quotation, error) {
	var q domain.Quotation
	query := `
		SELECT q.id, q.workspace_id, q.deal_id, q.contact_id, q.quote_number, q.title, q.status,
		       q.client_name, q.client_email, q.client_phone, q.company_name,
		       q.subtotal, q.discount_percentage, q.discount_amount, q.tax_percentage, q.tax_amount, q.grand_total,
		       TO_CHAR(q.valid_until, 'YYYY-MM-DD') as valid_until, q.notes, q.terms_conditions, q.created_by_id,
		       COALESCE(u.full_name, '') as created_by_name,
		       COALESCE(d.title, '') as deal_title,
		       q.created_at, q.updated_at
		FROM quotations q
		LEFT JOIN users u ON u.id = q.created_by_id
		LEFT JOIN deals d ON d.id = q.deal_id
		WHERE q.workspace_id = $1 AND q.id = $2
	`
	err := r.db.Get(&q, query, workspaceID, id)
	if err != nil {
		return nil, err
	}

	// Fetch items
	var items []domain.QuotationItem
	itemQuery := `
		SELECT id, quotation_id, item_name, description, quantity, unit_price, subtotal, order_index
		FROM quotation_items
		WHERE quotation_id = $1
		ORDER BY order_index ASC
	`
	err = r.db.Select(&items, itemQuery, q.ID)
	if err == nil {
		q.Items = items
	} else {
		q.Items = []domain.QuotationItem{}
	}

	return &q, nil
}

func (r *PillarRepository) ListQuotations(workspaceID string, dealID *string) ([]domain.Quotation, error) {
	query := `
		SELECT q.id, q.workspace_id, q.deal_id, q.contact_id, q.quote_number, q.title, q.status,
		       q.client_name, q.client_email, q.client_phone, q.company_name,
		       q.subtotal, q.discount_percentage, q.discount_amount, q.tax_percentage, q.tax_amount, q.grand_total,
		       TO_CHAR(q.valid_until, 'YYYY-MM-DD') as valid_until, q.notes, q.terms_conditions, q.created_by_id,
		       COALESCE(u.full_name, '') as created_by_name,
		       COALESCE(d.title, '') as deal_title,
		       q.created_at, q.updated_at
		FROM quotations q
		LEFT JOIN users u ON u.id = q.created_by_id
		LEFT JOIN deals d ON d.id = q.deal_id
		WHERE q.workspace_id = $1
	`
	args := []interface{}{workspaceID}
	if dealID != nil && *dealID != "" {
		query += " AND q.deal_id = $2"
		args = append(args, *dealID)
	}
	query += " ORDER BY q.created_at DESC"

	var quotations []domain.Quotation
	err := r.db.Select(&quotations, query, args...)
	if err != nil {
		return nil, err
	}
	return quotations, nil
}

func (r *PillarRepository) UpdateQuotationStatus(workspaceID, id string, status domain.QuotationStatus) error {
	query := `
		UPDATE quotations 
		SET status = $1, updated_at = NOW()
		WHERE workspace_id = $2 AND id = $3
	`
	_, err := r.db.Exec(query, status, workspaceID, id)
	return err
}

func (r *PillarRepository) DeleteQuotation(workspaceID, id string) error {
	_, err := r.db.Exec("DELETE FROM quotations WHERE workspace_id = $1 AND id = $2", workspaceID, id)
	return err
}

// ==========================================
// PILAR 2: WHATSAPP BROADCAST REPOSITORY
// ==========================================

func (r *PillarRepository) CreateCampaign(c *domain.BroadcastCampaign) error {
	targetFilterJSON, err := json.Marshal(c.TargetFilter)
	if err != nil {
		targetFilterJSON = []byte("{}")
	}

	query := `
		INSERT INTO broadcast_campaigns (
			workspace_id, channel_id, created_by_id, name, message_template,
			department, target_filter, status, scheduled_at, total_recipients
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10
		) RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(
		query,
		c.WorkspaceID, c.ChannelID, c.CreatedByID, c.Name, c.MessageTemplate,
		c.Department, targetFilterJSON, c.Status, c.ScheduledAt, c.TotalRecipients,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *PillarRepository) GetCampaignByID(workspaceID, id string) (*domain.BroadcastCampaign, error) {
	var c struct {
		domain.BroadcastCampaign
		TargetFilterRaw []byte `db:"target_filter"`
	}
	query := `
		SELECT b.id, b.workspace_id, b.channel_id, b.created_by_id, b.name, b.message_template,
		       b.department, b.target_filter, b.status, b.scheduled_at, b.total_recipients,
		       b.sent_count, b.failed_count, b.created_at, b.updated_at,
		       COALESCE(c.channel_name, '') as channel_name,
		       COALESCE(u.full_name, '') as created_by_name
		FROM broadcast_campaigns b
		LEFT JOIN workspace_channels c ON c.id = b.channel_id
		LEFT JOIN users u ON u.id = b.created_by_id
		WHERE b.workspace_id = $1 AND b.id = $2
	`
	err := r.db.Get(&c, query, workspaceID, id)
	if err != nil {
		return nil, err
	}

	if len(c.TargetFilterRaw) > 0 {
		_ = json.Unmarshal(c.TargetFilterRaw, &c.TargetFilter)
	}
	return &c.BroadcastCampaign, nil
}

func (r *PillarRepository) ListCampaigns(workspaceID string) ([]domain.BroadcastCampaign, error) {
	query := `
		SELECT b.id, b.workspace_id, b.channel_id, b.created_by_id, b.name, b.message_template,
		       b.department, b.status, b.scheduled_at, b.total_recipients,
		       b.sent_count, b.failed_count, b.created_at, b.updated_at,
		       COALESCE(c.channel_name, '') as channel_name,
		       COALESCE(u.full_name, '') as created_by_name
		FROM broadcast_campaigns b
		LEFT JOIN workspace_channels c ON c.id = b.channel_id
		LEFT JOIN users u ON u.id = b.created_by_id
		WHERE b.workspace_id = $1
		ORDER BY b.created_at DESC
	`
	var campaigns []domain.BroadcastCampaign
	err := r.db.Select(&campaigns, query, workspaceID)
	if err != nil {
		return nil, err
	}
	return campaigns, nil
}

func (r *PillarRepository) UpdateCampaignStatus(id string, status domain.BroadcastStatus, sent, failed int) error {
	query := `
		UPDATE broadcast_campaigns
		SET status = $1, sent_count = $2, failed_count = $3, updated_at = NOW()
		WHERE id = $4
	`
	_, err := r.db.Exec(query, status, sent, failed, id)
	return err
}

func (r *PillarRepository) CreateRecipients(recipients []domain.BroadcastRecipient) error {
	if len(recipients) == 0 {
		return nil
	}
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO broadcast_recipients (
			campaign_id, contact_id, phone_number, recipient_name, interpolated_message, status
		) VALUES ($1, $2, $3, $4, $5, $6)
	`
	for _, rec := range recipients {
		_, err := tx.Exec(query, rec.CampaignID, rec.ContactID, rec.PhoneNumber, rec.RecipientName, rec.InterpolatedMessage, rec.Status)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *PillarRepository) ListRecipients(campaignID string) ([]domain.BroadcastRecipient, error) {
	query := `
		SELECT id, campaign_id, contact_id, phone_number, recipient_name, interpolated_message,
		       status, sent_at, error_message, created_at
		FROM broadcast_recipients
		WHERE campaign_id = $1
		ORDER BY created_at ASC
	`
	var recs []domain.BroadcastRecipient
	err := r.db.Select(&recs, query, campaignID)
	if err != nil {
		return nil, err
	}
	return recs, nil
}

func (r *PillarRepository) UpdateRecipientStatus(id string, status domain.BroadcastRecipientStatus, errorMsg string) error {
	var sentAt *time.Time
	if status == domain.RecipientStatusSent {
		now := time.Now()
		sentAt = &now
	}
	query := `
		UPDATE broadcast_recipients
		SET status = $1, error_message = $2, sent_at = $3
		WHERE id = $4
	`
	_, err := r.db.Exec(query, status, errorMsg, sentAt, id)
	return err
}

// ==========================================
// PILAR 1: WORKSPACE AUTOMATIONS REPOSITORY
// ==========================================

func (r *PillarRepository) GetAutomation(workspaceID, automationType string) (*domain.WorkspaceAutomation, error) {
	var a struct {
		domain.WorkspaceAutomation
		ConfigRaw []byte `db:"config"`
	}
	query := `
		SELECT id, workspace_id, automation_type, is_enabled, config, created_at, updated_at
		FROM workspace_automations
		WHERE workspace_id = $1 AND automation_type = $2
	`
	err := r.db.Get(&a, query, workspaceID, automationType)
	if err != nil {
		if err == sql.ErrNoRows {
			// Return default enabled automation
			return &domain.WorkspaceAutomation{
				WorkspaceID:    workspaceID,
				AutomationType: automationType,
				IsEnabled:      true,
				Config:         map[string]any{},
			}, nil
		}
		return nil, err
	}
	if len(a.ConfigRaw) > 0 {
		_ = json.Unmarshal(a.ConfigRaw, &a.Config)
	}
	return &a.WorkspaceAutomation, nil
}

func (r *PillarRepository) ListAutomations(workspaceID string) ([]domain.WorkspaceAutomation, error) {
	query := `
		SELECT id, workspace_id, automation_type, is_enabled, config, created_at, updated_at
		FROM workspace_automations
		WHERE workspace_id = $1
		ORDER BY created_at ASC
	`
	var rows []struct {
		domain.WorkspaceAutomation
		ConfigRaw []byte `db:"config"`
	}
	err := r.db.Select(&rows, query, workspaceID)
	if err != nil {
		return nil, err
	}

	results := make([]domain.WorkspaceAutomation, len(rows))
	for i, row := range rows {
		results[i] = row.WorkspaceAutomation
		if len(row.ConfigRaw) > 0 {
			_ = json.Unmarshal(row.ConfigRaw, &results[i].Config)
		}
	}
	return results, nil
}

func (r *PillarRepository) UpsertAutomation(a *domain.WorkspaceAutomation) error {
	configJSON, err := json.Marshal(a.Config)
	if err != nil {
		configJSON = []byte("{}")
	}

	query := `
		INSERT INTO workspace_automations (workspace_id, automation_type, is_enabled, config, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (workspace_id, automation_type)
		DO UPDATE SET is_enabled = EXCLUDED.is_enabled, config = EXCLUDED.config, updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(query, a.WorkspaceID, a.AutomationType, a.IsEnabled, configJSON).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
}

// ==========================================
// PILAR 4: TICKET SLA ESCALATION
// ==========================================

func (r *PillarRepository) GetBreachedTickets(workspaceID string) ([]domain.Ticket, error) {
	query := `
		SELECT id, workspace_id, ticket_number, subject, priority, status, department,
		       sla_due_at, frt_due_at, is_sla_breached, created_at
		FROM tickets
		WHERE workspace_id = $1 
		  AND status IN ('open', 'in_progress')
		  AND is_sla_breached = false
		  AND (
		      (sla_due_at IS NOT NULL AND sla_due_at < NOW())
		      OR (frt_due_at IS NOT NULL AND first_responded_at IS NULL AND frt_due_at < NOW())
		  )
	`
	var tickets []domain.Ticket
	err := r.db.Select(&tickets, query, workspaceID)
	if err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *PillarRepository) MarkTicketSLABreached(ticketID string) error {
	query := `
		UPDATE tickets
		SET is_sla_breached = true,
		    priority = 'urgent',
		    status = CASE WHEN status = 'open' THEN 'escalated' ELSE status END,
		    updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(query, ticketID)
	return err
}

func (r *PillarRepository) RecordTicketFirstResponse(ticketID string) error {
	query := `
		UPDATE tickets
		SET first_responded_at = COALESCE(first_responded_at, NOW()),
		    updated_at = NOW()
		WHERE id = $1 AND first_responded_at IS NULL
	`
	_, err := r.db.Exec(query, ticketID)
	return err
}

// ==========================================
// PILAR 5: AI COPILOT & CONVERSATION SENTIMENT
// ==========================================

func (r *PillarRepository) UpdateConversationSentiment(conversationID, sentiment, aiSummary string) error {
	query := `
		UPDATE conversations
		SET sentiment = $1,
		    ai_summary = CASE WHEN $2 <> '' THEN $2 ELSE ai_summary END,
		    updated_at = NOW()
		WHERE id = $3
	`
	_, err := r.db.Exec(query, sentiment, aiSummary, conversationID)
	return err
}

func (r *PillarRepository) LinkDealHandoverTicket(dealID, ticketID string) error {
	query := `UPDATE deals SET handover_ticket_id = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, ticketID, dealID)
	return err
}
