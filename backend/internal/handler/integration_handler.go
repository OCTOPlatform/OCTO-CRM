package handler

import (
	"net/http"
	"strings"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/service"
	"octo-crm/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type IntegrationHandler struct {
	integrationService *service.IntegrationService
	userRepo           *repository.UserRepository
	jwtSecret          string
}

func NewIntegrationHandler(integrationService *service.IntegrationService, userRepo *repository.UserRepository, jwtSecret string) *IntegrationHandler {
	return &IntegrationHandler{
		integrationService: integrationService,
		userRepo:           userRepo,
		jwtSecret:          jwtSecret,
	}
}

// IngestLead handles atomic lead intake from OCTO-WEB or OCTO-TAP
func (h *IntegrationHandler) IngestLead(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("workspace_id is required"))
		return
	}

	userID := c.GetString("userID")

	// If no userID in context, check Authorization header if present
	if userID == "" {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				if claims, err := utils.ValidateJWT(h.jwtSecret, parts[1]); err == nil && claims != nil {
					userID = claims.UserID
				}
			}
		}
	}

	// Verify workspace exists and is active
	if h.userRepo != nil {
		ws, err := h.userRepo.GetWorkspaceByID(workspaceID)
		if err != nil || ws == nil {
			c.JSON(http.StatusNotFound, domain.ErrorResponse("Workspace perusahaan tidak ditemukan"))
			return
		}
		if ws.Status == "suspended" {
			c.JSON(http.StatusForbidden, domain.ErrorResponse("Workspace perusahaan sedang ditangguhkan"))
			return
		}
	}

	var req domain.LeadIntakeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("INVALID_REQUEST_BODY: "+err.Error()))
		return
	}

	// If explicit assignee provided in payload and no authenticated user session
	if userID == "" && req.AssigneeID != nil && strings.TrimSpace(*req.AssigneeID) != "" {
		userID = strings.TrimSpace(*req.AssigneeID)
	}

	result, err := h.integrationService.IngestLead(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(result, "Lead successfully ingested into CRM"))
}
