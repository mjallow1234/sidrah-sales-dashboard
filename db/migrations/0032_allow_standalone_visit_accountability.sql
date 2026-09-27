-- Visit cash accountability may exist without a delivery/accountability case.
ALTER TABLE agent_accountability_events MODIFY COLUMN case_id VARCHAR(32) NULL;
ALTER TABLE agent_accountability_events DROP FOREIGN KEY fk_agent_accountability_event_case;
ALTER TABLE agent_accountability_events ADD CONSTRAINT fk_agent_accountability_event_case FOREIGN KEY (case_id) REFERENCES agent_accountability_cases (case_id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE agent_cash_handover_allocations MODIFY COLUMN case_id VARCHAR(32) NULL;
ALTER TABLE agent_cash_handover_allocations DROP FOREIGN KEY fk_agent_cash_allocation_case;
ALTER TABLE agent_cash_handover_allocations ADD CONSTRAINT fk_agent_cash_allocation_case FOREIGN KEY (case_id) REFERENCES agent_accountability_cases (case_id) ON UPDATE CASCADE ON DELETE RESTRICT;
