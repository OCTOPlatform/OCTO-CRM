package domain

import (
	"time"
)

// --- Pilar 3: CPQ Quotation ---
type QuotationStatus string

const (
	QuotationStatusDraft    QuotationStatus = "draft"
	QuotationStatusSent     QuotationStatus = "sent"
	QuotationStatusAccepted QuotationStatus = "accepted"
	QuotationStatusRejected QuotationStatus = "rejected"
	QuotationStatusExpired  QuotationStatus = "expired"
)

type QuotationItem struct {
	ID          string  `json:"id" db:"id"`
	QuotationID string  `json:"quotation_id" db:"quotation_id"`
	ItemName    string  `json:"item_name" db:"item_name"`
	Description string  `json:"description" db:"description"`
	Quantity    float64 `json:"quantity" db:"quantity"`
	UnitPrice   float64 `json:"unit_price" db:"unit_price"`
	Subtotal    float64 `json:"subtotal" db:"subtotal"`
	OrderIndex  int     `json:"order_index" db:"order_index"`
}

type Quotation struct {
	ID                 string          `json:"id" db:"id"`
	WorkspaceID        string          `json:"workspace_id" db:"workspace_id"`
	DealID             *string         `json:"deal_id,omitempty" db:"deal_id"`
	DealTitle          string          `json:"deal_title,omitempty" db:"deal_title"`
	ContactID          *string         `json:"contact_id,omitempty" db:"contact_id"`
	QuoteNumber        string          `json:"quote_number" db:"quote_number"`
	Title              string          `json:"title" db:"title"`
	Status             QuotationStatus `json:"status" db:"status"`
	ClientName         string          `json:"client_name" db:"client_name"`
	ClientEmail        string          `json:"client_email" db:"client_email"`
	ClientPhone        string          `json:"client_phone" db:"client_phone"`
	CompanyName        string          `json:"company_name" db:"company_name"`
	Subtotal           float64         `json:"subtotal" db:"subtotal"`
	DiscountPercentage float64         `json:"discount_percentage" db:"discount_percentage"`
	DiscountAmount     float64         `json:"discount_amount" db:"discount_amount"`
	TaxPercentage      float64         `json:"tax_percentage" db:"tax_percentage"`
	TaxAmount          float64         `json:"tax_amount" db:"tax_amount"`
	GrandTotal         float64         `json:"grand_total" db:"grand_total"`
	ValidUntil         *string         `json:"valid_until,omitempty" db:"valid_until"`
	Notes              string          `json:"notes" db:"notes"`
	TermsConditions    string          `json:"terms_conditions" db:"terms_conditions"`
	CreatedByID        *string         `json:"created_by_id,omitempty" db:"created_by_id"`
	CreatedByName      string          `json:"created_by_name,omitempty" db:"created_by_name"`
	Items              []QuotationItem `json:"items,omitempty"`
	CreatedAt          time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at" db:"updated_at"`
}

type CreateQuotationRequest struct {
	DealID             *string         `json:"deal_id"`
	ContactID          *string         `json:"contact_id"`
	Title              string          `json:"title" binding:"required"`
	ClientName         string          `json:"client_name" binding:"required"`
	ClientEmail        string          `json:"client_email"`
	ClientPhone        string          `json:"client_phone"`
	CompanyName        string          `json:"company_name"`
	DiscountPercentage float64         `json:"discount_percentage"`
	TaxPercentage      float64         `json:"tax_percentage"`
	ValidUntil         *string         `json:"valid_until"`
	Notes              string          `json:"notes"`
	TermsConditions    string          `json:"terms_conditions"`
	Items              []QuotationItem `json:"items" binding:"required,min=1"`
}

// --- Pilar 2: WhatsApp Broadcast Engine ---
type BroadcastStatus string

const (
	BroadcastStatusDraft     BroadcastStatus = "draft"
	BroadcastStatusScheduled BroadcastStatus = "scheduled"
	BroadcastStatusSending   BroadcastStatus = "sending"
	BroadcastStatusCompleted BroadcastStatus = "completed"
	BroadcastStatusFailed    BroadcastStatus = "failed"
)

type BroadcastRecipientStatus string

const (
	RecipientStatusPending BroadcastRecipientStatus = "pending"
	RecipientStatusSent    BroadcastRecipientStatus = "sent"
	RecipientStatusFailed  BroadcastRecipientStatus = "failed"
)

