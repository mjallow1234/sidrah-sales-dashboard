CREATE TABLE factory_expense_payment_methods (
  payment_method_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_method_id),
  UNIQUE KEY uq_factory_expense_payment_methods_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO factory_expense_payment_methods (payment_method_id, name) VALUES
('FEPM_CASH', 'Cash'),
('FEPM_BANK_TRANSFER', 'Bank Transfer'),
('FEPM_MOBILE_MONEY', 'Mobile Money'),
('FEPM_CREDIT', 'Credit'),
('FEPM_OTHER', 'Other');

ALTER TABLE factory_expenses MODIFY payment_method VARCHAR(128) NOT NULL;
