# Google Sheets Foundation Package

This package defines the Google Sheets workbook foundation for the SIDRAH SALAAM sales application.

It includes:
- workbook setup instructions
- sheet creation script
- column definitions
- sample seed data
- data validation rules
- protected range strategy
- sheet permissions strategy

> Do not build Apps Script endpoints yet. This package only establishes the data foundation and governance model.

---

## 1. Workbook Setup Guide

### 1.1 Create the workbook
1. Open Google Sheets.
2. Create a new workbook named `SIDRAH SALAAM Sales Foundation`.
3. Set the time zone to your operating region.
4. Enable `File > Spreadsheet settings > Calculation` if you plan to use formulas.

### 1.2 Create sheets
Create the following sheets with exact names:
- `Vendors`
- `Products`
- `Inventory`
- `VendorBalances`
- `VisitLogs`
- `SalesReps`
- `SystemSettings`
- `AppUsers`
- `AuditLogs`
- `TransactionJournal`

### 1.3 Add headers and data types
Use the sheet creation script in `scripts/google_sheets_foundation_setup.gs` to create the sheet structure and header row automatically.

### 1.4 Seed the workbook
After the sheets are created, insert sample seed records for vendors, products, sales reps, inventory, balances, and settings.

### 1.5 Apply protections and permissions
Follow the protected range strategy in section 6 and the permissions plan in section 7.

---

## 2. Sheet Creation Script

Use `scripts/google_sheets_foundation_setup.gs` to initialize the workbook structure. The script creates the sheets and writes header rows.

It includes these sheets and columns:
- `Vendors`
- `Products`
- `Inventory`
- `VendorBalances`
- `VisitLogs`
- `SalesReps`
- `AppUsers`
- `AuditLogs`
- `TransactionJournal`
- `SystemSettings`

The script does not create Apps Script endpoints or business logic.

---

## 3. Column Definitions

### 3.1 Vendors
- `vendor_id` (string) — primary key, unique vendor code
- `vendor_name` (string)
- `phone` (string)
- `location` (string)
- `sales_rep_id` (string) — current assigned sales rep
- `assigned_date` (ISO date string)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)
- `status` (`active` / `inactive`)

### 3.2 Products
- `product_id` (string) — primary key
- `product_name` (string)
- `category` (string)
- `unit` (string)
- `default_unit_price` (number)
- `currency` (string)
- `active` (`TRUE` / `FALSE`)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

### 3.3 Inventory
- `inventory_id` (string) — primary key
- `vendor_id` (string)
- `product_id` (string)
- `total_stock_supplied` (number)
- `total_stock_sold` (number)
- `current_stock` (number)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

### 3.4 VendorBalances
- `vendor_id` (string) — primary key
- `total_expected_cash` (number)
- `cash_collected` (number)
- `balance_owed` (number)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

### 3.5 VisitLogs
- `visit_id` (string) — primary key
- `timestamp` (ISO datetime string)
- `date` (ISO date string)
- `vendor_id` (string)
- `product_id` (string)
- `sales_rep_id` (string)
- `opening_stock` (number) — system-generated
- `stock_sold` (number)
- `stock_added` (number)
- `cash_collected` (number)
- `expected_cash` (number)
- `unit_price` (number)
- `closing_stock` (number) — system-generated
- `payment_method` (string)
- `payment_reference` (string)
- `client_transaction_id` (string) — unique idempotency key
- `latitude` (number)
- `longitude` (number)
- `notes` (string)
- `date_created` (ISO datetime string)
- `last_updated` (ISO datetime string)

### 3.9 TransactionJournal
- `transaction_id` (string) — system-generated transaction identifier
- `timestamp` (ISO datetime string)
- `endpoint` (string)
- `stage` (string)
- `status` (string)
- `payload` (string)
- `completed` (`TRUE` / `FALSE`)

### 3.6 SalesReps
- `sales_rep_id` (string) — primary key
- `name` (string)
- `phone` (string)
- `role` (string)
- `status` (`active` / `inactive`)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

### 3.7 SystemSettings
- `setting_key` (string) — primary key for the setting
- `setting_value` (string) — actual setting value
- `description` (string) — optional human-readable note
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

### 3.8 AppUsers
- `user_id` (string) — primary key
- `email` (string)
- `name` (string)
- `role` (string)
- `status` (`active` / `inactive`)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

---

## 4. Sample Seed Data

