# Phase 5 Architecture and Documentation

## Overview
This document captures the final approved Phase 5 architecture for the SIDRAH SALAAM sales application.

The system remains:
- Next.js frontend on Hostinger Business Hosting
- Service layer in `src/services/gasApi.ts`
- Google Apps Script endpoints as backend API
- Google Sheets as the canonical data store

The final sheet structure now includes:
1. `Vendors`
2. `Products`
3. `Inventory`
4. `VendorBalances`
5. `VisitLogs`
6. `SalesReps`
7. `AppUsers`
8. `AuditLogs`
9. `TransactionJournal`
10. `SystemSettings`

No Dashboard sheet is created; dashboard metrics are computed dynamically.

---

## 1. Final Google Sheets Schema

### Vendors
Columns:
- `vendor_id` (PK, string)
- `vendor_name` (string)
- `phone` (string)
- `location` (string)
- `sales_rep_id` (string, FK → SalesReps)
- `assigned_date` (ISO date string)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)
- `status` (`active` | `inactive`)

### Products
Columns:
- `product_id` (PK, string)
- `product_name` (string)
- `category` (string)
- `unit` (string)
- `default_unit_price` (number)
- `currency` (string)
- `active` (`TRUE` | `FALSE`)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

Example rows:
| product_id | product_name        | category              | unit   | default_unit_price | currency | active |
|------------|---------------------|-----------------------|--------|--------------------|----------|--------|
| P001       | Deygeh 4kg          | Groundnut Products    | bucket | 900                | GMD      | TRUE   |
| P002       | Deygeh 4.5kg        | Groundnut Products    | bucket | 1050               | GMD      | TRUE   |
| P003       | Groundnut Granules  | Groundnut Ingredients | kg     | 120                | GMD      | TRUE   |

### Inventory
Columns:
- `inventory_id` (PK, string)
- `vendor_id` (string, FK → Vendors)
- `product_id` (string, FK → Products)
- `total_stock_supplied` (number)
- `total_stock_sold` (number)
- `current_stock` (number)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

### VendorBalances
Columns:
- `vendor_id` (PK, string, FK → Vendors)
- `total_expected_cash` (number)
- `cash_collected` (number)
- `balance_owed` (number)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

### VisitLogs
Columns:
- `visit_id` (PK, string)
- `timestamp` (ISO datetime string)
- `date` (ISO date string)
- `vendor_id` (string, FK → Vendors)
- `product_id` (string, FK → Products)
- `sales_rep_id` (string, FK → SalesReps)
- `opening_stock` (number, system-generated)
- `stock_sold` (number)
- `stock_added` (number)
- `cash_collected` (number)
- `expected_cash` (number)
- `unit_price` (number)
- `closing_stock` (number, system-generated)
- `payment_method` (string)
- `payment_reference` (string)
- `client_transaction_id` (string, unique request id)
- `latitude` (number)
- `longitude` (number)
- `notes` (string)
- `date_created` (ISO datetime string)
- `last_updated` (ISO datetime string)

### TransactionJournal
Columns:
- `transaction_id` (string, system-generated)
- `timestamp` (ISO datetime string)
- `endpoint` (string)
- `stage` (string)
- `status` (string)
- `payload` (string)
- `completed` (`TRUE` | `FALSE`)

### SalesReps
Columns:
- `sales_rep_id` (PK, string)
- `name` (string)
- `phone` (string)
- `role` (string, e.g. `agent`, `supervisor`, `admin`)
- `status` (`active` | `inactive`)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

### AppUsers
Columns:
- `user_id` (PK, string)
- `email` (string)
- `name` (string)
- `role` (string)
- `status` (`active` | `inactive`)
- `date_created` (ISO date string)
- `last_updated` (ISO datetime string)

---

## 2. Final Entity Relationship Diagram

