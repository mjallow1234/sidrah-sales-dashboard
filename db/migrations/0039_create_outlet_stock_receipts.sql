CREATE TABLE IF NOT EXISTS outlet_stock_receipts (
  receipt_id VARCHAR(32) NOT NULL,
  outlet_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  quantity_received DECIMAL(12,3) NOT NULL,
  received_date DATE NOT NULL,
  notes TEXT NULL,
  created_by VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (receipt_id),
  KEY idx_outlet_receipts_outlet_date (outlet_id, received_date),
  KEY idx_outlet_receipts_product (product_id),
  CONSTRAINT fk_outlet_receipts_outlet FOREIGN KEY (outlet_id) REFERENCES outlets (outlet_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlet_receipts_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlet_receipts_created_by FOREIGN KEY (created_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
