-- Migration 000016 Down
DROP TABLE IF EXISTS payroll_slips CASCADE;
DROP TABLE IF EXISTS payroll_components CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS product_stock_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
ALTER TABLE workspaces DROP COLUMN IF EXISTS enabled_modules;
