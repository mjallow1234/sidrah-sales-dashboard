-- Explicit vendor -> accountable agent assignments. Historical vendors are not backfilled.
CREATE TABLE agent_vendor_accountability_assignments (
  assignment_id VARCHAR(32) NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  agent_user_id VARCHAR(32) NOT NULL,
  starting_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'GMD',
  assigned_at DATETIME NOT NULL,
  assigned_by VARCHAR(32) NOT NULL,
  operation_id VARCHAR(128) NOT NULL,
  status ENUM('active','ended') NOT NULL DEFAULT 'active',
  ended_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_id),
  UNIQUE KEY ux_vendor_accountability_assignment_operation (operation_id),
  KEY idx_vendor_accountability_assignment_vendor (vendor_id, status),
  KEY idx_vendor_accountability_assignment_agent (agent_user_id, status),
  CONSTRAINT fk_vendor_accountability_assignment_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_accountability_assignment_agent FOREIGN KEY (agent_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_accountability_assignment_assigned_by FOREIGN KEY (assigned_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE agent_accountability_cases
  ADD COLUMN assignment_id VARCHAR(32) NULL AFTER vendor_id,
  ADD KEY idx_agent_accountability_case_assignment (assignment_id),
  ADD CONSTRAINT fk_agent_accountability_case_assignment FOREIGN KEY (assignment_id) REFERENCES agent_vendor_accountability_assignments (assignment_id) ON UPDATE CASCADE ON DELETE RESTRICT;
