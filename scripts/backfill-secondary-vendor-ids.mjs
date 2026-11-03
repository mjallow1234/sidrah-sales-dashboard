import envPkg from '@next/env';
import mysql from 'mysql2/promise';

const { loadEnvConfig } = envPkg;
loadEnvConfig(process.cwd(), true);

const APPLY = process.argv.includes('--apply');
const CATEGORY_CODES = new Map([
  ['Market Vendor', 'MV'],
  ['Street Food Vendor (STV)', 'ST'],
  ['Minimarket', 'MM'],
  ['Supermarket', 'SM'],
  ['Restaurant', 'RE'],
]);

function prefixFor(category, acquiredName) {
  const code = CATEGORY_CODES.get(category);
  const first = typeof acquiredName === 'string'
    ? acquiredName.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0]
    : null;
  if (!code || !first || !/^[A-Za-z]$/.test(first)) return null;
  return `${code}${first.toUpperCase()}`;
}

function reviewReason(category, acquiredName) {
  if (!category) return 'missing vendor category';
  if (!CATEGORY_CODES.has(category)) return 'unsupported vendor category';
  const first = typeof acquiredName === 'string'
    ? acquiredName.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0]
    : null;
  if (!first || !/^[A-Za-z]$/.test(first)) return 'missing or unusable acquired_by initial';
  return null;
}

async function allocate(connection, prefix) {
  await connection.execute(
    'INSERT INTO vendor_secondary_id_sequences (prefix, `last_value`) VALUES (?, 0) ON DUPLICATE KEY UPDATE prefix = prefix',
    [prefix],
  );
  const [[sequence]] = await connection.execute(
    'SELECT `last_value` FROM vendor_secondary_id_sequences WHERE prefix = ? FOR UPDATE',
    [prefix],
  );
  const [[issued]] = await connection.execute(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(secondary_vendor_id, 5) AS UNSIGNED)), 0) AS last_issued FROM vendors WHERE secondary_vendor_id LIKE ?',
    [`${prefix}-%`],
  );
  const next = Math.max(Number(sequence.last_value) || 0, Number(issued.last_issued) || 0) + 1;
  if (next > 999) throw new Error(`Secondary vendor ID sequence exhausted for ${prefix}`);
  await connection.execute('UPDATE vendor_secondary_id_sequences SET `last_value` = ? WHERE prefix = ?', [next, prefix]);
  return `${prefix}-${String(next).padStart(3, '0')}`;
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
  if (APPLY) await connection.beginTransaction();
  const [rows] = await connection.query(`
    SELECT v.vendor_id, v.vendor_name, v.secondary_vendor_id, vt.name AS vendor_type_name, ab.name AS acquired_by_name
    FROM vendors v
    LEFT JOIN vendor_types vt ON vt.vendor_type_id = v.vendor_type_id
    LEFT JOIN acquired_by_names ab ON ab.acquired_by_id = v.acquired_by
    ORDER BY v.vendor_id ASC ${APPLY ? 'FOR UPDATE' : ''}`);
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
    const secondaryId = APPLY
      ? await allocate(connection, prefix)
      : `${prefix}-${String((plannedCounters.get(prefix) || 0) + 1).padStart(3, '0')}`;
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
    if (APPLY) await connection.execute('UPDATE vendors SET secondary_vendor_id = ? WHERE vendor_id = ? AND secondary_vendor_id IS NULL', [secondaryId, vendor.vendor_id]);
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
