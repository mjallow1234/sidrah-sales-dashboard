ALTER TABLE deliveries
  ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'normal' AFTER status,
  ADD KEY idx_deliveries_priority (priority);
