CREATE TABLE factory_expense_categories (
  category_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  category_group VARCHAR(64) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  UNIQUE KEY ux_factory_expense_categories_name (name),
  KEY idx_factory_expense_categories_active (is_active),
  CONSTRAINT fk_factory_expense_categories_created_by FOREIGN KEY (created_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO factory_expense_categories (category_id, name, category_group, created_by) VALUES
('FEC_GROUND_SORTED', 'Groundnut (Sorted)', 'Raw Materials', 'U001'),
('FEC_GROUND_UNSORTED', 'Groundnut (Unsorted)', 'Raw Materials', 'U001'),
('FEC_SORTING', 'Sorting', 'Processing', 'U001'),
('FEC_GAS_REFILL', 'Gas Refill', 'Utilities', 'U001'),
('FEC_CASH_POWER', 'Cash Power', 'Utilities', 'U001'),
('FEC_TRANSPORT', 'Transportation', 'Logistics', 'U001'),
('FEC_FUEL', 'Fuel', 'Logistics', 'U001'),
('FEC_PACKAGING', 'Packaging', 'Processing', 'U001'),
('FEC_REPAIRS', 'Repairs & Maintenance', 'Maintenance', 'U001'),
('FEC_CLEANING', 'Cleaning', 'Maintenance', 'U001'),
('FEC_LABOUR', 'Labour', 'Labour', 'U001'),
('FEC_WATER', 'Water', 'Utilities', 'U001'),
('FEC_OTHER', 'Other', 'Other', 'U001');
