import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingStage,recordingSaveState} from './recordingWorkflow.js';
test('unsaved recordings stay Draft regardless of restored browser status',()=>{
 assert.equal(recordingStage({id:'',value:{status:'PUBLISHED'}}),'DRAFT');
});
test('saving archives privately and explicit publishing makes a saved recording public',()=>{
 const archived=recordingSaveState();assert.deepEqual(archived,{status:'DRAFT'});
 assert.equal(recordingStage({id:'saved',value:archived}),'DRAFT');
 const published=recordingSaveState(true);assert.deepEqual(published,{status:'PUBLISHED'});
 assert.equal(recordingStage({id:'saved',value:published}),'PUBLISHED');
 assert.equal(recordingStage({id:'saved',value:{status:'ARCHIVED'}}),'ARCHIVED');
});
test('saving keeps the stage of an existing recording, so Back does not unpublish it',()=>{
 assert.deepEqual(recordingSaveState(false,'PUBLISHED'),{status:'PUBLISHED'});
 assert.deepEqual(recordingSaveState(false,'DRAFT'),{status:'DRAFT'});
 assert.deepEqual(recordingSaveState(false,''),{status:'DRAFT'});
 assert.deepEqual(recordingSaveState(true,'DRAFT'),{status:'PUBLISHED'});
});
