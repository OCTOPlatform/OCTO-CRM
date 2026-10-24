package domain

import (
	"encoding/json"
	"time"
)

type ConversationChannel string

const (
	ChannelWhatsApp ConversationChannel = "whatsapp"
	ChannelEmail    ConversationChannel = "email"
	ChannelWebChat  ConversationChannel = "webchat"
)

type ConversationStatus string

const (
	ConversationStatusOpen    ConversationStatus = "open"
	ConversationStatusPending ConversationStatus = "pending"
	ConversationStatusClosed  ConversationStatus = "closed"
)

type Conversation struct {
	ID                 string             `json:"id" db:"id"`
	WorkspaceID        string             `json:"workspace_id" db:"workspace_id"`
	ContactID          *string            `json:"contact_id" db:"contact_id"`
	ContactName        *string            `json:"contact_name,omitempty" db:"contact_name"`
	ContactEmail       *string            `json:"contact_email,omitempty" db:"contact_email"`
	ContactPhone       *string            `json:"contact_phone,omitempty" db:"contact_phone"`
	CompanyName        *string            `json:"company_name,omitempty" db:"company_name"`
	Channel            ConversationChannel `json:"channel" db:"channel"`
	ChannelIdentifier  string             `json:"channel_identifier" db:"channel_identifier"`
	ChannelID          *string            `json:"channel_id,omitempty" db:"channel_id"`
	Department         string             `json:"department" db:"department"` // 'sales', 'support'
	Subject            string             `json:"subject" db:"subject"`
	Status             ConversationStatus `json:"status" db:"status"`
	AssignedToID       *string            `json:"assigned_to_id" db:"assigned_to_id"`
	AssignedToName     *string            `json:"assigned_to_name,omitempty" db:"assigned_to_name"`
	Sentiment          string             `json:"sentiment" db:"sentiment"`
	AISummary          string             `json:"ai_summary" db:"ai_summary"`
	Priority           string             `json:"priority" db:"priority"` // 'low', 'medium', 'high', 'urgent'
	IsSLABreached      bool               `json:"is_sla_breached" db:"is_sla_breached"`
	FRTDueAt           *time.Time         `json:"frt_due_at,omitempty" db:"frt_due_at"`
	FirstRespondedAt   *time.Time         `json:"first_responded_at,omitempty" db:"first_responded_at"`
	SLADueAt           *time.Time         `json:"sla_due_at,omitempty" db:"sla_due_at"`
	EscalatedToID      *string            `json:"escalated_to_id,omitempty" db:"escalated_to_id"`
	EscalatedToName    *string            `json:"escalated_to_name,omitempty" db:"escalated_to_name"`
	EscalatedByID      *string            `json:"escalated_by_id,omitempty" db:"escalated_by_id"`
	EscalatedByName    *string            `json:"escalated_by_name,omitempty" db:"escalated_by_name"`
	EscalationReason   string             `json:"escalation_reason" db:"escalation_reason"`
	EscalatedAt        *time.Time         `json:"escalated_at,omitempty" db:"escalated_at"`
	BotActive          bool               `json:"bot_active" db:"bot_active"`
	BotHandoffReason   string             `json:"bot_handoff_reason" db:"bot_handoff_reason"`
	UnreadCount        int                `json:"unread_count" db:"unread_count"`
	LastMessageContent *string            `json:"last_message_content,omitempty" db:"last_message_content"`
	LastMessageAt      time.Time          `json:"last_message_at" db:"last_message_at"`
	CreatedAt          time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at" db:"updated_at"`
}

type Message struct {
	ID             string              `json:"id" db:"id"`
	ConversationID string              `json:"conversation_id" db:"conversation_id"`
	SenderType     string              `json:"sender_type" db:"sender_type"` // 'customer' or 'agent'
	SenderID       *string             `json:"sender_id" db:"sender_id"`
	SenderName     string              `json:"sender_name" db:"sender_name"`
	Content        string              `json:"content" db:"content"`
	Channel        ConversationChannel `json:"channel" db:"channel"`
	Status         string              `json:"status" db:"status"` // 'sent', 'delivered', 'read'
	Metadata       json.RawMessage     `json:"metadata" db:"metadata"`
	CreatedAt      time.Time           `json:"created_at" db:"created_at"`
}

type ConversationFilter struct {
	Channel        string `form:"channel"`
	ChannelID      string `form:"channel_id"`
	Department     string `form:"department"`
	Status         string `form:"status"`
	AssignedToID   string `form:"assigned_to_id"`
	Priority       string `form:"priority"`
	OnlyBreached   bool   `form:"only_breached"`
	OnlyEscalated  bool   `form:"only_escalated"`
	OnlyUnassigned bool   `form:"only_unassigned"`
	Query          string `form:"query"`
}

