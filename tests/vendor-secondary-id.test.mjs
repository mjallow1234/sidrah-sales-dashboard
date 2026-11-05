import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatSecondaryVendorId, getAcquisitionInitial, getSecondaryVendorPrefix, VENDOR_CATEGORY_CODES } from '../src/lib/vendorSecondaryId.ts';
import { allocateSecondaryVendorSequenceIfNext, assignBackfillSecondaryVendorId } from '../src/repositories/SecondaryVendorIdSequenceRepository.ts';

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
  assert.match(service, /allocateSecondaryVendorSequenceIfNext\(connection, prefix, vendorId, getSecondaryVendorPrefix\)/);
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
  assert.match(updateBlock, /allocateSecondaryVendorSequenceIfNext\(connection, prefix, vendorId, getSecondaryVendorPrefix\)/);
  assert.match(repository, /assignSecondaryVendorIdIfNull[\s\S]*secondary_vendor_id IS NULL/);
  assert.match(form, /secondary_vendor_id_assignment_issue/);
  assert.match(form, /Vendor updated successfully\. \$\{updated\.secondary_vendor_id_assignment_issue\}/);
});

test('vendor creation succeeds with missing or unsupported identity data and leaves the secondary ID unassigned', () => {
  const service = read('src/services/vendorService.ts');
  const allocator = service.slice(service.indexOf('async function allocateSecondaryVendorId('), service.indexOf('async function getSecondaryVendorIdPrefix('));
  const create = service.slice(service.indexOf('export async function createVendor('), service.indexOf('export async function updateVendor('));
  assert.match(allocator, /if \(!prefix\) return null/);
  assert.doesNotMatch(allocator, /throw new ValidationError.*Unsupported vendor category/);
  assert.match(create, /const secondaryVendorId = await allocateSecondaryVendorId/);
  assert.match(create, /secondary_vendor_id: secondaryVendorId/);
  assert.match(service, /if \(!vendorTypeId\) return \{ prefix: null, issue:/);
  assert.match(service, /if \(!acquiredById \|\| !row\.acquired_name\)/);
  assert.match(service, /if \(!Object\.prototype\.hasOwnProperty\.call\(VENDOR_CATEGORY_CODES, category\)\)/);
});

test('ordered allocator serializes concurrent requests and advances beyond issued IDs', async () => {
  const state = { counter: 7, maxIssued: 7 };
  let vendorLockTail = Promise.resolve();
  function connection() {
    let releaseVendorLock;
    return {
      async beginTransaction() {},
      async commit() { releaseVendorLock?.(); },
      async rollback() { releaseVendorLock?.(); },
      async execute(sql, params = []) {
        if (sql.includes('FROM id_sequences') && sql.includes('FOR UPDATE')) {
          const previous = vendorLockTail;
          let release;
          vendorLockTail = new Promise((resolve) => { release = resolve; });
          await previous;
          releaseVendorLock = release;
          return [[{ entity_name: 'Vendors' }], []];
        }
        if (sql.includes('FROM vendors v') && sql.includes('secondary_vendor_id IS NULL')) return [[], []];
        if (sql.startsWith('INSERT INTO vendor_secondary_id_sequences')) return [[], []];
        if (sql.includes('SELECT `last_value`') && sql.includes('FOR UPDATE')) return [[{ last_value: state.counter }], []];
        if (sql.startsWith('SELECT COALESCE(MAX')) return [[{ last_issued: state.maxIssued }], []];
        if (sql.startsWith('UPDATE vendor_secondary_id_sequences')) {
          state.counter = params[0];
          return [{ affectedRows: 1 }, []];
        }
        throw new Error(`Unexpected SQL in allocator test: ${sql}`);
      },
    };
  }
  const allocate = async (vendorId) => {
    const db = connection();
    await db.beginTransaction();
    try {
      const sequence = await allocateSecondaryVendorSequenceIfNext(db, 'MVJ', vendorId, getSecondaryVendorPrefix);
      await db.commit();
      return sequence;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  };
  const allocated = await Promise.all(Array.from({ length: 20 }, (_, i) => allocate(`V${String(443 + i).padStart(3, '0')}`)));
  assert.equal(new Set(allocated).size, 20);
  assert.deepEqual(allocated, Array.from({ length: 20 }, (_, i) => i + 8));
  assert.equal(state.counter, 27);
});

test('a newly eligible Market Vendor with the MVF-001 prefix already issued receives MVF-002', async () => {
  const db = fakeBacklogConnection([
    { vendor_id: 'V001', vendor_type: 'Market Vendor', acquired_by: 'Fatty', secondary_vendor_id: 'MVF-001' },
  ], { MVF: 1 });
  const sequence = await allocateSecondaryVendorSequenceIfNext(db, 'MVF', 'V443', getSecondaryVendorPrefix);
  assert.equal(formatSecondaryVendorId('MVF', sequence), 'MVF-002');
  assert.equal(db.counters.get('MVF'), 2);
});

test('migration provides nullable legacy-compatible storage, a unique key, and one sequence row per prefix', () => {
  const migration = read('db/migrations/0048_add_secondary_vendor_ids.sql');
  assert.match(migration, /secondary_vendor_id VARCHAR\(8\) NULL/);
  assert.match(migration, /UNIQUE KEY ux_vendors_secondary_vendor_id/);
  assert.match(migration, /PRIMARY KEY \(prefix\)/);
});

test('backfill is ordered, skips assigned IDs, only updates unassigned vendors, and reports review cases', () => {
  const script = read('scripts/backfill-secondary-vendor-ids.mjs');
  assert.match(script, /ORDER BY CAST\(SUBSTRING\(v\.vendor_id, 2\) AS UNSIGNED\) ASC, v\.vendor_id ASC/);
  assert.ok(script.indexOf("SELECT entity_name FROM id_sequences WHERE entity_name = ? FOR UPDATE") < script.indexOf('SELECT v.vendor_id'));
  assert.match(script, /if \(vendor\.secondary_vendor_id\) continue/);
  assert.match(script, /assignBackfillSecondaryVendorId\(connection, String\(vendor\.vendor_id\), secondaryId\)/);
  assert.match(script, /manual_review_count/);
  assert.match(script, /proposed_prefix/);
  assert.match(script, /eligibility_report_count/);
  assert.match(script, /if \(APPLY\) await connection\.commit\(\)/);
  assert.match(script, /Refusing to run the vendor ID backfill against a non-local database/);
  const productionScript = read('scripts/backfill-secondary-vendor-ids-production.mjs');
  assert.ok(productionScript.indexOf("SELECT entity_name FROM id_sequences WHERE entity_name = ? FOR UPDATE") < productionScript.indexOf('SELECT v.vendor_id'));
  assert.match(productionScript, /ORDER BY CAST\(SUBSTRING\(v\.vendor_id, 2\) AS UNSIGNED\) ASC,v\.vendor_id ASC/);
  const allocator = read('src/repositories/SecondaryVendorIdSequenceRepository.ts');
  assert.match(allocator, /WHERE vendor_id = \? AND secondary_vendor_id IS NULL/);
  assert.match(allocator, /expected affectedRows 1, received/);
});

function fakeBacklogConnection(vendors, initialCounters = {}) {
  const counters = new Map(Object.entries(initialCounters));
  const calls = [];
  return {
    calls,
    counters,
    async execute(sql, params = []) {
      calls.push(sql);
      if (sql.includes('FROM id_sequences') && sql.includes('FOR UPDATE')) return [[{ entity_name: 'Vendors' }], []];
      if (sql.includes('FROM vendors v') && sql.includes('secondary_vendor_id IS NULL')) {
        const target = Number(String(params[0]).slice(1));
        const rows = vendors
          .filter((vendor) => Number(String(vendor.vendor_id).slice(1)) < target && vendor.secondary_vendor_id == null)
          .sort((a, b) => Number(String(a.vendor_id).slice(1)) - Number(String(b.vendor_id).slice(1)))
          .map((vendor) => ({ vendor_type_name: vendor.vendor_type, acquired_by_name: vendor.acquired_by }));
        return [rows, []];
      }
      if (sql.startsWith('INSERT INTO vendor_secondary_id_sequences')) {
        if (!counters.has(params[0])) counters.set(params[0], 0);
        return [[], []];
      }
      if (sql.includes('SELECT `last_value`') && sql.includes('FOR UPDATE')) {
        return [[{ last_value: counters.get(params[0]) ?? 0 }], []];
      }
      if (sql.startsWith('SELECT COALESCE(MAX')) {
        const prefix = String(params[0]).slice(0, 3);
        const numbers = vendors
          .filter((vendor) => String(vendor.secondary_vendor_id || '').startsWith(`${prefix}-`))
          .map((vendor) => Number(String(vendor.secondary_vendor_id).slice(4)));
        return [[{ last_issued: Math.max(0, ...numbers) }], []];
      }
      if (sql.startsWith('UPDATE vendor_secondary_vendor_id_sequences')) {
        counters.set(params[1], params[0]);
        return [{ affectedRows: 1 }, []];
      }
      if (sql.startsWith('UPDATE vendor_secondary_id_sequences')) {
        counters.set(params[1], params[0]);
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Unexpected SQL in backlog test: ${sql}`);
    },
  };
}

const prefixFor = (vendor) => getSecondaryVendorPrefix(vendor.vendor_type, vendor.acquired_by);

test('new eligible vendor gets the next ID when no older same-prefix vendor is pending', async () => {
  const db = fakeBacklogConnection([{ vendor_id: 'V001', vendor_type: 'Market Vendor', acquired_by: 'John', secondary_vendor_id: 'MVJ-001' }], { MVJ: 1 });
  const sequence = await allocateSecondaryVendorSequenceIfNext(db, 'MVJ', 'V443', getSecondaryVendorPrefix);
  assert.equal(formatSecondaryVendorId('MVJ', sequence), 'MVJ-002');
  assert.equal(db.counters.get('MVJ'), 2);
});

test('new eligible vendor remains unassigned without consuming a sequence when an older same-prefix vendor is pending', async () => {
  const db = fakeBacklogConnection([{ vendor_id: 'V001', vendor_type: 'Market Vendor', acquired_by: 'Fatty', secondary_vendor_id: null }]);
  const sequence = await allocateSecondaryVendorSequenceIfNext(db, 'MVF', 'V443', getSecondaryVendorPrefix);
  assert.equal(sequence, null);
  assert.equal(db.counters.size, 0);
  assert.equal(db.calls.some((sql) => sql.includes('vendor_secondary_id_sequences')), false);
});

test('ordered allocator refuses to proceed when it cannot acquire the Vendors sequence lock', async () => {
  const calls = [];
  const db = {
    async execute(sql) {
      calls.push(sql);
      return [[], []];
    },
  };
  await assert.rejects(
    allocateSecondaryVendorSequenceIfNext(db, 'MVJ', 'V443', getSecondaryVendorPrefix),
    /Could not lock the vendor ID sequence/,
  );
  assert.equal(calls.length, 1);
  assert.match(calls[0], /id_sequences[\s\S]*FOR UPDATE/);
});

test('backlog in another prefix does not block allocation', async () => {
  const db = fakeBacklogConnection([{ vendor_id: 'V001', vendor_type: 'Street Food Vendor (STV)', acquired_by: 'Musa', secondary_vendor_id: null }]);
  const sequence = await allocateSecondaryVendorSequenceIfNext(db, 'MVJ', 'V443', getSecondaryVendorPrefix);
  assert.equal(formatSecondaryVendorId('MVJ', sequence), 'MVJ-001');
  assert.equal(db.counters.get('MVJ'), 1);
  assert.equal(db.counters.has('STM'), false);
});

test('older vendor receives the next ID first and deferred vendor is then picked up', async () => {
  const vendors = [
    { vendor_id: 'V001', vendor_type: 'Market Vendor', acquired_by: 'John', secondary_vendor_id: null },
    { vendor_id: 'V002', vendor_type: 'Market Vendor', acquired_by: 'John', secondary_vendor_id: null },
  ];
  const db = fakeBacklogConnection(vendors);
  assert.equal(await allocateSecondaryVendorSequenceIfNext(db, 'MVJ', 'V002', getSecondaryVendorPrefix), null);
  const first = await allocateSecondaryVendorSequenceIfNext(db, 'MVJ', 'V001', getSecondaryVendorPrefix);
  vendors[0].secondary_vendor_id = formatSecondaryVendorId('MVJ', first);
  const second = await allocateSecondaryVendorSequenceIfNext(db, 'MVJ', 'V002', getSecondaryVendorPrefix);
  assert.equal(vendors[0].secondary_vendor_id, 'MVJ-001');
  assert.equal(formatSecondaryVendorId('MVJ', second), 'MVJ-002');
});

test('missing and unsupported older vendor details do not block a supported prefix', async () => {
  const db = fakeBacklogConnection([
    { vendor_id: 'V001', vendor_type: 'Market Vendor', acquired_by: null, secondary_vendor_id: null },
    { vendor_id: 'V002', vendor_type: 'Unsupported Category', acquired_by: 'John', secondary_vendor_id: null },
  ]);
  const sequence = await allocateSecondaryVendorSequenceIfNext(db, 'MVJ', 'V443', getSecondaryVendorPrefix);
  assert.equal(formatSecondaryVendorId('MVJ', sequence), 'MVJ-001');
});

test('create, edit, and backfill share the Vendors ID-sequence lock before allocation/backlog row locks', () => {
  const service = read('src/services/vendorService.ts');
  const create = service.slice(service.indexOf('export async function createVendor('), service.indexOf('export async function updateVendor('));
  const update = service.slice(service.indexOf('export async function updateVendor('));
  assert.ok(create.indexOf("incrementAndGetCurrentValue('Vendors')") < create.indexOf('allocateSecondaryVendorId('));
  assert.ok(update.indexOf("lockForUpdate('Vendors')") < update.indexOf('SELECT vendor_type_id, acquired_by, secondary_vendor_id FROM vendors WHERE vendor_id = ? FOR UPDATE'));
  const idSequenceRepository = read('src/repositories/IdSequenceRepository.ts');
  assert.match(idSequenceRepository, /lockForUpdate\(entityName: string\)[\s\S]*FOR UPDATE/);
});

test('editing a previously assigned secondary ID does not attempt to allocate another one', () => {
  const service = read('src/services/vendorService.ts');
  const update = service.slice(service.indexOf('export async function updateVendor('));
  const checkIndex = update.indexOf('if (current.secondary_vendor_id === null || current.secondary_vendor_id === undefined)');
  const nextAllocationIndex = update.indexOf('allocateSecondaryVendorSequenceIfNext', checkIndex);
  assert.ok(checkIndex >= 0);
  assert.ok(nextAllocationIndex > checkIndex);
  assert.match(update.slice(checkIndex, nextAllocationIndex), /if \(current\.secondary_vendor_id === null \|\| current\.secondary_vendor_id === undefined\)/);
});

test('local backfill aborts on an unexpected row count and its transaction handler rolls back', async () => {
  let rolledBack = false;
  let committed = false;
  const connection = {
    async execute(sql) {
      assert.match(sql, /UPDATE vendors SET secondary_vendor_id/);
      return [{ affectedRows: 0 }, []];
    },
  };
  await assert.rejects(async () => {
    try {
      await assignBackfillSecondaryVendorId(connection, 'V123', 'MVJ-001');
      committed = true;
    } catch (error) {
      rolledBack = true;
      throw error;
    }
  }, /vendor V123: expected affectedRows 1, received 0/);
  assert.equal(rolledBack, true);
  assert.equal(committed, false);
  const script = read('scripts/backfill-secondary-vendor-ids.mjs');
  assert.match(script, /assignBackfillSecondaryVendorId\(connection, String\(vendor\.vendor_id\), secondaryId\)/);
  assert.match(script, /if \(APPLY && connection\) await connection\.rollback\(\)/);
});
