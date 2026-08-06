-- Phase 1 MySQL schema for SIDRAH SALAAM
-- Preserve current Google Sheets business behavior and IDs.

CREATE TABLE sales_reps (
  sales_rep_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  date_created DATE NOT NULL,
  last_updated DATETIME NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  PRIMARY KEY (sales_rep_id),
  KEY idx_sales_reps_is_active (is_active),
  KEY idx_sales_reps_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendors (
  vendor_id VARCHAR(32) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  location VARCHAR(255) NOT NULL,
  sales_rep_id VARCHAR(32) NULL,
  assigned_date DATE NULL,
  assigned_by VARCHAR(32) NULL,
  date_created DATE NOT NULL,
  last_updated DATETIME NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  PRIMARY KEY (vendor_id),
  KEY idx_vendors_sales_rep_id_status (sales_rep_id, status),
  KEY idx_vendors_status (status),
  CONSTRAINT fk_vendors_sales_rep_id FOREIGN KEY (sales_rep_id) REFERENCES sales_reps (sales_rep_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  product_id VARCHAR(32) NOT NULL,
  sku VARCHAR(64) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL,
  unit VARCHAR(64) NOT NULL,
  default_unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'GMD',
  low_stock_threshold INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  date_created DATE NOT NULL,
  last_updated DATETIME NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  PRIMARY KEY (product_id),
  UNIQUE KEY ux_products_sku (sku),
  KEY idx_products_active_category (active, category),
  KEY idx_products_category (category),
  KEY idx_products_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory (
  inventory_id VARCHAR(32) NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  total_stock_supplied INT NOT NULL DEFAULT 0,
  total_stock_sold INT NOT NULL DEFAULT 0,
  current_stock INT NOT NULL DEFAULT 0,
  date_created DATE NOT NULL,
  last_updated DATETIME NOT NULL,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  PRIMARY KEY (inventory_id),
  UNIQUE KEY ux_inventory_vendor_product (vendor_id, product_id),
  KEY idx_inventory_vendor_id (vendor_id),
  KEY idx_inventory_product_id (product_id),
  CONSTRAINT fk_inventory_vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_product_id FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendor_inventory (
  vendor_inventory_id VARCHAR(32) NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  current_stock INT NOT NULL DEFAULT 0,
  total_stock_received INT NOT NULL DEFAULT 0,
  total_stock_sold INT NOT NULL DEFAULT 0,
  created_at DATE NOT NULL,
  updated_at DATETIME NOT NULL,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  PRIMARY KEY (vendor_inventory_id),
  UNIQUE KEY ux_vendor_inventory_vendor_product (vendor_id, product_id),
  KEY idx_vendor_inventory_vendor_id (vendor_id),
  KEY idx_vendor_inventory_product_id (product_id),
  CONSTRAINT fk_vendor_inventory_vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_inventory_product_id FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendor_balances (
  vendor_id VARCHAR(32) NOT NULL,
  total_expected_cash DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  cash_collected DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  balance_owed DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  date_created DATE NOT NULL,
  last_updated DATETIME NOT NULL,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  PRIMARY KEY (vendor_id),
  KEY idx_vendor_balances_balance_owed (balance_owed),
  CONSTRAINT fk_vendor_balances_vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE visit_logs (
  visit_id VARCHAR(32) NOT NULL,
  timestamp DATETIME NOT NULL,
  date DATE NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  sales_rep_id VARCHAR(32) NOT NULL,
  opening_stock INT NOT NULL,
  stock_sold INT NOT NULL,
  stock_added INT NOT NULL,
  cash_collected DECIMAL(18,2) NOT NULL,
  expected_cash DECIMAL(18,2) NOT NULL,
  unit_price DECIMAL(18,2) NOT NULL,
  closing_stock INT NOT NULL,
  payment_method VARCHAR(64) NOT NULL,
  payment_reference VARCHAR(255) NULL,
  client_transaction_id VARCHAR(128) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  notes TEXT NULL,
  date_created DATETIME NOT NULL,
  last_updated DATETIME NOT NULL,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  PRIMARY KEY (visit_id),
  UNIQUE KEY ux_visit_logs_client_transaction_id (client_transaction_id),
  KEY idx_visit_logs_date_vendor_id (date, vendor_id),
  KEY idx_visit_logs_date_sales_rep_id (date, sales_rep_id),
  KEY idx_visit_logs_date_product_id (date, product_id),
  KEY idx_visit_logs_vendor_id (vendor_id),
  KEY idx_visit_logs_product_id (product_id),
  KEY idx_visit_logs_sales_rep_id (sales_rep_id),
  KEY idx_visit_logs_date (date),
  CONSTRAINT fk_visit_logs_vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_visit_logs_product_id FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_visit_logs_sales_rep_id FOREIGN KEY (sales_rep_id) REFERENCES sales_reps (sales_rep_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_users (
  user_id VARCHAR(32) NOT NULL,
  username VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin','supervisor','agent') NOT NULL,
  status ENUM('active','inactive','suspended') NOT NULL,
  sales_rep_id VARCHAR(32) NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_reset_required BOOLEAN NOT NULL DEFAULT FALSE,
  last_login DATETIME NULL,
  is_system_user BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_count INT NOT NULL DEFAULT 0,
  last_failed_login DATETIME NULL,
  lockout_until DATETIME NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  date_created DATE NOT NULL,
  last_updated DATETIME NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY ux_app_users_username (username),
  UNIQUE KEY ux_app_users_email (email),
  UNIQUE KEY ux_app_users_phone (phone),
  KEY idx_app_users_sales_rep_id (sales_rep_id),
  KEY idx_app_users_role_status (role, status),
  KEY idx_app_users_status (status),
  KEY idx_app_users_role (role),
  CONSTRAINT fk_app_users_sales_rep_id FOREIGN KEY (sales_rep_id) REFERENCES sales_reps (sales_rep_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
  setting_key VARCHAR(128) NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT NULL,
  date_created DATE NOT NULL,
  last_updated DATETIME NOT NULL,
  created_by VARCHAR(32) NULL,
  updated_by VARCHAR(32) NULL,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  audit_id VARCHAR(32) NOT NULL,
  timestamp DATETIME NOT NULL,
  path VARCHAR(255) NULL,
  method VARCHAR(16) NULL,
  actor VARCHAR(128) NULL,
  outcome ENUM('success','error') NOT NULL,
  message TEXT NULL,
  PRIMARY KEY (audit_id),
  KEY idx_audit_logs_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transaction_journal (
  transaction_journal_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id VARCHAR(32) NOT NULL,
  timestamp DATETIME NOT NULL,
  endpoint VARCHAR(128) NOT NULL,
  stage VARCHAR(64) NOT NULL,
  status ENUM('pending','success','failure') NOT NULL,
  payload JSON NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  actor VARCHAR(128) NULL,
  error_message TEXT NULL,
  duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (transaction_journal_id),
  KEY idx_transaction_journal_transaction_id_completed (transaction_id, completed),
  KEY idx_transaction_journal_endpoint_completed (endpoint, completed),
  KEY idx_transaction_journal_completed (completed),
  KEY idx_transaction_journal_endpoint (endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE daily_stats (
  date DATE NOT NULL,
  sales_rep_id VARCHAR(32) NOT NULL,
  vendor_count INT UNSIGNED NOT NULL DEFAULT 0,
  visits INT UNSIGNED NOT NULL DEFAULT 0,
  stock_sold INT UNSIGNED NOT NULL DEFAULT 0,
  cash_collected DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  expected_cash DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (date, sales_rep_id),
  KEY idx_daily_stats_date (date),
  KEY idx_daily_stats_sales_rep_id (sales_rep_id),
  CONSTRAINT fk_daily_stats_sales_rep_id FOREIGN KEY (sales_rep_id) REFERENCES sales_reps (sales_rep_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendor_assignments (
  assignment_id VARCHAR(32) NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  previous_sales_rep_id VARCHAR(32) NULL,
  new_sales_rep_id VARCHAR(32) NULL,
  action VARCHAR(64) NOT NULL,
  assigned_by VARCHAR(32) NULL,
  assigned_at DATETIME NOT NULL,
  reason TEXT NULL,
  PRIMARY KEY (assignment_id),
  KEY idx_vendor_assignments_vendor_id (vendor_id),
  KEY idx_vendor_assignments_vendor_id_assigned_at (vendor_id, assigned_at),
  KEY idx_vendor_assignments_previous_sales_rep_id (previous_sales_rep_id),
  KEY idx_vendor_assignments_new_sales_rep_id (new_sales_rep_id),
  CONSTRAINT fk_vendor_assignments_vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_assignments_previous_sales_rep_id FOREIGN KEY (previous_sales_rep_id) REFERENCES sales_reps (sales_rep_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_vendor_assignments_new_sales_rep_id FOREIGN KEY (new_sales_rep_id) REFERENCES sales_reps (sales_rep_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE background_jobs (
  job_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_type VARCHAR(100) NOT NULL,
  status ENUM('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  payload JSON NULL,
  progress_percentage TINYINT UNSIGNED NOT NULL DEFAULT 0,
  result JSON NULL,
  error_message TEXT NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(32) NULL,
  PRIMARY KEY (job_id),
  KEY idx_background_jobs_status (status),
  KEY idx_background_jobs_type_status (job_type, status),
  KEY idx_background_jobs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE id_sequences (
  entity_name VARCHAR(64) NOT NULL,
  prefix VARCHAR(16) NOT NULL,
  next_value INT UNSIGNED NOT NULL,
  PRIMARY KEY (entity_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO id_sequences (entity_name, prefix, next_value) VALUES
  ('Vendors', 'V', 1),
  ('Products', 'P', 1),
  ('SalesReps', 'SR', 1),
  ('AppUsers', 'U', 1),
  ('Inventory', 'I', 1),
  ('VendorInventory', 'VI', 1),
  ('VisitLogs', 'VL', 1),
  ('Transactions', 'T', 1),
  ('AuditLogs', 'A', 1),
  ('VendorAssignments', 'VA', 1)
ON DUPLICATE KEY UPDATE next_value = next_value;
