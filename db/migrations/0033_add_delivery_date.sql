-- Preserve historical requests while allowing new requests to carry their planned delivery date.
SET @delivery_date_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deliveries'
    AND COLUMN_NAME = 'delivery_date'
);
SET @delivery_date_sql := IF(@delivery_date_exists = 0,
  'ALTER TABLE deliveries ADD COLUMN delivery_date DATE NULL AFTER priority',
  'SELECT 1');
PREPARE delivery_date_stmt FROM @delivery_date_sql;
EXECUTE delivery_date_stmt;
DEALLOCATE PREPARE delivery_date_stmt;
