import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuoteItems } from './quoteItems.js';
test('equipment never replaces requested service line items', () => {
  const lines = buildQuoteItems({ uplights: { id: 'uplights', name: 'Uplights', category: 'lighting', quantity: 10 } }, ['dj', 'lighting'], { dj: 'DJ', lighting: 'Lighting' }, 'General');
  assert.deepEqual(lines.map((i) => i.serviceId), ['uplights', 'svc-dj', 'svc-lighting']);
  assert.equal(lines[0].quantity, 10);
});
test('service-only and general quote requests remain supported', () => {
  assert.equal(buildQuoteItems({}, ['dj'], { dj: 'DJ' }, 'General')[0].serviceId, 'svc-dj');
  assert.equal(buildQuoteItems({}, [], {}, 'General')[0].serviceId, 'svc-general');
});
