ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_workspace_ticket_number_key;
ALTER TABLE tickets ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);
