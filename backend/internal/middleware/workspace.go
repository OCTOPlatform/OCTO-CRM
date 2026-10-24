package middleware

import (
	"net/http"
	"strings"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// WorkspaceMiddleware ensures that the authenticated user belongs to the requested workspace
func WorkspaceMiddleware(userRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get("userID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, domain.ErrorResponse("Unauthorized"))
			return
		}
		userID := userIDVal.(string)

		workspaceID := c.Param("workspace_id")
		if workspaceID == "" {
			workspaceID = c.GetHeader("X-Workspace-ID")
		}
		if workspaceID == "" {
			workspaceID = c.Query("workspace_id")
		}

		if workspaceID == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, domain.ErrorResponse("workspace_id is required"))
			return
		}

		// Check if user is platform superadmin
		currentUser, _ := userRepo.GetUserByID(userID)
		isSuperAdmin := currentUser != nil && currentUser.IsSuperAdmin

		// Verify membership
		membership, err := userRepo.GetUserWorkspaceMembership(workspaceID, userID)
		if err != nil {
			// Platform Super Admin has master owner privileges across all workspaces
			if isSuperAdmin {
				c.Set("workspaceID", workspaceID)
				c.Set("userRole", domain.RoleOwner)
				c.Set("isSuperAdmin", true)
				c.Next()
				return
			}
			c.AbortWithStatusJSON(http.StatusForbidden, domain.ErrorResponse("Access denied: You are not a member of this workspace"))
			return
		}

		// Verify workspace whitelist / suspension status
		ws, err := userRepo.GetWorkspaceByID(workspaceID)
		if err != nil || ws == nil {
			c.AbortWithStatusJSON(http.StatusNotFound, domain.ErrorResponse("Workspace not found"))
			return
		}
		if ws.Status == "suspended" && !isSuperAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, domain.ErrorResponse("Workspace perusahaan ini sedang ditangguhkan. Silakan hubungi tim OCTO-CRM."))
			return
		}

		c.Set("workspaceID", workspaceID)
		c.Set("userRole", membership.Role)
		c.Set("isSuperAdmin", isSuperAdmin)

		c.Next()
	}
}

// RequireRole checks if current user's role matches any of allowed roles
func RequireRole(allowedRoles ...domain.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Platform Superadmin always has full access
		if isSuper, exists := c.Get("isSuperAdmin"); exists && isSuper.(bool) {
			c.Next()
			return
		}

		roleVal, exists := c.Get("userRole")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, domain.ErrorResponse("Role not found in context"))
			return
		}
		userRole := roleVal.(domain.Role)

		for _, r := range allowedRoles {
			if userRole == r {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, domain.ErrorResponse("Insufficient permissions for this action"))
	}
}

// RequireSuperAdmin checks if current user is the OCTO Platform Super Admin (egichandrapratama@gmail.com)
func RequireSuperAdmin(userRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get("userID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, domain.ErrorResponse("Unauthorized"))
			return
		}
		user, err := userRepo.GetUserByID(userIDVal.(string))
		if err != nil || user == nil || !user.IsSuperAdmin || strings.ToLower(user.Email) != "egichandrapratama@gmail.com" {
			c.AbortWithStatusJSON(http.StatusForbidden, domain.ErrorResponse("Akses ditolak: Hanya Master Admin Platform (egichandrapratama@gmail.com) yang memiliki hak akses ini."))
			return
		}
		c.Next()
	}
}
