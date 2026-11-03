ALTER TABLE vendors
  ADD COLUMN secondary_vendor_id VARCHAR(8) NULL AFTER vendor_id,
  ADD UNIQUE KEY ux_vendors_secondary_vendor_id (secondary_vendor_id);

CREATE TABLE vendor_secondary_id_sequences (
  prefix CHAR(3) NOT NULL,
  `last_value` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill is intentionally performed by scripts/backfill-secondary-vendor-ids.mjs
-- so it can report records that require review and safely resume without overwrites.
