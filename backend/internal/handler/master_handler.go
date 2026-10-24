package handler

import (
	"net/http"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type MasterHandler struct {
	masterService *service.MasterService
}

func NewMasterHandler(masterService *service.MasterService) *MasterHandler {
	return &MasterHandler{
		masterService: masterService,
	}
}

func (h *MasterHandler) ListWorkspaces(c *gin.Context) {
	list, err := h.masterService.ListWorkspaces()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(list, "Master workspaces retrieved"))
}

func (h *MasterHandler) ProvisionCompany(c *gin.Context) {
	currentUserID := c.GetString("userID")

	var req domain.ProvisionCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Data formulir tidak lengkap: "+err.Error()))
		return
	}

	summary, inviteURL, err := h.masterService.ProvisionCompany(currentUserID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(gin.H{
		"company":    summary,
		"invite_url": inviteURL,
	}, "Perusahaan klien berhasil didaftarkan! Email aktivasi otomatis dikirimkan ke Owner."))
}

func (h *MasterHandler) UpdateCompanyStatus(c *gin.Context) {
	currentUserID := c.GetString("userID")
	workspaceID := c.Param("id")

	var req domain.UpdateWorkspaceStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Format status tidak valid: "+err.Error()))
		return
	}

	if err := h.masterService.UpdateCompanyStatus(currentUserID, workspaceID, req); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Status perusahaan berhasil diperbarui."))
}
