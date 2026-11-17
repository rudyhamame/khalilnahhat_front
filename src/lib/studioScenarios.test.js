import test from 'node:test';import assert from 'node:assert/strict';
import {STUDIO_SCENARIOS,scenarioById,scenarioSetup,assignStudioCamera} from './studioScenarios.js';
test('the six studio scenarios map to a source and an audio mode',()=>{
  assert.deepEqual(STUDIO_SCENARIOS.map(item=>item.id),['camera','camera-mixer','cameras-mixer','cameras-windows-mixer','photo','photo-mixer','photo-audio','photo-setlist','video','video-mixer','video-setlist']);
  assert.deepEqual(scenarioSetup(scenarioById('camera')),{kind:'camera',audio:'none'});
  assert.deepEqual(scenarioSetup(scenarioById('camera-mixer')),{kind:'camera',audio:'mic'});
  assert.deepEqual(scenarioSetup(scenarioById('cameras-mixer')),{kind:'cameras',audio:'mic'});
  assert.deepEqual(scenarioById('cameras-mixer').parts,['1 landscape camera','1 portrait camera (placed inside the landscape picture)','1 mixer','Optional mic']);
  assert.deepEqual(scenarioSetup(scenarioById('photo')),{kind:'image',audio:'none'});
  assert.deepEqual(scenarioSetup(scenarioById('photo-mixer')),{kind:'image',audio:'mic'});
  assert.deepEqual(scenarioSetup(scenarioById('photo-audio')),{kind:'image',audio:'file'});
  assert.deepEqual(scenarioSetup(scenarioById('video')),{kind:'video',audio:'file'});
  assert.deepEqual(scenarioSetup(scenarioById('photo-setlist')),{kind:'image',audio:'setlist'});
  assert.deepEqual(scenarioSetup(scenarioById('video-setlist')),{kind:'video',audio:'setlist'});
  assert.equal(scenarioById('video').mixer,false);
  assert.deepEqual(scenarioSetup(scenarioById('video-mixer')),{kind:'video',audio:'mic'});
  assert.equal(scenarioById('nope'),null);
  assert.ok(STUDIO_SCENARIOS.every(item=>item.parts.includes('Optional mic')));
});

test('moving a camera between windows clears its previous assignment',()=>{
  const portrait=assignStudioCamera('cam-a','cam-b','portrait','cam-a');
  assert.deepEqual(portrait,{cameraId:'none',overlayId:'cam-a'});
  const landscape=assignStudioCamera(portrait.cameraId,portrait.overlayId,'landscape','cam-a');
  assert.deepEqual(landscape,{cameraId:'cam-a',overlayId:'none'});
  assert.deepEqual(assignStudioCamera('cam-a','cam-b','portrait','cam-c'),{cameraId:'cam-a',overlayId:'cam-c'});
});
