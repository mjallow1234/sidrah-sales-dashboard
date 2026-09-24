CREATE TABLE delivery_tracking_locations (
  delivery_id VARCHAR(32) NOT NULL,
  delivery_user_id VARCHAR(32) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  location_updated_at DATETIME NOT NULL,
  PRIMARY KEY (delivery_id),
  KEY idx_delivery_tracking_user (delivery_user_id),
  KEY idx_delivery_tracking_updated (location_updated_at),
  CONSTRAINT fk_delivery_tracking_delivery
    FOREIGN KEY (delivery_id) REFERENCES deliveries (delivery_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_delivery_tracking_user
    FOREIGN KEY (delivery_user_id) REFERENCES app_users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