### 4.1 Vendors
| vendor_id | vendor_name      | phone     | location | sales_rep_id | assigned_date | date_created | last_updated | status |
|-----------|------------------|-----------|----------|--------------|---------------|--------------|--------------|--------|
| V001      | Brikama Grocery  | 740123456 | Brikama  | S001         | 2026-07-01    | 2026-07-01   | 2026-07-01T08:00:00Z | active |
| V002      | Bakau Market     | 740234567 | Bakau    | S002         | 2026-07-02    | 2026-07-02   | 2026-07-02T09:00:00Z | active |
| V003      | Mandinka Store   | 740345678 | Serrekunda | S001       | 2026-07-03    | 2026-07-03   | 2026-07-03T10:00:00Z | active |

### 4.2 Products
| product_id | product_name        | category              | unit   | default_unit_price | currency | active | date_created | last_updated |
|------------|---------------------|-----------------------|--------|--------------------|----------|--------|--------------|--------------|
| P001       | Deygeh 4kg          | Groundnut Products    | bucket | 900                | GMD      | TRUE   | 2026-07-01   | 2026-07-01T08:00:00Z |
| P002       | Deygeh 4.5kg        | Groundnut Products    | bucket | 1050               | GMD      | TRUE   | 2026-07-01   | 2026-07-01T08:00:00Z |
| P003       | Groundnut Granules  | Groundnut Ingredients | kg     | 120                | GMD      | TRUE   | 2026-07-01   | 2026-07-01T08:00:00Z |

### 4.3 Inventory
| inventory_id | vendor_id | product_id | total_stock_supplied | total_stock_sold | current_stock | date_created | last_updated |
|--------------|-----------|------------|----------------------|------------------|---------------|--------------|--------------|
| I001         | V001      | P001       | 100                  | 30               | 70            | 2026-07-01   | 2026-07-01T08:00:00Z |
| I002         | V001      | P002       | 50                   | 10               | 40            | 2026-07-01   | 2026-07-01T08:00:00Z |
| I003         | V002      | P001       | 80                   | 20               | 60            | 2026-07-02   | 2026-07-02T09:00:00Z |

### 4.4 VendorBalances
| vendor_id | total_expected_cash | cash_collected | balance_owed | date_created | last_updated |
|-----------|---------------------|----------------|--------------|--------------|--------------|
| V001      | 27000               | 18000          | 9000         | 2026-07-01   | 2026-07-01T08:00:00Z |
| V002      | 18000               | 12000          | 6000         | 2026-07-02   | 2026-07-02T09:00:00Z |

### 4.5 VisitLogs
| visit_id | timestamp           | date       | vendor_id | product_id | sales_rep_id | opening_stock | stock_sold | stock_added | cash_collected | expected_cash | unit_price | closing_stock | payment_method | payment_reference | latitude | longitude | notes | date_created | last_updated |
|----------|---------------------|------------|-----------|------------|--------------|---------------|------------|-------------|----------------|---------------|------------|---------------|----------------|-------------------|----------|-----------|-------|--------------|--------------|
| VL001    | 2026-07-01T08:00:00Z | 2026-07-01 | V001      | P001       | S001         | 100           | 30         | 0           | 27000          | 27000         | 900        | 70            | cash           | REF12345          | 13.450   | -16.650   | First visit | 2026-07-01T08:00:00Z | 2026-07-01T08:00:00Z |
| VL002    | 2026-07-02T09:00:00Z | 2026-07-02 | V002      | P001       | S002         | 80            | 20         | 0           | 18000          | 18000         | 900        | 60            | cash           | REF54321          | 13.450   | -16.650   | First visit | 2026-07-02T09:00:00Z | 2026-07-02T09:00:00Z |

### 4.6 SalesReps
| sales_rep_id | name       | phone     | role       | status   | date_created | last_updated |
|--------------|------------|-----------|------------|----------|--------------|--------------|
| S001         | Fatou      | 740456789 | agent      | active   | 2026-07-01   | 2026-07-01T08:00:00Z |
| S002         | Lamin      | 740567890 | agent      | active   | 2026-07-01   | 2026-07-01T08:00:00Z |

### 4.7 SystemSettings
| setting_key              | setting_value | description                           | date_created | last_updated |
|--------------------------|---------------|---------------------------------------|--------------|--------------|
| low_stock_threshold      | 5             | Threshold for low stock alerts        | 2026-07-01   | 2026-07-01T08:00:00Z |
| default_currency         | GMD           | Default currency for product pricing  | 2026-07-01   | 2026-07-01T08:00:00Z |
| dashboard_days           | 30            | Number of days used in dashboard data | 2026-07-01   | 2026-07-01T08:00:00Z |

### 4.8 AppUsers
| user_id | email              | name        | role   | status   | date_created | last_updated |
|---------|--------------------|-------------|--------|----------|--------------|--------------|
| U001    | fatou@example.com  | Fatou       | admin  | active   | 2026-07-01   | 2026-07-01T08:00:00Z |
| U002    | lamin@example.com  | Lamin       | agent  | active   | 2026-07-01   | 2026-07-01T08:00:00Z |

