CREATE TABLE IF NOT EXISTS operation_idempotency (
  client_transaction_id VARCHAR(128) NOT NULL,
  endpoint VARCHAR(64) NOT NULL,
  transaction_id VARCHAR(32) NOT NULL,
  status ENUM('processing', 'completed') NOT NULL,
  result_visit_id VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (client_transaction_id),
  KEY idx_operation_idempotency_transaction_id (transaction_id),
  KEY idx_operation_idempotency_result_visit_id (result_visit_id),
  CONSTRAINT fk_operation_idempotency_result_visit_id
    FOREIGN KEY (result_visit_id) REFERENCES visit_logs (visit_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
