import envPkg from '@next/env';
import mysql from 'mysql2/promise';
import { loadSecondaryVendorIdOperatorModules } from './secondary-vendor-id-operator-runtime.mjs';

const {
  formatSecondaryVendorId,
  getSecondaryVendorPrefix,
  VENDOR_CATEGORY_CODES,
  allocateSecondaryVendorSequenceIfNext,
  assignBackfillSecondaryVendorId,
} = await loadSecondaryVendorIdOperatorModules();

const { loadEnvConfig } = envPkg;
loadEnvConfig(process.cwd(), true);

const APPLY = process.argv.includes('--apply');

function prefixFor(category, acquiredName) {
  return getSecondaryVendorPrefix(category, acquiredName);
}

function reviewReason(category, acquiredName) {
  if (!category) return 'missing vendor category';
  if (!Object.prototype.hasOwnProperty.call(VENDOR_CATEGORY_CODES, category)) return 'unsupported vendor category';
  if (!getSecondaryVendorPrefix(category, acquiredName)) return 'missing or unusable acquired_by initial';
  return null;
}

const config = {
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 1,
};
if (!config.host || !config.user || !config.database) throw new Error('Database configuration is incomplete.');
if (!['localhost', '127.0.0.1', '::1'].includes(config.host.toLowerCase())) {
  throw new Error('Refusing to run the vendor ID backfill against a non-local database.');
}

const pool = mysql.createPool(config);
let connection;
try {
  connection = await pool.getConnection();
  if (APPLY) {
    await connection.beginTransaction();
    const [vendorSequenceRows] = await connection.query(
      'SELECT entity_name FROM id_sequences WHERE entity_name = ? FOR UPDATE',
      ['Vendors'],
    );
    if (vendorSequenceRows.length !== 1) throw new Error('Could not lock the vendor ID sequence before backfill.');
  }
  const [rows] = await connection.query(`
    SELECT v.vendor_id, v.vendor_name, v.secondary_vendor_id, vt.name AS vendor_type_name, ab.name AS acquired_by_name
    FROM vendors v
    LEFT JOIN vendor_types vt ON vt.vendor_type_id = v.vendor_type_id
    LEFT JOIN acquired_by_names ab ON ab.acquired_by_id = v.acquired_by
    ORDER BY CAST(SUBSTRING(v.vendor_id, 2) AS UNSIGNED) ASC, v.vendor_id ASC ${APPLY ? 'FOR UPDATE' : ''}`);
  const [sequenceRows] = await connection.query('SELECT prefix, `last_value` FROM vendor_secondary_id_sequences');
  const plannedCounters = new Map(sequenceRows.map((row) => [String(row.prefix), Number(row.last_value) || 0]));
  const issuedCounters = new Map();
  for (const vendor of rows) {
    const match = typeof vendor.secondary_vendor_id === 'string' && vendor.secondary_vendor_id.match(/^([A-Z]{3})-(\d{3})$/);
    if (match) {
      const issued = Number(match[2]);
      issuedCounters.set(match[1], Math.max(issuedCounters.get(match[1]) || 0, issued));
      plannedCounters.set(match[1], Math.max(plannedCounters.get(match[1]) || 0, issued));
    }
  }
  if (APPLY) {
    for (const [prefix, issued] of issuedCounters) {
      await connection.execute(
        'INSERT INTO vendor_secondary_id_sequences (prefix, `last_value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `last_value` = GREATEST(`last_value`, VALUES(`last_value`))',
        [prefix, issued],
      );
    }
  }
  const review = [];
  const assigned = [];
  const eligibilityReport = [];
  for (const vendor of rows) {
    if (vendor.secondary_vendor_id) continue;
    const prefix = prefixFor(vendor.vendor_type_name, vendor.acquired_by_name);
    if (!prefix) {
      const entry = {
        vendor_id: String(vendor.vendor_id),
        vendor_name: String(vendor.vendor_name),
        vendor_type: vendor.vendor_type_name ?? null,
        acquired_by: vendor.acquired_by_name ?? null,
        proposed_prefix: null,
        proposed_secondary_vendor_id: null,
        reason: reviewReason(vendor.vendor_type_name, vendor.acquired_by_name),
      };
      review.push(entry);
      eligibilityReport.push(entry);
      continue;
    }
    let secondaryId;
    if (APPLY) {
      const sequence = await allocateSecondaryVendorSequenceIfNext(
        connection,
        prefix,
        String(vendor.vendor_id),
        getSecondaryVendorPrefix,
      );
      if (sequence === null) {
        throw new Error(`Backfill allocation for ${vendor.vendor_id} was deferred by an older eligible vendor.`);
      }
      secondaryId = formatSecondaryVendorId(prefix, sequence);
    } else {
      secondaryId = formatSecondaryVendorId(prefix, (plannedCounters.get(prefix) || 0) + 1);
    }
    if (!APPLY) plannedCounters.set(prefix, (plannedCounters.get(prefix) || 0) + 1);
    eligibilityReport.push({
      vendor_id: String(vendor.vendor_id),
      vendor_name: String(vendor.vendor_name),
      vendor_type: vendor.vendor_type_name ?? null,
      acquired_by: vendor.acquired_by_name ?? null,
      proposed_prefix: prefix,
      proposed_secondary_vendor_id: secondaryId,
      reason: null,
    });
    assigned.push({ vendor_id: String(vendor.vendor_id), secondary_vendor_id: secondaryId });
    if (APPLY) await assignBackfillSecondaryVendorId(connection, String(vendor.vendor_id), secondaryId);
  }
  if (APPLY) await connection.commit();
  console.log(JSON.stringify({ mode: APPLY ? 'applied' : 'dry-run', assigned_count: assigned.length, assigned, manual_review_count: review.length, manual_review: review, eligibility_report_count: eligibilityReport.length, eligibility_report: eligibilityReport }, null, 2));
} catch (error) {
  if (APPLY && connection) await connection.rollback();
  throw error;
} finally {
  connection?.release();
  await pool.end();
}
