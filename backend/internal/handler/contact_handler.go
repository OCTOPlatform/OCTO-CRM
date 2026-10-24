package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type ContactHandler struct {
	contactService *service.ContactService
}

func NewContactHandler(contactService *service.ContactService) *ContactHandler {
	return &ContactHandler{contactService: contactService}
}

func (h *ContactHandler) ListContacts(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var filter domain.ContactFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PerPage <= 0 {
		filter.PerPage = 20
	}

	contacts, total, err := h.contactService.ListContacts(workspaceID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	totalPages := (total + filter.PerPage - 1) / filter.PerPage
	meta := domain.PaginationMeta{
		CurrentPage: filter.Page,
		PerPage:     filter.PerPage,
		TotalItems:  total,
		TotalPages:  totalPages,
	}

	c.JSON(http.StatusOK, domain.PaginatedResponse(contacts, meta))
}

func (h *ContactHandler) GetContact(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	contactID := c.Param("contact_id")

	contact, err := h.contactService.GetContact(workspaceID, contactID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Contact not found"))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(contact))
}

func (h *ContactHandler) CreateContact(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.CreateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	contact, err := h.contactService.CreateContact(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(contact, "Contact created successfully"))
}

func (h *ContactHandler) UpdateContact(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	contactID := c.Param("contact_id")

	var req domain.UpdateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	contact, err := h.contactService.UpdateContact(workspaceID, userID, contactID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(contact, "Contact updated"))
}

func (h *ContactHandler) DeleteContact(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	contactID := c.Param("contact_id")

	if err := h.contactService.DeleteContact(workspaceID, userID, contactID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Contact deleted"))
}

func (h *ContactHandler) FindDuplicates(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")

	duplicates, err := h.contactService.FindDuplicates(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	if duplicates == nil {
		duplicates = []domain.DuplicateCandidate{}
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(duplicates))
}

func (h *ContactHandler) MergeContacts(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.MergeContactsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	if err := h.contactService.MergeContacts(workspaceID, userID, req); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Contacts merged successfully"))
}

func (h *ContactHandler) PreviewCSV(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("CSV file is required"))
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse("Failed to read file"))
		return
	}
	defer f.Close()

	preview, err := h.contactService.PreviewCSV(f)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(preview))
}

func (h *ContactHandler) CommitCSV(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.CSVCommitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	successCount, failedCount, err := h.contactService.CommitCSVImport(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(gin.H{
		"success_count": successCount,
		"failed_count":  failedCount,
	}, fmt.Sprintf("Successfully imported %d contacts", successCount)))
}

func (h *ContactHandler) ExportCSV(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	data, err := h.contactService.ExportContactsCSV(workspaceID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	fileName := fmt.Sprintf("contacts_export_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Length", strconv.Itoa(len(data)))
	c.Data(http.StatusOK, "text/csv", data)
}
