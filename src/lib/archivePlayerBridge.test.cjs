const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function bridge(){
 const target=new EventTarget();
 const source=fs.readFileSync(__dirname+'/archivePlayerBridge.js','utf8').replace(/^import .*;\n/gm,'').replace(/\bexport /g,'');
 return vm.runInNewContext(source+';({readArchivePlayerState,readArchivePlayerControls,subscribeArchivePlayerState,publishArchivePlayerState,readArchivePlaybackPosition})',{window:target,CustomEvent,flatEqualizer:()=>({})});
}
test('clock ticks do not invalidate controls while the exact playback position keeps advancing',()=>{
 const b=bridge(),track={id:'one'},tracks=[track],equalizer={};let value={...b.readArchivePlayerState(),track,tracks,equalizer,enabled:true,playing:true};b.publishArchivePlayerState(value);
 const controls=b.readArchivePlayerControls();let controlChanges=0,clockChanges=0;
 const unsubscribe=b.subscribeArchivePlayerState(()=>{if(b.readArchivePlayerControls()!==controls)controlChanges++;clockChanges++;});
 for(let i=1;i<=1000;i++)b.publishArchivePlayerState({...value,position:i/4});
 assert.equal(controlChanges,0);assert.equal(clockChanges,1000);assert.equal(b.readArchivePlayerState().position,250);assert.equal(b.readArchivePlaybackPosition('one'),250);assert.equal(b.readArchivePlaybackPosition('another'),0);
 unsubscribe();b.publishArchivePlayerState({...value,position:300});assert.equal(clockChanges,1000);
});
test('track, transport, volume, errors, queue and future status fields invalidate controls',()=>{
 const b=bridge();let value={...b.readArchivePlayerState()};
 for(const patch of [{track:{id:'one'}},{playing:true},{preparing:true},{buffering:true},{duration:120},{volume:.4},{equalizer:{bass:2}},{error:'Failed'},{tracks:[{id:'two'}]},{enabled:false},{futureStatus:'recovering'}]){
  const previous=b.readArchivePlayerControls();value={...value,...patch};b.publishArchivePlayerState(value);assert.notEqual(b.readArchivePlayerControls(),previous);assert.equal(b.readArchivePlayerControls(),value);
 }
 b.publishArchivePlayerState({...value,track:{id:'two'},position:50});assert.equal(b.readArchivePlaybackPosition('one'),0);assert.equal(b.readArchivePlaybackPosition('two'),50);
});
