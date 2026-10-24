package domain

import (
	"encoding/json"
	"time"
)

type ActivityType string

const (
	ActivityCall         ActivityType = "call"
	ActivityMeeting      ActivityType = "meeting"
	ActivityEmail        ActivityType = "email"
	ActivityNote         ActivityType = "note"
	ActivityWhatsApp     ActivityType = "whatsapp"
	ActivityStatusChange ActivityType = "status_change"
)

type Activity struct {
	ID          string          `json:"id" db:"id"`
	WorkspaceID string          `json:"workspace_id" db:"workspace_id"`
	ContactID   string          `json:"contact_id" db:"contact_id"`
	ContactName *string         `json:"contact_name,omitempty" db:"contact_name"`
	DealID      *string         `json:"deal_id" db:"deal_id"`
	DealTitle   *string         `json:"deal_title,omitempty" db:"deal_title"`
	UserID      *string         `json:"user_id" db:"user_id"`
	UserName    *string         `json:"user_name,omitempty" db:"user_name"`
	UserAvatar  *string         `json:"user_avatar,omitempty" db:"user_avatar"`
	Type        ActivityType    `json:"type" db:"type"`
	Subject     string          `json:"subject" db:"subject"`
	Description string          `json:"description" db:"description"`
	Metadata    json.RawMessage `json:"metadata" db:"metadata"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
}

type CreateActivityRequest struct {
	ContactID   string          `json:"contact_id"`
	DealID      *string         `json:"deal_id"`
	Type        ActivityType    `json:"type" binding:"required"`
	Subject     string          `json:"subject" binding:"required"`
	Description string          `json:"description"`
	Metadata    json.RawMessage `json:"metadata"`
}
