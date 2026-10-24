package handler

import (
	"net/http"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type DealHandler struct {
	dealService *service.DealService
}

func NewDealHandler(dealService *service.DealService) *DealHandler {
	return &DealHandler{dealService: dealService}
}

// Pipelines
func (h *DealHandler) ListPipelines(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	pipelines, err := h.dealService.GetPipelines(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(pipelines))
}

func (h *DealHandler) CreatePipeline(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var req domain.Pipeline
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	pipeline, err := h.dealService.CreatePipeline(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(pipeline, "Pipeline created"))
}

// Deals
func (h *DealHandler) ListDeals(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var filter domain.DealFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	deals, err := h.dealService.ListDeals(workspaceID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(deals))
}

func (h *DealHandler) GetDeal(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	dealID := c.Param("deal_id")

	deal, err := h.dealService.GetDeal(workspaceID, dealID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Deal not found"))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(deal))
}

func (h *DealHandler) CreateDeal(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.CreateDealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	deal, err := h.dealService.CreateDeal(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(deal, "Deal created successfully"))
}

func (h *DealHandler) UpdateDeal(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	dealID := c.Param("deal_id")

	var req domain.UpdateDealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	deal, err := h.dealService.UpdateDeal(workspaceID, userID, dealID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(deal, "Deal updated"))
}

func (h *DealHandler) UpdateDealStage(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	dealID := c.Param("deal_id")

	var req domain.UpdateDealStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}

	deal, err := h.dealService.UpdateDealStage(workspaceID, userID, dealID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(deal, "Deal stage updated"))
}

func (h *DealHandler) DeleteDeal(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	dealID := c.Param("deal_id")

	if err := h.dealService.DeleteDeal(workspaceID, userID, dealID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Deal deleted"))
}
