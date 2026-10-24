package repository

import (
	"encoding/json"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ActivityRepository struct {
	db *sqlx.DB
}

func NewActivityRepository(db *sqlx.DB) *ActivityRepository {
	return &ActivityRepository{db: db}
}

func (r *ActivityRepository) CreateActivity(a *domain.Activity) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	if a.CreatedAt.IsZero() {
		a.CreatedAt = time.Now()
	}
	if len(a.Metadata) == 0 {
		a.Metadata = json.RawMessage("{}")
	}

	var contactID *string
	if a.ContactID != "" {
		contactID = &a.ContactID
	}

	query := `
		INSERT INTO activities (id, workspace_id, contact_id, deal_id, user_id, type, subject, description, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(query, a.ID, a.WorkspaceID, contactID, a.DealID, a.UserID, a.Type, a.Subject, a.Description, a.Metadata, a.CreatedAt)
	return err
}

func (r *ActivityRepository) ListActivitiesByDeal(workspaceID, dealID string) ([]domain.Activity, error) {
	var activities []domain.Activity
	query := `
		SELECT 
			a.id, a.workspace_id, COALESCE(a.contact_id::text, '') AS contact_id, 
			COALESCE(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '') AS contact_name,
			a.deal_id, d.title AS deal_title,
			a.user_id, u.full_name AS user_name, u.avatar_url AS user_avatar,
			a.type, a.subject, a.description, a.metadata, a.created_at
		FROM activities a
		JOIN deals d ON a.deal_id = d.id
		LEFT JOIN contacts c ON a.contact_id = c.id
		LEFT JOIN users u ON a.user_id = u.id
		WHERE a.workspace_id = $1 AND a.deal_id = $2
		ORDER BY a.created_at DESC
	`
	err := r.db.Select(&activities, query, workspaceID, dealID)
	if activities == nil {
		activities = []domain.Activity{}
	}
	return activities, err
}

func (r *ActivityRepository) ListActivitiesByContact(workspaceID, contactID string) ([]domain.Activity, error) {
	var activities []domain.Activity
	query := `
		SELECT 
			a.id, a.workspace_id, a.contact_id, TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS contact_name,
			a.deal_id, d.title AS deal_title,
			a.user_id, u.full_name AS user_name, u.avatar_url AS user_avatar,
			a.type, a.subject, a.description, a.metadata, a.created_at
		FROM activities a
		JOIN contacts c ON a.contact_id = c.id
		LEFT JOIN deals d ON a.deal_id = d.id
		LEFT JOIN users u ON a.user_id = u.id
		WHERE a.workspace_id = $1 AND a.contact_id = $2
		ORDER BY a.created_at DESC
	`
	err := r.db.Select(&activities, query, workspaceID, contactID)
	if activities == nil {
		activities = []domain.Activity{}
	}
	return activities, err
}

func (r *ActivityRepository) ListRecentActivities(workspaceID string, limit int) ([]domain.Activity, error) {
	if limit <= 0 {
		limit = 10
	}
	var activities []domain.Activity
	query := `
		SELECT 
			a.id, a.workspace_id, a.contact_id, TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS contact_name,
			a.deal_id, d.title AS deal_title,
			a.user_id, u.full_name AS user_name, u.avatar_url AS user_avatar,
			a.type, a.subject, a.description, a.metadata, a.created_at
		FROM activities a
		JOIN contacts c ON a.contact_id = c.id
		LEFT JOIN deals d ON a.deal_id = d.id
		LEFT JOIN users u ON a.user_id = u.id
		WHERE a.workspace_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2
	`
	err := r.db.Select(&activities, query, workspaceID, limit)
	if activities == nil {
		activities = []domain.Activity{}
	}
	return activities, err
}
