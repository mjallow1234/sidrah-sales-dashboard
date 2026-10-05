INSERT IGNORE INTO access_permissions
  (permission_key, module, section, action, display_name, description, active, created_at, updated_at)
VALUES
  ('crm.status.change', 'crm', NULL, 'status_change', 'Change CRM lead status', 'Change CRM lead status subject to existing ownership and business rules.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