type AgentWorkload struct {
	UserID         string  `json:"user_id" db:"user_id"`
	FullName       string  `json:"full_name" db:"full_name"`
	Email          string  `json:"email" db:"email"`
	Role           string  `json:"role" db:"role"`
	Department     string  `json:"department" db:"department"`
	ActiveChats    int     `json:"active_chats" db:"active_chats"`
	PendingChats   int     `json:"pending_chats" db:"pending_chats"`
	ResolvedChats  int     `json:"resolved_chats" db:"resolved_chats"`
	AvgResponseMin float64 `json:"avg_response_min" db:"avg_response_min"`
	SLABreached    int     `json:"sla_breached" db:"sla_breached"`
}

type MonitoringStatsResponse struct {
	TotalConversations      int             `json:"total_conversations"`
	OpenConversations       int             `json:"open_conversations"`
	PendingConversations    int             `json:"pending_conversations"`
	ResolvedConversations   int             `json:"resolved_conversations"`
	UnassignedCount         int             `json:"unassigned_count"`
	SLABreachedCount        int             `json:"sla_breached_count"`
	ComplaintsCount         int             `json:"complaints_count"`
	EscalatedCount          int             `json:"escalated_count"`
	AvgFirstResponseMinutes float64         `json:"avg_first_response_minutes"`
	SLAComplianceRate       float64         `json:"sla_compliance_rate"`
	AgentWorkloads          []AgentWorkload `json:"agent_workloads"`
}

type TakeoverConversationRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type EscalateConversationRequest struct {
	EscalateToID string `json:"escalate_to_id" binding:"required"`
	Reason       string `json:"reason" binding:"required"`
	Priority     string `json:"priority"` // 'high' or 'urgent'
}

type LogConversationAccessRequest struct {
	Reason  string `json:"reason" binding:"required"`
	Purpose string `json:"purpose"`
}

type SendReplyRequest struct {
	Content        string              `json:"content"`
	Channel        ConversationChannel `json:"channel"`
	AttachmentURL  string              `json:"attachment_url"`
	AttachmentName string              `json:"attachment_name"`
	AttachmentType string              `json:"attachment_type"` // "image", "video", "document"
	MimeType       string              `json:"mime_type"`
	FileSize       int64               `json:"file_size"`
}

type IncomingWebhookRequest struct {
	Channel          ConversationChannel `json:"channel" binding:"required"`
	ChannelID        string              `json:"channel_id"`
	Department       string              `json:"department"`
	AssignedToID     *string             `json:"assigned_to_id"`
	SenderName       string              `json:"sender_name" binding:"required"`
	SenderIdentifier string              `json:"sender_identifier" binding:"required"`
	Content          string              `json:"content"`
	Subject          string              `json:"subject"`
	AttachmentURL    string              `json:"attachment_url"`
	AttachmentName   string              `json:"attachment_name"`
	AttachmentType   string              `json:"attachment_type"`
	MimeType         string              `json:"mime_type"`
	FileSize         int64               `json:"file_size"`
}

type AttachmentUploadResponse struct {
	URL      string `json:"url"`
	FileName string `json:"file_name"`
	FileType string `json:"file_type"` // "image", "video", "document"
	MimeType string `json:"mime_type"`
	FileSize int64  `json:"file_size"`
}

type ConvertToDealRequest struct {
	PipelineID string  `json:"pipeline_id" binding:"required"`
	StageID    string  `json:"stage_id" binding:"required"`
	Title      string  `json:"title" binding:"required"`
	Value      float64 `json:"value"`
}

type ToggleBotRequest struct {
	BotActive bool   `json:"bot_active"`
	Reason    string `json:"reason,omitempty"`
}

