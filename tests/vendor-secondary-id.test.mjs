import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatSecondaryVendorId, getAcquisitionInitial, getSecondaryVendorPrefix, VENDOR_CATEGORY_CODES } from '../src/lib/vendorSecondaryId.ts';
import { allocateSecondaryVendorSequence } from '../src/repositories/SecondaryVendorIdSequenceRepository.ts';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('secondary ID category mappings and acquired_by initials match the approved format', () => {
  assert.deepEqual(VENDOR_CATEGORY_CODES, {
    'Market Vendor': 'MV', 'Street Food Vendor (STV)': 'ST', Minimarket: 'MM', Supermarket: 'SM', Restaurant: 'RE',
  });
  assert.equal(getSecondaryVendorPrefix('Market Vendor', 'John'), 'MVJ');
  assert.equal(getSecondaryVendorPrefix('Street Food Vendor (STV)', 'Musa'), 'STM');
  assert.equal(getSecondaryVendorPrefix('Minimarket', 'Mariama'), 'MMM');
  assert.equal(getSecondaryVendorPrefix('Supermarket', 'Ébrima'), 'SME');
  assert.equal(getSecondaryVendorPrefix('Restaurant', 'Awa'), 'REA');
  assert.equal(getAcquisitionInitial('  Musa Jallow'), 'M');
  assert.equal(getAcquisitionInitial('Ébrima'), 'E');
});

test('missing, unusable, and unsupported identity inputs do not invent an initial or category code', () => {
  assert.equal(getAcquisitionInitial(null), null);
  assert.equal(getAcquisitionInitial(''), null);
  assert.equal(getAcquisitionInitial('— John'), null);
  assert.equal(getSecondaryVendorPrefix('Unknown category', 'John'), null);
  assert.equal(getSecondaryVendorPrefix('constructor', 'John'), null);
  assert.equal(getSecondaryVendorPrefix('Market Vendor', '123'), null);
});

test('sequence formatting is stable and rejects out-of-range identifiers', () => {
  assert.equal(formatSecondaryVendorId('MVJ', 1), 'MVJ-001');
  assert.equal(formatSecondaryVendorId('MVJ', 12), 'MVJ-012');
  assert.equal(formatSecondaryVendorId('MVJ', 999), 'MVJ-999');
  assert.throws(() => formatSecondaryVendorId('MVJ', 1000));
  assert.throws(() => formatSecondaryVendorId('MV', 1));
});

