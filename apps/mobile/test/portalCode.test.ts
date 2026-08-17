import test from 'node:test';
import assert from 'node:assert/strict';
import { portalCodeFromScan } from '../src/lib/portalCode';

test('scan parser accepts Portal deep link QR payloads', () => {
  assert.equal(portalCodeFromScan('portal://connect?code=A7PK-92MX'), 'A7PK-92MX');
});

test('scan parser accepts raw Portal codes', () => {
  assert.equal(portalCodeFromScan(' a7pk-92mx '), 'A7PK-92MX');
});

test('scan parser rejects non-Portal QR payloads', () => {
  assert.equal(portalCodeFromScan('https://example.com/not-a-portal'), null);
});
