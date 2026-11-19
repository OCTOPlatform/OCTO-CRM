-- ==============================================================================
-- 000018_sales_commission_and_war_room.up.sql
-- Sales Commission Engine & Live Sales War-Room Leaderboard
-- ==============================================================================

-- 1. Sales Commission Plans (Rules & Thresholds)
CREATE TABLE IF NOT EXISTS sales_commission_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    calculation_type VARCHAR(50) NOT NULL DEFAULT 'percentage_deal', -- 'percentage_deal', 'fixed_amount', 'tiered_threshold'
    base_rate NUMERIC(8,2) NOT NULL DEFAULT 2.50, -- 2.5%
    threshold_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- e.g. 50,000,000 IDR
    bonus_rate NUMERIC(8,2) NOT NULL DEFAULT 0.00, -- extra bonus rate if deal exceeds threshold
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_commission_plans_ws ON sales_commission_plans(workspace_id);

-- 2. Sales Commissions (Transaction Ledger)
CREATE TABLE IF NOT EXISTS sales_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES sales_commission_plans(id) ON DELETE SET NULL,
    deal_title VARCHAR(255) NOT NULL DEFAULT '',
    deal_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    commission_rate NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'paid_in_payroll', 'rejected'
    period VARCHAR(20) NOT NULL DEFAULT '', -- e.g. '2026-11'
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    paid_payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_ws_user ON sales_commissions(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_period ON sales_commissions(workspace_id, period);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_status ON sales_commissions(status);

-- 3. Sales Team Targets (Monthly Omset Goal for War-Room Display)
CREATE TABLE IF NOT EXISTS sales_team_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL, -- e.g. '2026-11'
    target_amount NUMERIC(15,2) NOT NULL DEFAULT 100000000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, period)
);
CREATE INDEX IF NOT EXISTS idx_sales_team_targets_ws_period ON sales_team_targets(workspace_id, period);

-- 4. Seed initial commission plans, target & commissions for existing workspaces
DO $$
DECLARE
    ws_rec RECORD;
    plan_id UUID;
    rep_user_id UUID;
    deal_rec RECORD;
    current_period VARCHAR(20) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
    FOR ws_rec IN SELECT id FROM workspaces LOOP
        -- Seed Default Commission Plan
        INSERT INTO sales_commission_plans (id, workspace_id, name, calculation_type, base_rate, threshold_amount, bonus_rate, is_active)
        VALUES (
            gen_random_uuid(),
            ws_rec.id,
            'Skema Komisi Standar 2026',
            'tiered_threshold',
            3.00, -- 3% base
            50000000.00, -- threshold 50jt
            5.00, -- 5% bonus di atas threshold
            true
        ) RETURNING id INTO plan_id;

        -- Seed Monthly Target (Rp 250,000,000)
        INSERT INTO sales_team_targets (workspace_id, period, target_amount)
        VALUES (ws_rec.id, current_period, 250000000.00)
        ON CONFLICT (workspace_id, period) DO UPDATE SET target_amount = 250000000.00;

        -- Seed sample commissions for existing deals
        FOR deal_rec IN SELECT d.id, d.title, d.value, d.owner_id 
                        FROM deals d 
                        WHERE d.workspace_id = ws_rec.id AND d.owner_id IS NOT NULL 
                        LIMIT 3 LOOP
            INSERT INTO sales_commissions (
                workspace_id, user_id, deal_id, plan_id, deal_title, deal_amount, 
                commission_rate, commission_amount, status, period, notes
            ) VALUES (
                ws_rec.id,
                deal_rec.owner_id,
                deal_rec.id,
                plan_id,
                deal_rec.title,
                deal_rec.value,
                3.00,
                deal_rec.value * 0.03,
                'approved',
                current_period,
                'Komisi otomatis deal closing'
            ) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
