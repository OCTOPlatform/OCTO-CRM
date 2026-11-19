package domain

import "time"

type WorkspacePaymentSettings struct {
	ID                         string    `json:"id" db:"id"`
	WorkspaceID                string    `json:"workspace_id" db:"workspace_id"`
	BankName                   string    `json:"bank_name" db:"bank_name"`
	BankAccountNumber          string    `json:"bank_account_number" db:"bank_account_number"`
	BankAccountHolder          string    `json:"bank_account_holder" db:"bank_account_holder"`
	QRISImageUrl               string    `json:"qris_image_url" db:"qris_image_url"`
	QRISPayload                string    `json:"qris_payload" db:"qris_payload"`
	PaymentGatewayProvider     string    `json:"payment_gateway_provider" db:"payment_gateway_provider"` // 'manual', 'autogopay', 'midtrans', 'xendit'
	PaymentGatewayClientKey    string    `json:"payment_gateway_client_key" db:"payment_gateway_client_key"`
	PaymentGatewayServerKey    string    `json:"payment_gateway_server_key" db:"payment_gateway_server_key"`
	PaymentGatewayIsProduction bool      `json:"payment_gateway_is_production" db:"payment_gateway_is_production"`
	AutoGopayAPIKey            string    `json:"autogopay_api_key" db:"autogopay_api_key"`
	AutoGopayMerchantName      string    `json:"autogopay_merchant_name" db:"autogopay_merchant_name"`
	CreatedAt                  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt                  time.Time `json:"updated_at" db:"updated_at"`
}

type UpdateWorkspacePaymentSettingsRequest struct {
	BankName                   string  `json:"bank_name" binding:"required"`
	BankAccountNumber          string  `json:"bank_account_number" binding:"required"`
	BankAccountHolder          string  `json:"bank_account_holder" binding:"required"`
	QRISImageUrl               *string `json:"qris_image_url"`
	QRISPayload                *string `json:"qris_payload"`
	PaymentGatewayProvider     *string `json:"payment_gateway_provider"`
	PaymentGatewayClientKey    *string `json:"payment_gateway_client_key"`
	PaymentGatewayServerKey    *string `json:"payment_gateway_server_key"`
	PaymentGatewayIsProduction *bool   `json:"payment_gateway_is_production"`
	AutoGopayAPIKey            *string `json:"autogopay_api_key"`
	AutoGopayMerchantName      *string `json:"autogopay_merchant_name"`
}

// InvoiceQRISTransaction menyimpan sesi QRIS dinamis per invoice
type InvoiceQRISTransaction struct {
	ID              string     `json:"id" db:"id"`
	WorkspaceID     string     `json:"workspace_id" db:"workspace_id"`
	InvoiceID       string     `json:"invoice_id" db:"invoice_id"`
	Provider        string     `json:"provider" db:"provider"`
	TransactionID   string     `json:"transaction_id" db:"transaction_id"`
	OrderID         string     `json:"order_id" db:"order_id"`
	Amount          int64      `json:"amount" db:"amount"`
	QRString        string     `json:"qr_string" db:"qr_string"`
	QRURL           string     `json:"qr_url" db:"qr_url"`
	CheckoutURL     string     `json:"checkout_url" db:"checkout_url"`
	Status          string     `json:"status" db:"status"` // 'pending', 'settlement', 'paid', 'expire', 'cancel'
	GenerateCount   int        `json:"generate_count" db:"generate_count"`
	TransactionTime *time.Time `json:"transaction_time" db:"transaction_time"`
	ExpiryTime      *time.Time `json:"expiry_time" db:"expiry_time"`
	PaidAt          *time.Time `json:"paid_at" db:"paid_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// AutoGoPay External API Models
type AutoGopayGenerateQRISRequest struct {
	Amount int64 `json:"amount"`
}

type AutoGopayGenerateQRISResponse struct {
	Success bool                      `json:"success"`
	Message string                    `json:"message"`
	Data    AutoGopayGenerateQRISData `json:"data"`
}

type AutoGopayGenerateQRISData struct {
	TransactionID     string `json:"transaction_id"`
	OrderID           string `json:"order_id"`
	Amount            int64  `json:"amount"`
	TransactionStatus string `json:"transaction_status"`
	QRString          string `json:"qr_string"`
	QRURL             string `json:"qr_url"`
	CheckoutURL       string `json:"checkout_url"`
	TransactionTime   string `json:"transaction_time"`
	ExpiryTime        string `json:"expiry_time"`
}

type AutoGopayStatusRequest struct {
	TransactionID string `json:"transaction_id"`
}

type AutoGopayStatusResponse struct {
	Success bool                `json:"success"`
	Message string              `json:"message"`
	Data    AutoGopayStatusData `json:"data"`
}

type AutoGopayStatusData struct {
	TransactionID     string `json:"transaction_id"`
	OrderID           string `json:"order_id"`
	Amount            int64  `json:"amount"`
	TransactionStatus string `json:"transaction_status"` // 'pending', 'settlement', 'expire', 'cancel'
	SettlementTime    string `json:"settlement_time"`
}

type AutoGopayWebhookPayload struct {
	Event       string                      `json:"event"`
	Timestamp   string                      `json:"timestamp"`
	Transaction AutoGopayWebhookTransaction `json:"transaction"`
}

type AutoGopayWebhookTransaction struct {
	TransactionID string  `json:"transaction_id"`
	OrderID       string  `json:"order_id"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"` // 'PAID'
	PaymentMethod string  `json:"payment_method"` // 'QRIS'
	PaidAt        string  `json:"paid_at"`
}
