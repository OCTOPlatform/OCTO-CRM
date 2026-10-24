-- 000004_omnichannel_inbox.up.sql

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'webchat'
    channel_identifier VARCHAR(255) NOT NULL,        -- phone number or email
    subject VARCHAR(255) DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'open',      -- 'open', 'pending', 'closed'
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    unread_count INT NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL DEFAULT 'customer', -- 'customer', 'agent'
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    status VARCHAR(50) NOT NULL DEFAULT 'delivered',    -- 'sent', 'delivered', 'read'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

-- 3. Seed initial omnichannel conversations
DO $$
DECLARE
    v_ws_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_budi_id UUID := '11111111-1111-1111-1111-111111111111';
    v_c1_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01'; -- Hendra Wijaya (PT Digital Niaga)
    v_c2_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02'; -- Ratna Sari (CV Berkah Kuliner)
    v_conv_wa UUID := '99999999-9999-9999-9999-999999999901';
    v_conv_email UUID := '99999999-9999-9999-9999-999999999902';
BEGIN
    -- WhatsApp Conversation
    INSERT INTO conversations (id, workspace_id, contact_id, channel, channel_identifier, subject, status, assigned_to_id, unread_count, last_message_at)
    VALUES (
        v_conv_wa,
        v_ws_id,
        v_c1_id,
        'whatsapp',
        '+6281234567890',
        'Tanya Paket POS 12 Cabang',
        'open',
        v_budi_id,
        1,
        NOW() - INTERVAL '5 minutes'
    ) ON CONFLICT (id) DO NOTHING;

    -- WhatsApp Messages
    INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, channel, status, created_at)
    VALUES 
    (gen_random_uuid(), v_conv_wa, 'customer', 'Hendra Wijaya', 'Halo tim OCTO CRM, saya mau tanya untuk integrasi 12 cabang retail kami apakah ada diskon khusus tahunan?', 'whatsapp', 'read', NOW() - INTERVAL '15 minutes'),
    (gen_random_uuid(), v_conv_wa, 'agent', 'Budi Santoso', 'Halo Pak Hendra! Tentu ada, untuk paket multi-cabang kami memberikan diskon komitmen 15% serta gratis onboarding.', 'whatsapp', 'delivered', NOW() - INTERVAL '10 minutes'),
    (gen_random_uuid(), v_conv_wa, 'customer', 'Hendra Wijaya', 'Bagus kalau begitu. Boleh minta dikirimkan quotation resminya via WhatsApp ini?', 'whatsapp', 'delivered', NOW() - INTERVAL '5 minutes')
    ON CONFLICT DO NOTHING;

    -- Email Conversation
    INSERT INTO conversations (id, workspace_id, contact_id, channel, channel_identifier, subject, status, assigned_to_id, unread_count, last_message_at)
    VALUES (
        v_conv_email,
        v_ws_id,
        v_c2_id,
        'email',
        'ratna@berkahkuliner.id',
        'Permintaan Demo Kartu NFC Review Google Maps',
        'open',
        v_budi_id,
        1,
        NOW() - INTERVAL '2 hours'
    ) ON CONFLICT (id) DO NOTHING;

    -- Email Messages
    INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, channel, status, created_at)
    VALUES 
    (gen_random_uuid(), v_conv_email, 'customer', 'Ratna Sari', 'Selamat siang tim OCTO, kami memiliki 5 outlet resto di Bandung dan ingin mencoba pilot project OCTO Tap Smart Review NFC. Apakah bisa jadwalkan sesi zoom demo besok siang?', 'email', 'delivered', NOW() - INTERVAL '2 hours')
    ON CONFLICT DO NOTHING;
END $$;
