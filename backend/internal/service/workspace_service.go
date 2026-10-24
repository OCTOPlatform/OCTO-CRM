package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"octo-crm/backend/internal/config"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/utils"

	"github.com/google/uuid"
)

type WorkspaceService struct {
	userRepo  *repository.UserRepository
	auditRepo *repository.AuditRepository
	inboxRepo *repository.InboxRepository
	cfg       *config.Config
}

func NewWorkspaceService(
	userRepo *repository.UserRepository,
	auditRepo *repository.AuditRepository,
	inboxRepo *repository.InboxRepository,
	cfg *config.Config,
) *WorkspaceService {
	return &WorkspaceService{
		userRepo:  userRepo,
		auditRepo: auditRepo,
		inboxRepo: inboxRepo,
		cfg:       cfg,
	}
}

func (s *WorkspaceService) CreateWorkspace(userID string, req domain.CreateWorkspaceRequest) (*domain.Workspace, error) {
	wsID := uuid.New().String()
	slug := req.Slug
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(req.Name), " ", "-"))
		slug = fmt.Sprintf("%s-%s", slug, uuid.New().String()[:6])
	}

	ws := domain.Workspace{
		ID:       wsID,
		Name:     req.Name,
		Slug:     slug,
		Timezone: req.Timezone,
		Currency: req.Currency,
		Role:     domain.RoleOwner,
	}

	if err := s.userRepo.CreateWorkspace(&ws, userID); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: wsID,
		UserID:      &userID,
		Action:      "workspace_created",
		EntityType:  "workspace",
		EntityID:    wsID,
		Description: fmt.Sprintf("Workspace '%s' created", ws.Name),
	})

	return &ws, nil
}

func (s *WorkspaceService) GetWorkspace(workspaceID string) (*domain.Workspace, error) {
	return s.userRepo.GetWorkspaceByID(workspaceID)
}

func (s *WorkspaceService) UpdateWorkspace(workspaceID, currentUserID string, req domain.CreateWorkspaceRequest) (*domain.Workspace, error) {
	ws, err := s.userRepo.GetWorkspaceByID(workspaceID)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		ws.Name = req.Name
	}
	if req.Timezone != "" {
		ws.Timezone = req.Timezone
	}
	if req.Currency != "" {
		ws.Currency = req.Currency
	}

	if err := s.userRepo.UpdateWorkspace(ws); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "workspace_updated",
		EntityType:  "workspace",
		EntityID:    workspaceID,
		Description: fmt.Sprintf("Workspace settings updated: %s", ws.Name),
	})

	return ws, nil
}

func (s *WorkspaceService) ListMembers(workspaceID string) ([]domain.WorkspaceMember, error) {
	return s.userRepo.GetWorkspaceMembers(workspaceID)
}

func (s *WorkspaceService) UpdateMemberRole(workspaceID, currentUserID, memberID string, req domain.UpdateMemberRoleRequest) error {
	if err := s.userRepo.UpdateMemberRole(workspaceID, memberID, req.Role, req.Department); err != nil {
		return err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "member_updated",
		EntityType:  "workspace_member",
		EntityID:    memberID,
		Description: fmt.Sprintf("Member %s updated (role: %s, dept: %s)", memberID, req.Role, req.Department),
	})

	return nil
}

func (s *WorkspaceService) RemoveMember(workspaceID, currentUserID, memberID string) error {
	if err := s.userRepo.RemoveWorkspaceMember(workspaceID, memberID); err != nil {
		return err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "member_removed",
		EntityType:  "workspace_member",
		EntityID:    memberID,
		Description: fmt.Sprintf("Member %s removed from workspace", memberID),
	})

	return nil
}

// ================= MODEL 2: SEAMLESS TOKEN INVITATION & EMAIL DISPATCH =================

func generateSecureToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (s *WorkspaceService) InviteMember(workspaceID, currentUserID string, req domain.InviteMemberRequest) (*domain.WorkspaceInvitation, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return nil, errors.New("email is required")
	}

	ws, err := s.userRepo.GetWorkspaceByID(workspaceID)
	if err != nil {
		return nil, fmt.Errorf("workspace not found: %w", err)
	}

	// Check if already an active member in this workspace
	existingUser, _ := s.userRepo.GetUserByEmail(email)
	if existingUser != nil {
		membership, _ := s.userRepo.GetUserWorkspaceMembership(workspaceID, existingUser.ID)
		if membership != nil {
			return nil, errors.New("pengguna dengan email ini sudah aktif menjadi anggota tim di workspace ini")
		}
	}

	inviter, _ := s.userRepo.GetUserByID(currentUserID)
	inviterName := "Admin Perusahaan"
	if inviter != nil && inviter.FullName != "" {
		inviterName = inviter.FullName
	}

	dept := req.Department
	if dept == "" {
		if req.Role == "sales" {
			dept = "sales"
		} else if req.Role == "support" {
			dept = "support"
		} else {
			dept = "general"
		}
	}

	token := generateSecureToken()
	now := time.Now()
	expiresAt := now.Add(7 * 24 * time.Hour) // Seamless 7-Day Expiration

	inv := domain.WorkspaceInvitation{
		ID:          uuid.New().String(),
		WorkspaceID: workspaceID,
		Email:       email,
		FullName:    strings.TrimSpace(req.FullName),
		Role:        req.Role,
		Department:  dept,
		Token:       token,
		InvitedByID: &currentUserID,
		Status:      "pending",
		ExpiresAt:   expiresAt,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.userRepo.CreateInvitation(&inv); err != nil {
		return nil, fmt.Errorf("failed to save invitation: %w", err)
	}

	inviteURL := fmt.Sprintf("%s/invite?token=%s", utils.GetFrontendURL(), token)
	inv.InviteURL = inviteURL
	inv.WorkspaceName = ws.Name
	inv.InvitedByName = inviterName

	roleLabel := "Anggota Tim"
	if req.Role == "sales" {
		roleLabel = "Tim Sales (Pre-Sales)"
	} else if req.Role == "support" {
		roleLabel = "Tim CS (After-Sales)"
	} else if req.Role == "admin" {
		roleLabel = "Admin / Manajer"
	}

	// Dispatch HTML Email seamlessly
	go func() {
		_ = utils.SendInvitationEmail(utils.EmailMessage{
			To:            email,
			WorkspaceName: ws.Name,
			InviterName:   inviterName,
			RoleTitle:     roleLabel,
			InviteURL:     inviteURL,
		})
	}()

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "member_invited",
		EntityType:  "workspace_invitation",
		EntityID:    inv.ID,
		Description: fmt.Sprintf("Invited %s as %s (token expires in 7 days)", email, req.Role),
	})

	return &inv, nil
}

func (s *WorkspaceService) ListInvitations(workspaceID string) ([]domain.WorkspaceInvitation, error) {
	invs, err := s.userRepo.ListWorkspaceInvitations(workspaceID)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	for i := range invs {
		invs[i].InviteURL = fmt.Sprintf("%s/invite?token=%s", utils.GetFrontendURL(), invs[i].Token)
		if invs[i].Status == "pending" && now.After(invs[i].ExpiresAt) {
			invs[i].Status = "expired"
		}
	}
	return invs, nil
}

func (s *WorkspaceService) RevokeInvitation(workspaceID, currentUserID, invitationID string) error {
	if err := s.userRepo.RevokeInvitation(workspaceID, invitationID); err != nil {
		return err
	}
	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "invitation_revoked",
		EntityType:  "workspace_invitation",
		EntityID:    invitationID,
		Description: fmt.Sprintf("Invitation %s was revoked", invitationID),
	})
	return nil
}

func (s *WorkspaceService) ResendInvitation(workspaceID, currentUserID, invitationID string) (*domain.WorkspaceInvitation, error) {
	inv, err := s.userRepo.GetInvitationByID(workspaceID, invitationID)
	if err != nil {
		return nil, fmt.Errorf("invitation not found: %w", err)
	}

	// Check if already an active member
	existingMember, _ := s.userRepo.GetUserByEmail(inv.Email)
	if existingMember != nil {
		membership, _ := s.userRepo.GetUserWorkspaceMembership(workspaceID, existingMember.ID)
		if membership != nil {
			return nil, errors.New("pengguna dengan email ini sudah aktif sebagai anggota tim di workspace ini")
		}
	}

	newToken := generateSecureToken()
	newExpiresAt := time.Now().Add(7 * 24 * time.Hour)
	if err := s.userRepo.UpdateInvitationToken(inv.ID, newToken, newExpiresAt); err != nil {
		return nil, err
	}

	inv.Token = newToken
	inv.ExpiresAt = newExpiresAt
	inv.Status = "pending"
	inviteURL := fmt.Sprintf("%s/invite?token=%s", utils.GetFrontendURL(), newToken)
	inv.InviteURL = inviteURL

	roleLabel := "Anggota Tim"
	if inv.Role == "sales" {
		roleLabel = "Tim Sales (Pre-Sales)"
	} else if inv.Role == "support" {
		roleLabel = "Tim CS (After-Sales)"
	}

	go func() {
		_ = utils.SendInvitationEmail(utils.EmailMessage{
			To:            inv.Email,
			WorkspaceName: inv.WorkspaceName,
			InviterName:   inv.InvitedByName,
			RoleTitle:     roleLabel,
			InviteURL:     inviteURL,
		})
	}()

	return inv, nil
}