```text
[SalesReps] 1---* [Vendors]
      |           \
      |            \                [Products]
      |             \                1---*
      |              \                \
      |               \                [Inventory]
      |                \              *|      
      |                 \               |      
      |                  \              |      
      |                   \             |      
      |                    * [VisitLogs] *|      
      |                      vendor_id   /       
      |                                /        
      1------------------------------/         
      sales_rep_id                         

[Vendors] 1---1 [VendorBalances]

[Products] 1---* [Inventory]

[VisitLogs] stores full historical audit records with `unit_price` and `expected_cash`.

[AppUsers] stores future authentication and application user metadata.
```

Notes:
- `Vendors` is central to inventory and balance state.
- `Products` enables multi-product inventory per vendor.
- `VisitLogs` is append-only and stores all historical pricing and expected cash.
- `VendorBalances` stores money-only state.
- `Inventory` stores stock-only state.

---

## 3. Final API Contract
### Idempotency and Transaction Journal
- `POST /visit` now requires `client_transaction_id` in the request body.
- The backend uses `client_transaction_id` to detect duplicate replay requests and return the previously-created visit rather than creating a second visit row.
- The backend writes detailed `TransactionJournal` entries for each visit request stage: `begin`, `inventory_update`, `balance_update`, `visit_append`, `complete`, and `failure`.
- Partial transaction state can be diagnosed by replaying `TransactionJournal` entries for a transaction ID.
### Recovery and Transaction Journal Strategy

The backend records every `/visit` request lifecycle in `TransactionJournal` to support recovery and debugging.

- Timeout recovery
  - If a script execution times out or is aborted, the request may stop before the final `complete` stage is written.
  - Recovery uses `TransactionJournal` entries for the same transaction ID to determine which stage completed and whether rollback was performed.
  - The system can detect incomplete transactions where `completed` is `FALSE` and either `inventory_update` or `balance_update` succeeded without a final `visit_append`.

- Partial transaction recovery
  - A partially-applied visit is diagnosed by looking for a `failure` entry and the last successful stage.
  - If inventory was updated but `VisitLogs` append failed, the transaction is considered incomplete and can be rolled back by replaying journal entries or manually restoring the prior backup state.
  - The backend currently provides audit visibility; an external recovery script can use `TransactionJournal` to identify transactions needing manual reconciliation.

- Journal replay strategy
  - Replaying the journal requires idempotent stage handling and a record of the original payload.
  - Use `TransactionJournal` rows to reconstruct the request payload and determine whether `inventory_update`, `balance_update`, or `visit_append` executed.
  - If a transaction has a pending `visit_append`, the system can either retry the append (ensuring no duplicate `client_transaction_id`) or roll back state if the visit should not complete.

### Read APIs

#### GET `/vendors`
Returns all vendors.

#### GET `/products`
Returns all products with optional filters:
- `active`
- `category`

#### GET `/salesreps`
Returns sales reps with optional `status` filter.

#### GET `/vendors/:vendor_id`
Returns a single vendor.

#### GET `/vendors/:vendor_id`
Returns a single vendor.

#### GET `/products`
Returns all products.

#### GET `/inventory`
Returns all inventory rows.

#### GET `/inventory/:inventory_id`
Returns a single inventory row.

#### GET `/inventory?vendorId=V_001`
Returns inventory rows for a vendor.

#### GET `/vendorbalances`
Returns all vendor balances.

#### GET `/vendorbalances/:vendor_id`
Returns balance row for a vendor.

#### GET `/visitlogs`
Query parameters:
- `vendorId` (optional)
- `salesRepId` (optional)
- `productId` (optional)

Returns visit logs filtered by query.

#### GET `/salesreps`
Returns all sales reps.

#### GET `/salesreps/:sales_rep_id`
Returns a single sales rep.

#### GET `/stats`
Returns computed dashboard metrics.

### Write APIs

#### POST `/visit`
Request body:
```json
{
  "vendor_id": "V_001",
  "product_id": "P001",
  "sales_rep_id": "S_001",
  "stock_sold": 15,
  "stock_added": 11,
  "cash_collected": 45000,
  "unit_price": 900,
  "payment_method": "cash",
  "payment_reference": "REF12345",
  "client_transaction_id": "txn-20260716-001",
  "latitude": 13.456,
  "longitude": -16.123,
  "notes": "Visit notes"
}
```

