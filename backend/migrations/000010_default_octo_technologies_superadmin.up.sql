-- 000010_default_octo_technologies_superadmin.up.sql

DO $$
DECLARE
    v_user_egicp_id UUID := '0c700000-0000-0000-0000-000000000001';
    v_ws_octo_id    UUID := '0c700000-0000-0000-0000-000000000000';
    v_pipe_id       UUID := '0c700000-0000-0000-0000-000000000002';
    v_now           TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Clean up old temporary account egi.chandra.1997@gmail.com
    DELETE FROM workspace_invitations WHERE LOWER(email) = 'egi.chandra.1997@gmail.com';
    DELETE FROM workspace_members WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = 'egi.chandra.1997@gmail.com');
    DELETE FROM users WHERE LOWER(email) = 'egi.chandra.1997@gmail.com';

    -- 2. Insert or update default superadmin user egichandrapratama@gmail.com
    INSERT INTO users (id, email, password_hash, full_name, avatar_url, is_superadmin, created_at, updated_at)
    VALUES (
        v_user_egicp_id,
        'egichandrapratama@gmail.com',
        '$2a$10$EH1M/3Mxo9O6d6fHXKBhYeMXsH3rN1UjgacaTWoKIrtv31CTzQIG.', -- password123
        'Egi Chandra Pratama',
        'https://api.dicebear.com/7.x/initials/svg?seed=Egi Chandra Pratama',
        true,
        v_now,
        v_now
    )
    ON CONFLICT (email) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        is_superadmin = true,
        updated_at = v_now;

    -- Ensure only egichandrapratama@gmail.com is Platform Superadmin
    UPDATE users SET is_superadmin = false WHERE email != 'egichandrapratama@gmail.com';

    -- 3. Insert or update default company: PT OCTO Technologies Indonesia
    INSERT INTO workspaces (
        id, name, slug, timezone, currency, 
        status, subscription_plan, max_users, max_channels, expires_at, 
        created_at, updated_at
    )
    VALUES (
        v_ws_octo_id,
        'PT OCTO Technologies Indonesia',
        'octo-technologies',
        'Asia/Jakarta',
        'IDR',
        'active',
        'enterprise',
        100,
        20,
        '2099-12-31 23:59:59+07',
        v_now,
        v_now
    )
    ON CONFLICT (slug) DO UPDATE 
    SET name = EXCLUDED.name,
        status = 'active',
        subscription_plan = 'enterprise',
        max_users = 100,
        max_channels = 20,
        expires_at = '2099-12-31 23:59:59+07',
        updated_at = v_now;

    -- 4. Associate egichandrapratama@gmail.com as Owner of PT OCTO Technologies Indonesia
    INSERT INTO workspace_members (id, workspace_id, user_id, role, department, joined_at)
    SELECT gen_random_uuid(), w.id, u.id, 'owner', 'management', v_now
    FROM workspaces w, users u
    WHERE w.slug = 'octo-technologies' AND u.email = 'egichandrapratama@gmail.com'
    ON CONFLICT (workspace_id, user_id) DO UPDATE 
    SET role = 'owner', department = 'management';

    -- 5. Create default Sales Pipeline & Stages for PT OCTO Technologies Indonesia if not exists
    IF NOT EXISTS (SELECT 1 FROM pipelines WHERE workspace_id = v_ws_octo_id) THEN
        INSERT INTO pipelines (id, workspace_id, name, is_default, created_at, updated_at)
        VALUES (v_pipe_id, v_ws_octo_id, 'Sales Pipeline Utama', true, v_now, v_now);

        INSERT INTO pipeline_stages (id, pipeline_id, name, order_index, probability, is_won, is_lost, created_at, updated_at)
        VALUES 
        (gen_random_uuid(), v_pipe_id, 'New Lead', 0, 10, false, false, v_now, v_now),
        (gen_random_uuid(), v_pipe_id, 'Contacted', 1, 20, false, false, v_now, v_now),
        (gen_random_uuid(), v_pipe_id, 'Qualified', 2, 40, false, false, v_now, v_now),
        (gen_random_uuid(), v_pipe_id, 'Proposal', 3, 60, false, false, v_now, v_now),
        (gen_random_uuid(), v_pipe_id, 'Negotiation', 4, 80, false, false, v_now, v_now),
        (gen_random_uuid(), v_pipe_id, 'Won', 5, 100, true, false, v_now, v_now),
        (gen_random_uuid(), v_pipe_id, 'Lost', 6, 0, false, true, v_now, v_now);
    END IF;

    -- 6. Ensure egichandrapratama@gmail.com belongs strictly to PT OCTO Technologies Indonesia and NOT client workspaces
    DELETE FROM workspace_members 
    WHERE workspace_id != v_ws_octo_id 
      AND user_id = (SELECT id FROM users WHERE email = 'egichandrapratama@gmail.com');

END $$;
