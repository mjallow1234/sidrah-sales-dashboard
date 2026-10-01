CREATE TABLE IF NOT EXISTS outlets (
  outlet_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  responsible_person VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  description TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(32) NOT NULL,
  updated_by VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (outlet_id),
  KEY idx_outlets_active_name (active, name),
  CONSTRAINT fk_outlets_created_by FOREIGN KEY (created_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlets_updated_by FOREIGN KEY (updated_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outlet_sales (
  sale_id VARCHAR(32) NOT NULL,
  outlet_id VARCHAR(32) NOT NULL,
  sale_date DATE NOT NULL,
  payment_method VARCHAR(64) NOT NULL,
  notes TEXT NULL,
  recorded_by VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (sale_id),
  KEY idx_outlet_sales_outlet_date (outlet_id, sale_date),
  CONSTRAINT fk_outlet_sales_outlet FOREIGN KEY (outlet_id) REFERENCES outlets (outlet_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlet_sales_recorded_by FOREIGN KEY (recorded_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outlet_sale_items (
  sale_item_id VARCHAR(32) NOT NULL,
  sale_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (sale_item_id),
  KEY idx_outlet_sale_items_sale (sale_id),
  KEY idx_outlet_sale_items_product (product_id),
  CONSTRAINT fk_outlet_sale_items_sale FOREIGN KEY (sale_id) REFERENCES outlet_sales (sale_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_outlet_sale_items_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
