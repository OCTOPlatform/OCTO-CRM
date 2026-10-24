package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"octo-crm/backend/internal/config"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/utils"

	"github.com/google/uuid"
)

type MasterService struct {
	userRepo  *repository.UserRepository
	auditRepo *repository.AuditRepository
	cfg       *config.Config
}

func NewMasterService(userRepo *repository.UserRepository, auditRepo *repository.AuditRepository, cfg *config.Config) *MasterService {
	return &MasterService{
		userRepo:  userRepo,
		auditRepo: auditRepo,
		cfg:       cfg,
	}
}

func (s *MasterService) ListWorkspaces() ([]domain.MasterWorkspaceSummary, error) {
	return s.userRepo.ListAllWorkspacesMaster()
}

func (s *MasterService) ProvisionCompany(currentUserID string, req domain.ProvisionCompanyRequest) (*domain.MasterWorkspaceSummary, string, error) {
	companyName := strings.TrimSpace(req.CompanyName)
	ownerName := strings.TrimSpace(req.OwnerFullName)
	ownerEmail := strings.ToLower(strings.TrimSpace(req.OwnerEmail))

	if companyName == "" {
		return nil, "", errors.New("nama perusahaan wajib diisi")
	}
	if ownerName == "" {
		return nil, "", errors.New("nama owner wajib diisi")
	}
	if ownerEmail == "" {
		return nil, "", errors.New("email owner wajib diisi")
	}

	// Create Slug
	reg, _ := regexp.Compile("[^a-z0-9]+")
	baseSlug := reg.ReplaceAllString(strings.ToLower(companyName), "-")
	baseSlug = strings.Trim(baseSlug, "-")
	if baseSlug == "" {
		baseSlug = "company"
	}
	slug := fmt.Sprintf("%s-%s", baseSlug, uuid.New().String()[:6])

	wsID := uuid.New().String()
	invID := uuid.New().String()

	b := make([]byte, 32)
	_, _ = rand.Read(b)
	token := hex.EncodeToString(b)
	expiresAt := time.Now().Add(7 * 24 * time.Hour) // 7 days token

	plan := req.SubscriptionPlan
	if plan == "" {
		plan = "pro"
	}
	maxUsers := req.MaxUsers
	if maxUsers <= 0 {
		maxUsers = 15
	}
	maxChannels := req.MaxChannels
	if maxChannels <= 0 {
		maxChannels = 3
	}

	oneYearLater := time.Now().AddDate(1, 0, 0)
	ws := domain.Workspace{
		ID:               wsID,
		Name:             companyName,
		Slug:             slug,
		Timezone:         "Asia/Jakarta",
		Currency:         "IDR",
		Status:           "active",
		SubscriptionPlan: plan,
		MaxUsers:         maxUsers,
		MaxChannels:      maxChannels,
		ExpiresAt:        &oneYearLater,
	}

	inv := domain.WorkspaceInvitation{
		ID:          invID,
		WorkspaceID: wsID,
		Email:       ownerEmail,
		FullName:    ownerName,
		Role:        domain.RoleOwner,
		Department:  "management",
		Token:       token,
		InvitedByID: &currentUserID,
		Status:      "pending",
		ExpiresAt:   expiresAt,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.userRepo.ProvisionClientCompany(&ws, &inv); err != nil {
		return nil, "", fmt.Errorf("gagal mendaftarkan perusahaan: %w", err)
	}

	inviteURL := fmt.Sprintf("http://localhost:3000/invite?token=%s", token)

	// Dispatch Onboarding Activation Email via Brevo SMTP
	go func() {
		_ = utils.SendInvitationEmail(utils.EmailMessage{
			To:            ownerEmail,
			WorkspaceName: companyName,
			InviterName:   "Tim Onboarding & Kemitraan OCTO-CRM",
			RoleTitle:     "Owner & Direktur Utama",
			InviteURL:     inviteURL,
		})
	}()

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: wsID,
		UserID:      &currentUserID,
		Action:      "master_company_provisioned",
		EntityType:  "workspace",
		EntityID:    wsID,
		Description: fmt.Sprintf("Perusahaan '%s' berhasil didaftarkan dan di-whitelist dengan owner %s (%s)", companyName, ownerName, ownerEmail),
	})

	summary := &domain.MasterWorkspaceSummary{
		ID:               wsID,
		Name:             companyName,
		Slug:             slug,
		Timezone:         "Asia/Jakarta",
		Currency:         "IDR",
		Status:           "active",
		SubscriptionPlan: plan,
		MaxUsers:         maxUsers,
		MaxChannels:      maxChannels,
		ExpiresAt:        &oneYearLater,
		CreatedAt:        ws.CreatedAt,
		UpdatedAt:        ws.UpdatedAt,
		OwnerName:        ownerName,
		OwnerEmail:       ownerEmail,
		TotalMembers:     0,
		TotalDeals:       0,
		TotalTickets:     0,
		TotalChannels:    0,
	}

	return summary, inviteURL, nil
}

func (s *MasterService) UpdateCompanyStatus(currentUserID, workspaceID string, req domain.UpdateWorkspaceStatusRequest) error {
	if err := s.userRepo.UpdateWorkspaceMasterStatus(workspaceID, req); err != nil {
		return err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "master_company_status_updated",
		EntityType:  "workspace",
		EntityID:    workspaceID,
		Description: fmt.Sprintf("Status perusahaan %s diubah menjadi '%s' (plan: %s)", workspaceID, req.Status, req.SubscriptionPlan),
	})

	return nil
}
