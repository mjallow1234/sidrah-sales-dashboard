CREATE TABLE IF NOT EXISTS delivery_payment_corrections (
  correction_id VARCHAR(32) NOT NULL,
  operation_id VARCHAR(128) NOT NULL,
  payment_id VARCHAR(32) NOT NULL,
  delivery_id VARCHAR(32) NOT NULL,
  previous_amount DECIMAL(18,2) NOT NULL,
  corrected_amount DECIMAL(18,2) NOT NULL,
  reason TEXT NOT NULL,
  corrected_by VARCHAR(32) NOT NULL,
  corrected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (correction_id),
  UNIQUE KEY ux_delivery_payment_correction_operation (operation_id),
  KEY idx_delivery_payment_correction_payment_time (payment_id, corrected_at, correction_id),
  KEY idx_delivery_payment_correction_delivery (delivery_id),
  CONSTRAINT fk_delivery_payment_correction_payment FOREIGN KEY (payment_id) REFERENCES delivery_payments (payment_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_payment_correction_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries (delivery_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_payment_correction_actor FOREIGN KEY (corrected_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
