-- Explicit vendor -> accountable agent assignments. Historical vendors are not backfilled.
CREATE TABLE IF NOT EXISTS agent_vendor_accountability_assignments (
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

SET @assignment_column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_cases' AND COLUMN_NAME = 'assignment_id'
);
SET @assignment_column_sql := IF(
  @assignment_column_exists = 0,
  'ALTER TABLE agent_accountability_cases ADD COLUMN assignment_id VARCHAR(32) NULL AFTER vendor_id',
  'SELECT 1'
);
PREPARE assignment_column_stmt FROM @assignment_column_sql;
EXECUTE assignment_column_stmt;
DEALLOCATE PREPARE assignment_column_stmt;

SET @assignment_index_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_cases' AND INDEX_NAME = 'idx_agent_accountability_case_assignment'
);
SET @assignment_index_sql := IF(
  @assignment_index_exists = 0,
  'ALTER TABLE agent_accountability_cases ADD KEY idx_agent_accountability_case_assignment (assignment_id)',
  'SELECT 1'
);
PREPARE assignment_index_stmt FROM @assignment_index_sql;
EXECUTE assignment_index_stmt;
DEALLOCATE PREPARE assignment_index_stmt;

SET @assignment_fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_cases'
    AND CONSTRAINT_NAME = 'fk_agent_accountability_case_assignment'
);
SET @assignment_fk_sql := IF(
  @assignment_fk_exists = 0,
  'ALTER TABLE agent_accountability_cases ADD CONSTRAINT fk_agent_accountability_case_assignment FOREIGN KEY (assignment_id) REFERENCES agent_vendor_accountability_assignments (assignment_id) ON UPDATE CASCADE ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE assignment_fk_stmt FROM @assignment_fk_sql;
EXECUTE assignment_fk_stmt;
DEALLOCATE PREPARE assignment_fk_stmt;
