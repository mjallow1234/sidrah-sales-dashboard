CREATE TABLE IF NOT EXISTS vendor_types (
  vendor_type_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (vendor_type_id),
  UNIQUE KEY uq_vendor_types_name (name),
  KEY idx_vendor_types_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO vendor_types (vendor_type_id, name)
VALUES
  ('VT_MARKET', 'Market Vendor'),
  ('VT_STV', 'Street Food Vendor (STV)'),
  ('VT_MINIMARKET', 'Minimarket'),
  ('VT_SUPERMARKET', 'Supermarket'),
  ('VT_RESTAURANT', 'Restaurant')
ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1;

CREATE TABLE IF NOT EXISTS acquired_by_agents (
  user_id VARCHAR(32) NOT NULL,
  date_added DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by VARCHAR(32) NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_acquired_by_agents_user FOREIGN KEY (user_id) REFERENCES app_users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_acquired_by_agents_added_by FOREIGN KEY (added_by) REFERENCES app_users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO acquired_by_agents (user_id)
SELECT user_id FROM app_users WHERE role = 'agent' AND status = 'active'
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

SET @vendor_type_column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'vendor_type_id'
);
SET @vendor_type_sql := IF(@vendor_type_column_exists = 0,
  'ALTER TABLE vendors ADD COLUMN vendor_type_id VARCHAR(32) NULL AFTER acquired_by, ADD KEY idx_vendors_vendor_type_id (vendor_type_id), ADD CONSTRAINT fk_vendors_vendor_type FOREIGN KEY (vendor_type_id) REFERENCES vendor_types(vendor_type_id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1');
PREPARE vendor_type_stmt FROM @vendor_type_sql;
EXECUTE vendor_type_stmt;
DEALLOCATE PREPARE vendor_type_stmt;
