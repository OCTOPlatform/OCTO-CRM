package domain

import "time"

// Invoices & Quotations
type Invoice struct {
	ID               string        `json:"id" db:"id"`
	WorkspaceID      string        `json:"workspace_id" db:"workspace_id"`
	DealID           *string       `json:"deal_id" db:"deal_id"`
	ContactID        *string       `json:"contact_id" db:"contact_id"`
	CompanyID        *string       `json:"company_id" db:"company_id"`
	InvoiceNumber    string        `json:"invoice_number" db:"invoice_number"`
	IssueDate        string        `json:"issue_date" db:"issue_date"`
	DueDate          string        `json:"due_date" db:"due_date"`
	Type             string        `json:"type" db:"type"`     // 'quotation', 'invoice'
	Status           string        `json:"status" db:"status"` // 'draft', 'sent', 'paid', 'overdue', 'cancelled'
	Subtotal         float64       `json:"subtotal" db:"subtotal"`
	TaxAmount        float64       `json:"tax_amount" db:"tax_amount"`
	DiscountAmount   float64       `json:"discount_amount" db:"discount_amount"`
	TotalAmount      float64       `json:"total_amount" db:"total_amount"`
	Notes            string        `json:"notes" db:"notes"`
	Terms            string        `json:"terms" db:"terms"`
	PaymentMethod    string        `json:"payment_method" db:"payment_method"`
	PaymentReference string        `json:"payment_reference" db:"payment_reference"`
	PaidAt           *time.Time    `json:"paid_at" db:"paid_at"`
	CreatedAt        time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at" db:"updated_at"`
	Items            []InvoiceItem `json:"items,omitempty"`
	ContactName      string        `json:"contact_name,omitempty" db:"contact_name"`
	ContactPhone     string        `json:"contact_phone,omitempty" db:"contact_phone"`
	CompanyName      string        `json:"company_name,omitempty" db:"company_name"`
	DealTitle        string        `json:"deal_title,omitempty" db:"deal_title"`
}

type InvoiceItem struct {
	ID         string    `json:"id" db:"id"`
	InvoiceID  string    `json:"invoice_id" db:"invoice_id"`
	ProductID  *string   `json:"product_id" db:"product_id"`
	ItemName   string    `json:"item_name" db:"item_name"`
	SKU        string    `json:"sku" db:"sku"`
	Quantity   float64   `json:"quantity" db:"quantity"`
	UnitPrice  float64   `json:"unit_price" db:"unit_price"`
	Discount   float64   `json:"discount" db:"discount"`
	TotalPrice float64   `json:"total_price" db:"total_price"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type CreateInvoiceRequest struct {
	DealID           *string                    `json:"deal_id"`
	ContactID        *string                    `json:"contact_id"`
	CompanyID        *string                    `json:"company_id"`
	InvoiceNumber    string                     `json:"invoice_number"`
	IssueDate        string                     `json:"issue_date"`
	DueDate          string                     `json:"due_date"`
	Type             string                     `json:"type"` // 'quotation' or 'invoice'
	Notes            string                     `json:"notes"`
	Terms            string                     `json:"terms"`
	PaymentMethod    string                     `json:"payment_method"`
	DiscountAmount   float64                    `json:"discount_amount"`
	TaxAmount        float64                    `json:"tax_amount"`
	Items            []CreateInvoiceItemRequest `json:"items"`
}

type CreateInvoiceItemRequest struct {
	ProductID  *string `json:"product_id"`
	ItemName   string  `json:"item_name"`
	SKU        string  `json:"sku"`
	Quantity   float64 `json:"quantity"`
	UnitPrice  float64 `json:"unit_price"`
	Discount   float64 `json:"discount"`
	TotalPrice float64 `json:"total_price"`
}

type PayInvoiceRequest struct {
	PaymentMethod    string `json:"payment_method"`
	PaymentReference string `json:"payment_reference"`
	AutoDeductStock  bool   `json:"auto_deduct_stock"`
	AutoCloseDeal    bool   `json:"auto_close_deal"`
}

// Automation Workflows & Logs
type AutomationWorkflow struct {
	ID                string                 `json:"id" db:"id"`
	WorkspaceID       string                 `json:"workspace_id" db:"workspace_id"`
	Name              string                 `json:"name" db:"name"`
	Description       string                 `json:"description" db:"description"`
	TriggerType       string                 `json:"trigger_type" db:"trigger_type"` // 'lead_inactive_24h', 'deal_stage_changed', 'invoice_paid', 'scheduled_timer'
	TriggerConfig     map[string]interface{} `json:"trigger_config" db:"-"`
	TriggerConfigRaw  []byte                 `json:"-" db:"trigger_config"`
	ActionType        string                 `json:"action_type" db:"action_type"` // 'send_whatsapp', 'create_task', 'change_deal_stage'
	ActionConfig      map[string]interface{} `json:"action_config" db:"-"`
	ActionConfigRaw   []byte                 `json:"-" db:"action_config"`
	IsActive          bool                   `json:"is_active" db:"is_active"`
	ExecutionCount    int                    `json:"execution_count" db:"execution_count"`
	LastTriggeredAt   *time.Time             `json:"last_triggered_at" db:"last_triggered_at"`
	CreatedAt         time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at" db:"updated_at"`
}

type AutomationLog struct {
	ID            string    `json:"id" db:"id"`
	WorkflowID    string    `json:"workflow_id" db:"workflow_id"`
	WorkspaceID   string    `json:"workspace_id" db:"workspace_id"`
	WorkflowName  string    `json:"workflow_name,omitempty" db:"workflow_name"`
	TargetType    string    `json:"target_type" db:"target_type"` // 'lead', 'deal', 'contact', 'invoice'
	TargetID      string    `json:"target_id" db:"target_id"`
	TargetName    string    `json:"target_name" db:"target_name"`
	Status        string    `json:"status" db:"status"` // 'success', 'failed'
	ActionDetails string    `json:"action_details" db:"action_details"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type CreateWorkflowRequest struct {
	Name          string                 `json:"name" binding:"required"`
	Description   string                 `json:"description"`
	TriggerType   string                 `json:"trigger_type" binding:"required"`
	TriggerConfig map[string]interface{} `json:"trigger_config"`
	ActionType    string                 `json:"action_type" binding:"required"`
	ActionConfig  map[string]interface{} `json:"action_config"`
	IsActive      bool                   `json:"is_active"`
}

type TriggerWorkflowRequest struct {
	TargetType string `json:"target_type"`
	TargetID   string `json:"target_id"`
	TargetName string `json:"target_name"`
}
