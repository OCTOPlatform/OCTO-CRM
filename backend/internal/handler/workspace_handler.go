package handler

import (
	"net/http"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type WorkspaceHandler struct {
	workspaceService *service.WorkspaceService
	authService      *service.AuthService
}

func NewWorkspaceHandler(workspaceService *service.WorkspaceService, authService *service.AuthService) *WorkspaceHandler {
	return &WorkspaceHandler{
		workspaceService: workspaceService,
		authService:      authService,
	}
}

func (h *WorkspaceHandler) ListUserWorkspaces(c *gin.Context) {
	userID := c.GetString("userID")
	_, workspaces, err := h.authService.GetCurrentUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(workspaces))
}

func (h *WorkspaceHandler) CreateWorkspace(c *gin.Context) {
	userID := c.GetString("userID")
	var req domain.CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	ws, err := h.workspaceService.CreateWorkspace(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(ws, "Workspace created successfully"))
}

func (h *WorkspaceHandler) GetWorkspace(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	ws, err := h.workspaceService.GetWorkspace(workspaceID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Workspace not found"))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(ws))
}

func (h *WorkspaceHandler) UpdateWorkspace(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	var req domain.CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	ws, err := h.workspaceService.UpdateWorkspace(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(ws, "Workspace updated"))
}

func (h *WorkspaceHandler) ListMembers(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	members, err := h.workspaceService.ListMembers(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(members))
}

func (h *WorkspaceHandler) InviteMember(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.InviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	inv, err := h.workspaceService.InviteMember(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(inv, "Undangan anggota tim berhasil dikirim! Tautan berlaku selama 7 hari."))
}

func (h *WorkspaceHandler) ListInvitations(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	invs, err := h.workspaceService.ListInvitations(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(invs))
}

func (h *WorkspaceHandler) RevokeInvitation(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	invitationID := c.Param("invitation_id")

	if err := h.workspaceService.RevokeInvitation(workspaceID, userID, invitationID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Undangan berhasil dibatalkan"))
}

func (h *WorkspaceHandler) ResendInvitation(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	invitationID := c.Param("invitation_id")

	inv, err := h.workspaceService.ResendInvitation(workspaceID, userID, invitationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(inv, "Undangan berhasil diperbarui dan dikirim ulang"))
}

// Public endpoint to verify token
func (h *WorkspaceHandler) GetInvitation(c *gin.Context) {
	token := c.Param("token")
	detail, err := h.workspaceService.GetInvitationByToken(token)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(detail))
}

// Public endpoint to accept token and set password
func (h *WorkspaceHandler) AcceptInvitation(c *gin.Context) {
	token := c.Param("token")
	var req domain.AcceptInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	user, ws, authToken, err := h.workspaceService.AcceptInvitation(token, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(gin.H{
		"token":     authToken,
		"user":      user,
		"workspace": ws,
	}, "Akun Anda berhasil diaktifkan! Selamat datang di OCTO CRM."))
}

func (h *WorkspaceHandler) UpdateMemberRole(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	memberID := c.Param("member_id")

	var req domain.UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	if err := h.workspaceService.UpdateMemberRole(workspaceID, userID, memberID, req); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Member role updated"))
}

func (h *WorkspaceHandler) RemoveMember(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	memberID := c.Param("member_id")

	if err := h.workspaceService.RemoveMember(workspaceID, userID, memberID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Member removed from workspace"))
}
