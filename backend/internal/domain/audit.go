package domain

import (
	"encoding/json"
	"time"

	"github.com/lib/pq"
)

type AuditEvent struct {
	ID          string          `json:"id" db:"id"`
	WorkspaceID string          `json:"workspace_id" db:"workspace_id"`
	UserID      *string         `json:"user_id" db:"user_id"`
	UserName    *string         `json:"user_name,omitempty" db:"user_name"`
	Action      string          `json:"action" db:"action"`
	EntityType  string          `json:"entity_type" db:"entity_type"`
	EntityID    string          `json:"entity_id" db:"entity_id"`
	Description string          `json:"description" db:"description"`
	Metadata    json.RawMessage `json:"metadata" db:"metadata"`
	IPAddress   string          `json:"ip_address" db:"ip_address"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
}

type CustomFieldDefinition struct {
	ID          string         `json:"id" db:"id"`
	WorkspaceID string         `json:"workspace_id" db:"workspace_id"`
	EntityType  string         `json:"entity_type" db:"entity_type"`
	FieldKey    string         `json:"field_key" db:"field_key"`
	FieldLabel  string         `json:"field_label" db:"field_label"`
	FieldType   string         `json:"field_type" db:"field_type"` // text, number, select, date
	Options     pq.StringArray `json:"options" db:"options"`
	IsRequired  bool           `json:"is_required" db:"is_required"`
	CreatedAt   time.Time      `json:"created_at" db:"created_at"`
}
