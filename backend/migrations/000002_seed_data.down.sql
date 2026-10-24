-- 000002_seed_data.down.sql
DELETE FROM workspaces WHERE slug = 'maju-bersama';
DELETE FROM users WHERE email IN ('budi@octocrm.id', 'siti@octocrm.id', 'reza@octocrm.id');