func (s *WorkspaceService) GetInvitationByToken(token string) (*domain.InvitationDetailResponse, error) {
	inv, err := s.userRepo.GetInvitationByToken(token)
	if err != nil {
		return nil, errors.New("tautan undangan tidak valid atau tidak ditemukan")
	}

	if inv.Status == "accepted" {
		return nil, errors.New("undangan ini telah berhasil digunakan untuk aktivasi akun sebelumnya")
	}
	if inv.Status == "revoked" {
		return nil, errors.New("undangan ini telah dibatalkan oleh admin")
	}
	if time.Now().After(inv.ExpiresAt) {
		return nil, errors.New("tautan undangan telah kedaluwarsa (masa aktif 7 hari telah habis). Hubungi admin untuk mengirim ulang undangan.")
	}

	ws, err := s.userRepo.GetWorkspaceByID(inv.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("workspace not found: %w", err)
	}

	return &domain.InvitationDetailResponse{
		Invitation: *inv,
		Workspace:  *ws,
	}, nil
}

func (s *WorkspaceService) AcceptInvitation(token string, req domain.AcceptInvitationRequest) (*domain.User, *domain.Workspace, string, error) {
	inv, err := s.userRepo.GetInvitationByToken(token)
	if err != nil {
		return nil, nil, "", errors.New("tautan undangan tidak valid")
	}

	if inv.Status == "accepted" {
		return nil, nil, "", errors.New("undangan ini sudah pernah digunakan")
	}
	if inv.Status == "revoked" {
		return nil, nil, "", errors.New("undangan ini telah dibatalkan oleh admin")
	}
	if time.Now().After(inv.ExpiresAt) {
		return nil, nil, "", errors.New("tautan undangan telah kedaluwarsa")
	}

	password := strings.TrimSpace(req.Password)
	if len(password) < 6 {
		return nil, nil, "", errors.New("kata sandi minimal 6 karakter")
	}

	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to hash password: %w", err)
	}

	fullName := strings.TrimSpace(req.FullName)
	if fullName == "" {
		if inv.FullName != "" {
			fullName = inv.FullName
		} else {
			fullName = strings.Split(inv.Email, "@")[0]
		}
	}

	// 1. Create or update user
	user, _ := s.userRepo.GetUserByEmail(inv.Email)
	if user == nil {
		newUser := domain.User{
			ID:           uuid.New().String(),
			Email:        inv.Email,
			PasswordHash: hashedPassword,
			FullName:     fullName,
			AvatarURL:    fmt.Sprintf("https://api.dicebear.com/7.x/initials/svg?seed=%s", fullName),
		}
		if err := s.userRepo.CreateUser(&newUser); err != nil {
			return nil, nil, "", fmt.Errorf("failed to create user: %w", err)
		}
		user = &newUser
	} else {
		_ = s.userRepo.UpdateUserPassword(user.ID, hashedPassword, fullName)
		user.FullName = fullName
	}

	// 2. Add to workspace
	if err := s.userRepo.AddWorkspaceMember(inv.WorkspaceID, user.ID, inv.Role); err != nil {
		return nil, nil, "", fmt.Errorf("failed to assign workspace member: %w", err)
	}

	// 3. Auto-provision personal WhatsApp channel for user if not yet exists
	if s.inboxRepo != nil {
		existingCh, _ := s.inboxRepo.GetWorkspaceChannelByUserID(inv.WorkspaceID, user.ID)
		if existingCh == nil {
			cleanUserID := strings.ReplaceAll(user.ID, "-", "")[:8]
			newCh := domain.WorkspaceChannel{
				ID:             uuid.New().String(),
				WorkspaceID:    inv.WorkspaceID,
				ChannelName:    fmt.Sprintf("WhatsApp %s", user.FullName),
				ChannelType:    "whatsapp",
				Department:     inv.Department,
				PhoneNumber:    "",
				SessionName:    fmt.Sprintf("user_%s", cleanUserID),
				AssignedUserID: &user.ID,
				Status:         "disconnected",
				IsActive:       true,
			}
			_ = s.inboxRepo.UpsertWorkspaceChannel(&newCh)
		}
	}

	// 4. Mark invitation as accepted
	_ = s.userRepo.MarkInvitationAccepted(inv.ID)

	ws, _ := s.userRepo.GetWorkspaceByID(inv.WorkspaceID)

	// 5. Generate JWT token for instant seamless login
	jwtSecret := s.cfg.JWTSecret
	if jwtSecret == "" {
		jwtSecret = "octo_crm_jwt_super_secret_key_change_in_production"
	}
	authToken, err := utils.GenerateJWT(jwtSecret, user.ID, user.Email, user.FullName, 7*24*time.Hour)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to generate auth token: %w", err)
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: inv.WorkspaceID,
		UserID:      &user.ID,
		Action:      "invitation_accepted",
		EntityType:  "workspace_member",
		EntityID:    user.ID,
		Description: fmt.Sprintf("%s joined workspace via 7-day magic token", user.Email),
	})

	return user, ws, authToken, nil
}
