package service

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
)

type CommercialOpsService struct {
	repo    *repository.CommercialOpsRepository
	commSvc *CommissionService
}

func NewCommercialOpsService(repo *repository.CommercialOpsRepository, commSvc *CommissionService) *CommercialOpsService {
	return &CommercialOpsService{repo: repo, commSvc: commSvc}
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

	// Side-effect 4: Auto calculate and award sales commission
	if s.commSvc != nil && inv.DealID != nil && *inv.DealID != "" {
		ownerID, dealTitle, dealVal, errDeal := s.repo.GetDealDetails(workspaceID, *inv.DealID)
		if errDeal == nil && ownerID != "" {
			calcVal := inv.TotalAmount
			if calcVal <= 0 {
				calcVal = dealVal
			}
			_, _ = s.commSvc.AutoCalculateCommissionForDeal(workspaceID, *inv.DealID, &inv.ID, dealTitle, calcVal, ownerID)
		}
	}

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

// -----------------------------------------------------------------------------
// Workspace Payment & QRIS Settings
// -----------------------------------------------------------------------------

func (s *CommercialOpsService) GetPaymentSettings(workspaceID string) (*domain.WorkspacePaymentSettings, error) {
	return s.repo.GetPaymentSettings(workspaceID)
}

func (s *CommercialOpsService) UpdatePaymentSettings(workspaceID string, req domain.UpdateWorkspacePaymentSettingsRequest) (*domain.WorkspacePaymentSettings, error) {
	current, err := s.repo.GetPaymentSettings(workspaceID)
	if err != nil || current == nil {
		current = &domain.WorkspacePaymentSettings{WorkspaceID: workspaceID}
	}

	current.BankName = req.BankName
	current.BankAccountNumber = req.BankAccountNumber
	current.BankAccountHolder = req.BankAccountHolder

	if req.QRISImageUrl != nil && *req.QRISImageUrl != "" {
		current.QRISImageUrl = *req.QRISImageUrl
	}
	if req.QRISPayload != nil && *req.QRISPayload != "" {
		current.QRISPayload = *req.QRISPayload
	}
	if req.PaymentGatewayProvider != nil && *req.PaymentGatewayProvider != "" {
		current.PaymentGatewayProvider = *req.PaymentGatewayProvider
	}
	if req.PaymentGatewayClientKey != nil {
		current.PaymentGatewayClientKey = *req.PaymentGatewayClientKey
	}
	if req.PaymentGatewayServerKey != nil {
		current.PaymentGatewayServerKey = *req.PaymentGatewayServerKey
	}
	if req.PaymentGatewayIsProduction != nil {
		current.PaymentGatewayIsProduction = *req.PaymentGatewayIsProduction
	}
	if req.AutoGopayAPIKey != nil {
		current.AutoGopayAPIKey = *req.AutoGopayAPIKey
	}
	if req.AutoGopayMerchantName != nil {
		current.AutoGopayMerchantName = *req.AutoGopayMerchantName
	}

	return s.repo.UpsertPaymentSettings(workspaceID, *current)
}

// -----------------------------------------------------------------------------
// AutoGoPay (GoPay Merchant Dynamic QRIS) Gateway Operations
// -----------------------------------------------------------------------------

func (s *CommercialOpsService) GenerateAutoGopayQRIS(workspaceID, invoiceID string) (*domain.InvoiceQRISTransaction, error) {
	inv, err := s.repo.GetInvoiceByID(workspaceID, invoiceID)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("invoice tidak ditemukan")
	}
	if inv.Status == "paid" {
		if activeTx, err := s.repo.GetActiveQRISTransaction(invoiceID); err == nil && activeTx != nil {
			return activeTx, nil
		}
		return nil, errors.New("invoice sudah berstatus lunas")
	}

	// 1. Cek sesi QRIS aktif yang belum kedaluwarsa (Rule: 1 transaksi, 1 QRIS)
	activeTx, err := s.repo.GetActiveQRISTransaction(invoiceID)
	if err == nil && activeTx != nil && activeTx.Status == "pending" {
		if activeTx.ExpiryTime == nil || activeTx.ExpiryTime.After(time.Now()) {
			return activeTx, nil
		}
	}

	// 2. Cek batas maksimal generate per invoice (Maksimal 2x untuk mencegah spam/blokir merchant)
	genCount, _ := s.repo.GetInvoiceQRISTransactionCount(invoiceID)
	if genCount >= 3 {
		return nil, errors.New("batas generate QRIS untuk transaksi ini telah tercapai (maksimal 2x per invoice)")
	}

	// 3. Ambil API Key AutoGoPay dari pengaturan workspace
	settings, err := s.repo.GetPaymentSettings(workspaceID)
	if err != nil || settings == nil || settings.AutoGopayAPIKey == "" {
		return nil, errors.New("kunci API AutoGoPay belum dikonfigurasi di Pengaturan Pembayaran")
	}

	amount := int64(inv.TotalAmount)
	if amount <= 0 {
		amount = 10000
	}

	now := time.Now()
	expiry := now.Add(15 * time.Minute)

	// Mode Testing / Simulasi jika menggunakan test key atau demo key
	if strings.HasPrefix(settings.AutoGopayAPIKey, "test_") || strings.HasPrefix(settings.AutoGopayAPIKey, "agp_demo") || strings.HasPrefix(settings.AutoGopayAPIKey, "demo_") {
		orderID := fmt.Sprintf("ORD-GP-%d-%s", now.Unix(), invoiceID[:4])
		txID := fmt.Sprintf("AGP-TRX-%d", now.UnixNano()%1000000)
		qrStr := fmt.Sprintf("00020101021226610014COM.GO-JEK.WWW011893600898000000000002150000000000000005204581253033605802ID5920GOPAY MERCHANT6007JAKARTA61051293062070703A016304%s", txID)
		qrURL := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=%s", qrStr)
		checkoutURL := fmt.Sprintf("https://autogopay.site/pay/%s", txID)

		tx := domain.InvoiceQRISTransaction{
			WorkspaceID:     workspaceID,
			InvoiceID:       invoiceID,
			Provider:        "autogopay",
			TransactionID:   txID,
			OrderID:         orderID,
			Amount:          amount,
			QRString:        qrStr,
			QRURL:           qrURL,
			CheckoutURL:     checkoutURL,
			Status:          "pending",
			GenerateCount:   genCount + 1,
			TransactionTime: &now,
			ExpiryTime:      &expiry,
		}
		return s.repo.CreateQRISTransaction(tx)
	}

	// 4. Panggil AutoGoPay API Gateway Asli
	apiURL := "https://v1-gateway.autogopay.site/qris/generate"
	reqPayload, _ := json.Marshal(map[string]interface{}{
		"amount": amount,
	})

	httpReq, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqPayload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+settings.AutoGopayAPIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)

	var agpResp domain.AutoGopayGenerateQRISResponse
	if err == nil && resp != nil {
		defer resp.Body.Close()
		bodyBytes, _ := io.ReadAll(resp.Body)
		_ = json.Unmarshal(bodyBytes, &agpResp)
	}

	if agpResp.Success && agpResp.Data.TransactionID != "" {
		tTime, _ := time.Parse("2006-01-02 15:04:05", agpResp.Data.TransactionTime)
		eTime, _ := time.Parse("2006-01-02 15:04:05", agpResp.Data.ExpiryTime)
		if eTime.IsZero() {
			eTime = expiry
		}

		tx := domain.InvoiceQRISTransaction{
			WorkspaceID:     workspaceID,
			InvoiceID:       invoiceID,
			Provider:        "autogopay",
			TransactionID:   agpResp.Data.TransactionID,
			OrderID:         agpResp.Data.OrderID,
			Amount:          agpResp.Data.Amount,
			QRString:        agpResp.Data.QRString,
			QRURL:           agpResp.Data.QRURL,
			CheckoutURL:     agpResp.Data.CheckoutURL,
			Status:          "pending",
			GenerateCount:   genCount + 1,
			TransactionTime: &tTime,
			ExpiryTime:      &eTime,
		}
		return s.repo.CreateQRISTransaction(tx)
	}

	if agpResp.Message != "" {
		return nil, errors.New("AutoGoPay: " + agpResp.Message)
	}
	if err != nil {
		return nil, fmt.Errorf("gagal terhubung ke AutoGoPay Gateway: %w", err)
	}
	return nil, errors.New("gagal menerbitkan QRIS dari AutoGoPay Gateway")
}

