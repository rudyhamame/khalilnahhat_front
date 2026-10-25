import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLiveAudioFocus } from './liveAudioFocus.js';

test('only the newly selected live player keeps audio focus within one page', () => {
  const target = new EventTarget(); let firstMuted = false; let secondMuted = false;
  const first = createLiveAudioFocus({target,Channel:null,onLoseFocus:()=>{firstMuted=true;}});
  const second = createLiveAudioFocus({target,Channel:null,onLoseFocus:()=>{secondMuted=true;}});
  try {
    first.claim(); assert.equal(firstMuted,false); assert.equal(secondMuted,true);
    secondMuted=false; second.claim(); assert.equal(firstMuted,true); assert.equal(secondMuted,false);
  } finally { first.close(); second.close(); }
});
test('another tab loses audio focus through the real BroadcastChannel transport', async () => {
  let resolveMuted; const muted = new Promise(resolve=>{resolveMuted=resolve;});
  const first=createLiveAudioFocus({target:new EventTarget(),onLoseFocus:()=>resolveMuted(true)});
  const second=createLiveAudioFocus({target:new EventTarget(),onLoseFocus:()=>assert.fail('claimant must not mute itself')});
  let timeout;
  try {
    second.claim();
    assert.equal(await Promise.race([muted,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Focus message not delivered')),2000);})]),true);
  } finally { clearTimeout(timeout); first.close(); second.close(); }
});
test('disposed players neither mute active players nor react to new claims', () => {
  const target=new EventTarget();let calls=0;
  const first=createLiveAudioFocus({target,Channel:null,onLoseFocus:()=>calls++});
  const second=createLiveAudioFocus({target,Channel:null,onLoseFocus:()=>calls++});
  first.close();first.claim();second.claim();assert.equal(calls,0);second.close();
});
