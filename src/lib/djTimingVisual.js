import {verifiedGridAt} from './beatGridAnalysis.js';
import {trackBpm} from './aiDjPlanner.js';
import {recordingBeatGrid} from './recordingBeatGrid.js';
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const valid=value=>Number.isFinite(value)&&value>=0;

// Read-only evidence for the footer. A tempo match is never presented as a downbeat lock.
export function djTimingVisual({deck,incoming,ai={},remix=null,pulse=null,analysis=null,now=0}={}){
 const track=deck?.track,position=valid(deck?.position)?deck.position:0,rate=Number.isFinite(deck?.rate)&&deck.rate>0?deck.rate:1;
 const known=recordingBeatGrid({trackId:track?.id,audioUrl:track?.audioUrl,time:position});
 const measured=track?.audioBeatGrid,verified=verifiedGridAt(track,position);
 const metadata=trackBpm(track),assumed=Boolean(track&&!metadata&&!known);
 const bpm=known?.bpm||metadata||(track?120:0),effective=bpm*rate;
 const origin=measured?.verified?measured.firstDownbeat:measured?.tempoVerified?measured.beatOffset||0:0;
 const beats=bpm?Math.max(0,(position-origin)*bpm/60):0,beatIndex=Math.floor(beats+1e-8),phase=Math.max(0,beats-beatIndex);
 const nextBeatSeconds=bpm?(1-phase)*60/bpm/rate:null;
 const nextBarSeconds=bpm?(position<origin?(origin-position)/rate:(4-(beatIndex%4)-phase)*60/bpm/rate):null;
 const incomingBpm=trackBpm(incoming?.track),incomingRate=Number.isFinite(incoming?.rate)&&incoming.rate>0?incoming.rate:1;
 const evidence=pulse&&track&&pulse.trackId===track.id&&pulse.energy>.015&&Math.abs(pulse.time-position)<.5&&pulse.playing&&deck?.playing&&ai.phase!=='mixing'&&now-pulse.observedAt>=0&&now-pulse.observedAt<700&&pulse.bpm>0?pulse:null;
 const delta=metadata&&incomingBpm?incomingBpm*incomingRate-effective:null;
 let progress=null,countdown=null,progressLabel=remix?.phase==='waiting'?'Preparing stem channels':remix?.phase==='planning'?'Choosing remix arrangement':remix?.phase==='paused'?'Remix paused':'Waiting for a plan';
 if(remix&&remix.trackId===track?.id&&valid(remix.sectionStart)&&valid(remix.sectionEnd)&&remix.sectionEnd>remix.sectionStart){
  progress=clamp((position-remix.sectionStart)/(remix.sectionEnd-remix.sectionStart));countdown=Math.max(0,(remix.sectionEnd-position)/rate);progressLabel=remix.label||'Remix section';
 }else if(ai.enabled&&ai.phase==='mixing'&&Number.isFinite(ai.mixBegan)&&ai.mixDuration>0){
  progress=clamp((now-ai.mixBegan)/(ai.mixDuration*1000));countdown=Math.max(0,ai.mixDuration-(now-ai.mixBegan)/1000);progressLabel='Crossfade';
 }else if(ai.enabled&&ai.phase==='armed'&&valid(ai.startAt)){
  countdown=Math.max(0,(ai.startAt-position)/rate);progressLabel='Waiting for transition cue';
 }else if(remix?.anchor!=null&&position<remix.anchor){countdown=(remix.anchor-position)/rate;progressLabel='Waiting for remix cue';}
 return {hasTrack:Boolean(track),playing:Boolean(deck?.playing),position,bpm,effective,rate,assumed,
  basis:verified?'Audio-verified 4/4 grid':known?'Reference grid':['queued','analyzing'].includes(analysis?.status)?'Analyzing recording audio…':measured?.tempoVerified?'Audio BPM detected · first beat ambiguous':metadata?'Track BPM · estimated beat phase':track?'Estimated 120 BPM · beat phase unverified':'Load a recording',
  analysis,gridEvidence:measured?.coverage??null,gridReason:measured?.reason||analysis?.stage||'',
  firstBeatVerified:Boolean(verified||known),audioVerified:Boolean(verified),beat:beatIndex%4+1,bar:Math.floor(beatIndex/4)+1,phraseBeat:beatIndex%16,phase,railPosition:((beatIndex%16)+phase)/16,
  nextBeatSeconds,nextBarSeconds,incomingBpm:incomingBpm?incomingBpm*incomingRate:null,delta,
  pulseBpm:evidence?.bpm||null,pulseConsistency:evidence?clamp(evidence.confidence||0):null,
  tempoMatched:delta!=null&&Math.abs(delta)<=.5,progress,countdown,progressLabel,
  planner:remix?.source||ai.plan?.source||null};
}
