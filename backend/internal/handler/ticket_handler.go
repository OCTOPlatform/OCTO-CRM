package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"
)

type TicketHandler struct {
	ticketService *service.TicketService
}

func NewTicketHandler(ticketService *service.TicketService) *TicketHandler {
	return &TicketHandler{ticketService: ticketService}
}

func (h *TicketHandler) ListTickets(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var filter domain.TicketFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	tickets, err := h.ticketService.ListTickets(workspaceID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	if tickets == nil {
		tickets = []domain.Ticket{}
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(tickets))
}

func (h *TicketHandler) GetTicket(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	ticketID := c.Param("ticket_id")

	ticket, err := h.ticketService.GetTicket(workspaceID, ticketID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Ticket not found"))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(ticket))
}

func (h *TicketHandler) CreateTicket(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	userID := c.GetString("userID")
	if userID == "" {
		userID = c.GetString("user_id")
	}

	var req domain.CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	ticket, err := h.ticketService.CreateTicket(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(ticket, "Support ticket created successfully"))
}

func (h *TicketHandler) UpdateTicket(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	if workspaceID == "" {
		workspaceID = c.Param("workspace_id")
	}
	userID := c.GetString("userID")
	if userID == "" {
		userID = c.GetString("user_id")
	}
	ticketID := c.Param("ticket_id")

	var req domain.UpdateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	ticket, err := h.ticketService.UpdateTicket(workspaceID, userID, ticketID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(ticket, "Ticket updated"))
}

func (h *TicketHandler) AddTicketNote(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	ticketID := c.Param("ticket_id")

	var req domain.AddTicketNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	note, err := h.ticketService.AddTicketNote(workspaceID, userID, ticketID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.SuccessResponse(note, "Note added to ticket"))
}

func (h *TicketHandler) GetSupportStats(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")

	stats, err := h.ticketService.GetSupportStats(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse(stats))
}
