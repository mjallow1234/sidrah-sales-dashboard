CREATE TABLE factory_container_inventory (
  container_type ENUM('gallon','bucket_5l','bucket_1kg') NOT NULL,
  current_quantity DECIMAL(18,3) NOT NULL DEFAULT 0.000,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (container_type),
  CONSTRAINT chk_factory_container_inventory_nonnegative CHECK (current_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE factory_container_movements (
  movement_id VARCHAR(64) NOT NULL,
  operation_id VARCHAR(128) NOT NULL,
  container_type ENUM('gallon','bucket_5l','bucket_1kg') NOT NULL,
  movement_type ENUM('received','leaving_factory','returned_factory') NOT NULL,
  quantity DECIMAL(18,3) NOT NULL,
  occurred_at DATETIME NOT NULL,
  recorded_at DATETIME NOT NULL,
  actor_user_id VARCHAR(32) NOT NULL,
  reason_comment TEXT NULL,
  PRIMARY KEY (movement_id),
  UNIQUE KEY ux_factory_container_movements_operation_id (operation_id),
  KEY idx_factory_container_movements_type_recorded (container_type, recorded_at),
  KEY idx_factory_container_movements_actor_recorded (actor_user_id, recorded_at),
  CONSTRAINT chk_factory_container_movements_quantity_positive CHECK (quantity > 0),
  CONSTRAINT fk_factory_container_movements_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES app_users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
