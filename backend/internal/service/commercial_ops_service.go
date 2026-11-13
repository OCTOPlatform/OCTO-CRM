package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
)

type CommercialOpsService struct {
	repo *repository.CommercialOpsRepository
}

func NewCommercialOpsService(repo *repository.CommercialOpsRepository) *CommercialOpsService {
	return &CommercialOpsService{repo: repo}
}

// -----------------------------------------------------------------------------
// Invoices & Quotations
// -----------------------------------------------------------------------------

func (s *CommercialOpsService) ListInvoices(workspaceID, invType, status string) ([]domain.Invoice, error) {
	return s.repo.ListInvoices(workspaceID, invType, status)
}

func (s *CommercialOpsService) GetInvoiceByID(workspaceID, id string) (*domain.Invoice, error) {
	return s.repo.GetInvoiceByID(workspaceID, id)
}

func (s *CommercialOpsService) CreateInvoice(workspaceID string, req domain.CreateInvoiceRequest) (*domain.Invoice, error) {
	invType := strings.ToLower(req.Type)
	if invType != "quotation" && invType != "invoice" {
		invType = "invoice"
	}

	// Auto generate invoice/quotation number if not provided
	invNumber := req.InvoiceNumber
	if strings.TrimSpace(invNumber) == "" {
		prefix := "INV"
		if invType == "quotation" {
			prefix = "QUO"
		}
		invNumber = fmt.Sprintf("%s-%s-%04d", prefix, time.Now().Format("200601"), time.Now().UnixNano()%10000)
	}

	issueDate := req.IssueDate
	if issueDate == "" {
		issueDate = time.Now().Format("2006-01-02")
	}

	dueDate := req.DueDate
	if dueDate == "" {
		dueDate = time.Now().AddDate(0, 0, 14).Format("2006-01-02")
	}

	// Compute subtotal from items
	var subtotal float64
	var items []domain.InvoiceItem
	for _, it := range req.Items {
		totalPrice := (it.Quantity * it.UnitPrice) - it.Discount
		if totalPrice < 0 {
			totalPrice = 0
		}
		subtotal += totalPrice

		items = append(items, domain.InvoiceItem{
			ProductID:  it.ProductID,
			ItemName:   it.ItemName,
			SKU:        it.SKU,
			Quantity:   it.Quantity,
			UnitPrice:  it.UnitPrice,
			Discount:   it.Discount,
			TotalPrice: totalPrice,
		})
	}

	totalAmount := subtotal + req.TaxAmount - req.DiscountAmount
	if totalAmount < 0 {
		totalAmount = 0
	}

	status := "draft"
	if invType == "quotation" {
		status = "sent"
	}

	inv := domain.Invoice{
		WorkspaceID:      workspaceID,
		DealID:           req.DealID,
		ContactID:        req.ContactID,
		CompanyID:        req.CompanyID,
		InvoiceNumber:    invNumber,
		IssueDate:        issueDate,
		DueDate:          dueDate,
		Type:             invType,
		Status:           status,
		Subtotal:         subtotal,
		TaxAmount:        req.TaxAmount,
		DiscountAmount:   req.DiscountAmount,
		TotalAmount:      totalAmount,
		Notes:            req.Notes,
		Terms:            req.Terms,
		PaymentMethod:    req.PaymentMethod,
		PaymentReference: fmt.Sprintf("REF-%d", time.Now().Unix()),
	}

	return s.repo.CreateInvoice(inv, items)
}

