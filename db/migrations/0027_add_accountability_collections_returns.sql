SET @payment_option_column_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events' AND COLUMN_NAME = 'payment_option_id');
SET @payment_option_column_sql := IF(@payment_option_column_exists = 0, 'ALTER TABLE agent_accountability_events ADD COLUMN payment_option_id VARCHAR(32) NULL AFTER currency', 'SELECT 1');
PREPARE payment_option_column_stmt FROM @payment_option_column_sql;
EXECUTE payment_option_column_stmt;
DEALLOCATE PREPARE payment_option_column_stmt;

SET @payment_method_column_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events' AND COLUMN_NAME = 'payment_method');
SET @payment_method_column_sql := IF(@payment_method_column_exists = 0, 'ALTER TABLE agent_accountability_events ADD COLUMN payment_method VARCHAR(128) NULL AFTER payment_option_id', 'SELECT 1');
PREPARE payment_method_column_stmt FROM @payment_method_column_sql;
EXECUTE payment_method_column_stmt;
DEALLOCATE PREPARE payment_method_column_stmt;

SET @source_payment_column_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events' AND COLUMN_NAME = 'source_payment_id');
SET @source_payment_column_sql := IF(@source_payment_column_exists = 0, 'ALTER TABLE agent_accountability_events ADD COLUMN source_payment_id VARCHAR(32) NULL AFTER payment_method', 'SELECT 1');
PREPARE source_payment_column_stmt FROM @source_payment_column_sql;
EXECUTE source_payment_column_stmt;
DEALLOCATE PREPARE source_payment_column_stmt;

SET @collector_column_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events' AND COLUMN_NAME = 'collector_user_id');
SET @collector_column_sql := IF(@collector_column_exists = 0, 'ALTER TABLE agent_accountability_events ADD COLUMN collector_user_id VARCHAR(32) NULL AFTER recorded_by', 'SELECT 1');
PREPARE collector_column_stmt FROM @collector_column_sql;
EXECUTE collector_column_stmt;
DEALLOCATE PREPARE collector_column_stmt;

SET @source_payment_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events' AND INDEX_NAME = 'idx_agent_accountability_event_source_payment');
SET @source_payment_index_sql := IF(@source_payment_index_exists = 0, 'ALTER TABLE agent_accountability_events ADD KEY idx_agent_accountability_event_source_payment (source_payment_id)', 'SELECT 1');
PREPARE source_payment_index_stmt FROM @source_payment_index_sql;
EXECUTE source_payment_index_stmt;
DEALLOCATE PREPARE source_payment_index_stmt;

SET @payment_option_fk_exists := (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events' AND CONSTRAINT_NAME = 'fk_agent_accountability_event_payment_option');
SET @payment_option_fk_sql := IF(@payment_option_fk_exists = 0, 'ALTER TABLE agent_accountability_events ADD CONSTRAINT fk_agent_accountability_event_payment_option FOREIGN KEY (payment_option_id) REFERENCES delivery_payment_options (payment_option_id) ON UPDATE CASCADE ON DELETE RESTRICT', 'SELECT 1');
PREPARE payment_option_fk_stmt FROM @payment_option_fk_sql;
EXECUTE payment_option_fk_stmt;
DEALLOCATE PREPARE payment_option_fk_stmt;

SET @collector_fk_exists := (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_accountability_events' AND CONSTRAINT_NAME = 'fk_agent_accountability_event_collector');
SET @collector_fk_sql := IF(@collector_fk_exists = 0, 'ALTER TABLE agent_accountability_events ADD CONSTRAINT fk_agent_accountability_event_collector FOREIGN KEY (collector_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT', 'SELECT 1');
PREPARE collector_fk_stmt FROM @collector_fk_sql;
EXECUTE collector_fk_stmt;
DEALLOCATE PREPARE collector_fk_stmt;
