-- Scope ticket number uniqueness to workspace rather than global
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_number_key;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_workspace_ticket_number_key;
ALTER TABLE tickets ADD CONSTRAINT tickets_workspace_ticket_number_key UNIQUE (workspace_id, ticket_number);
