CREATE TABLE IF NOT EXISTS acquired_by_names (
  acquired_by_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (acquired_by_id),
  KEY idx_acquired_by_names_name (name),
  KEY idx_acquired_by_names_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO acquired_by_names (acquired_by_id, name)
SELECT v.acquired_by, COALESCE(NULLIF(MAX(u.name), ''), v.acquired_by)
FROM vendors v
LEFT JOIN app_users u ON u.user_id = v.acquired_by
WHERE v.acquired_by IS NOT NULL AND v.acquired_by <> ''
GROUP BY v.acquired_by
ON DUPLICATE KEY UPDATE name = VALUES(name);

ALTER TABLE vendors
  DROP FOREIGN KEY fk_vendors_acquired_by,
  ADD CONSTRAINT fk_vendors_acquired_by_name
    FOREIGN KEY (acquired_by) REFERENCES acquired_by_names(acquired_by_id)
    ON UPDATE CASCADE ON DELETE SET NULL;
