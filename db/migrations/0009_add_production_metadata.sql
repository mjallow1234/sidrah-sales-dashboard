ALTER TABLE factory_stock_movements
  ADD COLUMN raw_material VARCHAR(255) NULL AFTER actor_user_id,
  ADD COLUMN temperature_c DECIMAL(8,2) NULL AFTER raw_material,
  ADD COLUMN processing_duration_hours INT UNSIGNED NULL AFTER temperature_c,
  ADD COLUMN processing_duration_minutes TINYINT UNSIGNED NULL AFTER processing_duration_hours,
  ADD CONSTRAINT chk_factory_stock_movements_processing_duration_minutes
    CHECK (processing_duration_minutes IS NULL OR processing_duration_minutes BETWEEN 0 AND 59);
