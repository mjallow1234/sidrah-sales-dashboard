/** Low-level prefix allocator. Use allocateSecondaryVendorSequenceIfNext for assignments. */
async function allocateSecondaryVendorSequence(connection: any, prefix: string): Promise<number> {
  await connection.execute(
    'INSERT INTO vendor_secondary_id_sequences (prefix, `last_value`) VALUES (?, 0) ON DUPLICATE KEY UPDATE prefix = prefix',
    [prefix],
  );
  const [sequenceRows] = await connection.execute(
    'SELECT `last_value` FROM vendor_secondary_id_sequences WHERE prefix = ? FOR UPDATE',
    [prefix],
  );
  const [issuedRows] = await connection.execute(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(secondary_vendor_id, 5) AS UNSIGNED)), 0) AS last_issued FROM vendors WHERE secondary_vendor_id LIKE ?',
    [`${prefix}-%`],
  );
  const lastValue = Math.max(Number(sequenceRows[0]?.last_value) || 0, Number(issuedRows[0]?.last_issued) || 0);
  const next = lastValue + 1;
  if (!Number.isInteger(next) || next > 999) throw new Error(`Secondary vendor ID sequence exhausted for ${prefix}.`);
  await connection.execute('UPDATE vendor_secondary_id_sequences SET `last_value` = ? WHERE prefix = ?', [next, prefix]);
  return next;
}

/** Checks older unassigned rows using the approved category/acquisition prefix helper. */
async function hasOlderEligibleVendorPending(
  connection: any,
  prefix: string,
  vendorId: string,
  prefixForVendor: (category: string | null | undefined, acquiredByName: string | null | undefined) => string | null,
): Promise<boolean> {
  const [rows] = await connection.execute(
    `SELECT v.vendor_id,vt.name AS vendor_type_name,ab.name AS acquired_by_name
     FROM vendors v
     LEFT JOIN vendor_types vt ON vt.vendor_type_id=v.vendor_type_id
     LEFT JOIN acquired_by_names ab ON ab.acquired_by_id=v.acquired_by
     WHERE v.secondary_vendor_id IS NULL
       AND CAST(SUBSTRING(v.vendor_id,2) AS UNSIGNED) < CAST(SUBSTRING(?,2) AS UNSIGNED)
     ORDER BY CAST(SUBSTRING(v.vendor_id,2) AS UNSIGNED) ASC,v.vendor_id ASC`,
    [vendorId],
  );
  const hasOlderEligible = (rows as any[]).some((row) =>
    prefixForVendor(row.vendor_type_name, row.acquired_by_name) === prefix,
  );
  return hasOlderEligible;
}

/**
 * Allocates only when this vendor is next among eligible unassigned vendors for its prefix.
 * Acquires the Vendors row in id_sequences before checking the backlog or locking a prefix
 * counter. Call this inside the caller's active MySQL transaction so the lock remains held
 * through the related vendor write and commit/rollback.
 * Returns null without touching a sequence counter when an older eligible vendor is pending.
 */
export async function allocateSecondaryVendorSequenceIfNext(
  connection: any,
  prefix: string,
  vendorId: string,
  prefixForVendor: (category: string | null | undefined, acquiredByName: string | null | undefined) => string | null,
): Promise<number | null> {
  const [vendorSequenceRows] = await connection.execute(
    'SELECT entity_name FROM id_sequences WHERE entity_name = ? FOR UPDATE',
    ['Vendors'],
  );
  if ((vendorSequenceRows as any[]).length !== 1) {
    throw new Error('Could not lock the vendor ID sequence before secondary ID allocation.');
  }
  if (await hasOlderEligibleVendorPending(connection, prefix, vendorId, prefixForVendor)) return null;
  return allocateSecondaryVendorSequence(connection, prefix);
}

/** Persist one backfill assignment or fail so the enclosing backfill transaction rolls back. */
export async function assignBackfillSecondaryVendorId(
  connection: any,
  vendorId: string,
  secondaryVendorId: string,
): Promise<void> {
  const [result] = await connection.execute(
    'UPDATE vendors SET secondary_vendor_id = ? WHERE vendor_id = ? AND secondary_vendor_id IS NULL',
    [secondaryVendorId, vendorId],
  );
  const affectedRows = Number(result?.affectedRows ?? 0);
  if (affectedRows !== 1) {
    throw new Error(
      `Backfill assignment failed for vendor ${vendorId}: expected affectedRows 1, received ${affectedRows}.`,
    );
  }
}
