import test from 'node:test';
import assert from 'node:assert/strict';
import {destinationSources,destinationSourceState} from './liveDestinationSources.js';

const items=[
 {platform:'youtube',roomName:'current',state:'live',format:'1280 × 720 landscape'},
 {platform:'instagram',roomName:'current',state:'starting',format:'720 × 1280 portrait'},
 {platform:'tiktok',roomName:'current',state:'stopping',format:'720 × 1280 portrait'},
];
test('sending destinations appear on their actual landscape or portrait output',()=>{
 assert.deepEqual(destinationSources(items,'current','landscape').map(row=>row.platform),['youtube']);
 assert.deepEqual(destinationSources(items,'current','portrait').map(row=>row.platform),['instagram','tiktok']);
 // Server format wins over a platform default if its orientation changes.
 assert.equal(destinationSources([{...items[0],format:'720 × 1280 portrait'}],'current','portrait').length,1);
});
test('idle, ended and other-room outputs never imply this preview is sending',()=>{
 const rows=[...items.map(row=>({...row,roomName:'previous'})),{...items[0],state:'idle'},{...items[0],state:'ended'}];
 assert.deepEqual(destinationSources(rows,'current','landscape'),[]);
 assert.deepEqual(destinationSources(items,'','portrait'),[]);
 assert.deepEqual(destinationSources(null,'current','portrait'),[]);
});
test('failed or unavailable status cannot be mistaken for a live destination',()=>{
 assert.equal(destinationSourceState('live'),'Sending');
 assert.equal(destinationSourceState('starting'),'Starting');
 assert.equal(destinationSourceState('stopping'),'Stopping');
 assert.equal(destinationSourceState('failed'),'Failed');
 assert.equal(destinationSourceState('live',true),'Status unavailable');
 assert.equal(destinationSources([{...items[0],state:'failed'}],'current','landscape').length,1);
});
