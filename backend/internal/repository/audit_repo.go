package repository

import (
	"encoding/json"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type AuditRepository struct {
	db *sqlx.DB
}

func NewAuditRepository(db *sqlx.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) LogEvent(event *domain.AuditEvent) error {
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}
	if len(event.Metadata) == 0 {
		event.Metadata = json.RawMessage("{}")
	}
	if event.UserID != nil && *event.UserID == "" {
		event.UserID = nil
	}

	query := `
		INSERT INTO audit_events (id, workspace_id, user_id, action, entity_type, entity_id, description, metadata, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(query, event.ID, event.WorkspaceID, event.UserID, event.Action, event.EntityType, event.EntityID, event.Description, event.Metadata, event.IPAddress, event.CreatedAt)
	return err
}

func (r *AuditRepository) ListAuditEvents(workspaceID string, limit int) ([]domain.AuditEvent, error) {
	if limit <= 0 {
		limit = 50
	}
	var events []domain.AuditEvent
	query := `
		SELECT 
			a.id, a.workspace_id, a.user_id, u.full_name AS user_name,
			a.action, a.entity_type, a.entity_id, a.description,
			a.metadata, a.ip_address, a.created_at
		FROM audit_events a
		LEFT JOIN users u ON a.user_id = u.id
		WHERE a.workspace_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2
	`
	err := r.db.Select(&events, query, workspaceID, limit)
	return events, err
}
