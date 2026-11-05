import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import mysql from 'mysql2/promise';
import { loadSecondaryVendorIdOperatorModules } from './secondary-vendor-id-operator-runtime.mjs';

const {
  formatSecondaryVendorId,
  getSecondaryVendorPrefix,
  allocateSecondaryVendorSequenceIfNext,
  assignBackfillSecondaryVendorId,
} = await loadSecondaryVendorIdOperatorModules();

const EXPECTED_HOST = 'srv507.hstgr.io';
const EXPECTED_DATABASE = 'u508592604_Sales_Platform';
const EXPECTED_SERVER_HOSTNAME = 'lt-bnk-web507.main-hosting.eu';
const args = process.argv.slice(2);
const option = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const isApply = args.includes('--apply');

function requireFlag(flag) {
  if (!args.includes(flag)) throw new Error(`Required safety flag is missing: ${flag}`);
}

requireFlag('--production');
if (option('--confirm-database') !== EXPECTED_DATABASE) {
  throw new Error(`Pass --confirm-database=${EXPECTED_DATABASE} to confirm the intended target.`);
}
if (isApply && option('--confirm-production-write') !== EXPECTED_DATABASE) {
  throw new Error(`Apply mode additionally requires --confirm-production-write=${EXPECTED_DATABASE}.`);
}

const reportFile = option('--report-file');
if (!reportFile) throw new Error('Provide --report-file=<restricted report path>.');
if (!path.isAbsolute(reportFile)) throw new Error('--report-file must be an absolute path outside the repository.');
const resolvedReport = path.resolve(reportFile);
const repoRoot = path.resolve(process.cwd());
if (resolvedReport === repoRoot || resolvedReport.startsWith(`${repoRoot}${path.sep}`)) {
  throw new Error('Report file must be outside the repository.');
}
const restrictedReportRoot = process.env.LOCALAPPDATA
  ? path.resolve(process.env.LOCALAPPDATA, 'SalesDashboard-ProductionBackups')
  : null;
if (!restrictedReportRoot || !resolvedReport.toLowerCase().startsWith(`${restrictedReportRoot}${path.sep}`.toLowerCase())) {
  throw new Error('Report file must be inside the restricted LOCALAPPDATA\\SalesDashboard-ProductionBackups directory.');
}

// Load only the production environment file (never .env.local). Existing process values take precedence.
const productionEnv = path.join(repoRoot, '.env.production');
await fs.access(productionEnv);
process.loadEnvFile(productionEnv);

const configuredHost = process.env.MYSQL_HOST;
const configuredDatabase = process.env.MYSQL_DATABASE;
const configuredPort = Number(process.env.MYSQL_PORT || 3306);
if (configuredHost !== EXPECTED_HOST || configuredDatabase !== EXPECTED_DATABASE || configuredPort !== 3306) {
  throw new Error('Configured database identity does not match the explicitly approved production target.');
}
if (!process.env.MYSQL_USER || process.env.MYSQL_PASSWORD === undefined) {
  throw new Error('Production database configuration is incomplete.');
}

const pool = mysql.createPool({
  host: configuredHost,
  port: configuredPort,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: configuredDatabase,
  connectionLimit: 1,
  multipleStatements: false,
});

