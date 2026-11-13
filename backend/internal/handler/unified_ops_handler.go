package handler

import (
	"net/http"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type UnifiedOpsHandler struct {
	opsService *service.UnifiedOpsService
}

func NewUnifiedOpsHandler(opsService *service.UnifiedOpsService) *UnifiedOpsHandler {
	return &UnifiedOpsHandler{opsService: opsService}
}

// ================= INVENTORY & PRODUCTS =================

func (h *UnifiedOpsHandler) ListProducts(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	search := c.Query("search")
	category := c.Query("category")

	products, err := h.opsService.ListProducts(workspaceID, search, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(products))
}

func (h *UnifiedOpsHandler) GetProduct(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	productID := c.Param("id")

	prod, err := h.opsService.GetProduct(workspaceID, productID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse("Produk tidak ditemukan"))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(prod))
}

func (h *UnifiedOpsHandler) CreateProduct(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var req domain.Product
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Data produk tidak valid: "+err.Error()))
		return
	}

	prod, err := h.opsService.CreateProduct(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(prod, "Produk berhasil ditambahkan ke inventori"))
}

func (h *UnifiedOpsHandler) UpdateProduct(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	productID := c.Param("id")
	var req domain.Product
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Data produk tidak valid: "+err.Error()))
		return
	}

	prod, err := h.opsService.UpdateProduct(workspaceID, productID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(prod, "Produk berhasil diperbarui"))
}

func (h *UnifiedOpsHandler) AdjustStock(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	productID := c.Param("id")

	var req domain.StockAdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Data penyesuaian stok tidak valid: "+err.Error()))
		return
	}

	if err := h.opsService.AdjustStock(workspaceID, productID, req, userID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Stok produk berhasil disesuaikan"))
}

func (h *UnifiedOpsHandler) ListStockMovements(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	productID := c.Param("id")

	movements, err := h.opsService.ListStockMovements(workspaceID, productID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(movements))
}

// ================= ATTENDANCE =================

func (h *UnifiedOpsHandler) CheckIn(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.CheckInRequest
	_ = c.ShouldBindJSON(&req)

	att, err := h.opsService.CheckIn(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(att, "Presensi Check-In berhasil dicatat"))
}

func (h *UnifiedOpsHandler) CheckOut(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	var req domain.CheckOutRequest
	_ = c.ShouldBindJSON(&req)

	att, err := h.opsService.CheckOut(workspaceID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(att, "Presensi Check-Out berhasil dicatat"))
}

func (h *UnifiedOpsHandler) GetTodayAttendance(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")

	att, err := h.opsService.GetTodayAttendance(workspaceID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(att))
}

func (h *UnifiedOpsHandler) ListAttendances(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	month := c.Query("month")
	filterUser := c.Query("user_id")

	list, err := h.opsService.ListAttendances(workspaceID, month, filterUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(list))
}

func (h *UnifiedOpsHandler) GetAttendanceSummary(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	userID := c.GetString("userID")
	month := c.DefaultQuery("month", "")

	summary, err := h.opsService.GetAttendanceSummary(workspaceID, userID, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(summary))
}

// ================= DYNAMIC PAYROLL =================

func (h *UnifiedOpsHandler) ListPayrollComponents(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")

	comps, err := h.opsService.ListPayrollComponents(workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(comps))
}

func (h *UnifiedOpsHandler) CreatePayrollComponent(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var req domain.PayrollComponent
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Data komponen tidak valid: "+err.Error()))
		return
	}

	created, err := h.opsService.CreatePayrollComponent(workspaceID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, domain.SuccessResponse(created, "Komponen rumus payroll berhasil disimpan"))
}

func (h *UnifiedOpsHandler) UpdatePayrollComponent(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	compID := c.Param("id")
	var req domain.PayrollComponent
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Data komponen tidak valid: "+err.Error()))
		return
	}

	updated, err := h.opsService.UpdatePayrollComponent(workspaceID, compID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(updated, "Komponen rumus payroll berhasil diperbarui"))
}

func (h *UnifiedOpsHandler) DeletePayrollComponent(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	compID := c.Param("id")

	if err := h.opsService.DeletePayrollComponent(workspaceID, compID); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(nil, "Komponen payroll berhasil dihapus"))
}

func (h *UnifiedOpsHandler) SimulateFormula(c *gin.Context) {
	var req domain.FormulaSimulationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse("Ekspresi rumus wajib diisi: "+err.Error()))
		return
	}

	result := h.opsService.SimulateFormula(req)
	c.JSON(http.StatusOK, domain.SuccessResponse(result))
}

func (h *UnifiedOpsHandler) ListPayrollSlips(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	month := c.Query("month")

	slips, err := h.opsService.ListPayrollSlips(workspaceID, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(slips))
}

func (h *UnifiedOpsHandler) GenerateMonthlyPayrollRun(c *gin.Context) {
	workspaceID := c.GetString("workspaceID")
	var req domain.GeneratePayrollRunRequest
	_ = c.ShouldBindJSON(&req)

	slips, err := h.opsService.GenerateMonthlyPayrollRun(workspaceID, req.PeriodMonth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse("Gagal memproses kalkulasi payroll: "+err.Error()))
		return
	}
	c.JSON(http.StatusOK, domain.SuccessResponse(slips, "Kalkulasi slip gaji bulanan berhasil dieksekusi"))
}
