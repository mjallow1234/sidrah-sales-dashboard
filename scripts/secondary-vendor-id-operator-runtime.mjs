function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function assertSecondaryVendorIdOperatorRuntime(version = process.versions.node) {
  const parsed = parseVersion(version);
  const isSupported = parsed && (
    parsed.major >= 26
    || (parsed.major === 25 && parsed.minor >= 2)
    || (parsed.major === 24 && parsed.minor >= 12)
  );

  if (!isSupported) {
    throw new Error(
      `Secondary Vendor ID backfill operators require stable built-in TypeScript support (Node.js >=24.12, >=25.2, or >=26); detected ${version}.`,
    );
  }
}

export async function loadSecondaryVendorIdOperatorModules() {
  assertSecondaryVendorIdOperatorRuntime();
  const [vendorSecondaryId, sequenceRepository] = await Promise.all([
    import('../src/lib/vendorSecondaryId.ts'),
    import('../src/repositories/SecondaryVendorIdSequenceRepository.ts'),
  ]);
  return { ...vendorSecondaryId, ...sequenceRepository };
}
