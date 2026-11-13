import test from 'node:test';import assert from 'node:assert/strict';
import {track,trackOnce,resetAnalyticsForTests,setFunnelStep,installDropOffTracking} from './analytics.js';
test('events are announced once per name for *Once, and a leave mid-funnel reports the step reached',()=>{
  const events=[],listeners={};
  globalThis.window={dispatchEvent:event=>{events.push(event.detail.name+':'+JSON.stringify(event.detail.props));return true;},addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener(){}};
  globalThis.CustomEvent=class{constructor(name,init){this.type=name;this.detail=init.detail;}};
  resetAnalyticsForTests();
  track('hero_cta_click',{place:'hero'});trackOnce('booking_started');trackOnce('booking_started');
  assert.deepEqual(events,['hero_cta_click:{"place":"hero"}','booking_started:{}']);
  installDropOffTracking();setFunnelStep('personal_info');listeners.pagehide();listeners.pagehide();
  assert.deepEqual(events.slice(2),['booking_dropoff:{"step":"personal_info"}']);
  resetAnalyticsForTests();trackOnce('quote_submitted');listeners.pagehide();assert.equal(events.filter(item=>item.startsWith('booking_dropoff')).length,1);
  delete globalThis.window;delete globalThis.CustomEvent;
});
