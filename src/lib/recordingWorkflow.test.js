import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingStage,recordingSaveState} from './recordingWorkflow.js';
test('unsaved recordings stay Draft regardless of restored browser status',()=>{
 assert.equal(recordingStage({id:'',value:{publicationStatus:'PUBLISHED',archivalStatus:'ACTIVE'}}),'DRAFT');
});
test('saving archives privately and explicit publishing makes a saved recording public',()=>{
 const archived=recordingSaveState();assert.deepEqual(archived,{publicationStatus:'DRAFT',archivalStatus:'ARCHIVED'});
 assert.equal(recordingStage({id:'saved',value:archived}),'ARCHIVED');
 const published=recordingSaveState(true);assert.deepEqual(published,{publicationStatus:'PUBLISHED',archivalStatus:'ACTIVE'});
 assert.equal(recordingStage({id:'saved',value:published}),'PUBLISHED');
 assert.equal(recordingStage({id:'saved',value:{...published,archivalStatus:'ARCHIVED'}}),'ARCHIVED');
});
