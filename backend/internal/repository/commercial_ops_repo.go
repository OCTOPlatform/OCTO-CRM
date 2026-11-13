package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/jmoiron/sqlx"
)

type CommercialOpsRepository struct {
	db *sqlx.DB
}

func NewCommercialOpsRepository(db *sqlx.DB) *CommercialOpsRepository {
	return &CommercialOpsRepository{db: db}
}

// -----------------------------------------------------------------------------
// Invoices & Quotations
// -----------------------------------------------------------------------------

func (r *CommercialOpsRepository) ListInvoices(workspaceID, invType, status string) ([]domain.Invoice, error) {
	query := `
		SELECT 
			i.id, i.workspace_id, i.deal_id, i.contact_id, i.company_id, i.invoice_number,
			i.issue_date::text AS issue_date, i.due_date::text AS due_date, i.type, i.status,
			i.subtotal, i.tax_amount, i.discount_amount, i.total_amount, i.notes, i.terms,
			i.payment_method, i.payment_reference, i.paid_at, i.created_at, i.updated_at,
			COALESCE(c.first_name || ' ' || c.last_name, '') AS contact_name,
			COALESCE(c.phone, '') AS contact_phone,
			COALESCE(comp.name, '') AS company_name,
			COALESCE(d.title, '') AS deal_title
		FROM invoices i
		LEFT JOIN contacts c ON i.contact_id = c.id
		LEFT JOIN companies comp ON i.company_id = comp.id
		LEFT JOIN deals d ON i.deal_id = d.id
		WHERE i.workspace_id = $1
	`
	args := []interface{}{workspaceID}

	if invType != "" && invType != "all" {
		args = append(args, invType)
		query += fmt.Sprintf(" AND i.type = $%d", len(args))
	}
	if status != "" && status != "all" {
		args = append(args, status)
		query += fmt.Sprintf(" AND i.status = $%d", len(args))
	}
	query += " ORDER BY i.created_at DESC"

	var invoices []domain.Invoice
	err := r.db.Select(&invoices, query, args...)
	if invoices == nil {
		invoices = []domain.Invoice{}
	}
	return invoices, err
}

