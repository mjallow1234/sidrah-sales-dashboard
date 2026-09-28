-- Phase 1 Agent Accountability: explicit delivery linkage and append-only foundation.
-- Existing deployments may already contain this nullable column; the guards
-- keep the migration safe for both those deployments and a clean schema.
SET @delivery_vendor_column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deliveries' AND COLUMN_NAME = 'vendor_id'
);
SET @delivery_vendor_column_sql := IF(
  @delivery_vendor_column_exists = 0,
  'ALTER TABLE deliveries ADD COLUMN vendor_id VARCHAR(32) NULL AFTER delivery_id',
  'SELECT 1'
);
PREPARE delivery_vendor_column_stmt FROM @delivery_vendor_column_sql;
EXECUTE delivery_vendor_column_stmt;
DEALLOCATE PREPARE delivery_vendor_column_stmt;

SET @delivery_vendor_index_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deliveries' AND INDEX_NAME = 'idx_deliveries_vendor_id'
);
SET @delivery_vendor_index_sql := IF(
  @delivery_vendor_index_exists = 0,
  'ALTER TABLE deliveries ADD INDEX idx_deliveries_vendor_id (vendor_id)',
  'SELECT 1'
);
PREPARE delivery_vendor_index_stmt FROM @delivery_vendor_index_sql;
EXECUTE delivery_vendor_index_stmt;
DEALLOCATE PREPARE delivery_vendor_index_stmt;

SET @delivery_vendor_fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deliveries'
    AND COLUMN_NAME = 'vendor_id' AND REFERENCED_TABLE_NAME = 'vendors'
);
SET @delivery_vendor_fk_sql := IF(
  @delivery_vendor_fk_exists = 0,
  'ALTER TABLE deliveries ADD CONSTRAINT fk_deliveries_vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON UPDATE CASCADE ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE delivery_vendor_fk_stmt FROM @delivery_vendor_fk_sql;
EXECUTE delivery_vendor_fk_stmt;
DEALLOCATE PREPARE delivery_vendor_fk_stmt;

CREATE TABLE IF NOT EXISTS agent_accountability_cases (
  case_id VARCHAR(32) NOT NULL,
  delivery_id VARCHAR(32) NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  accountable_agent_user_id VARCHAR(32) NOT NULL,
  status ENUM('pending','active','closed','voided') NOT NULL DEFAULT 'pending',
  created_by VARCHAR(32) NOT NULL,
  activated_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (case_id),
  UNIQUE KEY ux_agent_accountability_case_delivery (delivery_id),
  KEY idx_agent_accountability_case_agent_status (accountable_agent_user_id, status),
  KEY idx_agent_accountability_case_vendor_status (vendor_id, status),
  CONSTRAINT fk_agent_accountability_case_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries (delivery_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_case_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_case_agent FOREIGN KEY (accountable_agent_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_case_created_by FOREIGN KEY (created_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_accountability_events (
  event_id VARCHAR(32) NOT NULL,
  operation_id VARCHAR(128) NOT NULL,
  case_id VARCHAR(32) NOT NULL,
  event_type ENUM('pending_delivery','delivery_activation','cash_collection','stock_return','transfer_out','transfer_in','cash_handover','correction','reversal') NOT NULL,
  event_status ENUM('pending','posted','reversed') NOT NULL DEFAULT 'pending',
  agent_user_id VARCHAR(32) NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  delivery_id VARCHAR(32) NULL,
  product_id VARCHAR(32) NULL,
  quantity DECIMAL(18,3) NULL,
  unit_value DECIMAL(18,2) NULL,
  amount_delta DECIMAL(18,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'GMD',
  source_reference VARCHAR(255) NULL,
  reason TEXT NULL,
  occurred_at DATETIME NOT NULL,
  recorded_by VARCHAR(32) NOT NULL,
  reversed_event_id VARCHAR(32) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  UNIQUE KEY ux_agent_accountability_event_operation (operation_id),
  KEY idx_agent_accountability_event_case_time (case_id, occurred_at, event_id),
  KEY idx_agent_accountability_event_agent_time (agent_user_id, occurred_at, event_id),
  KEY idx_agent_accountability_event_vendor_time (vendor_id, occurred_at, event_id),
  KEY idx_agent_accountability_event_delivery (delivery_id),
  CONSTRAINT fk_agent_accountability_event_case FOREIGN KEY (case_id) REFERENCES agent_accountability_cases (case_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_event_agent FOREIGN KEY (agent_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_event_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_event_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries (delivery_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_event_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_event_recorded_by FOREIGN KEY (recorded_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_accountability_event_reversed_event FOREIGN KEY (reversed_event_id) REFERENCES agent_accountability_events (event_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
