# Deployment Preparation for Hostinger

## Overview
Prepare the `sidrah-sales-app` Next.js 15 application for production deployment on Hostinger using a standalone build and PM2 process manager.

## Prerequisites
- Hostinger Node.js hosting plan with Node 18+ support
- Access to Hostinger File Manager or SSH/terminal
- PM2 installed on the Hostinger server (either globally or locally)
- `npm` available in the deployment environment

## Build and Deployment Checklist
1. Confirm `npm install` succeeds locally and on the target host.
2. Verify `npm run build` completes successfully.
3. Ensure `next.config.mjs` includes `output: 'standalone'`.
4. Set required environment variables in Hostinger for production.
5. Upload project files excluding `node_modules` and `.next/standalone` if building on the host.
6. Run `npm install --production` on the host.
7. Run `npm run build` and confirm `.next/standalone/server.js` exists.
8. Start the app with PM2 using `ecosystem.config.js`.
9. Verify the app listens on the configured `PORT` and responds successfully.

## Required Environment Variables
- `NODE_ENV=production`
- `PORT` (e.g. `3000`)
- `NEXT_PUBLIC_GAS_API_BASE_URL` - URL to your Google Apps Script backend
- `NEXT_PUBLIC_GAS_API_KEY` - optional API key for GAS requests

## npm Commands
- Install dependencies:
  - `npm install`
- Build production app:
  - `npm run build`
- Start production app:
  - `npm run start`

## Hostinger Deployment Steps
1. Upload project source to Hostinger.
2. Set environment variables in the Hostinger Node.js dashboard or `.env.production` file.
3. Run:
   - `npm install`
   - `npm run build`
4. Launch with PM2:
   - `npx pm2 start ecosystem.config.js --env production`
5. Save PM2 process list:
   - `npx pm2 save`
6. Restart app after changes:
   - `npx pm2 restart sidrah-sales-app`

## Hostinger Notes
- Hostinger may require the `PORT` variable to match the assigned port in the hosting panel.
- If Hostinger manages Node processes directly, set the app entrypoint to `.next/standalone/server.js`.
- Keep `.env.production` out of source control; use `.env.production.example` as a template.

## Notes for Production
- `output: 'standalone'` creates a self-contained `.next/standalone` runtime directory.
- On Hostinger, you can either:
  - build on the host and run `node .next/standalone/server.js`, or
  - build locally and upload `.next/standalone`, `package.json`, and `ecosystem.config.js`.
- Always verify `NEXT_PUBLIC_GAS_API_BASE_URL` is reachable from the production host.
