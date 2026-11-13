-- Migration 000016: Unified Business Operations (Inventory, Attendance & Dynamic Payroll Formula Engine)

-- 1. Add modular workspace enabled modules
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS enabled_modules JSONB NOT NULL DEFAULT '{"crm_sales": true, "inventory_products": true, "workforce_attendance": true, "dynamic_payroll": true}'::jsonb;

-- 2. Products (Master SKU & Inventory)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Umum',
    description TEXT NOT NULL DEFAULT '',
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sale_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_alert INT NOT NULL DEFAULT 5,
    unit VARCHAR(50) NOT NULL DEFAULT 'Pcs',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_products_ws ON products(workspace_id);

-- 3. Product Stock Movements (Audit log)
CREATE TABLE IF NOT EXISTS product_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment', 'deal_won'
    quantity INT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON product_stock_movements(product_id);

-- 4. Attendances (Presensi GPS & Selfie Staff)
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    gps_lat NUMERIC(10, 7),
    gps_lng NUMERIC(10, 7),
    location_name VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'present', -- 'present', 'late', 'absent', 'on_leave'
    overtime_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendances_ws_user_date ON attendances(workspace_id, user_id, date);

-- 5. Payroll Components & Formula Rules
CREATE TABLE IF NOT EXISTS payroll_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'allowance', 'deduction', 'commission', 'tax'
    formula_expression TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, code)
);
CREATE INDEX IF NOT EXISTS idx_payroll_components_ws ON payroll_components(workspace_id);

-- 6. Payroll Slips (Slip Gaji Terhitung)
CREATE TABLE IF NOT EXISTS payroll_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_month VARCHAR(20) NOT NULL, -- e.g. '2026-11'
    base_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_allowances NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_commissions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'paid'
    calculation_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id, period_month)
);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_ws_month ON payroll_slips(workspace_id, period_month);

-- 7. Seed Initial Sample Products for existing workspaces
INSERT INTO products (workspace_id, sku, name, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit)
SELECT 
    id,
    'OCTO-DEV-S1',
    'OCTO Tap Smart NFC Card (Premium Metal)',
    'Hardware & Gadgets',
    'Kartu nama pintar NFC terintegrasi CRM untuk sales networking',
    75000.00,
    199000.00,
    120,
    15,
    'Pcs'
FROM workspaces
ON CONFLICT (workspace_id, sku) DO NOTHING;

INSERT INTO products (workspace_id, sku, name, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit)
SELECT 
    id,
    'OCTO-CRM-LIC',
    'Paket Lisensi Software CRM Enterprise (Tahunan)',
    'Software Subscription',
    'Lisensi akses cloud multi-channel WhatsApp, Pipeline, dan Helpdesk',
    1200000.00,
    3500000.00,
    999,
    10,
    'Paket'
FROM workspaces
ON CONFLICT (workspace_id, sku) DO NOTHING;

INSERT INTO products (workspace_id, sku, name, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit)
SELECT 
    id,
    'OCTO-POS-TERM',
    'Mesin POS Terminal Kasir Dual Screen Android',
    'Hardware & Gadgets',
    'Terminal kasir layar sentuh lengkap dengan printer struk thermal 58mm',
    2100000.00,
    3250000.00,
    18,
    5,
    'Unit'
FROM workspaces
ON CONFLICT (workspace_id, sku) DO NOTHING;

-- 8. Seed Default Formula Components for workspaces
INSERT INTO payroll_components (workspace_id, name, code, type, formula_expression, description)
SELECT 
    id,
    'Uang Makan Kehadiran',
    'UANG_MAKAN',
    'allowance',
    'HARI_HADIR * 35000',
    'Tunjangan makan harian berdasarkan total hari presensi hadir'
FROM workspaces
ON CONFLICT (workspace_id, code) DO NOTHING;

INSERT INTO payroll_components (workspace_id, name, code, type, formula_expression, description)
SELECT 
    id,
    'Komisi Omset Penjualan (CRM Closing)',
    'KOMISI_SALES',
    'commission',
    'TOTAL_OMSET_WON * 0.03',
    'Insentif komisi 3% dari total nilai deal won yang ditutup staf pada bulan berjalan'
FROM workspaces
ON CONFLICT (workspace_id, code) DO NOTHING;

INSERT INTO payroll_components (workspace_id, name, code, type, formula_expression, description)
SELECT 
    id,
    'Bonus Target Ekstra',
    'BONUS_TARGET',
    'commission',
    'IF(JUMLAH_DEAL_WON >= 5, 1000000, 0)',
    'Bonus spesial Rp 1.000.000 jika staf berhasil closing minimal 5 deal dalam sebulan'
FROM workspaces
ON CONFLICT (workspace_id, code) DO NOTHING;

INSERT INTO payroll_components (workspace_id, name, code, type, formula_expression, description)
SELECT 
    id,
    'Potongan Keterlambatan Presensi',
    'POTONGAN_TELAT',
    'deduction',
    'JUMLAH_TERLAMBAT * 25000',
    'Potongan Rp 25.000 per kejadian keterlambatan masuk kantor'
FROM workspaces
ON CONFLICT (workspace_id, code) DO NOTHING;

INSERT INTO payroll_components (workspace_id, name, code, type, formula_expression, description)
SELECT 
    id,
    'Estimasi Potongan PPh 21 TER',
    'PAJAK_PPH21',
    'tax',
    'IF(GAJI_BRUTO > 5000000, GAJI_BRUTO * 0.02, 0)',
    'Estimasi potongan pajak penghasilan PPh 21 kategori efektif bulanan'
FROM workspaces
ON CONFLICT (workspace_id, code) DO NOTHING;
