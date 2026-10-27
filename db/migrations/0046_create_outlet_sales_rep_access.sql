CREATE TABLE IF NOT EXISTS outlet_sales_rep_access (
  access_id VARCHAR(32) NOT NULL,
  outlet_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by VARCHAR(32) NOT NULL,
  granted_at DATETIME NOT NULL,
  revoked_by VARCHAR(32) NULL,
  revoked_at DATETIME NULL,
  PRIMARY KEY (access_id),
  UNIQUE KEY ux_outlet_sales_rep_access_outlet_user (outlet_id, user_id),
  KEY idx_outlet_sales_rep_access_user_active (user_id, active),
  KEY idx_outlet_sales_rep_access_outlet_active (outlet_id, active),
  CONSTRAINT fk_outlet_sales_rep_access_outlet FOREIGN KEY (outlet_id) REFERENCES outlets (outlet_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlet_sales_rep_access_user FOREIGN KEY (user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlet_sales_rep_access_granted_by FOREIGN KEY (granted_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlet_sales_rep_access_revoked_by FOREIGN KEY (revoked_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