async function writeReport(report) {
  await fs.mkdir(path.dirname(resolvedReport), { recursive: true });
  await fs.writeFile(resolvedReport, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  await fs.chmod(resolvedReport, 0o600);
}

let connection;
let transactionOpen = false;
try {
  connection = await pool.getConnection();
  const [[identity]] = await connection.query('SELECT @@hostname AS server_hostname, DATABASE() AS database_name');
  if (identity.server_hostname !== EXPECTED_SERVER_HOSTNAME || identity.database_name !== EXPECTED_DATABASE) {
    throw new Error('Connected database identity does not match the approved production target.');
  }

  if (isApply) {
    await connection.beginTransaction();
    const [vendorSequenceRows] = await connection.execute(
      'SELECT entity_name FROM id_sequences WHERE entity_name = ? FOR UPDATE',
      ['Vendors'],
    );
    if (vendorSequenceRows.length !== 1) throw new Error('Could not lock the vendor ID sequence before backfill.');
  } else {
    await connection.query('SET TRANSACTION READ ONLY');
    await connection.beginTransaction();
  }
  transactionOpen = true;

  const [[columnCheck]] = await connection.query(`
    SELECT COUNT(*) AS found
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'secondary_vendor_id'`);
  const [[sequenceTableCheck]] = await connection.query(`
    SELECT COUNT(*) AS found
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_secondary_id_sequences'`);
  if (Number(columnCheck.found) !== 1 || Number(sequenceTableCheck.found) !== 1) {
    throw new Error('Migration 0048 schema is incomplete; refusing to continue.');
  }

  const [uniqueIndexes] = await connection.query(`
    SELECT INDEX_NAME, NON_UNIQUE
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'secondary_vendor_id'`);
  if (!uniqueIndexes.some((row) => row.NON_UNIQUE === 0)) {
    throw new Error('The secondary_vendor_id unique index is missing; refusing to continue.');
  }

  const [vendors] = await connection.query(`
    SELECT v.vendor_id, v.vendor_name, v.secondary_vendor_id,
           v.vendor_type_id, vt.name AS vendor_type_name,
           v.acquired_by, ab.name AS acquired_by_name
    FROM vendors v
    LEFT JOIN vendor_types vt ON vt.vendor_type_id = v.vendor_type_id
    LEFT JOIN acquired_by_names ab ON ab.acquired_by_id = v.acquired_by
    ORDER BY CAST(SUBSTRING(v.vendor_id, 2) AS UNSIGNED) ASC,v.vendor_id ASC${isApply ? ' FOR UPDATE' : ''}`);
  const [sequences] = await connection.query('SELECT prefix, `last_value` FROM vendor_secondary_id_sequences ORDER BY prefix');
  const [[population]] = await connection.query(`
    SELECT COUNT(*) AS total_vendors,
           COUNT(DISTINCT vendor_id) AS distinct_primary_ids,
           SUM(vendor_id IS NULL OR vendor_id = '') AS missing_primary_ids,
           SUM(secondary_vendor_id IS NOT NULL) AS assigned_secondary_ids
    FROM vendors`);
  const [[duplicateIds]] = await connection.query(`
    SELECT COUNT(*) AS duplicate_groups
    FROM (SELECT secondary_vendor_id FROM vendors WHERE secondary_vendor_id IS NOT NULL
          GROUP BY secondary_vendor_id HAVING COUNT(*) > 1) duplicates`);

  if (Number(population.total_vendors) !== vendors.length || Number(population.distinct_primary_ids) !== vendors.length || Number(population.missing_primary_ids) !== 0) {
    throw new Error('Primary vendor ID integrity check failed; refusing to continue.');
  }
  if (Number(duplicateIds.duplicate_groups) !== 0) throw new Error('Duplicate secondary IDs already exist; refusing to continue.');

  const counters = new Map(sequences.map((row) => [String(row.prefix), Number(row.last_value) || 0]));
  const currentMaxByPrefix = new Map();
  const issuedIds = new Set();
  for (const vendor of vendors) {
    if (!vendor.secondary_vendor_id) continue;
    const value = String(vendor.secondary_vendor_id);
    if (issuedIds.has(value)) throw new Error(`Duplicate existing secondary ID detected: ${value}`);
    issuedIds.add(value);
    const match = value.match(/^([A-Z]{3})-(\d{3})$/);
    if (!match) throw new Error(`Malformed existing secondary ID detected for vendor ${vendor.vendor_id}; refusing to allocate.`);
    currentMaxByPrefix.set(match[1], Math.max(currentMaxByPrefix.get(match[1]) || 0, Number(match[2])));
  }

  const baseCounterByPrefix = new Map();
  for (const prefix of new Set([...counters.keys(), ...currentMaxByPrefix.keys()])) {
    baseCounterByPrefix.set(prefix, Math.max(counters.get(prefix) || 0, currentMaxByPrefix.get(prefix) || 0));
  }
  const plannedCounters = new Map(baseCounterByPrefix);
  const assignments = [];
  const ineligible = [];
  const referenceIssues = [];

  for (const vendor of vendors) {
    if (vendor.secondary_vendor_id !== null) continue;
    let reason = null;
    if (vendor.vendor_type_id !== null && vendor.vendor_type_name === null) reason = 'vendor category reference is missing';
    else if (vendor.acquired_by !== null && vendor.acquired_by_name === null) reason = 'acquired_by reference is missing';
    else if (!vendor.vendor_type_name) reason = 'missing vendor category';
    else if (!vendor.acquired_by_name) reason = 'missing acquisition name';

    const prefix = reason ? null : getSecondaryVendorPrefix(vendor.vendor_type_name, vendor.acquired_by_name);
    if (!reason && !prefix) reason = 'unsupported vendor category or unusable acquired_by initial';
    if (reason) {
      const item = {
        vendor_id: String(vendor.vendor_id), vendor_name: String(vendor.vendor_name),
        vendor_type: vendor.vendor_type_name ?? null, acquired_by: vendor.acquired_by_name ?? null,
        proposed_prefix: null, proposed_secondary_vendor_id: null, reason,
      };
      ineligible.push(item);
      if (reason.includes('reference is missing')) referenceIssues.push(item);
      continue;
    }
    const sequence = (plannedCounters.get(prefix) || 0) + 1;
    const secondaryId = formatSecondaryVendorId(prefix, sequence);
    plannedCounters.set(prefix, sequence);
    assignments.push({
      vendor_id: String(vendor.vendor_id), vendor_name: String(vendor.vendor_name),
      vendor_type: vendor.vendor_type_name, acquired_by: vendor.acquired_by_name,
      proposed_prefix: prefix, proposed_secondary_vendor_id: secondaryId,
    });
  }

  const proposedIds = assignments.map((item) => item.proposed_secondary_vendor_id);
  const duplicateProposals = proposedIds.filter((value, index) => proposedIds.indexOf(value) !== index);
  const existingCollisions = proposedIds.filter((value) => issuedIds.has(value));
  if (duplicateProposals.length || existingCollisions.length) throw new Error('Proposed ID collision detected; refusing to continue.');
  if (referenceIssues.length) throw new Error('Broken vendor/acquisition references were detected; refusing to continue.');

  const sequenceReview = [...plannedCounters.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([prefix, plannedLast]) => ({
    prefix,
    stored_last_value: counters.get(prefix) || 0,
    highest_existing_issued: currentMaxByPrefix.get(prefix) || 0,
    projected_last_value: plannedLast,
  }));
  const report = {
    mode: isApply ? 'apply' : 'dry-run',
    generated_at_utc: new Date().toISOString(),
    target: { configured_host: configuredHost, configured_port: configuredPort, database: identity.database_name, server_hostname: identity.server_hostname },
    checks: {
      migration_0048_schema_present: true,
      secondary_id_unique_index_present: true,
      vendor_count: vendors.length,
      distinct_primary_ids: Number(population.distinct_primary_ids),
      missing_primary_ids: Number(population.missing_primary_ids),
      existing_secondary_id_count: Number(population.assigned_secondary_ids),
      duplicate_existing_secondary_ids: Number(duplicateIds.duplicate_groups),
      duplicate_proposed_ids: duplicateProposals.length,
      proposed_ids_colliding_with_existing: existingCollisions.length,
      broken_references: referenceIssues.length,
      rerun_preserves_issued_ids: true,
    },
    assignment_count: assignments.length,
    assignments,
    ineligible_count: ineligible.length,
    ineligible,
    sequence_review: sequenceReview,
    write_result: isApply ? 'pending' : 'not performed (read-only transaction)',
  };

  if (!isApply) {
    await connection.rollback();
    transactionOpen = false;
    await writeReport(report);
    process.stdout.write(JSON.stringify({ mode: report.mode, target: report.target, assignment_count: report.assignment_count, ineligible_count: report.ineligible_count, checks: report.checks, report_file: resolvedReport }, null, 2) + '\n');
  } else {
    // Prepare a durable proposed audit record before any database write.
    report.write_result = 'planned; transaction not yet committed';
    await writeReport(report);
    let changed = 0;
    for (const item of assignments) {
      const vendor = vendors.find((row) => String(row.vendor_id) === item.vendor_id);
      const sequence = await allocateSecondaryVendorSequenceIfNext(
        connection,
        item.proposed_prefix,
        item.vendor_id,
        getSecondaryVendorPrefix,
      );
      if (sequence === null) throw new Error(`Backfill allocation for vendor ${item.vendor_id} was unexpectedly deferred.`);
      const allocatedId = formatSecondaryVendorId(item.proposed_prefix, sequence);
      if (allocatedId !== item.proposed_secondary_vendor_id) throw new Error(`Sequence changed during allocation for vendor ${item.vendor_id}; aborting.`);
      await assignBackfillSecondaryVendorId(connection, vendor.vendor_id, allocatedId);
      changed += 1;
    }
    await connection.commit();
    transactionOpen = false;
    report.write_result = `committed ${changed} assignments`;
    report.assigned_count = changed;
    await writeReport(report);
    process.stdout.write(JSON.stringify({ mode: report.mode, assigned_count: changed, report_file: resolvedReport }, null, 2) + '\n');
  }
} catch (error) {
  if (transactionOpen && connection) await connection.rollback();
  // Do not print query configuration or connection objects; error messages may contain SQL only.
  process.stderr.write(`Production secondary ID backfill stopped: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool.end();
}
