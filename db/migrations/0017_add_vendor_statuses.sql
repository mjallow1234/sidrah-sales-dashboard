CREATE TABLE IF NOT EXISTS vendor_statuses (
  status_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (status_id),
  UNIQUE KEY uq_vendor_statuses_name (name),
  KEY idx_vendor_statuses_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO vendor_statuses (status_id, name, is_active)
VALUES
  ('active', 'Active', 1),
  ('inactive', 'Inactive', 1),
  ('dormant', 'Dormant', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1;
