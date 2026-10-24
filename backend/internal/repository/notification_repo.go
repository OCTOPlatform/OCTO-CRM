package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"octo-crm/backend/internal/domain"
)

type NotificationRepo struct {
	db *sqlx.DB
}

func NewNotificationRepo(db *sqlx.DB) *NotificationRepo {
	return &NotificationRepo{db: db}
}

func (r *NotificationRepo) CreateNotification(n *domain.Notification) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}

	dataBytes, err := json.Marshal(n.Data)
	if err != nil {
		dataBytes = []byte("{}")
	}

	query := `
		INSERT INTO notifications (id, workspace_id, user_id, type, title, message, data, is_read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err = r.db.Exec(query, n.ID, n.WorkspaceID, n.UserID, n.Type, n.Title, n.Message, dataBytes, n.IsRead, n.CreatedAt)
	return err
}

func (r *NotificationRepo) ListNotifications(workspaceID, userID string, limit int) ([]domain.Notification, int, error) {
	if limit <= 0 {
		limit = 30
	}

	// 1. Get unread count
	var unreadCount int
	countQuery := `
		SELECT COUNT(*)
		FROM notifications
		WHERE workspace_id = $1 AND user_id = $2 AND is_read = false
	`
	if err := r.db.Get(&unreadCount, countQuery, workspaceID, userID); err != nil {
		unreadCount = 0
	}

	// 2. Get list of notifications
	query := `
		SELECT id, workspace_id, user_id, type, title, message, data, is_read, created_at, read_at
		FROM notifications
		WHERE workspace_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT $3
	`

	type notifRow struct {
		ID          string         `db:"id"`
		WorkspaceID string         `db:"workspace_id"`
		UserID      string         `db:"user_id"`
		Type        string         `db:"type"`
		Title       string         `db:"title"`
		Message     string         `db:"message"`
		Data        []byte         `db:"data"`
		IsRead      bool           `db:"is_read"`
		CreatedAt   time.Time      `db:"created_at"`
		ReadAt      *time.Time     `db:"read_at"`
	}

	var rows []notifRow
	if err := r.db.Select(&rows, query, workspaceID, userID, limit); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []domain.Notification{}, 0, nil
		}
		return nil, 0, fmt.Errorf("failed to list notifications: %w", err)
	}

	result := make([]domain.Notification, len(rows))
	for i, row := range rows {
		n := domain.Notification{
			ID:          row.ID,
			WorkspaceID: row.WorkspaceID,
			UserID:      row.UserID,
			Type:        row.Type,
			Title:       row.Title,
			Message:     row.Message,
			IsRead:      row.IsRead,
			CreatedAt:   row.CreatedAt,
			ReadAt:      row.ReadAt,
		}
		if len(row.Data) > 0 {
			var d map[string]interface{}
			if err := json.Unmarshal(row.Data, &d); err == nil {
				n.Data = d
			}
		}
		if n.Data == nil {
			n.Data = make(map[string]interface{})
		}
		result[i] = n
	}

	return result, unreadCount, nil
}

func (r *NotificationRepo) MarkAsRead(workspaceID, userID, notificationID string) error {
	now := time.Now()
	query := `
		UPDATE notifications
		SET is_read = true, read_at = $1
		WHERE workspace_id = $2 AND user_id = $3 AND id = $4
	`
	_, err := r.db.Exec(query, now, workspaceID, userID, notificationID)
	return err
}

func (r *NotificationRepo) MarkAllAsRead(workspaceID, userID string) error {
	now := time.Now()
	query := `
		UPDATE notifications
		SET is_read = true, read_at = $1
		WHERE workspace_id = $2 AND user_id = $3 AND is_read = false
	`
	_, err := r.db.Exec(query, now, workspaceID, userID)
	return err
}
