# Backend Implementation

This backend package contains the Google Apps Script backend for the SIDRAH SALAAM sales application.

## Structure
- `Code.gs` — application entrypoint, routing, endpoints, validation, and business logic
- `validation.gs` — reusable validation helpers and HTTP error helpers
- `config.gs` — application configuration and sheet helpers
- `appsscript.json` — Apps Script manifest
- `postman-collection.json` — API request collection for Postman
- `test-dataset.json` — sample test payloads

## Phase 6 Deliverables
- Google Apps Script backend
- GET endpoints
- POST `/vendor`
- POST `/visit`
- Validation layer
- Authentication strategy
- Error handling
- API documentation
- Test dataset
- Deployment guide

## Official Sheets
The backend and setup script rely on these official sheets:
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

## Endpoints

### GET
- `/vendors`
- `/vendors/:vendor_id`
- `/products`
- `/inventory`
- `/vendorbalances`
- `/visitlogs`
- `/salesreps`
- `/stats`

### POST
- `/vendor`
- `/visit`
- `/product`
- `/salesrep`

### PUT
- `/product/:id`
- `/vendor/:id`
- `/salesrep/:id`

> Note: Google Apps Script Web Apps only expose `doGet(e)` and `doPost(e)`. This backend supports PUT-style semantics using a POST request with a method override.
>
> Example body:
> ```json
> {
>   "_method": "PUT",
>   "product_name": "Deygeh 4kg"
> }
> ```
>
> Example query override:
> `/product/P001?method=PUT`

## Authentication
All requests require the API key parameter:
- `apiKey`

The key is validated against the script property `GAS_API_KEY`.

## Validation
The backend validates:
- required fields
- string fields
- numeric fields
- date fields
- foreign key references
- pagination parameters
- non-negative inventory values for visits
- `stock_sold` not exceeding `opening_stock`
- idempotent visit requests via `client_transaction_id`

## Transaction Recovery
The backend writes structured transaction lifecycle records to the `TransactionJournal` sheet.

Recovery guidance:
- `begin` indicates the request started.
- `inventory_update` and `balance_update` indicate staged side effects.
- `visit_append` must succeed for the visit to be complete.
- `complete` means the transaction finished successfully.
- `failure` means the transaction aborted and rollback was attempted.
- External recovery can scan `TransactionJournal` for rows with `completed` = `FALSE`.
- If a `client_transaction_id` appears for an existing visit, replay is treated as a duplicate and returns the prior visit.

## Test Dataset
See `test-dataset.json` for sample requests and test values.

## API Documentation
Use `postman-collection.json` to import the API endpoints into Postman. The collection includes example request bodies and query parameters.

## Deployment Guide
1. Open the backend folder in Google Apps Script or use clasp to push the project.
2. Set the project manifest in `appsscript.json`.
3. Deploy as a Web App with `Execute as: Me` and `Who has access: Anyone` or the required access level.
4. Set the script property `GAS_API_KEY` using `PropertiesService.getScriptProperties().setProperty('GAS_API_KEY', '<YOUR_KEY>');`.
5. Use the published web app URL plus path routes in your client requests.

### Example deployment commands (clasp)
```bash
clasp login
clasp create --type standalone --title "SIDRAH SALAAM Backend"
clasp push
```

### Notes
- Do not modify the live Next.js frontend until the backend is tested.
- The backend is intentionally implemented in a separate `backend/` folder.
