import test from 'node:test';
import assert from 'node:assert/strict';
import {automate,getAutomation} from './recordingAutomation.js';

test('steps run one at a time, cheapest first, once per audio file', async()=>{
 const log=[];let active=0,overlap=false;
 const step=name=>async()=>{active++;overlap||=active>1;log.push(name);await new Promise(r=>setTimeout(r,10));active--;};
 automate('a.mp3','key',step('key'));        // starts at once and holds the queue while the rest line up
 automate('a.mp3','language',step('language'));
 automate('a.mp3','info',step('info'));
 automate('a.mp3','bpm',step('bpm'));
 automate('a.mp3','bpm',step('bpm-again'));  // duplicate: ignored
 await new Promise(r=>setTimeout(r,1800));
 assert.equal(overlap,false);
 assert.deepEqual(log,['key','bpm','info','language']);
 assert.deepEqual(getAutomation().finished.sort(),['bpm','info','key','language']);
});
