ALTER TABLE vendors
  ADD COLUMN acquired_by VARCHAR(32) NULL AFTER sales_rep_id,
  ADD KEY idx_vendors_acquired_by (acquired_by),
  ADD CONSTRAINT fk_vendors_acquired_by
    FOREIGN KEY (acquired_by) REFERENCES app_users (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL;
