-- Add bot active and handoff tracking to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bot_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bot_handoff_reason TEXT DEFAULT '';
