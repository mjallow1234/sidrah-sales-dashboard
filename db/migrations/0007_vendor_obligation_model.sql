-- Vendor Obligation Model: additive schema for supply-driven vendor debt.
-- Debt is created when stock is supplied, not when a vendor reports a sale.
-- Nothing historical is dropped or recalculated; all columns are additive with safe defaults.

ALTER TABLE vendor_inventory
  ADD COLUMN average_unit_value DECIMAL(18,2) NOT NULL DEFAULT 0.00;

ALTER TABLE admin_stock_movements
  ADD COLUMN unit_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN total_value DECIMAL(18,2) NOT NULL DEFAULT 0.00;

ALTER TABLE vendor_balances
  ADD COLUMN opening_balance_locked_at DATETIME NULL;
