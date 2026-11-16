import {test} from 'node:test';
import assert from 'node:assert/strict';
import {backendPresent,drift} from '../../scripts/sync-contracts.mjs';

// The shared rulebooks are owned by the backend; the frontend holds generated copies. Drift fails here.
test('shared contracts match the backend (skipped when the backend is not checked out)',{skip:!backendPresent()&&'backend checkout not present'},()=>{
 assert.deepEqual(drift(),[],'Run npm run sync:contracts');
});
