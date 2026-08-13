import test from 'node:test';
import assert from 'node:assert/strict';
const re = /^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/;
test('portal code excludes confusing characters', () => {
  assert.equal(re.test('A7PK-92MX'), true);
  assert.equal(re.test('A0PK-92MX'), false);
  assert.equal(re.test('A1PK-92MX'), false);
  assert.equal(re.test('AIPK-92MX'), false);
});
