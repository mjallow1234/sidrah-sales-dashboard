import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSecondaryVendorIdOperatorRuntime } from '../scripts/secondary-vendor-id-operator-runtime.mjs';

test('operator runtime rejects Node versions below stable built-in TypeScript support', () => {
  for (const version of ['18.20.8', '22.6.0', '22.18.0', '24.11.1', '25.0.0', '25.1.9']) {
    assert.throws(
      () => assertSecondaryVendorIdOperatorRuntime(version),
      /require stable built-in TypeScript support/,
    );
  }
});

test('operator runtime accepts versions with stable built-in TypeScript support', () => {
  for (const version of ['24.12.0', '24.12.1', '25.2.0', '25.3.0', '26.1.0']) {
    assert.doesNotThrow(() => assertSecondaryVendorIdOperatorRuntime(version));
  }
});

test('operator runtime rejects an unparseable Node version', () => {
  assert.throws(() => assertSecondaryVendorIdOperatorRuntime('unknown'), /detected unknown/);
});
