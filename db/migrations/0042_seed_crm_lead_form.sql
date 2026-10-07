-- Establish the single canonical CRM Lead form when a super-admin exists.
-- Existing CRM lead data is not modified.
INSERT INTO form_definitions (form_id, form_key, name, description, form_type, status, created_by, updated_by, created_at, updated_at)
SELECT 'FORM_CRM_LEAD', 'crm-lead', 'Lead Form', 'The configurable CRM Lead capture form.', 'crm_lead', 'published', u.user_id, u.user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM app_users u
WHERE u.role = 'super_admin'
  AND NOT EXISTS (SELECT 1 FROM form_definitions WHERE form_key = 'crm-lead')
ORDER BY u.user_id
LIMIT 1;

INSERT INTO form_versions (form_version_id, form_id, version_number, status, created_by, created_at, published_at)
SELECT 'FORMV_CRM_LEAD_1', 'FORM_CRM_LEAD', 1, 'published', d.created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM form_definitions d
WHERE d.form_key = 'crm-lead'
  AND NOT EXISTS (SELECT 1 FROM form_versions WHERE form_id = d.form_id);

INSERT INTO form_fields (field_id, form_version_id, field_key, field_type, label, order_index, is_required, placeholder, help_text, options_json, is_protected, system_key)
SELECT CONCAT('CRM_FIELD_', x.field_key), 'FORMV_CRM_LEAD_1', x.field_key, x.field_type, x.label, x.order_index, x.is_required, NULL, NULL, x.options_json, x.is_protected, x.field_key
FROM (
  SELECT 'lead_name' field_key, 'short_text' field_type, 'Lead name' label, 0 order_index, TRUE is_required, NULL options_json, TRUE is_protected
  UNION ALL SELECT 'phone', 'phone', 'Phone', 1, FALSE, NULL, FALSE
  UNION ALL SELECT 'location', 'short_text', 'Location/address', 2, FALSE, NULL, FALSE
  UNION ALL SELECT 'business_type', 'short_text', 'Business type', 3, FALSE, NULL, FALSE
  UNION ALL SELECT 'lead_source', 'short_text', 'Lead source', 4, FALSE, NULL, FALSE
  UNION ALL SELECT 'captured_at', 'date', 'Capture date', 5, TRUE, NULL, TRUE
  UNION ALL SELECT 'status', 'dropdown', 'Status', 6, TRUE, '["new","follow_up_required","converted","not_interested","lost"]', TRUE
  UNION ALL SELECT 'next_follow_up_date', 'date', 'Next follow-up date', 7, FALSE, NULL, FALSE
  UNION ALL SELECT 'notes', 'long_text', 'Notes', 8, FALSE, NULL, FALSE
) x
WHERE EXISTS (SELECT 1 FROM form_versions v WHERE v.form_version_id = 'FORMV_CRM_LEAD_1')
  AND NOT EXISTS (SELECT 1 FROM form_fields f WHERE f.form_version_id = 'FORMV_CRM_LEAD_1');