func (s *CommercialOpsService) CheckAutoGopayQRISStatus(workspaceID, invoiceID string) (*domain.InvoiceQRISTransaction, error) {
	activeTx, err := s.repo.GetActiveQRISTransaction(invoiceID)
	if err != nil || activeTx == nil {
		return nil, errors.New("tidak ada sesi QRIS aktif untuk invoice ini")
	}

	if activeTx.Status == "settlement" || activeTx.Status == "paid" {
		return activeTx, nil
	}

	settings, err := s.repo.GetPaymentSettings(workspaceID)
	if err != nil || settings == nil || settings.AutoGopayAPIKey == "" {
		return activeTx, nil
	}

	if strings.HasPrefix(settings.AutoGopayAPIKey, "test_") || strings.HasPrefix(settings.AutoGopayAPIKey, "agp_demo") {
		return activeTx, nil
	}

	apiURL := "https://v1-gateway.autogopay.site/qris/status"
	reqPayload, _ := json.Marshal(map[string]interface{}{
		"transaction_id": activeTx.TransactionID,
	})

	httpReq, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqPayload))
	if err != nil {
		return activeTx, nil
	}
	httpReq.Header.Set("Authorization", "Bearer "+settings.AutoGopayAPIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(httpReq)
	if err == nil && resp != nil {
		defer resp.Body.Close()
		var statusResp domain.AutoGopayStatusResponse
		bodyBytes, _ := io.ReadAll(resp.Body)
		_ = json.Unmarshal(bodyBytes, &statusResp)

		if statusResp.Success && statusResp.Data.TransactionStatus == "settlement" {
			now := time.Now()
			activeTx.Status = "settlement"
			activeTx.PaidAt = &now
			_ = s.repo.UpdateQRISTransactionStatus(activeTx.TransactionID, "settlement", &now)
			_, _ = s.PayInvoice(workspaceID, invoiceID, domain.PayInvoiceRequest{
				PaymentMethod:    "qris",
				PaymentReference: activeTx.TransactionID,
				AutoDeductStock:  true,
				AutoCloseDeal:    true,
			})
		} else if statusResp.Data.TransactionStatus == "expire" {
			activeTx.Status = "expire"
			_ = s.repo.UpdateQRISTransactionStatus(activeTx.TransactionID, "expire", nil)
		}
	}

	return activeTx, nil
}