#### PUT `/vendor/:id`
Request body accepts partial updates:
```json
{
  "vendor_name": "New Vendor Co",
  "phone": "740999999",
  "location": "Serrekunda",
  "sales_rep_id": "S001",
  "status": "active"
}
```

> Note: Apps Script Web Apps expose only `doGet(e)` and `doPost(e)`. This API supports PUT semantics through POST method override using `_method: "PUT"` in the request body or `?method=PUT` in the query string.

#### POST `/salesrep`
Request body:
```json
{
  "full_name": "John Doe",
  "phone": "7777777"
}
```

Generated response fields:
```json
{
  "sales_rep_id": "SRxxx",
  "status": "active",
  "date_created": "2026-07-16",
  "last_updated": "2026-07-16T00:00:00Z"
}
```

#### PUT `/salesrep/:id`
Request body accepts partial updates:
```json
{
  "full_name": "John Doe",
  "phone": "7777777",
  "status": "inactive"
}
```
Behavior:
1. Calculate `opening_stock` from the latest `Inventory` or prior visit state.
2. Calculate `expected_cash = stock_sold * unit_price`.
3. Calculate `closing_stock = opening_stock - stock_sold + stock_added`.
4. Append a row to `VisitLogs`.
5. Update `Inventory` row for `vendor_id` + `product_id`.
6. Update `VendorBalances` for `vendor_id`.
7. Return updated vendor state:
```json
{
  "vendor": { ... },
  "inventory": { ... },
  "vendorBalance": { ... },
  "visitLog": { ... }
}
```

#### POST `/vendor`
Request body:
```json
{
  "vendor_name": "New Vendor",
  "phone": "7401234",
  "location": "Brikama",
  "sales_rep_id": "S_001"
}
```
Behavior:
1. Generate `vendor_id`.
2. Create vendor row in `Vendors`.
3. Create initial `Inventory` rows as needed for existing products or default product.
4. Create a `VendorBalances` row.
5. Return the created vendor record.

---

## 4. Google Apps Script Endpoint Specification

### GET `/vendors`
- Reads `Vendors` sheet.
- Returns list of vendors.

### GET `/vendors/:vendor_id`
- Reads `Vendors` sheet.
- Filters by `vendor_id`.

### POST `/vendor`
- Validates required fields.
- Generates unique `vendor_id`.
- Inserts into `Vendors`.
- Creates default `Inventory` row(s).
- Creates `VendorBalances` row.
- Returns created vendor.

### GET `/products`
- Reads `Products` sheet.
- Returns the product catalog.

### GET `/inventory`
- Reads `Inventory` sheet.
- Returns all inventory states.

### GET `/inventory/:inventory_id`
- Reads `Inventory` sheet.
- Filters by `inventory_id`.

### GET `/inventory?vendorId=...`
- Filters inventory by `vendor_id`.

### GET `/vendorbalances`
- Reads `VendorBalances` sheet.

### GET `/vendorbalances/:vendor_id`
- Reads balance row for vendor.

### GET `/visitlogs`
- Reads `VisitLogs` sheet.
- Supports query filtering by `vendorId`, `salesRepId`, `productId`, `paymentMethod`, and optional date range.
- Supports pagination parameters `page` and `pageSize`.

### POST `/visit`
- Validates inputs.
- Generates unique `visit_id`.
- Calculates `opening_stock` from the latest `Inventory` or prior visit record.
- Calculates `expected_cash = stock_sold * unit_price`.
- Calculates `closing_stock = opening_stock - stock_sold + stock_added`.
- Appends row to `VisitLogs`.
- Updates `Inventory`:
  - `total_stock_sold += stock_sold`
  - `total_stock_supplied += stock_added`
  - `current_stock = total_stock_supplied - total_stock_sold`
- Updates `VendorBalances`:
  - `cash_collected += cash_collected`
  - `balance_owed = total_expected_cash - cash_collected` (or recalc based on sheet logic)
