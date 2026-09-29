-- Add an optional, delivery-specific cooking location without changing existing records.
SET @cooking_location_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'deliveries'
    AND COLUMN_NAME = 'cooking_location'
);
SET @cooking_location_sql := IF(
  @cooking_location_exists = 0,
  'ALTER TABLE deliveries ADD COLUMN cooking_location VARCHAR(32) NULL AFTER delivery_date',
  'SELECT 1'
);
PREPARE cooking_location_stmt FROM @cooking_location_sql;
EXECUTE cooking_location_stmt;
DEALLOCATE PREPARE cooking_location_stmt;
