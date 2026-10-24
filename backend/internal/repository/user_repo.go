package repository

import (
	"database/sql"
	"fmt"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) CreateUser(user *domain.User) error {
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	query := `
		INSERT INTO users (id, email, password_hash, full_name, avatar_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(query, user.ID, user.Email, user.PasswordHash, user.FullName, user.AvatarURL, user.CreatedAt, user.UpdatedAt)
	return err
}

func (r *UserRepository) GetUserByEmail(email string) (*domain.User, error) {
	var user domain.User
	query := `SELECT id, email, password_hash, full_name, avatar_url, is_superadmin, created_at, updated_at FROM users WHERE email = $1`
	err := r.db.Get(&user, query, email)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetUserByID(id string) (*domain.User, error) {
	var user domain.User
	query := `SELECT id, email, password_hash, full_name, avatar_url, is_superadmin, created_at, updated_at FROM users WHERE id = $1`
	err := r.db.Get(&user, query, id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) UpdateUser(user *domain.User) error {
	user.UpdatedAt = time.Now()
	query := `
		UPDATE users SET full_name = $1, avatar_url = $2, updated_at = $3 WHERE id = $4
	`
	_, err := r.db.Exec(query, user.FullName, user.AvatarURL, user.UpdatedAt, user.ID)
	return err
}

// Workspace operations
func (r *UserRepository) CreateWorkspace(ws *domain.Workspace, ownerUserID string) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if ws.ID == "" {
		ws.ID = uuid.New().String()
	}
	now := time.Now()
	ws.CreatedAt = now
	ws.UpdatedAt = now

	if ws.Timezone == "" {
		ws.Timezone = "Asia/Jakarta"
	}
	if ws.Currency == "" {
		ws.Currency = "IDR"
	}

	wsQuery := `
		INSERT INTO workspaces (id, name, slug, timezone, currency, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	if _, err := tx.Exec(wsQuery, ws.ID, ws.Name, ws.Slug, ws.Timezone, ws.Currency, ws.CreatedAt, ws.UpdatedAt); err != nil {
		return err
	}

	// Add owner to workspace_members
	memberQuery := `
		INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	if _, err := tx.Exec(memberQuery, uuid.New().String(), ws.ID, ownerUserID, domain.RoleOwner, now); err != nil {
		return err
	}

	// Create default pipeline and stages for new workspace
	pipeID := uuid.New().String()
	pipeQuery := `
		INSERT INTO pipelines (id, workspace_id, name, is_default, created_at, updated_at)
		VALUES ($1, $2, 'Sales Pipeline Utama', true, $3, $4)
	`
	if _, err := tx.Exec(pipeQuery, pipeID, ws.ID, now, now); err != nil {
		return err
	}

	stages := []struct {
		name        string
		order       int
		probability int
		isWon       bool
		isLost      bool
	}{
		{"New Lead", 0, 10, false, false},
		{"Contacted", 1, 20, false, false},
		{"Qualified", 2, 40, false, false},
		{"Proposal", 3, 60, false, false},
		{"Negotiation", 4, 80, false, false},
		{"Won", 5, 100, true, false},
		{"Lost", 6, 0, false, true},
	}

	stageQuery := `
		INSERT INTO pipeline_stages (id, pipeline_id, name, order_index, probability, is_won, is_lost, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	for _, s := range stages {
		if _, err := tx.Exec(stageQuery, uuid.New().String(), pipeID, s.name, s.order, s.probability, s.isWon, s.isLost, now, now); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *UserRepository) GetWorkspacesByUserID(userID string) ([]domain.Workspace, error) {
	var workspaces []domain.Workspace
	query := `
		SELECT 
			w.id, w.name, w.slug, w.timezone, w.currency,
			w.status, w.subscription_plan, w.max_users, w.max_channels, w.expires_at,
			w.created_at, w.updated_at, wm.role, COALESCE(wm.department, 'sales') AS department
		FROM workspaces w
		JOIN workspace_members wm ON w.id = wm.workspace_id
		WHERE wm.user_id = $1
		ORDER BY w.name ASC
	`
	err := r.db.Select(&workspaces, query, userID)
	return workspaces, err
}

func (r *UserRepository) GetWorkspaceByID(workspaceID string) (*domain.Workspace, error) {
	var ws domain.Workspace
	query := `
		SELECT 
			id, name, slug, timezone, currency,
			status, subscription_plan, max_users, max_channels, expires_at,
			created_at, updated_at 
		FROM workspaces WHERE id = $1
	`
	err := r.db.Get(&ws, query, workspaceID)
	if err != nil {
		return nil, err
	}
	return &ws, nil
}

func (r *UserRepository) UpdateWorkspace(ws *domain.Workspace) error {
	ws.UpdatedAt = time.Now()
	query := `
		UPDATE workspaces SET name = $1, timezone = $2, currency = $3, updated_at = $4
		WHERE id = $5
	`
	_, err := r.db.Exec(query, ws.Name, ws.Timezone, ws.Currency, ws.UpdatedAt, ws.ID)
	return err
}

func (r *UserRepository) GetUserWorkspaceMembership(workspaceID, userID string) (*domain.WorkspaceMember, error) {
	var member domain.WorkspaceMember
	query := `
		SELECT wm.id, wm.workspace_id, wm.user_id, u.email, u.full_name, u.avatar_url, wm.role, wm.joined_at
		FROM workspace_members wm
		JOIN users u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1 AND wm.user_id = $2
	`
	err := r.db.Get(&member, query, workspaceID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not a member of workspace")
		}
		return nil, err
	}
	return &member, nil
}

func (r *UserRepository) GetWorkspaceMembers(workspaceID string) ([]domain.WorkspaceMember, error) {
	var members []domain.WorkspaceMember
	query := `
		SELECT wm.id, wm.workspace_id, wm.user_id, u.email, u.full_name, u.avatar_url, wm.role, wm.department, wm.joined_at
		FROM workspace_members wm
		JOIN users u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1
		ORDER BY wm.joined_at ASC
	`
	err := r.db.Select(&members, query, workspaceID)
	return members, err
}

func (r *UserRepository) AddWorkspaceMember(workspaceID, userID string, role domain.Role) error {
	query := `
		INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`
	_, err := r.db.Exec(query, uuid.New().String(), workspaceID, userID, role)
	return err
}

func (r *UserRepository) UpdateMemberRole(workspaceID, memberID string, role domain.Role, department string) error {
	var query string
	var err error
	if department != "" && role != "" {
		query = `UPDATE workspace_members SET role = $1, department = $2 WHERE workspace_id = $3 AND id = $4`
		_, err = r.db.Exec(query, role, department, workspaceID, memberID)
	} else if department != "" {
		query = `UPDATE workspace_members SET department = $1 WHERE workspace_id = $2 AND id = $3`
		_, err = r.db.Exec(query, department, workspaceID, memberID)
	} else {
		query = `UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND id = $3`
		_, err = r.db.Exec(query, role, workspaceID, memberID)
	}
	return err
}

func (r *UserRepository) RemoveWorkspaceMember(workspaceID, memberID string) error {
	query := `DELETE FROM workspace_members WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, memberID)
	return err
}

func (r *UserRepository) UpdateUserPassword(userID, passwordHash, fullName string) error {
	query := `UPDATE users SET password_hash = $1, full_name = COALESCE(NULLIF($2, ''), full_name), updated_at = NOW() WHERE id = $3`
	_, err := r.db.Exec(query, passwordHash, fullName, userID)
	return err
}

// Invitation operations
func (r *UserRepository) CreateInvitation(inv *domain.WorkspaceInvitation) error {
	if inv.ID == "" {
		inv.ID = uuid.New().String()
	}
	now := time.Now()
	inv.CreatedAt = now
	inv.UpdatedAt = now
	if inv.ExpiresAt.IsZero() {
		inv.ExpiresAt = now.Add(7 * 24 * time.Hour)
	}
	if inv.Status == "" {
		inv.Status = "pending"
	}

	query := `
		INSERT INTO workspace_invitations (
			id, workspace_id, email, full_name, role, department, token, invited_by_id, status, expires_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)
	`
	_, err := r.db.Exec(query, inv.ID, inv.WorkspaceID, inv.Email, inv.FullName, inv.Role, inv.Department, inv.Token, inv.InvitedByID, inv.Status, inv.ExpiresAt, inv.CreatedAt, inv.UpdatedAt)
	return err
}

func (r *UserRepository) GetInvitationByToken(token string) (*domain.WorkspaceInvitation, error) {
	var inv domain.WorkspaceInvitation
	query := `
		SELECT 
			wi.id, wi.workspace_id, w.name AS workspace_name, wi.email, wi.full_name, wi.role, wi.department,
			wi.token, wi.invited_by_id, COALESCE(u.full_name, 'Admin') AS invited_by_name,
			wi.status, wi.expires_at, wi.accepted_at, wi.created_at, wi.updated_at
		FROM workspace_invitations wi
		JOIN workspaces w ON wi.workspace_id = w.id
		LEFT JOIN users u ON wi.invited_by_id = u.id
		WHERE wi.token = $1
		LIMIT 1
	`
	err := r.db.Get(&inv, query, token)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *UserRepository) GetInvitationByID(workspaceID, id string) (*domain.WorkspaceInvitation, error) {
	var inv domain.WorkspaceInvitation
	query := `
		SELECT 
			wi.id, wi.workspace_id, w.name AS workspace_name, wi.email, wi.full_name, wi.role, wi.department,
			wi.token, wi.invited_by_id, COALESCE(u.full_name, 'Admin') AS invited_by_name,
			wi.status, wi.expires_at, wi.accepted_at, wi.created_at, wi.updated_at
		FROM workspace_invitations wi
		JOIN workspaces w ON wi.workspace_id = w.id
		LEFT JOIN users u ON wi.invited_by_id = u.id
		WHERE wi.workspace_id = $1 AND wi.id = $2
		LIMIT 1
	`
	err := r.db.Get(&inv, query, workspaceID, id)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *UserRepository) ListWorkspaceInvitations(workspaceID string) ([]domain.WorkspaceInvitation, error) {
	var list []domain.WorkspaceInvitation
	query := `
		SELECT 
			wi.id, wi.workspace_id, w.name AS workspace_name, wi.email, wi.full_name, wi.role, wi.department,
			wi.token, wi.invited_by_id, COALESCE(u.full_name, 'Admin') AS invited_by_name,
			wi.status, wi.expires_at, wi.accepted_at, wi.created_at, wi.updated_at
		FROM workspace_invitations wi
		JOIN workspaces w ON wi.workspace_id = w.id
		LEFT JOIN users u ON wi.invited_by_id = u.id
		WHERE wi.workspace_id = $1 
		  AND wi.status = 'pending'
		  AND NOT EXISTS (
		      SELECT 1 FROM workspace_members wm 
		      JOIN users mu ON wm.user_id = mu.id 
		      WHERE wm.workspace_id = wi.workspace_id AND LOWER(mu.email) = LOWER(wi.email)
		  )
		ORDER BY wi.created_at DESC
	`
	err := r.db.Select(&list, query, workspaceID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []domain.WorkspaceInvitation{}
	}
	return list, nil
}

func (r *UserRepository) MarkInvitationAccepted(id string) error {
	query := `UPDATE workspace_invitations SET status = 'accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *UserRepository) RevokeInvitation(workspaceID, id string) error {
	query := `UPDATE workspace_invitations SET status = 'revoked', updated_at = NOW() WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, id)
	return err
}

func (r *UserRepository) UpdateInvitationToken(id, token string, expiresAt time.Time) error {
	query := `UPDATE workspace_invitations SET token = $1, expires_at = $2, status = 'pending', updated_at = NOW() WHERE id = $3`
	_, err := r.db.Exec(query, token, expiresAt, id)
	return err
}

func (r *UserRepository) ListAllWorkspacesMaster() ([]domain.MasterWorkspaceSummary, error) {
	var list []domain.MasterWorkspaceSummary
	query := `
		SELECT 
			w.id, w.name, w.slug, w.timezone, w.currency,
			w.status, w.subscription_plan, w.max_users, w.max_channels, w.expires_at,
			w.created_at, w.updated_at,
			COALESCE(
				(SELECT u.full_name FROM workspace_members wm JOIN users u ON wm.user_id = u.id WHERE wm.workspace_id = w.id AND wm.role = 'owner' ORDER BY wm.joined_at ASC LIMIT 1),
				(SELECT wi.full_name FROM workspace_invitations wi WHERE wi.workspace_id = w.id AND wi.role = 'owner' AND wi.status = 'pending' ORDER BY wi.created_at ASC LIMIT 1),
				'Belum Diaktivasi'
			) AS owner_name,
			COALESCE(
				(SELECT u.email FROM workspace_members wm JOIN users u ON wm.user_id = u.id WHERE wm.workspace_id = w.id AND wm.role = 'owner' ORDER BY wm.joined_at ASC LIMIT 1),
				(SELECT wi.email FROM workspace_invitations wi WHERE wi.workspace_id = w.id AND wi.role = 'owner' AND wi.status = 'pending' ORDER BY wi.created_at ASC LIMIT 1),
				'-'
			) AS owner_email,
			(SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) AS total_members,
			(SELECT COUNT(*) FROM deals d WHERE d.workspace_id = w.id) AS total_deals,
			(SELECT COUNT(*) FROM tickets t WHERE t.workspace_id = w.id) AS total_tickets,
			(SELECT COUNT(*) FROM workspace_channels wc WHERE wc.workspace_id = w.id) AS total_channels
		FROM workspaces w
		ORDER BY w.created_at DESC
	`
	err := r.db.Select(&list, query)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []domain.MasterWorkspaceSummary{}
	}
	return list, nil
}

func (r *UserRepository) ProvisionClientCompany(
	ws *domain.Workspace,
	inv *domain.WorkspaceInvitation,
) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	now := time.Now()
	ws.CreatedAt = now
	ws.UpdatedAt = now
	if ws.Timezone == "" {
		ws.Timezone = "Asia/Jakarta"
	}
	if ws.Currency == "" {
		ws.Currency = "IDR"
	}
	if ws.Status == "" {
		ws.Status = "active"
	}
	if ws.SubscriptionPlan == "" {
		ws.SubscriptionPlan = "pro"
	}
	if ws.MaxUsers <= 0 {
		ws.MaxUsers = 15
	}
	if ws.MaxChannels <= 0 {
		ws.MaxChannels = 3
	}

	wsQuery := `
		INSERT INTO workspaces (id, name, slug, timezone, currency, status, subscription_plan, max_users, max_channels, expires_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	if _, err := tx.Exec(wsQuery, ws.ID, ws.Name, ws.Slug, ws.Timezone, ws.Currency, ws.Status, ws.SubscriptionPlan, ws.MaxUsers, ws.MaxChannels, ws.ExpiresAt, ws.CreatedAt, ws.UpdatedAt); err != nil {
		return err
	}

	// Create default pipeline and stages
	pipeID := uuid.New().String()
	pipeQuery := `
		INSERT INTO pipelines (id, workspace_id, name, is_default, created_at, updated_at)
		VALUES ($1, $2, 'Sales Pipeline Utama', true, $3, $4)
	`
	if _, err := tx.Exec(pipeQuery, pipeID, ws.ID, now, now); err != nil {
		return err
	}

	stages := []struct {
		name        string
		order       int
		probability int
		isWon       bool
		isLost      bool
	}{
		{"New Lead", 0, 10, false, false},
		{"Contacted", 1, 20, false, false},
		{"Qualified", 2, 40, false, false},
		{"Proposal", 3, 60, false, false},
		{"Negotiation", 4, 80, false, false},
		{"Won", 5, 100, true, false},
		{"Lost", 6, 0, false, true},
	}

	stageQuery := `
		INSERT INTO pipeline_stages (id, pipeline_id, name, order_index, probability, is_won, is_lost, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	for _, s := range stages {
		if _, err := tx.Exec(stageQuery, uuid.New().String(), pipeID, s.name, s.order, s.probability, s.isWon, s.isLost, now, now); err != nil {
			return err
		}
	}

	// Insert Owner invitation
	invQuery := `
		INSERT INTO workspace_invitations (id, workspace_id, email, full_name, role, department, token, invited_by_id, status, expires_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	if _, err := tx.Exec(invQuery, inv.ID, inv.WorkspaceID, inv.Email, inv.FullName, inv.Role, inv.Department, inv.Token, inv.InvitedByID, inv.Status, inv.ExpiresAt, inv.CreatedAt, inv.UpdatedAt); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *UserRepository) UpdateWorkspaceMasterStatus(wsID string, req domain.UpdateWorkspaceStatusRequest) error {
	query := `
		UPDATE workspaces 
		SET status = $1,
		    subscription_plan = CASE WHEN $2 != '' THEN $2 ELSE subscription_plan END,
		    max_users = CASE WHEN $3 > 0 THEN $3 ELSE max_users END,
		    max_channels = CASE WHEN $4 > 0 THEN $4 ELSE max_channels END,
		    updated_at = NOW()
		WHERE id = $5
	`
	_, err := r.db.Exec(query, req.Status, req.SubscriptionPlan, req.MaxUsers, req.MaxChannels, wsID)
	return err
}

func (r *UserRepository) DeleteWorkspaceMaster(wsID string) error {
	query := `DELETE FROM workspaces WHERE id = $1`
	_, err := r.db.Exec(query, wsID)
	return err
}
