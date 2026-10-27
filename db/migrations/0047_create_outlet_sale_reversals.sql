CREATE TABLE IF NOT EXISTS outlet_sale_reversals (
  reversal_id VARCHAR(32) NOT NULL,
  sale_id VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  reversed_by VARCHAR(32) NOT NULL,
  reversed_at DATETIME NOT NULL,
  PRIMARY KEY (reversal_id),
  UNIQUE KEY ux_outlet_sale_reversals_sale (sale_id),
  KEY idx_outlet_sale_reversals_actor_time (reversed_by, reversed_at),
  CONSTRAINT fk_outlet_sale_reversals_sale FOREIGN KEY (sale_id) REFERENCES outlet_sales (sale_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlet_sale_reversals_actor FOREIGN KEY (reversed_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