func (r *CommercialOpsRepository) GetInvoiceByID(workspaceID, id string) (*domain.Invoice, error) {
	var inv domain.Invoice
	query := `
		SELECT 
			i.id, i.workspace_id, i.deal_id, i.contact_id, i.company_id, i.invoice_number,
			i.issue_date::text AS issue_date, i.due_date::text AS due_date, i.type, i.status,
			i.subtotal, i.tax_amount, i.discount_amount, i.total_amount, i.notes, i.terms,
			i.payment_method, i.payment_reference, i.paid_at, i.created_at, i.updated_at,
			COALESCE(c.first_name || ' ' || c.last_name, '') AS contact_name,
			COALESCE(c.phone, '') AS contact_phone,
			COALESCE(comp.name, '') AS company_name,
			COALESCE(d.title, '') AS deal_title
		FROM invoices i
		LEFT JOIN contacts c ON i.contact_id = c.id
		LEFT JOIN companies comp ON i.company_id = comp.id
		LEFT JOIN deals d ON i.deal_id = d.id
		WHERE i.workspace_id = $1 AND i.id = $2
	`
	err := r.db.Get(&inv, query, workspaceID, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Fetch items
	items, err := r.GetInvoiceItems(inv.ID)
	if err == nil {
		inv.Items = items
	}

	return &inv, nil
}

func (r *CommercialOpsRepository) GetInvoiceItems(invoiceID string) ([]domain.InvoiceItem, error) {
	var items []domain.InvoiceItem
	query := `
		SELECT id, invoice_id, product_id, item_name, sku, quantity, unit_price, discount, total_price, created_at
		FROM invoice_items
		WHERE invoice_id = $1
		ORDER BY created_at ASC
	`
	err := r.db.Select(&items, query, invoiceID)
	if items == nil {
		items = []domain.InvoiceItem{}
	}
	return items, err
}

func (r *CommercialOpsRepository) CreateInvoice(inv domain.Invoice, items []domain.InvoiceItem) (*domain.Invoice, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	queryInv := `
		INSERT INTO invoices (
			workspace_id, deal_id, contact_id, company_id, invoice_number,
			issue_date, due_date, type, status, subtotal, tax_amount, discount_amount, total_amount,
			notes, terms, payment_method, payment_reference
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		) RETURNING id, created_at, updated_at
	`
	err = tx.QueryRow(queryInv,
		inv.WorkspaceID, inv.DealID, inv.ContactID, inv.CompanyID, inv.InvoiceNumber,
		inv.IssueDate, inv.DueDate, inv.Type, inv.Status, inv.Subtotal, inv.TaxAmount, inv.DiscountAmount, inv.TotalAmount,
		inv.Notes, inv.Terms, inv.PaymentMethod, inv.PaymentReference,
	).Scan(&inv.ID, &inv.CreatedAt, &inv.UpdatedAt)
	if err != nil {
		return nil, err
	}

	queryItem := `
		INSERT INTO invoice_items (
			invoice_id, product_id, item_name, sku, quantity, unit_price, discount, total_price
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		) RETURNING id, created_at
	`
	var createdItems []domain.InvoiceItem
	for _, it := range items {
		it.InvoiceID = inv.ID
		err = tx.QueryRow(queryItem,
			it.InvoiceID, it.ProductID, it.ItemName, it.SKU, it.Quantity, it.UnitPrice, it.Discount, it.TotalPrice,
		).Scan(&it.ID, &it.CreatedAt)
		if err != nil {
			return nil, err
		}
		createdItems = append(createdItems, it)
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	inv.Items = createdItems
	return &inv, nil
}

func (r *CommercialOpsRepository) UpdateInvoiceStatus(workspaceID, id, status, paymentMethod, paymentRef string, paidAt *time.Time) error {
	query := `
		UPDATE invoices
		SET status = $1, payment_method = COALESCE(NULLIF($2, ''), payment_method),
		    payment_reference = COALESCE(NULLIF($3, ''), payment_reference),
		    paid_at = $4, updated_at = NOW()
		WHERE workspace_id = $5 AND id = $6
	`
	_, err := r.db.Exec(query, status, paymentMethod, paymentRef, paidAt, workspaceID, id)
	return err
}

func (r *CommercialOpsRepository) MarkDealAsWon(workspaceID, dealID string) error {
	query := `UPDATE deals SET status = 'won', updated_at = NOW() WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, dealID)
	return err
}

func (r *CommercialOpsRepository) DeductProductStock(workspaceID, productID string, quantity float64, invoiceNumber string) error {
	// Deduct stock in products table
	queryProd := `
		UPDATE products
		SET stock_quantity = GREATEST(0, stock_quantity - $1), updated_at = NOW()
		WHERE workspace_id = $2 AND id = $3
	`
	_, err := r.db.Exec(queryProd, int(quantity), workspaceID, productID)
	if err != nil {
		return err
	}

	// Insert stock movement record
	queryMov := `
		INSERT INTO product_stock_movements (
			workspace_id, product_id, movement_type, quantity, reference_type, notes
		) VALUES (
			$1, $2, 'out', $3, 'invoice', $4
		)
	`
	notes := fmt.Sprintf("Pengurangan stok otomatis pelunasan invoice %s", invoiceNumber)
	_, err = r.db.Exec(queryMov, workspaceID, productID, int(quantity), notes)
	return err
}

// -----------------------------------------------------------------------------
// Automation Workflows & Logs
// -----------------------------------------------------------------------------

func (r *CommercialOpsRepository) ListWorkflows(workspaceID string) ([]domain.AutomationWorkflow, error) {
	query := `
		SELECT 
			id, workspace_id, name, description, trigger_type, trigger_config,
			action_type, action_config, is_active, execution_count, last_triggered_at,
			created_at, updated_at
		FROM automation_workflows
		WHERE workspace_id = $1
		ORDER BY created_at DESC
	`
	var workflows []domain.AutomationWorkflow
	err := r.db.Select(&workflows, query, workspaceID)
	if workflows == nil {
		workflows = []domain.AutomationWorkflow{}
	}

	for i := range workflows {
		if len(workflows[i].TriggerConfigRaw) > 0 {
			_ = json.Unmarshal(workflows[i].TriggerConfigRaw, &workflows[i].TriggerConfig)
		}
		if len(workflows[i].ActionConfigRaw) > 0 {
			_ = json.Unmarshal(workflows[i].ActionConfigRaw, &workflows[i].ActionConfig)
		}
	}

	return workflows, err
}

func (r *CommercialOpsRepository) GetWorkflowByID(workspaceID, id string) (*domain.AutomationWorkflow, error) {
	var wf domain.AutomationWorkflow
	query := `
		SELECT 
			id, workspace_id, name, description, trigger_type, trigger_config,
			action_type, action_config, is_active, execution_count, last_triggered_at,
			created_at, updated_at
		FROM automation_workflows
		WHERE workspace_id = $1 AND id = $2
	`
	err := r.db.Get(&wf, query, workspaceID, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if len(wf.TriggerConfigRaw) > 0 {
		_ = json.Unmarshal(wf.TriggerConfigRaw, &wf.TriggerConfig)
	}
	if len(wf.ActionConfigRaw) > 0 {
		_ = json.Unmarshal(wf.ActionConfigRaw, &wf.ActionConfig)
	}

	return &wf, nil
}

func (r *CommercialOpsRepository) CreateWorkflow(wf domain.AutomationWorkflow) (*domain.AutomationWorkflow, error) {
	triggerJSON, _ := json.Marshal(wf.TriggerConfig)
	actionJSON, _ := json.Marshal(wf.ActionConfig)

	query := `
		INSERT INTO automation_workflows (
			workspace_id, name, description, trigger_type, trigger_config, action_type, action_config, is_active
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		) RETURNING id, execution_count, created_at, updated_at
	`
	err := r.db.QueryRow(query,
		wf.WorkspaceID, wf.Name, wf.Description, wf.TriggerType, triggerJSON, wf.ActionType, actionJSON, wf.IsActive,
	).Scan(&wf.ID, &wf.ExecutionCount, &wf.CreatedAt, &wf.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &wf, nil
}

func (r *CommercialOpsRepository) UpdateWorkflow(wf domain.AutomationWorkflow) error {
	triggerJSON, _ := json.Marshal(wf.TriggerConfig)
	actionJSON, _ := json.Marshal(wf.ActionConfig)

	query := `
		UPDATE automation_workflows
		SET name = $1, description = $2, trigger_type = $3, trigger_config = $4,
		    action_type = $5, action_config = $6, is_active = $7, updated_at = NOW()
		WHERE workspace_id = $8 AND id = $9
	`
	_, err := r.db.Exec(query,
		wf.Name, wf.Description, wf.TriggerType, triggerJSON, wf.ActionType, actionJSON, wf.IsActive, wf.WorkspaceID, wf.ID,
	)
	return err
}

func (r *CommercialOpsRepository) DeleteWorkflow(workspaceID, id string) error {
	_, err := r.db.Exec("DELETE FROM automation_workflows WHERE workspace_id = $1 AND id = $2", workspaceID, id)
	return err
}

func (r *CommercialOpsRepository) IncrementWorkflowExecution(id string) error {
	query := `UPDATE automation_workflows SET execution_count = execution_count + 1, last_triggered_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *CommercialOpsRepository) RecordAutomationLog(log domain.AutomationLog) error {
	query := `
		INSERT INTO automation_logs (
			workflow_id, workspace_id, target_type, target_id, target_name, status, action_details
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)
	`
	_, err := r.db.Exec(query,
		log.WorkflowID, log.WorkspaceID, log.TargetType, log.TargetID, log.TargetName, log.Status, log.ActionDetails,
	)
	return err
}

func (r *CommercialOpsRepository) ListAutomationLogs(workspaceID string, limit int) ([]domain.AutomationLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	query := `
		SELECT 
			l.id, l.workflow_id, l.workspace_id, l.target_type, l.target_id, l.target_name,
			l.status, l.action_details, l.created_at,
			COALESCE(w.name, 'Workflow Dihapus') AS workflow_name
		FROM automation_logs l
		LEFT JOIN automation_workflows w ON l.workflow_id = w.id
		WHERE l.workspace_id = $1
		ORDER BY l.created_at DESC
		LIMIT $2
	`
	var logs []domain.AutomationLog
	err := r.db.Select(&logs, query, workspaceID, limit)
	if logs == nil {
		logs = []domain.AutomationLog{}
	}
	return logs, err
}