type WorkspaceBotSettings struct {
	ID              string          `json:"id" db:"id"`
	WorkspaceID     string          `json:"workspace_id" db:"workspace_id"`
	BotEnabled      bool            `json:"bot_enabled" db:"bot_enabled"`
	BotName         string          `json:"bot_name" db:"bot_name"`
	GreetingMessage string          `json:"greeting_message" db:"greeting_message"`
	Menu1Title      string          `json:"menu_1_title" db:"menu_1_title"`
	Menu1Keywords   string          `json:"menu_1_keywords" db:"menu_1_keywords"`
	Menu1Response   string          `json:"menu_1_response" db:"menu_1_response"`
	Menu2Title      string          `json:"menu_2_title" db:"menu_2_title"`
	Menu2Keywords   string          `json:"menu_2_keywords" db:"menu_2_keywords"`
	Menu2Response   string          `json:"menu_2_response" db:"menu_2_response"`
	Menu3Title      string          `json:"menu_3_title" db:"menu_3_title"`
	Menu3Keywords   string          `json:"menu_3_keywords" db:"menu_3_keywords"`
	Menu3Response   string          `json:"menu_3_response" db:"menu_3_response"`
	Menu4Title      string          `json:"menu_4_title" db:"menu_4_title"`
	Menu4Keywords   string          `json:"menu_4_keywords" db:"menu_4_keywords"`
	Menu4Response   string          `json:"menu_4_response" db:"menu_4_response"`
	HandoffMessage  string          `json:"handoff_message" db:"handoff_message"`
	CustomFAQs      json.RawMessage `json:"custom_faqs" db:"custom_faqs"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
}

type UpdateBotSettingsRequest struct {
	BotEnabled      *bool           `json:"bot_enabled"`
	BotName         *string         `json:"bot_name"`
	GreetingMessage *string         `json:"greeting_message"`
	Menu1Title      *string         `json:"menu_1_title"`
	Menu1Keywords   *string         `json:"menu_1_keywords"`
	Menu1Response   *string         `json:"menu_1_response"`
	Menu2Title      *string         `json:"menu_2_title"`
	Menu2Keywords   *string         `json:"menu_2_keywords"`
	Menu2Response   *string         `json:"menu_2_response"`
	Menu3Title      *string         `json:"menu_3_title"`
	Menu3Keywords   *string         `json:"menu_3_keywords"`
	Menu3Response   *string         `json:"menu_3_response"`
	Menu4Title      *string         `json:"menu_4_title"`
	Menu4Keywords   *string         `json:"menu_4_keywords"`
	Menu4Response   *string         `json:"menu_4_response"`
	HandoffMessage  *string         `json:"handoff_message"`
	CustomFAQs      json.RawMessage `json:"custom_faqs"`
}

type WorkspaceChannel struct {
	ID               string          `json:"id" db:"id"`
	WorkspaceID      string          `json:"workspace_id" db:"workspace_id"`
	ChannelName      string          `json:"channel_name" db:"channel_name"`
	ChannelType      string          `json:"channel_type" db:"channel_type"`
	Department       string          `json:"department" db:"department"` // 'sales', 'support', 'general'
	PhoneNumber      string          `json:"phone_number" db:"phone_number"`
	SessionName      string          `json:"session_name" db:"session_name"`
	AssignedUserID   *string         `json:"assigned_user_id,omitempty" db:"assigned_user_id"`
	AssignedUserName *string         `json:"assigned_user_name,omitempty" db:"assigned_user_name"`
	QRCode           *string         `json:"qr_code,omitempty" db:"qr_code"`
	Status           string          `json:"status" db:"status"`
	IsActive         bool            `json:"is_active" db:"is_active"`
	Metadata         json.RawMessage `json:"metadata" db:"metadata"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
}

type CreateWorkspaceChannelRequest struct {
	ChannelName    string  `json:"channel_name" binding:"required"`
	ChannelType    string  `json:"channel_type"` // default "whatsapp"
	Department     string  `json:"department"`   // "sales" or "support"
	PhoneNumber    string  `json:"phone_number"`
	SessionName    string  `json:"session_name"`
	AssignedUserID *string `json:"assigned_user_id"`
}

type UpdateWorkspaceChannelRequest struct {
	ChannelName    string  `json:"channel_name"`
	Department     string  `json:"department"`
	PhoneNumber    string  `json:"phone_number" binding:"required"`
	SessionName    string  `json:"session_name"`
	AssignedUserID *string `json:"assigned_user_id"`
}

type InboxEvent struct {
	Type           string      `json:"type"` // "new_message", "conversation_updated", "bot_handoff"
	WorkspaceID    string      `json:"workspace_id"`
	ConversationID string      `json:"conversation_id"`
	Message        *Message    `json:"message,omitempty"`
	Data           interface{} `json:"data,omitempty"`
}

type WhatsAppSyncRequest struct {
	Limit int `json:"limit"`
}

type WhatsAppSyncResult struct {
	TotalChats     int    `json:"total_chats"`
	SyncedChats    int    `json:"synced_chats"`
	SyncedMessages int    `json:"synced_messages"`
	Message        string `json:"message"`
}
