package domain

import (
	"encoding/json"
	"time"
)

type NotificationType string

const (
	NotificationTypeConversationEscalated NotificationType = "conversation_escalated"
	NotificationTypeConversationAssigned  NotificationType = "conversation_assigned"
	NotificationTypeConversationTakeover  NotificationType = "conversation_takeover"
	NotificationTypeSLABreached           NotificationType = "sla_breached"
	NotificationTypeSystem                NotificationType = "system"
)

type Notification struct {
	ID          string                 `json:"id" db:"id"`
	WorkspaceID string                 `json:"workspace_id" db:"workspace_id"`
	UserID      string                 `json:"user_id" db:"user_id"`
	Type        string                 `json:"type" db:"type"`
	Title       string                 `json:"title" db:"title"`
	Message     string                 `json:"message" db:"message"`
	Data        map[string]interface{} `json:"data" db:"-"`
	DataJSON    []byte                 `json:"-" db:"data"`
	IsRead      bool                   `json:"is_read" db:"is_read"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
	ReadAt      *time.Time             `json:"read_at,omitempty" db:"read_at"`
}

func (n *Notification) UnmarshalData() {
	if len(n.DataJSON) > 0 {
		var d map[string]interface{}
		if err := json.Unmarshal(n.DataJSON, &d); err == nil {
			n.Data = d
		}
	}
	if n.Data == nil {
		n.Data = make(map[string]interface{})
	}
}

type NotificationListResponse struct {
	Notifications []Notification `json:"notifications"`
	UnreadCount   int            `json:"unread_count"`
}
