ALTER TABLE vendors
  ADD COLUMN location_latitude DECIMAL(10,7) NULL AFTER location,
  ADD COLUMN location_longitude DECIMAL(10,7) NULL AFTER location_latitude,
  ADD COLUMN location_updated_at DATETIME NULL AFTER location_longitude,
  ADD COLUMN location_updated_by VARCHAR(32) NULL AFTER location_updated_at,
  ADD KEY idx_vendors_location_updated_by (location_updated_by),
  ADD CONSTRAINT fk_vendors_location_updated_by
    FOREIGN KEY (location_updated_by) REFERENCES app_users (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE vendor_location_update_requests (
  request_id VARCHAR(32) NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  proposed_latitude DECIMAL(10,7) NOT NULL,
  proposed_longitude DECIMAL(10,7) NOT NULL,
  requested_by VARCHAR(32) NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by VARCHAR(32) NULL,
  reviewed_at DATETIME NULL,
  decision_reason TEXT NULL,
  PRIMARY KEY (request_id),
  KEY idx_vendor_location_requests_vendor_status (vendor_id, status),
  KEY idx_vendor_location_requests_status_requested (status, requested_at),
  CONSTRAINT fk_vendor_location_requests_vendor
    FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_location_requests_requested_by
    FOREIGN KEY (requested_by) REFERENCES app_users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_location_requests_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES app_users (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
