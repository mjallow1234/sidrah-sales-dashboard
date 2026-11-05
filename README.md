# Sidrah Sales Dashboard

A mobile-first Next.js 15 dashboard for vendor sales tracking, with Google Apps Script backend integration and standalone deployment support.

## Project setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Create local env file from example
   ```bash
   cp .env.local.example .env.local
   ```

3. Run development server
   ```bash
   npm run dev
   ```

## Production build

```bash
npm run build
npm run start
```

> Note: `npm run start` runs the standalone server at `node .next/standalone/server.js`.

## Secondary Vendor ID backfill operators

The local and production secondary Vendor ID backfill scripts require Node.js with stable built-in TypeScript support: Node 24.12 or later in the 24.x line, Node 25.2 or later in the 25.x line, or Node 26 or later. This operator-only requirement does not change the Node.js version required to run the application. The local script refuses non-local database hosts. The production script requires its explicit production and database confirmation flags; use it only under an approved production backfill procedure.

## Deployment

This repository is prepared for Hostinger Business Hosting deployment using a standalone Next.js build.

### Required environment variables
- `NODE_ENV=production`
- `PORT` (e.g. `3000`)
- `NEXT_PUBLIC_GAS_API_URL`
- `NEXT_PUBLIC_GAS_API_KEY`

### Recommended Hostinger steps
1. Upload source to Hostinger.
2. Install dependencies with `npm install`.
3. Build the project with `npm run build`.
4. Start the server with `npm run start` or use PM2 via `ecosystem.config.js`.
5. Set the Hostinger domain to `sales.sidrahsalaam.com`.

## Deploying Apps Script

Use the standardized PowerShell deployment script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-gas.ps1
```

## Backend Development

The Google Apps Script backend source is maintained in the `backend/` folder.
- `backend/*.gs` is the canonical backend source of truth.
- `root/appsscript.json` is the deployment manifest used by `scripts/deploy-gas.ps1`.
- `scripts/deploy-gas.ps1` is the only supported deployment method.
- Do not edit root-level legacy GAS artifacts such as `Code.js`, `validation.js`, `config.js`, or `AppUsersMigration.js`.
- All schema changes must be implemented through `backend/schema_migrations.gs`.

## GitHub repository

Repository: `sidrah-sales-dashboard`
