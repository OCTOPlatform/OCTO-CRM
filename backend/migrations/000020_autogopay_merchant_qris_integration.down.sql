-- ==============================================================================
-- 000020_autogopay_merchant_qris_integration.down.sql
-- ==============================================================================

DROP TABLE IF EXISTS invoice_qris_transactions;

ALTER TABLE workspace_payment_settings 
DROP COLUMN IF EXISTS autogopay_api_key,
DROP COLUMN IF EXISTS autogopay_merchant_name;
