-- Link new accountability collection events to the authoritative visit record.
SET @source_visit_column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'agent_accountability_events'
    AND COLUMN_NAME = 'source_visit_id'
);
SET @source_visit_column_sql := IF(
  @source_visit_column_exists = 0,
  'ALTER TABLE agent_accountability_events ADD COLUMN source_visit_id VARCHAR(32) NULL AFTER source_payment_id',
  'SELECT 1'
);
PREPARE source_visit_column_stmt FROM @source_visit_column_sql;
EXECUTE source_visit_column_stmt;
DEALLOCATE PREPARE source_visit_column_stmt;

SET @source_visit_index_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'agent_accountability_events'
    AND INDEX_NAME = 'idx_agent_accountability_event_source_visit'
);
SET @source_visit_index_sql := IF(
  @source_visit_index_exists = 0,
  'ALTER TABLE agent_accountability_events ADD KEY idx_agent_accountability_event_source_visit (source_visit_id)',
  'SELECT 1'
);
PREPARE source_visit_index_stmt FROM @source_visit_index_sql;
EXECUTE source_visit_index_stmt;
DEALLOCATE PREPARE source_visit_index_stmt;

SET @source_visit_fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'agent_accountability_events'
    AND COLUMN_NAME = 'source_visit_id'
    AND REFERENCED_TABLE_NAME = 'visit_logs'
);
SET @source_visit_fk_sql := IF(
  @source_visit_fk_exists = 0,
  'ALTER TABLE agent_accountability_events ADD CONSTRAINT fk_agent_accountability_event_source_visit FOREIGN KEY (source_visit_id) REFERENCES visit_logs (visit_id) ON UPDATE CASCADE ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE source_visit_fk_stmt FROM @source_visit_fk_sql;
EXECUTE source_visit_fk_stmt;
DEALLOCATE PREPARE source_visit_fk_stmt;
