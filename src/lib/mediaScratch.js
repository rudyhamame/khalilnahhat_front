const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function mediaScratch(element,state,event,{duration,normalRate=1,resume=false,onPosition}={}){
  if(!element||!Number.isFinite(duration)||duration<=0)return;
  const stopGrain=()=>{
    clearTimeout(state.timer);
    state.timer=0;
    element.pause();
  };
  if(event?.phase==='start'){
    stopGrain();
    state.active=true;
    state.resume=resume;
    state.target=element.currentTime;
    return;
  }
  if(event?.phase==='move'&&state.active){
    const target=clamp(Number(event.pos)||0,0,duration);
    const velocity=clamp(Number(event.vel)||0,-4,4);
    state.target=target;
    onPosition?.(target);
    clearTimeout(state.timer);
    if(velocity>=0){
      const rate=clamp(velocity||.25,.25,4);
      if(element.paused||Math.abs(element.currentTime-target)>.2)element.currentTime=target;
      element.playbackRate=rate;
      element.play().catch(()=>{});
      state.timer=setTimeout(()=>{if(state.active)element.pause();},85);
    }else{
      // Media elements cannot run at a negative playback rate. Closely spaced,
      // short grains keep reverse hand movement audible without a long forward burst.
      element.pause();
      element.currentTime=target;
      element.playbackRate=clamp(Math.abs(velocity),.5,2);
      element.play().catch(()=>{});
      state.timer=setTimeout(()=>{if(state.active)element.pause();},32);
    }
    return;
  }
  if(event?.phase==='end'&&state.active){
    stopGrain();
    state.active=false;
    if(Number.isFinite(state.target))element.currentTime=state.target;
    element.playbackRate=normalRate;
    if(state.resume)element.play().catch(()=>{});
  }
}
