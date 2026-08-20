-- Migration 0003: Add visit reversal support and admin stock movement audit table

ALTER TABLE visit_logs
  ADD COLUMN is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN reversed_at DATETIME NULL,
  ADD COLUMN reversed_by VARCHAR(32) NULL,
  ADD COLUMN reversal_reason TEXT NULL,
  ADD COLUMN reversal_operation_id VARCHAR(128) NULL,
  ADD KEY idx_visit_logs_reversal_operation_id (reversal_operation_id),
  ADD CONSTRAINT fk_visit_logs_reversed_by FOREIGN KEY (reversed_by) REFERENCES app_users (user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

CREATE TABLE admin_stock_movements (
  admin_stock_movement_id VARCHAR(32) NOT NULL,
  operation_id VARCHAR(128) NOT NULL,
  movement_type ENUM('transfer', 'retrieval') NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  source_vendor_id VARCHAR(32) NULL,
  destination_vendor_id VARCHAR(32) NULL,
  quantity INT NOT NULL,
  admin_id VARCHAR(32) NOT NULL,
  timestamp DATETIME NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_stock_movement_id),
  UNIQUE KEY ux_admin_stock_movements_operation_id (operation_id),
  KEY idx_admin_stock_movements_product_id (product_id),
  KEY idx_admin_stock_movements_source_vendor_id (source_vendor_id),
  KEY idx_admin_stock_movements_destination_vendor_id (destination_vendor_id),
  KEY idx_admin_stock_movements_admin_id (admin_id),
  CONSTRAINT fk_admin_stock_movements_product_id FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_admin_stock_movements_source_vendor_id FOREIGN KEY (source_vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_admin_stock_movements_destination_vendor_id FOREIGN KEY (destination_vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_admin_stock_movements_admin_id FOREIGN KEY (admin_id) REFERENCES app_users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO id_sequences (entity_name, prefix, next_value)
  VALUES ('AdminStockMovements', 'ASM', 1)
  ON DUPLICATE KEY UPDATE next_value = next_value;
