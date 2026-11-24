import test from 'node:test';
import assert from 'node:assert/strict';
import {djTimingVisual} from './djTimingVisual.js';
const deck=(position=0,rate=1,bpm=120)=>({n:1,track:{id:'one',bpm},position,rate,playing:true});
test('beat markers follow media time, while heard BPM and real countdown respect playback speed',()=>{
 const v=djTimingVisual({deck:deck(1.25,1.5)});assert.equal(v.beat,3);assert.equal(v.phase,.5);assert.equal(v.effective,180);assert.equal(v.nextBarSeconds,.5);assert.equal(v.firstBeatVerified,false);
 const sought=djTimingVisual({deck:deck(0)});assert.equal(sought.bar,1);assert.equal(sought.beat,1);assert.equal(sought.railPosition,0);
});
test('unknown tempo stays visibly assumed and cannot be marked tempo matched',()=>{
 const v=djTimingVisual({deck:{...deck(),track:{id:'one'}},incoming:deck()});assert.equal(v.assumed,true);assert.equal(v.bpm,120);assert.equal(v.delta,null);assert.equal(v.tempoMatched,false);assert.match(v.basis,/unverified/);
 const empty=djTimingVisual();assert.equal(empty.hasTrack,false);assert.equal(empty.bpm,0);assert.equal(empty.nextBarSeconds,null);
});
test('matching effective BPM is separate from downbeat verification',()=>{
 const v=djTimingVisual({deck:deck(0,1,120),incoming:deck(20,1.2,100)});assert.equal(v.delta,0);assert.equal(v.tempoMatched,true);assert.equal(v.firstBeatVerified,false);
});
test('cue waiting is a real countdown, and crossfade progress uses conductor timing',()=>{
 const armed=djTimingVisual({deck:deck(20,2),ai:{enabled:true,phase:'armed',startAt:30}});assert.equal(armed.countdown,5);assert.equal(armed.progress,null);
 const mixing=djTimingVisual({deck:deck(),ai:{enabled:true,phase:'mixing',mixBegan:1000,mixDuration:8},now:5000});assert.equal(mixing.progress,.5);assert.equal(mixing.countdown,4);
 const planning=djTimingVisual({deck:deck(),ai:{enabled:true,phase:'planning'}});assert.equal(planning.progress,null);
});
test('remix sections use the song playhead and ignore stale sections from another recording',()=>{
 const remix={trackId:'one',sectionStart:12,sectionEnd:28,label:'Instrumental passage',source:'ai'};
 const v=djTimingVisual({deck:deck(20),remix,now:900000});assert.equal(v.progress,.5);assert.equal(v.countdown,8);assert.equal(v.planner,'ai');
 const paused=djTimingVisual({deck:{...deck(20),playing:false},remix,now:1000000});assert.equal(paused.progress,.5);
 const stale=djTimingVisual({deck:{...deck(20),track:{id:'different',bpm:120}},remix});assert.equal(stale.progress,null);
});
test('live pulse evidence expires and never becomes a claim of downbeat lock',()=>{
 const pulse={trackId:'one',playing:true,time:20,energy:.2,bpm:121,confidence:.8,measureLocked:true,observedAt:100};
 const live=djTimingVisual({deck:deck(20),pulse,now:300});assert.equal(live.pulseBpm,121);assert.equal(live.pulseConsistency,.8);assert.equal(live.firstBeatVerified,false);
 assert.equal(djTimingVisual({deck:deck(20),pulse,now:1000}).pulseBpm,null);
 assert.equal(djTimingVisual({deck:deck(20),pulse:{...pulse,trackId:'other'},now:300}).pulseBpm,null);
 assert.equal(djTimingVisual({deck:deck(20),pulse,ai:{phase:'mixing'},now:300}).pulseBpm,null);
});

test('only a matching reference recording can display a reference first-beat grid',()=>{
 const track={id:'archive-dc3b1186-e0c3-4550-ac7f-29013bf1168d',audioUrl:'https://vps-ba7fb4cb.vps.ovh.ca/khalil-media/public/07350b048b9526d05cb83ff9880ce596341926dc3216442bc3264e84ff7d73a1.wav'};
 assert.equal(djTimingVisual({deck:{track,position:0,rate:1}}).firstBeatVerified,true);
 assert.equal(djTimingVisual({deck:{track:{...track,audioUrl:'replacement.mp3'},position:0,rate:1}}).firstBeatVerified,false);
});
