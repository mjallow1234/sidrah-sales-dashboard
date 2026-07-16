# Hostinger Deployment Guide for sidrah-sales-dashboard

## Overview
This guide prepares `sidrah-sales-dashboard` for deployment on Hostinger Business Hosting under the domain `sales.sidrahsalaam.com`.

## Compatibility Audit
- `package.json` is configured for Node 18+.
- `next.config.mjs` uses `output: 'standalone'` for standalone deployment.
- Build script is `npm run build`.
- Start script is now `node .next/standalone/server.js`.
- The app uses server-rendered Next.js routes and public environment variables for the Google Apps Script backend.

## Required Files
- `.env.production.example`
- `ecosystem.config.js`
- `hostinger-deploy.md`
- `README.md`

## Production environment variables
Set these values in Hostinger Node.js app settings or via a production `.env` file:

```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
NEXT_PUBLIC_GAS_API_KEY=YOUR_API_KEY
```

## Hostinger Deployment Settings
- Node Version: `18.x` or later
- Build Command: `npm install && npm run build`
- Output Directory: `.next/standalone`
- Start Command: `node .next/standalone/server.js`
- Application Root: project root (where `package.json` resides)

## Deployment Checklist
1. Ensure Hostinger Business Hosting has Node.js support enabled.
2. Clone or upload repository to Hostinger.
3. Set Node version to `18.x` or newer.
4. Install dependencies: `npm install`
5. Build the app: `npm run build`
6. Confirm `.next/standalone/server.js` exists.
7. Configure environment variables.
8. Start the app with `node .next/standalone/server.js` or PM2.
9. Set Hostinger domain to `sales.sidrahsalaam.com`.
10. Verify the app is reachable at the domain.

## Notes
- `next start` is not compatible with `output: 'standalone'` in this repository.
- Use `node .next/standalone/server.js` for production.
- Do not connect Google Sheets until the environment variables and deployment are stable.