- Returns updated vendor state.

### GET `/salesreps`
- Reads `SalesReps` sheet.

### GET `/salesreps/:sales_rep_id`
- Finds a sales rep record.

### GET `/stats`
- Computes dashboard metrics dynamically from Sheets.
- No dashboard sheet used.

### API pagination and filtering strategy
- All list endpoints support `page` and `pageSize`.
- `GET /visitlogs` supports filtering by `vendorId`, `productId`, `salesRepId`, `paymentMethod`, `startDate`, and `endDate`.
- `GET /inventory` supports filtering by `vendorId` and `productId`.
- `GET /vendorbalances` supports filtering by `vendorId`.
- `GET /vendors` supports filtering by `salesRepId` and `status`.
- All paginated responses include `totalCount`, `page`, `pageSize`, and `items`.
- Use sensible upper limits such as `pageSize <= 200` and default `pageSize = 50`.

---

## 5. Data Validation Rules

### Vendors
- `vendor_name`: required, non-empty string
- `phone`: required, valid phone string
- `location`: required, non-empty string
- `sales_rep_id`: required, must exist in `SalesReps`
- `date_created`: valid ISO date
- `status`: `active` or `inactive`

### Products
- `product_id`: required, unique
- `product_name`: required
- `unit`: required
- `active`: `TRUE` or `FALSE`

### Inventory
- `inventory_id`: required, unique
- `vendor_id`: required, must exist in `Vendors`
- `product_id`: required, must exist in `Products`
- `total_stock_supplied`: number ≥ 0
- `total_stock_sold`: number ≥ 0
- `current_stock`: number ≥ 0

### VendorBalances
- `vendor_id`: required, must exist
- `expected_cash`: number ≥ 0
- `cash_collected`: number ≥ 0
- `balance_owed`: number ≥ 0

### VisitLogs
- `visit_id`: required, unique
- `timestamp`: required, ISO datetime
- `date`: required, ISO date
- `vendor_id`: required, exists in `Vendors`
- `product_id`: required, exists in `Products`
- `sales_rep_id`: required, exists in `SalesReps`
- `opening_stock`: number ≥ 0
- `stock_sold`: number ≥ 0
- `stock_added`: number ≥ 0
- `cash_collected`: number ≥ 0
- `unit_price`: number ≥ 0
- `expected_cash`: number ≥ 0
- `closing_stock`: number ≥ 0
- `notes`: optional string

### POST `/visit`
- `vendor_id` required and existing
- `product_id` required and existing
- `sales_rep_id` required and existing
- `stock_sold` and `stock_added` numeric
- `unit_price` numeric
- `cash_collected` numeric
- `expected_cash` persisted by server only

### POST `/vendor`
- `vendor_name` required
- `phone` required
- `location` required
- `sales_rep_id` required and existing

---

## 6. Dashboard Calculation Rules
All metrics computed dynamically from Sheets.

### Metrics
- `Total Active Vendors`
  - Count of `Vendors` where `status == active`

- `New Vendors This Month`
  - Count of `Vendors` with `date_created` in current month/year

- `Vendors Visited Today`
  - Count of distinct `vendor_id` values in `VisitLogs` where `date == today`

- `Buckets Sold Today`
  - Sum of `stock_sold` in `VisitLogs` where `date == today`

- `Cash Collected Today`
  - Sum of `cash_collected` in `VisitLogs` where `date == today`

- `Outstanding Balances`
  - Sum of `balance_owed` from `VendorBalances`

- `Low Stock Vendors`
  - Count of unique vendors with any inventory row where `current_stock <= threshold` (threshold to be defined, e.g. 20)

- `Average Sales Per Vendor`
  - `(Total cash_collected from VisitLogs today) / (Vendors Visited Today)`
  - If no vendors visited, value should be 0

- `Sales By Sales Rep`
  - Group `VisitLogs` by `sales_rep_id`; sum `cash_collected` and `stock_sold`

- `Collections By Sales Rep`
  - Group `VisitLogs` by `sales_rep_id`; sum `cash_collected`

