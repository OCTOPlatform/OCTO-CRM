package service

import (
	"errors"
	"fmt"
	"strings"

	"octo-crm/backend/internal/config"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/utils"

	"github.com/google/uuid"
)

type AuthService struct {
	userRepo  *repository.UserRepository
	auditRepo *repository.AuditRepository
	cfg       *config.Config
}

func NewAuthService(userRepo *repository.UserRepository, auditRepo *repository.AuditRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		auditRepo: auditRepo,
		cfg:       cfg,
	}
}

func (s *AuthService) Register(req domain.RegisterRequest) (*domain.LoginResponse, error) {
	// 1. Check if user already exists
	existingUser, _ := s.userRepo.GetUserByEmail(req.Email)
	if existingUser != nil {
		return nil, errors.New("email is already registered")
	}

	// 2. Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// 3. Create user
	userID := uuid.New().String()
	user := domain.User{
		ID:           userID,
		Email:        strings.ToLower(strings.TrimSpace(req.Email)),
		PasswordHash: hashedPassword,
		FullName:     strings.TrimSpace(req.FullName),
		AvatarURL:    fmt.Sprintf("https://api.dicebear.com/7.x/initials/svg?seed=%s", strings.TrimSpace(req.FullName)),
	}
	if err := s.userRepo.CreateUser(&user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// 4. Create initial workspace
	wsID := uuid.New().String()
	slug := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(req.WorkspaceName), " ", "-"))
	// ensure slug uniqueness with random suffix
	slug = fmt.Sprintf("%s-%s", slug, uuid.New().String()[:6])

	ws := domain.Workspace{
		ID:       wsID,
		Name:     req.WorkspaceName,
		Slug:     slug,
		Timezone: "Asia/Jakarta",
		Currency: "IDR",
		Role:     domain.RoleOwner,
	}
	if err := s.userRepo.CreateWorkspace(&ws, userID); err != nil {
		return nil, fmt.Errorf("failed to create workspace: %w", err)
	}

	// 5. Generate JWT token
	token, err := utils.GenerateJWT(s.cfg.JWTSecret, user.ID, user.Email, user.FullName, s.cfg.JWTExpiration)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Audit event
	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: wsID,
		UserID:      &user.ID,
		Action:      "user_registered",
		EntityType:  "user",
		EntityID:    user.ID,
		Description: fmt.Sprintf("User %s registered with workspace %s", user.Email, ws.Name),
	})

	return &domain.LoginResponse{
		Token:      token,
		User:       user,
		Workspaces: []domain.Workspace{ws},
	}, nil
}

func (s *AuthService) Login(req domain.LoginRequest) (*domain.LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	workspaces, err := s.userRepo.GetWorkspacesByUserID(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user workspaces: %w", err)
	}

	token, err := utils.GenerateJWT(s.cfg.JWTSecret, user.ID, user.Email, user.FullName, s.cfg.JWTExpiration)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &domain.LoginResponse{
		Token:      token,
		User:       *user,
		Workspaces: workspaces,
	}, nil
}

func (s *AuthService) GetCurrentUser(userID string) (*domain.User, []domain.Workspace, error) {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil {
		return nil, nil, err
	}

	workspaces, err := s.userRepo.GetWorkspacesByUserID(userID)
	if err != nil {
		return nil, nil, err
	}

	return user, workspaces, nil
}

func (s *AuthService) UpdateProfile(userID, fullName, avatarURL string) (*domain.User, error) {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	if fullName != "" {
		user.FullName = fullName
	}
	if avatarURL != "" {
		user.AvatarURL = avatarURL
	}

	if err := s.userRepo.UpdateUser(user); err != nil {
		return nil, err
	}

	return user, nil
}
