package handler

import (
	"net/http"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type CompanyHandler struct {
	contactService *service.ContactService
}

func NewCompanyHandler(contactService *service.ContactService) *CompanyHandler {
	return &CompanyHandler{contactService: contactService}
}

func (h *CompanyHandler) ListCompanies(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	companies, err := h.contactService.ListCompanies(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(companies))
}

func (h *CompanyHandler) GetCompany(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	companyID := c.Param("company_id")

	company, err := h.contactService.GetCompany(workspaceID, companyID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Company not found"))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(company))
}

func (h *CompanyHandler) CreateCompany(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.Company
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	company, err := h.contactService.CreateCompany(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(company, "Company created successfully"))
}

func (h *CompanyHandler) UpdateCompany(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	companyID := c.Param("company_id")

	var req domain.Company
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}
	req.ID = companyID

	company, err := h.contactService.UpdateCompany(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(company, "Company updated"))
}

func (h *CompanyHandler) DeleteCompany(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	companyID := c.Param("company_id")

	if err := h.contactService.DeleteCompany(workspaceID, userID, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Company deleted"))
}