- `Top 10 Vendors By Sales`
  - Group `VisitLogs` by `vendor_id`; order by sum(`cash_collected`) descending; take top 10

### Additional rules
- Use `VisitLogs` for all time-based and historical metrics.
- Do not use a dedicated dashboard sheet.
- `expected_cash` is stored in `VisitLogs` and is not recomputed from historical records.
- `unit_price` is stored in `VisitLogs` and preserves historical pricing.

---

## 7. Migration Plan from Current Mock Data

### Current state
- The repo currently contains mock data in `src/lib/api/*`.
- The active service layer uses `src/services/gasApi.ts`.
- Some legacy files may still reference mock modules.

### Migration steps
1. Create the final Google Sheets structure with the six sheets.
2. Populate `Products` from planned product catalog.
3. Populate `SalesReps` with known sales reps.
4. Migrate mock `Vendors` to `Vendors` sheet.
5. Create `Inventory` rows for each `vendor_id` + `product_id` combination in use.
6. Populate `VendorBalances` from mock inventory money fields or initial values.
7. Translate mock transactions into `VisitLogs`, including:
   - `visit_id`
   - `timestamp`
   - `date`
   - `product_id`
   - `unit_price`
   - `expected_cash`

8. Confirm `VisitLogs` is append-only; do not update historical rows.
9. Update GAS endpoints to read from the final sheets and remove any mock read paths.
10. Validate the service layer: all reads from Sheets, writes through `/visit` and `/vendor` endpoints.

### Notes
- Existing `Inventory` and `VendorBalances` must be initialized from the mock dataset.
- Mock `Transactions` record data should be migrated into `VisitLogs` with historical pricing.
- Do not use the old `Dashboard` sheet; compute metrics dynamically.

---

## 8. Security Review

### API key handling
- Do not expose any Google Apps Script API key in client-side code.
- Replace `NEXT_PUBLIC_GAS_API_KEY` with a server-only env variable (e.g. `GAS_API_KEY`).
- Use server-side proxy or Next.js API routes where possible.

### Endpoint protection
- Validate all request payloads strictly.
- Require `sales_rep_id` to exist for `/vendor` and `/visit`.
- Generate `vendor_id`, `inventory_id`, and `visit_id` server-side.

### Google Apps Script access
- Use request validation inside GAS, such as secret key headers.
- Optional: implement IP or origin checks if feasible.
- Limit sheet access to required ranges only.

### Data integrity
- `VisitLogs` must remain immutable once appended.
- `expected_cash` and `unit_price` must be stored in the visit row and not recalculated later.
- `Inventory` updates must preserve stock-only state; `VendorBalances` updates must preserve money-only state.

### Google Sheets protection strategy
- Protect `VisitLogs`, `Inventory`, and `VendorBalances` ranges in Sheets to prevent manual edits.
- Set `VisitLogs` to append-only where possible and restrict update/delete access to system service accounts only.
- Protect `Products`, `SalesReps`, and `Vendors` ranges with edit permissions only for trusted administrators.
- Use separate edit permissions for metadata fields such as `last_updated` and `date_created`.
- Use GAS request validation and secret key headers in addition to sheet protection.

### Inventory reconciliation strategy
- Reconcile `Inventory.current_stock` weekly or monthly by recomputing from `VisitLogs` and stored supply/sales totals.
- Store reconciliation metadata such as `last_reconciled_at`, `reconciled_by`, and `reconciliation_notes` in a separate reconciliation log or in a protected `InventoryReconciliation` sheet.
- Treat `Inventory` as a materialized view that can be rebuilt from `VisitLogs` if discrepancies are detected.
- Use `last_updated` timestamps on `Inventory` rows to identify stale or out-of-sync records.

### Audit trail
- `VisitLogs` is the audit trail; do not delete or modify past records.
- All writes must pass through the `/visit` or `/vendor` endpoints.

---

## Approval
This document is the final Phase 5 architecture and specification. No implementation code will be written until this plan is explicitly approved.
