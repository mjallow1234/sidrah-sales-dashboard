CREATE TABLE IF NOT EXISTS delivery_user_locations (
  delivery_user_id VARCHAR(32) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  location_updated_at DATETIME NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'browser',
  PRIMARY KEY (delivery_user_id),
  KEY idx_delivery_user_locations_updated (location_updated_at),
  CONSTRAINT fk_delivery_user_locations_user
    FOREIGN KEY (delivery_user_id) REFERENCES app_users (user_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