---

## 5. Validation Rules

### 5.1 Vendors
- `vendor_id`: unique, non-empty
- `vendor_name`: non-empty
- `phone`: non-empty, valid phone pattern
- `location`: non-empty
- `sales_rep_id`: existing `SalesReps` value
- `date_created`, `last_updated`: valid ISO date or datetime
- `status`: `active` or `inactive`

### 5.2 Products
- `product_id`: unique, non-empty
- `product_name`: non-empty
- `category`: non-empty
- `unit`: non-empty
- `default_unit_price`: number ≥ 0
- `currency`: non-empty ISO currency code
- `active`: `TRUE` or `FALSE`
- `date_created`, `last_updated`: valid ISO date or datetime

### 5.3 Inventory
- `inventory_id`: unique, non-empty
- `vendor_id`: existing `Vendors` value
- `product_id`: existing `Products` value
- `total_stock_supplied`: number ≥ 0
- `total_stock_sold`: number ≥ 0
- `current_stock`: number ≥ 0
- `date_created`, `last_updated`: valid ISO date or datetime

### 5.4 VendorBalances
- `vendor_id`: existing `Vendors` value
- `total_expected_cash`: number ≥ 0
- `cash_collected`: number ≥ 0
- `balance_owed`: number ≥ 0
- `date_created`, `last_updated`: valid ISO date or datetime

### 5.5 VisitLogs
- `visit_id`: unique, non-empty
- `timestamp`: valid ISO datetime
- `date`: valid ISO date
- `vendor_id`: existing `Vendors` value
- `product_id`: existing `Products` value
- `sales_rep_id`: existing `SalesReps` value
- `opening_stock`: number ≥ 0
- `stock_sold`: number ≥ 0
- `stock_added`: number ≥ 0
- `cash_collected`: number ≥ 0
- `expected_cash`: number ≥ 0
- `unit_price`: number ≥ 0
- `closing_stock`: number ≥ 0
- `payment_method`: non-empty
- `latitude` / `longitude`: valid coordinates or blank
- `date_created`, `last_updated`: valid ISO date or datetime

### 5.6 SalesReps
- `sales_rep_id`: unique, non-empty
- `name`: non-empty
- `phone`: non-empty
- `role`: non-empty
- `date_created`, `last_updated`: valid ISO date or datetime

### 5.7 SystemSettings
- `setting_key`: unique, non-empty
- `setting_value`: non-empty
- `description`: optional
- `date_created`, `last_updated`: valid ISO date or datetime

---

## 6. Protected Range Strategy

### 6.1 Protection design
- Protect all header rows and sheet structure on every sheet.
- Protect `VisitLogs` rows to prevent manual editing after insertion.
- Protect `Inventory.current_stock`, `VendorBalances.balance_owed`, and `Products.default_unit_price` against unauthorized changes.
- Protect `SystemSettings` values from manual edits by non-admins.

### 6.2 Implementation guidance
- Use Google Sheets `Protect range` for each sheet range that contains formulas or critical state.
- Use `Custom` permissions to allow only the system owner and administrator accounts to modify protected ranges.
- For `VisitLogs`, create a protected range covering the full sheet excluding the header row.
- For `SystemSettings`, protect the entire range and grant edit rights only to authorized stewards.

### 6.3 Change process
- Any manual correction must be documented by updating the `last_updated` timestamp.
- Prefer changes through Apps Script once implemented, not direct sheet edits.

---

## 7. Sheet Permissions Strategy

### 7.1 Roles
- `Admin` — full access to all sheets and protection settings
- `Data Editor` — edit access to `Products`, `Vendors`, and `SalesReps`
- `Finance` — edit access to `VendorBalances` and `SystemSettings`
- `Viewer` — view-only access to all sheets

### 7.2 Recommended access matrix
- `Vendors` — Admin, Data Editor
- `Products` — Admin, Data Editor
- `Inventory` — Admin only until Apps Script is live
- `VendorBalances` — Admin, Finance
- `VisitLogs` — Admin only until Apps Script is live
- `SalesReps` — Admin, Data Editor
- `SystemSettings` — Admin, Finance
- `AppUsers` — Admin only

### 7.3 Practical setup
- Place collaborators into Google Workspace groups if possible.
- Grant sheet-level edit permissions carefully.
- Use protected ranges for finer control inside a sheet.
- Audit access periodically.

---

## 8. Approval
This foundation package is ready for review. No Apps Script endpoints have been built yet.
