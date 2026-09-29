import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('db/migrations/0034_add_cooking_location.sql', 'utf8');
const repository = fs.readFileSync('src/repositories/DeliveryRepository.ts', 'utf8');
const service = fs.readFileSync('src/services/deliveryService.ts', 'utf8');
const api = fs.readFileSync('src/lib/api/deliveries.ts', 'utf8');
const form = fs.readFileSync('src/components/deliveries/delivery-form.tsx', 'utf8');
const card = fs.readFileSync('src/components/deliveries/delivery-card.tsx', 'utf8');
const details = fs.readFileSync('src/components/deliveries/delivery-details.tsx', 'utf8');

assert.match(migration, /cooking_location VARCHAR\(32\) NULL/);
assert.match(migration, /information_schema\.COLUMNS/);
assert.match(repository, /cooking_location/);
assert.match(service, /validateCookingLocation/);
assert.match(service, /Home.*Workplace/);
assert.match(api, /cooking_location/);
assert.match(form, /value="Home"/);
assert.match(form, /value="Workplace"/);
assert.match(form, /cooking_location: cookingLocation \|\| undefined/);
assert.match(card, /delivery\.cooking_location/);
assert.match(details, /delivery\.cooking_location/);
assert.match(details, /Not specified/);
console.log('delivery cooking location tests passed');