test('creation allocates under the transaction and a locked per-prefix sequence; edits cannot regenerate IDs', () => {
  const service = read('src/services/vendorService.ts');
  const repository = read('src/repositories/VendorRepository.ts');
  const allocator = read('src/repositories/SecondaryVendorIdSequenceRepository.ts');
  assert.match(service, /return transaction\(async \(connection\)/);
  assert.match(allocator, /FOR UPDATE/);
  assert.match(allocator, /UPDATE vendor_secondary_id_sequences SET `last_value` = \?/);
  assert.match(service, /secondaryVendorId = await allocateSecondaryVendorId/);
  assert.match(service, /Unsupported vendor category/);
  assert.match(repository, /secondary_vendor_id/);
  const updateBlock = repository.slice(
    repository.indexOf('public async update('),
    repository.indexOf('public async assignSecondaryVendorIdIfNull('),
  );
  assert.doesNotMatch(updateBlock, /secondary_vendor_id\s*=/);
});

test('editing an existing vendor assigns only a missing ID from the effective category and acquired-by values', () => {
  const service = read('src/services/vendorService.ts');
  const repository = read('src/repositories/VendorRepository.ts');
  const form = read('src/components/forms/vendor-form.tsx');
  const updateBlock = service.slice(service.indexOf('export async function updateVendor('));
  assert.match(updateBlock, /return transaction\(async \(connection\)/);
  assert.match(updateBlock, /SELECT vendor_type_id, acquired_by, secondary_vendor_id FROM vendors WHERE vendor_id = \? FOR UPDATE/);
  assert.match(updateBlock, /if \(current\.secondary_vendor_id === null \|\| current\.secondary_vendor_id === undefined\)/);
  assert.match(updateBlock, /updates\.vendor_type_id === undefined \? current\.vendor_type_id : updates\.vendor_type_id/);
  assert.match(updateBlock, /updates\.acquired_by === undefined \? current\.acquired_by : updates\.acquired_by/);
  assert.match(updateBlock, /allocateSecondaryVendorSequence\(connection, prefix\)/);
  assert.match(repository, /assignSecondaryVendorIdIfNull[\s\S]*secondary_vendor_id IS NULL/);
  assert.match(form, /secondary_vendor_id_assignment_issue/);
  assert.match(form, /Vendor updated successfully\. \$\{updated\.secondary_vendor_id_assignment_issue\}/);
});

test('sequence allocation remains unique under concurrent requests and advances beyond issued IDs', async () => {
  const state = { sequences: new Map(), maxIssued: 7 };
  let lockTail = Promise.resolve();
  function connection() {
    let releaseLock;
    return {
      async execute(sql, params) {
        if (sql.startsWith('INSERT INTO vendor_secondary_id_sequences')) {
          if (!state.sequences.has(params[0])) state.sequences.set(params[0], 0);
          return [[], []];
        }
        if (sql.includes('FOR UPDATE')) {
          const previous = lockTail;
          let release;
          lockTail = new Promise((resolve) => { release = resolve; });
          await previous;
          releaseLock = release;
          return [[{ last_value: state.sequences.get(params[0]) }], []];
        }
        if (sql.startsWith('SELECT COALESCE(MAX')) return [[{ last_issued: state.maxIssued }], []];
        if (sql.startsWith('UPDATE vendor_secondary_id_sequences')) {
          state.sequences.set(params[1], params[0]);
          releaseLock?.();
          return [{ affectedRows: 1 }, []];
        }
        throw new Error(`Unexpected SQL in allocator test: ${sql}`);
      },
    };
  }
  const allocated = await Promise.all(Array.from({ length: 20 }, () => allocateSecondaryVendorSequence(connection(), 'MVJ')));
  assert.equal(new Set(allocated).size, 20);
  assert.deepEqual([...allocated].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 8));
  assert.equal(state.sequences.get('MVJ'), 27);
});

test('a newly eligible Market Vendor with the MVF-001 prefix already issued receives MVF-002', async () => {
  const state = { value: 1 };
  const db = {
    async execute(sql, params) {
      if (sql.startsWith('INSERT INTO vendor_secondary_id_sequences')) return [[], []];
      if (sql.includes('FOR UPDATE')) return [[{ last_value: state.value }], []];
      if (sql.startsWith('SELECT COALESCE(MAX')) return [[{ last_issued: 1 }], []];
      if (sql.startsWith('UPDATE vendor_secondary_id_sequences')) {
        state.value = params[0];
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Unexpected SQL in allocator test: ${sql}`);
    },
  };
  const sequence = await allocateSecondaryVendorSequence(db, 'MVF');
  assert.equal(formatSecondaryVendorId('MVF', sequence), 'MVF-002');
  assert.equal(state.value, 2);
});

test('migration provides nullable legacy-compatible storage, a unique key, and one sequence row per prefix', () => {
  const migration = read('db/migrations/0048_add_secondary_vendor_ids.sql');
  assert.match(migration, /secondary_vendor_id VARCHAR\(8\) NULL/);
  assert.match(migration, /UNIQUE KEY ux_vendors_secondary_vendor_id/);
  assert.match(migration, /PRIMARY KEY \(prefix\)/);
});

test('backfill is ordered, skips assigned IDs, only updates unassigned vendors, and reports review cases', () => {
  const script = read('scripts/backfill-secondary-vendor-ids.mjs');
  assert.match(script, /ORDER BY v\.vendor_id ASC/);
  assert.match(script, /if \(vendor\.secondary_vendor_id\) continue/);
  assert.match(script, /WHERE vendor_id = \? AND secondary_vendor_id IS NULL/);
  assert.match(script, /manual_review_count/);
  assert.match(script, /proposed_prefix/);
  assert.match(script, /eligibility_report_count/);
  assert.match(script, /if \(APPLY\) await connection\.commit\(\)/);
  assert.match(script, /Refusing to run the vendor ID backfill against a non-local database/);
});