type BroadcastCampaign struct {
	ID              string          `json:"id" db:"id"`
	WorkspaceID     string          `json:"workspace_id" db:"workspace_id"`
	ChannelID       *string         `json:"channel_id,omitempty" db:"channel_id"`
	ChannelName     string          `json:"channel_name,omitempty" db:"channel_name"`
	CreatedByID     *string         `json:"created_by_id,omitempty" db:"created_by_id"`
	CreatedByName   string          `json:"created_by_name,omitempty" db:"created_by_name"`
	Name            string          `json:"name" db:"name"`
	MessageTemplate string          `json:"message_template" db:"message_template"`
	Department      string          `json:"department" db:"department"`
	TargetFilter    map[string]any  `json:"target_filter" db:"target_filter"`
	Status          BroadcastStatus `json:"status" db:"status"`
	ScheduledAt     *time.Time      `json:"scheduled_at,omitempty" db:"scheduled_at"`
	TotalRecipients int             `json:"total_recipients" db:"total_recipients"`
	SentCount       int             `json:"sent_count" db:"sent_count"`
	FailedCount     int             `json:"failed_count" db:"failed_count"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
}

type BroadcastRecipient struct {
	ID                  string                   `json:"id" db:"id"`
	CampaignID          string                   `json:"campaign_id" db:"campaign_id"`
	ContactID           *string                  `json:"contact_id,omitempty" db:"contact_id"`
	PhoneNumber         string                   `json:"phone_number" db:"phone_number"`
	RecipientName       string                   `json:"recipient_name" db:"recipient_name"`
	InterpolatedMessage string                   `json:"interpolated_message" db:"interpolated_message"`
	Status              BroadcastRecipientStatus `json:"status" db:"status"`
	SentAt              *time.Time               `json:"sent_at,omitempty" db:"sent_at"`
	ErrorMessage        string                   `json:"error_message" db:"error_message"`
	CreatedAt           time.Time                `json:"created_at" db:"created_at"`
}

type CreateBroadcastCampaignRequest struct {
	Name            string         `json:"name" binding:"required"`
	ChannelID       *string        `json:"channel_id"`
	Department      string         `json:"department"`
	MessageTemplate string         `json:"message_template" binding:"required"`
	TargetFilter    map[string]any `json:"target_filter"`
	ContactIDs      []string       `json:"contact_ids"`
	SendNow         bool           `json:"send_now"`
}

// --- Pilar 1: Workflow Automations ---
type WorkspaceAutomation struct {
	ID             string         `json:"id" db:"id"`
	WorkspaceID    string         `json:"workspace_id" db:"workspace_id"`
	AutomationType string         `json:"automation_type" db:"automation_type"`
	IsEnabled      bool           `json:"is_enabled" db:"is_enabled"`
	Config         map[string]any `json:"config" db:"config"`
	CreatedAt      time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at" db:"updated_at"`
}

type UpdateAutomationRequest struct {
	AutomationType string         `json:"automation_type" binding:"required"`
	IsEnabled      bool           `json:"is_enabled"`
	Config         map[string]any `json:"config"`
}

// --- Pilar 5: AI Copilot ---
type AISummarizeRequest struct {
	ConversationID string `json:"conversation_id" binding:"required"`
}

type AISummarizeResponse struct {
	ConversationID string   `json:"conversation_id"`
	Summary        string   `json:"summary"`
	KeyPoints      []string `json:"key_points"`
	Sentiment      string   `json:"sentiment"`      // 'positive', 'neutral', 'negative', 'critical'
	SentimentScore float64  `json:"sentiment_score"` // 0.0 to 1.0
	NextAction     string   `json:"next_action"`
}

type AISuggestionRequest struct {
	ConversationID string `json:"conversation_id" binding:"required"`
	Context        string `json:"context,omitempty"`
}

type AISmartReplyOption struct {
	Title   string `json:"title"`
	Tone    string `json:"tone"` // 'professional', 'empathetic', 'closing', 'technical'
	Content string `json:"content"`
}

type AISuggestionResponse struct {
	ConversationID string               `json:"conversation_id"`
	Suggestions    []AISmartReplyOption `json:"suggestions"`
	DetectedIntent string               `json:"detected_intent"`
}
