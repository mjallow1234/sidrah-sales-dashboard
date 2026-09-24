CREATE TABLE IF NOT EXISTS delivery_payment_options (
  payment_option_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_option_id),
  UNIQUE KEY uq_delivery_payment_options_name (name),
  KEY idx_delivery_payment_options_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO delivery_payment_options (payment_option_id, name)
VALUES
  ('DPO_CASH', 'Cash'),
  ('DPO_MOBILE_MONEY', 'Mobile Money'),
  ('DPO_BANK_TRANSFER', 'Bank Transfer')
ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1;

CREATE TABLE IF NOT EXISTS delivery_payments (
  payment_id VARCHAR(32) NOT NULL,
  delivery_id VARCHAR(32) NOT NULL,
  payment_option_id VARCHAR(32) NOT NULL,
  payment_method VARCHAR(128) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  recorded_by VARCHAR(32) NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  KEY idx_delivery_payments_delivery_time (delivery_id, recorded_at, payment_id),
  KEY idx_delivery_payments_recorded_by (recorded_by),
  CONSTRAINT fk_delivery_payments_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(delivery_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_delivery_payments_option FOREIGN KEY (payment_option_id) REFERENCES delivery_payment_options(payment_option_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_delivery_payments_recorder FOREIGN KEY (recorded_by) REFERENCES app_users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
