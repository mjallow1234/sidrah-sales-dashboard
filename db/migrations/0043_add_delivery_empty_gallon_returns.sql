CREATE TABLE IF NOT EXISTS delivery_empty_gallon_returns (
  return_id VARCHAR(32) NOT NULL,
  delivery_id VARCHAR(32) NOT NULL,
  quantity_received INT UNSIGNED NOT NULL,
  recorded_by VARCHAR(32) NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (return_id),
  UNIQUE KEY ux_delivery_empty_gallon_return_delivery (delivery_id),
  KEY idx_delivery_empty_gallon_return_delivery (delivery_id),
  CONSTRAINT fk_delivery_empty_gallon_return_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries (delivery_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_empty_gallon_return_recorded_by FOREIGN KEY (recorded_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
