CREATE TABLE factory_movement_events (
  event_id VARCHAR(64) NOT NULL,
  operation_id VARCHAR(128) NOT NULL,
  movement_type ENUM('production','leaving_factory','returned_factory') NOT NULL,
  occurred_at DATETIME NOT NULL,
  recorded_at DATETIME NOT NULL,
  actor_user_id VARCHAR(32) NOT NULL,
  reason_comment TEXT NULL,
  PRIMARY KEY (event_id),
  UNIQUE KEY ux_factory_movement_events_operation_id (operation_id),
  KEY idx_factory_movement_events_actor_recorded (actor_user_id, recorded_at),
  CONSTRAINT fk_factory_movement_events_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES app_users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO factory_movement_events (
  event_id, operation_id, movement_type, occurred_at, recorded_at, actor_user_id, reason_comment
)
SELECT
  CONCAT('legacy_', movement_id), operation_id, movement_type, occurred_at, recorded_at, actor_user_id, reason_comment
FROM factory_stock_movements;

ALTER TABLE factory_stock_movements
  ADD COLUMN event_id VARCHAR(64) NULL AFTER movement_id;

UPDATE factory_stock_movements
SET event_id = CONCAT('legacy_', movement_id);

ALTER TABLE factory_stock_movements
  DROP INDEX ux_factory_stock_movements_operation_id,
  ADD KEY idx_factory_stock_movements_operation_id (operation_id),
  ADD KEY idx_factory_stock_movements_event_id (event_id),
  MODIFY COLUMN event_id VARCHAR(64) NOT NULL,
  ADD CONSTRAINT fk_factory_stock_movements_event_id FOREIGN KEY (event_id) REFERENCES factory_movement_events (event_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
