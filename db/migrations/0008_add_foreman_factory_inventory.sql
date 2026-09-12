ALTER TABLE app_users
  MODIFY COLUMN role ENUM('super_admin','admin','supervisor','agent','delivery','foreman') NOT NULL;

CREATE TABLE factory_inventory (
  factory_inventory_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  current_quantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (factory_inventory_id),
  UNIQUE KEY ux_factory_inventory_product_id (product_id),
  CONSTRAINT chk_factory_inventory_current_quantity_nonnegative CHECK (current_quantity >= 0),
  CONSTRAINT fk_factory_inventory_product_id FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE factory_stock_movements (
  movement_id VARCHAR(32) NOT NULL,
  operation_id VARCHAR(128) NOT NULL,
  movement_type ENUM('production','leaving_factory','returned_factory') NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  quantity DECIMAL(18,3) NOT NULL,
  occurred_at DATETIME NOT NULL,
  recorded_at DATETIME NOT NULL,
  actor_user_id VARCHAR(32) NOT NULL,
  reason_comment TEXT NULL,
  batch_reference VARCHAR(128) NULL,
  input_quantity DECIMAL(18,3) NULL,
  input_unit VARCHAR(64) NULL,
  PRIMARY KEY (movement_id),
  UNIQUE KEY ux_factory_stock_movements_operation_id (operation_id),
  KEY idx_factory_stock_movements_product_occurred (product_id, occurred_at),
  KEY idx_factory_stock_movements_actor_recorded (actor_user_id, recorded_at),
  CONSTRAINT chk_factory_stock_movements_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_factory_stock_movements_input_quantity_nonnegative CHECK (input_quantity IS NULL OR input_quantity >= 0),
  CONSTRAINT fk_factory_stock_movements_product_id FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_factory_stock_movements_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES app_users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
