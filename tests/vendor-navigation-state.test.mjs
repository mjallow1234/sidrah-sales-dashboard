import assert from 'node:assert/strict';
import fs from 'node:fs';

const utility = fs.readFileSync('src/lib/navigation/vendorNavigation.ts', 'utf8');
const modal = fs.readFileSync('src/components/dashboard/dormant-vendors-modal.tsx', 'utf8');
const admin = fs.readFileSync('src/components/dashboard/admin-control-center.tsx', 'utf8');
const agent = fs.readFileSync('src/components/dashboard/dashboard-shell.tsx', 'utf8');
const owing = fs.readFileSync('src/components/dashboard/vendors-owing-modal.tsx', 'utf8');
const list = fs.readFileSync('src/components/vendors/vendor-list.tsx', 'utf8');
const detail = fs.readFileSync('src/components/vendors/vendor-details-shell.tsx', 'utf8');

assert.match(utility, /getSafeReturnTo/);
assert.match(utility, /startsWith\('\/\'\)/);
assert.match(utility, /vendorHref/);
assert.match(modal, /detailLocation/);
assert.match(modal, /detailVendorTypeId/);
assert.match(modal, /sessionStorage/);
assert.match(modal, /scrollTop/);
assert.match(modal, /vendorHref/);
assert.match(admin, /detailFromSearchParams/);
assert.match(admin, /router\.replace/);
assert.match(admin, /detailLocation/);
assert.match(admin, /detailVendorTypeId/);
assert.match(admin, /vendorHref/);
assert.match(agent, /detail.*vendor-owing/);
assert.match(agent, /updateAgentDetail/);
assert.match(owing, /vendorHref/);
assert.match(owing, /vendor-drilldown-scroll/);
assert.match(list, /searchParams/);
assert.match(list, /sessionStorage/);
assert.match(list, /vendorHref/);
assert.match(detail, /getSafeReturnTo/);
assert.match(detail, /returnTo/);

console.log('vendor navigation state tests passed');
