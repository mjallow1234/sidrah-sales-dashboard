# Repository Architecture

## Purpose

This folder contains the database repository layer for the application. It is responsible only for data access and SQL execution. All business logic, validation, calculations, and transaction orchestration belong in services.

## Structure

- `BaseRepository.ts`
  - Provides shared database helpers:
    - `execute()`
    - `executeOne()`
    - `executeMany()`
    - `exists()`
    - `paginate()`
    - `beginTransaction()` / `commit()` / `rollback()`
  - Uses dependency injection for the database client (`Pool` or `PoolConnection`).
  - Enforces typed results and typed errors.

- `types.ts`
  - Defines common repository types and the `IBaseRepository` generic interface.
  - Provides a shared `PaginatedResult<T>` contract.

- `errors.ts`
  - Defines typed repository errors:
    - `RepositoryError`
    - `NotFoundError`
    - `DuplicateRecordError`
    - `TransactionError`
    - `RepositoryStateError`

- `index.ts`
  - Central export file for repository imports.

- Repository files
  - One repository per bounded data concept.
  - Each repository extends `BaseRepository`.
  - Each repository exposes typed CRUD/search methods.
  - No SQL is written outside repositories.
  - Methods currently throw explicit `not implemented` errors until implementation begins.

## Naming and responsibilities

Repositories created:
- `VendorRepository`
- `ProductRepository`
- `InventoryRepository`
- `VendorInventoryRepository`
- `VendorBalanceRepository`
- `VisitRepository`
- `SalesRepRepository`
- `AppUserRepository`
- `AuditRepository`
- `TransactionJournalRepository`
- `DailyStatsRepository`
- `BackgroundJobRepository`
- `IdSequenceRepository`

Each repository is responsible only for data access and mapping database rows to typed objects. No business rules are implemented in these classes.

## Service layer expectations

Service classes will:
- Own business rules and validation.
- Coordinate multiple repositories.
- Manage SQL transactions via the database layer, not repositories.
- Expose application use cases to API routes.

## API route flow

API route → Service → Repository → Database

This ensures no route bypasses the service layer and all SQL remains inside repositories.
