const number=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function trackBpm(track){
  const measured=track?.audioBeatGrid;
  if(measured?.tempoVerified&&Number.isFinite(measured.bpm)&&measured.bpm>=50&&measured.bpm<=220)return measured.bpm;
  const direct=number(track?.bpm||track?.sound?.bpm);
  if(direct>=50&&direct<=220)return direct;
  const values=(track?.atoms||[]).map(atom=>number(atom?.sound?.bpm)).filter(value=>value>=50&&value<=220).sort((a,b)=>a-b);
  return values.length?values[Math.floor(values.length/2)]:0;
}

export function localDjPlan({current,candidates=[],played=[]}){
  const bpm=trackBpm(current),seen=new Set(played);
  const ranked=candidates.filter(track=>track?.id&&track.id!==current?.id).map((track,index)=>{
    const nextBpm=trackBpm(track),ratio=bpm&&nextBpm?Math.abs(Math.log2(nextBpm/bpm)):1;
    return {track,index,score:ratio*100+(seen.has(track.id)?40:0)+index*.01};
  }).sort((a,b)=>a.score-b.score);
  const next=ranked[0]?.track||null,nextBpm=trackBpm(next);
  return next?{nextTrackId:next.id,transitionBars:8,cueSeconds:0,targetBpm:bpm&&nextBpm?clamp(bpm,nextBpm*.85,nextBpm*1.15):nextBpm||bpm||120,style:'bass-swap',reason:'Closest compatible tempo with an unplayed recording.',source:'local'}:null;
}

export function safeDjPlan(value,{current,candidates,played=[]}){
  const fallback=localDjPlan({current,candidates,played});
  if(!fallback)return null;
  const ids=new Set(candidates.map(track=>track.id));
  if(!value||!ids.has(value.nextTrackId)||value.nextTrackId===current?.id)return fallback;
  return {
    nextTrackId:value.nextTrackId,
    transitionBars:clamp(Math.round(number(value.transitionBars)||8),4,32),
    cueSeconds:clamp(number(value.cueSeconds),0,60),
    targetBpm:clamp(number(value.targetBpm)||fallback.targetBpm,60,200),
    style:['bass-swap','smooth','energy-lift'].includes(value.style)?value.style:'smooth',
    reason:String(value.reason||'AI selected a compatible transition.').slice(0,180),
    source:value.source==='ai'?'ai':'local',
  };
}

export function nextPhraseStart({position=0,duration=0,bpm=120,transitionBars=8,rate=1,firstDownbeat=0,gridVerified=false,beatPhaseMeasured=false}){
  const speed=Number.isFinite(rate)&&rate>0?rate:1;
  const bar=240/clamp(number(bpm)||120,50,220),transition=bar*clamp(transitionBars,4,32),phrase=bar*4;
  const origin=(gridVerified||beatPhaseMeasured)&&Number.isFinite(firstDownbeat)?firstDownbeat:0;
  if(duration>0){
    const finalPhrase=origin+Math.max(0,Math.floor(Math.max(0,duration-origin-transition)/phrase))*phrase;
    const quantum=gridVerified?bar:bar/4;
    const currentCue=gridVerified||beatPhaseMeasured?origin+Math.max(0,Math.ceil((position-origin)/quantum))*quantum:position;
    const desired=Math.max(currentCue,finalPhrase),startAt=Math.min(Math.max(position,duration-.25),desired);
    return {startAt,duration:Math.max(.25/speed,Math.min(transition,duration-startAt)/speed),...(gridVerified?{gridAligned:Math.abs((startAt-origin)/bar-Math.round((startAt-origin)/bar))<.001}:{})};
  }
  return {startAt:origin+Math.ceil((position-origin+phrase)/phrase)*phrase,duration:transition/speed,...(gridVerified?{gridAligned:true}:{})};
}
