import test from 'node:test';
import assert from 'node:assert/strict';
import { recordingBeatGrid } from './recordingBeatGrid.js';
import { performancePose } from './songPerformance.js';

const recording = {trackId:'archive-dc3b1186-e0c3-4550-ac7f-29013bf1168d',audioUrl:'https://res.cloudinary.com/nqiooluk/video/upload/v1792786516/khalil/live-sessions/file_mt2kvc.wav'};
test('Esh Maana recording changes photos every 16 beats across the full track', () => {
  for (let phrase = 1; phrase <= 20; phrase++) {
    const boundary = phrase * 16 * 60 / 110;
    const before = recordingBeatGrid({...recording,time:boundary-.01});
    const after = recordingBeatGrid({...recording,time:boundary+.01});
    assert.equal(before.beatsFromDownbeat,phrase*16-1);
    assert.equal(after.beatsFromDownbeat,phrase*16);
    assert.notEqual(performancePose(null,{...before,playing:true,time:boundary-.01}),performancePose(null,{...after,playing:true,time:boundary+.01}));
  }
});
test('recording grid survives backwards seeks and never applies to replacement audio', () => {
  recordingBeatGrid({...recording,time:100});
  assert.equal(recordingBeatGrid({...recording,time:0}).beatsFromDownbeat,0);
  assert.equal(recordingBeatGrid({...recording,audioUrl:'another-file.wav',time:10}),null);
  assert.equal(recordingBeatGrid({...recording,trackId:'another-track',time:10}),null);
});
