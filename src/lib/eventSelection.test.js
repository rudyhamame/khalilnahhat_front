import assert from 'node:assert/strict';
import test from 'node:test';
import { servicesById } from '../data/services.js';
import {
  addSelectionItem,
  countSelectedUnits,
  normalizeSelection,
  removeSelectionItem,
  updateSelectionQuantity,
} from './eventSelection.js';

test('adds a service with its default quantity', () => {
  const selection = addSelectionItem({}, servicesById['professional-dj-service']);
  assert.deepEqual(selection, { 'professional-dj-service': 1 });
});

test('uplights start at 10 and cannot be reduced below 10', () => {
  const service = servicesById.uplight;
  const selection = addSelectionItem({}, service);
  const reducedSelection = updateSelectionQuantity(selection, service, 2);

  assert.equal(selection.uplight, 10);
  assert.equal(reducedSelection.uplight, 10);
});

test('quantity can increase and standard services cannot fall below one', () => {
  const service = servicesById['qsc-k12-2-speaker'];
  const selection = addSelectionItem({}, service);

  assert.equal(updateSelectionQuantity(selection, service, 4)[service.id], 4);
  assert.equal(updateSelectionQuantity(selection, service, 0)[service.id], 1);
});

test('removes a selected service', () => {
  const selection = { projector: 2, 'smoke-machine': 1 };
  assert.deepEqual(removeSelectionItem(selection, 'projector'), { 'smoke-machine': 1 });
});

test('normalizes persisted data and discards unknown services', () => {
  const selection = normalizeSelection({ uplight: 3, projector: 2, unknown: 8 }, servicesById);
  assert.deepEqual(selection, { uplight: 10, projector: 2 });
});

test('counts selected units and supports clearing the selection', () => {
  assert.equal(countSelectedUnits({ uplight: 10, projector: 2 }), 12);
  assert.equal(countSelectedUnits({}), 0);
});
