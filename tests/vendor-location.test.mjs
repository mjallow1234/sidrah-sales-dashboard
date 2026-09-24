import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('db/migrations/0020_add_vendor_locations.sql', 'utf8');
const service = fs.readFileSync('src/services/vendorLocationService.ts', 'utf8');
const repository = fs.readFileSync('src/repositories/VendorLocationRepository.ts', 'utf8');
const locationRoute = fs.readFileSync('src/app/api/vendors/[id]/location/route.ts', 'utf8');
const requestRoute = fs.readFileSync('src/app/api/vendor-location-requests/[requestId]/route.ts', 'utf8');
const panel = fs.readFileSync('src/components/vendors/vendor-location-panel.tsx', 'utf8');
const requests = fs.readFileSync('src/components/vendors/vendor-location-requests.tsx', 'utf8');

assert.match(migration, /location_latitude DECIMAL\(10,7\)/i);
assert.match(migration, /location_longitude DECIMAL\(10,7\)/i);
assert.match(migration, /CREATE TABLE vendor_location_update_requests/i);
assert.match(migration, /status ENUM\('pending','approved','rejected'\)/i);
assert.match(service, /navigator|validateCoordinates|latitude.*-90|longitude.*-180/s);
assert.match(service, /isAgentRole\(actor\.role\).*hasExistingLocation/s);
assert.match(service, /location_update_requested/);
assert.match(service, /location_request_\$\{decision\}/);
assert.match(service, /lockVendor|lockRequest/);
assert.match(repository, /FOR UPDATE/);
assert.match(locationRoute, /submitVendorLocation/);
assert.match(requestRoute, /approveVendorLocationRequest|rejectVendorLocationRequest/);
assert.match(panel, /navigator\.geolocation/);
assert.match(panel, /permission was denied/i);
assert.match(panel, /pending_request/);
assert.match(requests, /Existing:/);
assert.match(requests, /Proposed:/);

console.log('vendor-location tests passed');
