-- Delivery V1: support cancellation and admin/supervisor completion, without inventory impact.
ALTER TABLE deliveries
  MODIFY COLUMN status ENUM('pending','ongoing','delivered','cancelled') NOT NULL DEFAULT 'pending',
  ADD COLUMN cancelled_at DATETIME NULL,
  ADD COLUMN cancelled_by VARCHAR(32) NULL;
