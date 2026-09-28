-- Visit cash accountability may exist without a delivery/accountability case.
-- Every operation is guarded so this migration is safe to retry.
SET @event_case_nullable := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events'
    AND COLUMN_NAME = 'case_id' AND IS_NULLABLE = 'YES'
);
SET @event_case_sql := IF(@event_case_nullable = 0,
  'ALTER TABLE agent_accountability_events MODIFY COLUMN case_id VARCHAR(32) NULL',
  'SELECT 1');
PREPARE event_case_stmt FROM @event_case_sql;
EXECUTE event_case_stmt;
DEALLOCATE PREPARE event_case_stmt;

SET @event_case_needs_change := (1 - @event_case_nullable);
SET @event_case_fk_exists := (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events'
    AND CONSTRAINT_NAME = 'fk_agent_accountability_event_case'
);
SET @event_case_drop_sql := IF(@event_case_needs_change = 1 AND @event_case_fk_exists > 0,
  'ALTER TABLE agent_accountability_events DROP FOREIGN KEY fk_agent_accountability_event_case',
  'SELECT 1');
PREPARE event_case_drop_stmt FROM @event_case_drop_sql;
EXECUTE event_case_drop_stmt;
DEALLOCATE PREPARE event_case_drop_stmt;

SET @event_case_fk_exists_after_drop := (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events'
    AND CONSTRAINT_NAME = 'fk_agent_accountability_event_case'
);
SET @event_case_add_sql := IF(@event_case_fk_exists_after_drop = 0,
  'ALTER TABLE agent_accountability_events ADD CONSTRAINT fk_agent_accountability_event_case FOREIGN KEY (case_id) REFERENCES agent_accountability_cases (case_id) ON UPDATE CASCADE ON DELETE RESTRICT',
  'SELECT 1');
PREPARE event_case_add_stmt FROM @event_case_add_sql;
EXECUTE event_case_add_stmt;
DEALLOCATE PREPARE event_case_add_stmt;

SET @allocation_case_nullable := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_cash_handover_allocations'
    AND COLUMN_NAME = 'case_id' AND IS_NULLABLE = 'YES'
);
SET @allocation_case_sql := IF(@allocation_case_nullable = 0,
  'ALTER TABLE agent_cash_handover_allocations MODIFY COLUMN case_id VARCHAR(32) NULL',
  'SELECT 1');
PREPARE allocation_case_stmt FROM @allocation_case_sql;
EXECUTE allocation_case_stmt;
DEALLOCATE PREPARE allocation_case_stmt;

SET @allocation_case_needs_change := (1 - @allocation_case_nullable);
SET @allocation_case_fk_exists := (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_cash_handover_allocations'
    AND CONSTRAINT_NAME = 'fk_agent_cash_allocation_case'
);
SET @allocation_case_drop_sql := IF(@allocation_case_needs_change = 1 AND @allocation_case_fk_exists > 0,
  'ALTER TABLE agent_cash_handover_allocations DROP FOREIGN KEY fk_agent_cash_allocation_case',
  'SELECT 1');
PREPARE allocation_case_drop_stmt FROM @allocation_case_drop_sql;
EXECUTE allocation_case_drop_stmt;
DEALLOCATE PREPARE allocation_case_drop_stmt;

SET @allocation_case_fk_exists_after_drop := (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_cash_handover_allocations'
    AND CONSTRAINT_NAME = 'fk_agent_cash_allocation_case'
);
SET @allocation_case_add_sql := IF(@allocation_case_fk_exists_after_drop = 0,
  'ALTER TABLE agent_cash_handover_allocations ADD CONSTRAINT fk_agent_cash_allocation_case FOREIGN KEY (case_id) REFERENCES agent_accountability_cases (case_id) ON UPDATE CASCADE ON DELETE RESTRICT',
  'SELECT 1');
PREPARE allocation_case_add_stmt FROM @allocation_case_add_sql;
EXECUTE allocation_case_add_stmt;
DEALLOCATE PREPARE allocation_case_add_stmt;
