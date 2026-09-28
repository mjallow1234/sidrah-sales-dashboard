CREATE TABLE IF NOT EXISTS agent_cash_handovers (
  handover_id VARCHAR(32) NOT NULL,
  operation_id VARCHAR(128) NOT NULL,
  agent_user_id VARCHAR(32) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  cash_collected_at_record DECIMAL(18,2) NOT NULL,
  variance DECIMAL(18,2) NOT NULL,
  status ENUM('reconciled','short','excess') NOT NULL,
  company_receiver VARCHAR(255) NULL,
  handover_at DATETIME NOT NULL,
  recorded_by VARCHAR(32) NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (handover_id),
  UNIQUE KEY ux_agent_cash_handover_operation (operation_id),
  KEY idx_agent_cash_handover_agent_time (agent_user_id, handover_at),
  CONSTRAINT fk_agent_cash_handover_agent FOREIGN KEY (agent_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_cash_handover_recorded_by FOREIGN KEY (recorded_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_cash_handover_allocations (
  allocation_id VARCHAR(32) NOT NULL,
  handover_id VARCHAR(32) NOT NULL,
  collection_event_id VARCHAR(32) NOT NULL,
  case_id VARCHAR(32) NOT NULL,
  vendor_id VARCHAR(32) NOT NULL,
  delivery_id VARCHAR(32) NULL,
  amount DECIMAL(18,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (allocation_id),
  UNIQUE KEY ux_agent_cash_handover_collection (handover_id, collection_event_id),
  KEY idx_agent_cash_allocation_collection (collection_event_id),
  CONSTRAINT fk_agent_cash_allocation_handover FOREIGN KEY (handover_id) REFERENCES agent_cash_handovers (handover_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_cash_allocation_collection FOREIGN KEY (collection_event_id) REFERENCES agent_accountability_events (event_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_cash_allocation_case FOREIGN KEY (case_id) REFERENCES agent_accountability_cases (case_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_cash_allocation_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agent_cash_allocation_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries (delivery_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