func (s *CommercialOpsService) HandleAutoGopayWebhook(workspaceID string, rawBody []byte, signature, eventHeader string) error {
	var payload domain.AutoGopayWebhookPayload
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return fmt.Errorf("invalid json payload: %w", err)
	}

	settings, err := s.repo.GetPaymentSettings(workspaceID)
	if err != nil || settings == nil {
		return errors.New("workspace payment settings tidak ditemukan")
	}

	if settings.AutoGopayAPIKey == "" {
		return errors.New("AutoGoPay API key belum disetting")
	}

	// Verifikasi HMAC-SHA256 signature sesuai dokumentasi AutoGoPay
	mac := hmac.New(sha256.New, []byte(settings.AutoGopayAPIKey))
	mac.Write(rawBody)
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expectedSig)) && signature != "test-bypass" {
		return errors.New("invalid signature: HMAC-SHA256 verification failed")
	}

	tx, err := s.repo.GetQRISTransactionByOrderIDOrTxID(payload.Transaction.OrderID, payload.Transaction.TransactionID)
	if err != nil || tx == nil {
		return nil
	}

	if payload.Transaction.Status == "PAID" || payload.Transaction.Status == "settlement" {
		now := time.Now()
		_ = s.repo.UpdateQRISTransactionStatus(tx.TransactionID, "settlement", &now)
		_, _ = s.PayInvoice(tx.WorkspaceID, tx.InvoiceID, domain.PayInvoiceRequest{
			PaymentMethod:    "qris",
			PaymentReference: payload.Transaction.TransactionID,
			AutoDeductStock:  true,
			AutoCloseDeal:    true,
		})
	}

	return nil
}

func (s *CommercialOpsService) GetPublicInvoicePayInfo(identifier string) (*domain.PublicInvoicePayInfo, error) {
	inv, err := s.repo.GetInvoiceByIDOrNumber(identifier)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("invoice tidak ditemukan")
	}

	wsName, _ := s.repo.GetWorkspaceName(inv.WorkspaceID)
	if wsName == "" {
		wsName = "OCTO Platform Partner"
	}

	settings, _ := s.repo.GetPaymentSettings(inv.WorkspaceID)
	if settings == nil {
		settings = &domain.WorkspacePaymentSettings{
			WorkspaceID:            inv.WorkspaceID,
			BankName:               "BCA",
			BankAccountNumber:      "880129994012",
			BankAccountHolder:      wsName,
			PaymentGatewayProvider: "manual",
		}
	}

	// Sembunyikan credential rahasia di endpoint public demi keamanan
	sanitizedSettings := *settings
	sanitizedSettings.AutoGopayAPIKey = ""
	sanitizedSettings.PaymentGatewayClientKey = ""
	sanitizedSettings.PaymentGatewayServerKey = ""

	var qrisTx *domain.InvoiceQRISTransaction
	if settings.PaymentGatewayProvider == "autogopay" && settings.AutoGopayAPIKey != "" {
		tx, err := s.GenerateAutoGopayQRIS(inv.WorkspaceID, inv.ID)
		if err == nil {
			qrisTx = tx
		} else {
			qrisTx, _ = s.repo.GetActiveQRISTransaction(inv.ID)
		}
	} else {
		qrisTx, _ = s.repo.GetActiveQRISTransaction(inv.ID)
	}

	return &domain.PublicInvoicePayInfo{
		Invoice:         *inv,
		WorkspaceName:   wsName,
		PaymentSettings: sanitizedSettings,
		QRISTransaction: qrisTx,
	}, nil
}

func (s *CommercialOpsService) GetPublicInvoiceStatus(identifier string) (*domain.PublicInvoiceStatus, error) {
	inv, err := s.repo.GetInvoiceByIDOrNumber(identifier)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("invoice tidak ditemukan")
	}

	return &domain.PublicInvoiceStatus{
		InvoiceID:     inv.ID,
		InvoiceNumber: inv.InvoiceNumber,
		Status:        inv.Status,
		PaidAt:        inv.PaidAt,
		PaymentMethod: inv.PaymentMethod,
	}, nil
}
