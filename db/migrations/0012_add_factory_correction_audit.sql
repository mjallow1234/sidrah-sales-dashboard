ALTER TABLE factory_movement_events
  ADD COLUMN status ENUM('active','reversed') NOT NULL DEFAULT 'active' AFTER reason_comment,
  ADD COLUMN reversed_by VARCHAR(32) NULL AFTER status,
  ADD COLUMN reversed_at DATETIME NULL AFTER reversed_by,
  ADD COLUMN reversal_reason TEXT NULL AFTER reversed_at,
  ADD COLUMN reversal_operation_id VARCHAR(128) NULL AFTER reversal_reason,
  ADD COLUMN edited_by VARCHAR(32) NULL AFTER reversal_operation_id,
  ADD COLUMN edited_at DATETIME NULL AFTER edited_by,
  ADD KEY idx_factory_movement_events_status (status),
  ADD CONSTRAINT fk_factory_movement_events_reversed_by FOREIGN KEY (reversed_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_factory_movement_events_edited_by FOREIGN KEY (edited_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE factory_container_movements
  ADD COLUMN status ENUM('active','reversed') NOT NULL DEFAULT 'active' AFTER reason_comment,
  ADD COLUMN reversed_by VARCHAR(32) NULL AFTER status,
  ADD COLUMN reversed_at DATETIME NULL AFTER reversed_by,
  ADD COLUMN reversal_reason TEXT NULL AFTER reversed_at,
  ADD COLUMN reversal_operation_id VARCHAR(128) NULL AFTER reversal_reason,
  ADD COLUMN edited_by VARCHAR(32) NULL AFTER reversal_operation_id,
  ADD COLUMN edited_at DATETIME NULL AFTER edited_by,
  ADD KEY idx_factory_container_movements_status (status),
  ADD CONSTRAINT fk_factory_container_movements_reversed_by FOREIGN KEY (reversed_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_factory_container_movements_edited_by FOREIGN KEY (edited_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE factory_record_revisions (
  revision_id VARCHAR(64) NOT NULL,
  record_type ENUM('movement_event','container_movement') NOT NULL,
  event_id VARCHAR(64) NULL,
  movement_id VARCHAR(64) NULL,
  action_type ENUM('edit','reverse') NOT NULL,
  actor_user_id VARCHAR(32) NOT NULL,
  recorded_at DATETIME NOT NULL,
  reason_comment TEXT NULL,
  operation_id VARCHAR(128) NULL,
  before_snapshot JSON NOT NULL,
  after_snapshot JSON NOT NULL,
  PRIMARY KEY (revision_id),
  KEY idx_factory_record_revisions_event (record_type, event_id, recorded_at),
  KEY idx_factory_record_revisions_movement (record_type, movement_id, recorded_at),
  KEY idx_factory_record_revisions_actor (actor_user_id, recorded_at),
  CONSTRAINT fk_factory_record_revisions_actor FOREIGN KEY (actor_user_id) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
