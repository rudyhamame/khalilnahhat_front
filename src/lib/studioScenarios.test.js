import test from 'node:test';import assert from 'node:assert/strict';
import {STUDIO_SCENARIOS,scenarioById,scenarioSetup} from './studioScenarios.js';
test('the six studio scenarios map to a source and an audio mode',()=>{
  assert.deepEqual(STUDIO_SCENARIOS.map(item=>item.id),['camera','camera-mixer','photo','photo-mixer','photo-audio','video','video-mixer']);
  assert.deepEqual(scenarioSetup(scenarioById('camera')),{kind:'camera',audio:'none'});
  assert.deepEqual(scenarioSetup(scenarioById('camera-mixer')),{kind:'camera',audio:'mic'});
  assert.deepEqual(scenarioSetup(scenarioById('photo')),{kind:'image',audio:'none'});
  assert.deepEqual(scenarioSetup(scenarioById('photo-mixer')),{kind:'image',audio:'mic'});
  assert.deepEqual(scenarioSetup(scenarioById('photo-audio')),{kind:'image',audio:'file'});
  assert.deepEqual(scenarioSetup(scenarioById('video')),{kind:'video',audio:'file'});
  assert.equal(scenarioById('video').mixer,false);
  assert.deepEqual(scenarioSetup(scenarioById('video-mixer')),{kind:'video',audio:'mic'});
  assert.equal(scenarioById('nope'),null);
  assert.ok(STUDIO_SCENARIOS.every(item=>item.parts.includes('Optional mic')));
});
