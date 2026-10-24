-- 000006_helpdesk_tickets_and_multi_channel.down.sql

DROP TABLE IF EXISTS ticket_activities;
DROP TABLE IF EXISTS tickets;

ALTER TABLE conversations DROP COLUMN IF EXISTS department;
ALTER TABLE conversations DROP COLUMN IF EXISTS channel_id;

ALTER TABLE workspace_channels DROP COLUMN IF EXISTS qr_code;
ALTER TABLE workspace_channels DROP COLUMN IF EXISTS assigned_user_id;
ALTER TABLE workspace_channels DROP COLUMN IF EXISTS department;
ALTER TABLE workspace_channels DROP COLUMN IF EXISTS channel_name;

ALTER TABLE workspace_members DROP COLUMN IF EXISTS department;
