ALTER TABLE agent_accountability_events
  ADD COLUMN payment_option_id VARCHAR(32) NULL AFTER currency,
  ADD COLUMN payment_method VARCHAR(128) NULL AFTER payment_option_id,
  ADD COLUMN source_payment_id VARCHAR(32) NULL AFTER payment_method,
  ADD COLUMN collector_user_id VARCHAR(32) NULL AFTER recorded_by,
  ADD KEY idx_agent_accountability_event_source_payment (source_payment_id),
  ADD CONSTRAINT fk_agent_accountability_event_payment_option FOREIGN KEY (payment_option_id) REFERENCES delivery_payment_options (payment_option_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_agent_accountability_event_collector FOREIGN KEY (collector_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT;
