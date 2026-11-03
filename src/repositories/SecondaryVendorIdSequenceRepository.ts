/** Must be called from the caller's active MySQL transaction. */
export async function allocateSecondaryVendorSequence(connection: any, prefix: string): Promise<number> {
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