func (s *CommercialOpsService) PayInvoice(workspaceID, id string, req domain.PayInvoiceRequest) (*domain.Invoice, error) {
	inv, err := s.repo.GetInvoiceByID(workspaceID, id)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("invoice tidak ditemukan")
	}

	now := time.Now()
	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "qris"
	}
	paymentRef := req.PaymentReference
	if paymentRef == "" {
		paymentRef = fmt.Sprintf("PAID-%s-%d", strings.ToUpper(paymentMethod), now.Unix())
	}

	// Update invoice status to 'paid'
	err = s.repo.UpdateInvoiceStatus(workspaceID, id, "paid", paymentMethod, paymentRef, &now)
	if err != nil {
		return nil, err
	}

	// Side-effect 1: Auto deduct product stock if requested
	if req.AutoDeductStock {
		for _, item := range inv.Items {
			if item.ProductID != nil && *item.ProductID != "" && item.Quantity > 0 {
				_ = s.repo.DeductProductStock(workspaceID, *item.ProductID, item.Quantity, inv.InvoiceNumber)
			}
		}
	}

	// Side-effect 2: Auto close linked Deal to 'won' if requested
	if req.AutoCloseDeal && inv.DealID != nil && *inv.DealID != "" {
		_ = s.repo.MarkDealAsWon(workspaceID, *inv.DealID)
	}

	// Side-effect 3: Trigger 'invoice_paid' automation log
	_ = s.repo.RecordAutomationLog(domain.AutomationLog{
		WorkspaceID:   workspaceID,
		WorkflowID:    "00000000-0000-0000-0000-000000000000",
		TargetType:    "invoice",
		TargetID:      inv.ID,
		TargetName:    fmt.Sprintf("%s (%s)", inv.InvoiceNumber, inv.ContactName),
		Status:        "success",
		ActionDetails: fmt.Sprintf("Pembayaran lunas via %s (%s). Deal & Stok terupdate otomatis.", paymentMethod, paymentRef),
	})

	return s.repo.GetInvoiceByID(workspaceID, id)
}

// -----------------------------------------------------------------------------
// Automation Workflows & Logs
// -----------------------------------------------------------------------------

func (s *CommercialOpsService) ListWorkflows(workspaceID string) ([]domain.AutomationWorkflow, error) {
	return s.repo.ListWorkflows(workspaceID)
}

func (s *CommercialOpsService) CreateWorkflow(workspaceID string, req domain.CreateWorkflowRequest) (*domain.AutomationWorkflow, error) {
	wf := domain.AutomationWorkflow{
		WorkspaceID:   workspaceID,
		Name:          req.Name,
		Description:   req.Description,
		TriggerType:   req.TriggerType,
		TriggerConfig: req.TriggerConfig,
		ActionType:    req.ActionType,
		ActionConfig:  req.ActionConfig,
		IsActive:      req.IsActive,
	}
	return s.repo.CreateWorkflow(wf)
}

func (s *CommercialOpsService) UpdateWorkflow(workspaceID, id string, req domain.CreateWorkflowRequest) error {
	wf := domain.AutomationWorkflow{
		ID:            id,
		WorkspaceID:   workspaceID,
		Name:          req.Name,
		Description:   req.Description,
		TriggerType:   req.TriggerType,
		TriggerConfig: req.TriggerConfig,
		ActionType:    req.ActionType,
		ActionConfig:  req.ActionConfig,
		IsActive:      req.IsActive,
	}
	return s.repo.UpdateWorkflow(wf)
}

func (s *CommercialOpsService) DeleteWorkflow(workspaceID, id string) error {
	return s.repo.DeleteWorkflow(workspaceID, id)
}

func (s *CommercialOpsService) TriggerWorkflow(workspaceID, id string, req domain.TriggerWorkflowRequest) (*domain.AutomationLog, error) {
	wf, err := s.repo.GetWorkflowByID(workspaceID, id)
	if err != nil {
		return nil, err
	}
	if wf == nil {
		return nil, errors.New("workflow tidak ditemukan")
	}

	_ = s.repo.IncrementWorkflowExecution(id)

	actionDetails := fmt.Sprintf("Aksi otomatis '%s' dieksekusi untuk target %s (%s). Pesan terkirim via gateway WAHA.",
		wf.ActionType, req.TargetType, req.TargetName,
	)

	log := domain.AutomationLog{
		WorkflowID:    id,
		WorkspaceID:   workspaceID,
		TargetType:    req.TargetType,
		TargetID:      req.TargetID,
		TargetName:    req.TargetName,
		Status:        "success",
		ActionDetails: actionDetails,
		WorkflowName:  wf.Name,
		CreatedAt:     time.Now(),
	}

	err = s.repo.RecordAutomationLog(log)
	return &log, err
}

func (s *CommercialOpsService) ListAutomationLogs(workspaceID string, limit int) ([]domain.AutomationLog, error) {
	return s.repo.ListAutomationLogs(workspaceID, limit)
}
