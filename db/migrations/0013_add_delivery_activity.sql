CREATE TABLE IF NOT EXISTS delivery_activity (
  activity_id VARCHAR(64) NOT NULL,
  delivery_id VARCHAR(32) NOT NULL,
  activity_type ENUM('created','claimed','assigned','reassigned','delivered','cancelled','comment') NOT NULL,
  previous_status ENUM('pending','ongoing','delivered','cancelled') NULL,
  new_status ENUM('pending','ongoing','delivered','cancelled') NULL,
  comment TEXT NULL,
  actor_user_id VARCHAR(32) NOT NULL,
  related_user_id VARCHAR(32) NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_id),
  KEY idx_delivery_activity_delivery_time (delivery_id, occurred_at, activity_id),
  KEY idx_delivery_activity_actor_time (actor_user_id, occurred_at),
  CONSTRAINT fk_delivery_activity_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries (delivery_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_activity_actor FOREIGN KEY (actor_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_activity_related_user FOREIGN KEY (related_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
