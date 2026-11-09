import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMicrophoneMonitor} from './microphoneMonitor.js';

function fixture({resumeError,connectError}={}) {
  let context, captured, disconnected=0, stopped=0, resumed=0, closed=0;
  const track={kind:'audio',enabled:true,readyState:'live',stop(){stopped++;}};
  class AudioContextClass {
    constructor(options){this.options=options;this.state='running';this.destination={};context=this;}
    createMediaStreamSource(stream){captured=stream.tracks;return {connect(target){assert.ok(target.gain);if(connectError)throw connectError;},disconnect(){disconnected++;}};}
    createGain(){return {gain:{setValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},connect(target){assert.equal(target,context.destination);},disconnect(){}};}
    resume(){resumed++;return resumeError?Promise.reject(resumeError):Promise.resolve();}
    close(){closed++;this.state='closed';return Promise.resolve();}
  }
  class MediaStreamClass {constructor(tracks){this.tracks=tracks;}}
  return {track,options:{AudioContextClass,MediaStreamClass},get context(){return context;},get captured(){return captured;},get counts(){return {disconnected,stopped,resumed,closed};}};
}

test('monitor connects the existing microphone straight to minimum-latency output and resumes within the click',async()=>{
  const f=fixture(),monitor=createMicrophoneMonitor(f.track,f.options);
  assert.deepEqual(f.context.options,{latencyHint:0});
  assert.deepEqual(f.captured,[f.track]);
  assert.equal(f.counts.resumed,1);
  await monitor.ready;
  monitor.stop();monitor.stop();
  assert.deepEqual(f.counts,{disconnected:1,stopped:0,resumed:1,closed:1});
  assert.equal(f.track.enabled,true);
});
test('a blocked monitor releases local resources without stopping the broadcast input',async()=>{
  const f=fixture({resumeError:new Error('Blocked')}),monitor=createMicrophoneMonitor(f.track,f.options);
  await assert.rejects(monitor.ready,/Blocked/);
  assert.equal(f.counts.closed,1);assert.equal(f.counts.stopped,0);
});
test('graph failure closes the context and ended microphones do not open monitoring',()=>{
  const f=fixture({connectError:new Error('Audio unavailable')});
  assert.throws(()=>createMicrophoneMonitor(f.track,f.options),/Audio unavailable/);
  assert.equal(f.counts.closed,1);assert.equal(f.counts.stopped,0);
  f.track.readyState='ended';
  assert.throws(()=>createMicrophoneMonitor(f.track,f.options),/Open the microphone/);
});
