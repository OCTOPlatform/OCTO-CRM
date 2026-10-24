package domain

import (
	"time"
)

type Role string

const (
	RoleOwner      Role = "owner"
	RoleAdmin      Role = "admin"
	RoleSupervisor Role = "supervisor"
	RoleMember     Role = "member"
	RoleViewer     Role = "viewer"
)

type User struct {
	ID           string    `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	FullName     string    `json:"full_name" db:"full_name"`
	AvatarURL    string    `json:"avatar_url" db:"avatar_url"`
	IsSuperAdmin bool      `json:"is_superadmin" db:"is_superadmin"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type Workspace struct {
	ID               string     `json:"id" db:"id"`
	Name             string     `json:"name" db:"name"`
	Slug             string     `json:"slug" db:"slug"`
	Timezone         string     `json:"timezone" db:"timezone"`
	Currency         string     `json:"currency" db:"currency"`
	Status           string     `json:"status" db:"status"`                           // 'active', 'suspended', 'pending_whitelist'
	SubscriptionPlan string     `json:"subscription_plan" db:"subscription_plan"`     // 'starter', 'pro', 'enterprise'
	MaxUsers         int        `json:"max_users" db:"max_users"`
	MaxChannels      int        `json:"max_channels" db:"max_channels"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	Role             Role       `json:"role,omitempty" db:"role"`                     // Current user's role in this workspace
	Department       string     `json:"department,omitempty" db:"department"`         // Current user's department in this workspace
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
}

type WorkspaceMember struct {
	ID          string    `json:"id" db:"id"`
	WorkspaceID string    `json:"workspace_id" db:"workspace_id"`
	UserID      string    `json:"user_id" db:"user_id"`
	Email       string    `json:"email" db:"email"`
	FullName    string    `json:"full_name" db:"full_name"`
	AvatarURL   string    `json:"avatar_url" db:"avatar_url"`
	Role        Role      `json:"role" db:"role"`
	Department  string    `json:"department" db:"department"` // 'sales', 'support', 'management', 'all'
	JoinedAt    time.Time `json:"joined_at" db:"joined_at"`
}

type RegisterRequest struct {
	Email         string `json:"email" binding:"required,email"`
	Password      string `json:"password" binding:"required,min=6"`
	FullName      string `json:"full_name" binding:"required"`
	WorkspaceName string `json:"workspace_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token      string      `json:"token"`
	User       User        `json:"user"`
	Workspaces []Workspace `json:"workspaces"`
}

type CreateWorkspaceRequest struct {
	Name     string `json:"name" binding:"required"`
	Slug     string `json:"slug"`
	Timezone string `json:"timezone"`
	Currency string `json:"currency"`
}

type InviteMemberRequest struct {
	Email      string `json:"email" binding:"required,email"`
	FullName   string `json:"full_name"`
	Role       Role   `json:"role" binding:"required"`
	Department string `json:"department"`
}

type UpdateMemberRoleRequest struct {
	Role       Role   `json:"role"`
	Department string `json:"department"`
}

type WorkspaceInvitation struct {
	ID            string     `json:"id" db:"id"`
	WorkspaceID   string     `json:"workspace_id" db:"workspace_id"`
	WorkspaceName string     `json:"workspace_name,omitempty" db:"workspace_name"`
	Email         string     `json:"email" db:"email"`
	FullName      string     `json:"full_name" db:"full_name"`
	Role          Role       `json:"role" db:"role"`
	Department    string     `json:"department" db:"department"`
	Token         string     `json:"token" db:"token"`
	InvitedByID   *string    `json:"invited_by_id" db:"invited_by_id"`
	InvitedByName string     `json:"invited_by_name,omitempty" db:"invited_by_name"`
	Status        string     `json:"status" db:"status"` // 'pending', 'accepted', 'revoked', 'expired'
	ExpiresAt     time.Time  `json:"expires_at" db:"expires_at"`
	AcceptedAt    *time.Time `json:"accepted_at,omitempty" db:"accepted_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
	InviteURL     string     `json:"invite_url,omitempty" db:"-"`
}

type AcceptInvitationRequest struct {
	FullName string `json:"full_name"`
	Password string `json:"password" binding:"required,min=6"`
}

type InvitationDetailResponse struct {
	Invitation WorkspaceInvitation `json:"invitation"`
	Workspace  Workspace           `json:"workspace"`
}

type MasterWorkspaceSummary struct {
	ID               string     `json:"id" db:"id"`
	Name             string     `json:"name" db:"name"`
	Slug             string     `json:"slug" db:"slug"`
	Timezone         string     `json:"timezone" db:"timezone"`
	Currency         string     `json:"currency" db:"currency"`
	Status           string     `json:"status" db:"status"`
	SubscriptionPlan string     `json:"subscription_plan" db:"subscription_plan"`
	MaxUsers         int        `json:"max_users" db:"max_users"`
	MaxChannels      int        `json:"max_channels" db:"max_channels"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
	OwnerName        string     `json:"owner_name" db:"owner_name"`
	OwnerEmail       string     `json:"owner_email" db:"owner_email"`
	TotalMembers     int        `json:"total_members" db:"total_members"`
	TotalDeals       int        `json:"total_deals" db:"total_deals"`
	TotalTickets     int        `json:"total_tickets" db:"total_tickets"`
	TotalChannels    int        `json:"total_channels" db:"total_channels"`
}

type ProvisionCompanyRequest struct {
	CompanyName      string `json:"company_name" binding:"required"`
	SubscriptionPlan string `json:"subscription_plan"` // 'starter', 'pro', 'enterprise'
	MaxUsers         int    `json:"max_users"`
	MaxChannels      int    `json:"max_channels"`
	OwnerFullName    string `json:"owner_full_name" binding:"required"`
	OwnerEmail       string `json:"owner_email" binding:"required,email"`
}

type UpdateWorkspaceStatusRequest struct {
	Status           string `json:"status" binding:"required"` // 'active', 'suspended'
	SubscriptionPlan string `json:"subscription_plan"`
	MaxUsers         int    `json:"max_users"`
	MaxChannels      int    `json:"max_channels"`
}
