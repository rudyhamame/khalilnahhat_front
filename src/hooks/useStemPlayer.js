import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiBaseUrl } from '../lib/api';
import { initialStemMix, STEM_CHANNELS, stemGain, scheduleStemSources } from '../lib/stemMix';

export default function useStemPlayer({audio, track, audioGraph, unlock, master, active=false}) {
  const [status,setStatus] = useState({status:'idle',channels:[]});
  const [notice,setNotice] = useState('');
  const [loading,setLoading] = useState(false);
  const [mode,setMode] = useState(false);
  const [mix,setMix] = useState(initialStemMix);
  const [levels,setLevels] = useState({});
  const engine = useRef(null);
  const generation = useRef(0);
  const automaticAttempt = useRef(null);
  const separationAttempt = useRef({id:null,count:0,retryAt:0});
  const current = useRef(track?.id);
  current.current = track?.id;
  const settings = useRef({mix,master});
  settings.current = {mix,master};
  const stop = useCallback(() => {
    const graph = engine.current;
    if (!graph) return;
    for (const source of graph.sources) { try {source.stop();} catch { /* Already stopped. */ } source.disconnect(); }
    graph.sources=[];
  },[]);
  const release = useCallback(() => {
    stop();
    const graph=engine.current;
    engine.current=null;
    if(graph) { cancelAnimationFrame(graph.frame); for(const node of Object.values(graph.outputs)) node.disconnect(); for(const node of Object.values(graph.analysers)) node.disconnect(); }
    audioGraph.current?.originalGain?.gain.setValueAtTime(1,audioGraph.current.context.currentTime);
  },[audioGraph,stop]);
  useEffect(() => {
    let canceled=false, timer;
    const version=generation;
    version.current++;
    automaticAttempt.current=null;
    separationAttempt.current={id:null,count:0,retryAt:0};
    release(); setMode(false); setLoading(false); setMix(initialStemMix()); setLevels({}); setNotice(''); setStatus({status:'idle',channels:[]});
    const refresh = async () => {
      if(!track?.id) return;
      try {
        const value=await apiRequest(`/player/stems/${encodeURIComponent(track.id)}`);
        if(!canceled) setStatus({...value,trackId:track.id});
      } catch(error) { if(!canceled) setStatus({status:'unavailable',channels:[],stage:error.status===404?'Separation is unavailable for this recording.':'Could not connect to the audio separator.'}); }
      finally { if(!canceled) timer=setTimeout(refresh,4000); }
    };
    refresh();
    return () => {canceled=true;clearTimeout(timer);version.current++;release();};
  },[track?.id,track?.audioUrl,release]); // Track switches cancel stale decodes and restore original audio.
  useEffect(() => {
    const graph=engine.current;
    if(!graph) return;
    for(const name of STEM_CHANNELS) graph.outputs[name].gain.setTargetAtTime(stemGain(mix,name,master),graph.context.currentTime,.015);
  },[mix,master]);
  useEffect(() => {
    if(!mode) return undefined;
    const element=audio.current, graph=engine.current;
    if(!element || !graph) return undefined;
    const sync=() => {
      stop();
      if(element.paused || element.ended || element.seeking) return;
      try {
        graph.context.resume().catch(()=>{});
        graph.sources=scheduleStemSources(graph.context,graph.buffers,graph.outputs,element.currentTime,element.playbackRate);
        graph.startedAt=graph.context.currentTime;
        graph.offset=element.currentTime;
        graph.rate=element.playbackRate;
      } catch {release();setMode(false);setNotice('Channels could not play. Original audio restored.');}
    };
    const check=() => {
      if(graph.sources.length && Math.abs(element.currentTime-(graph.offset+(graph.context.currentTime-graph.startedAt)*graph.rate))>.15) sync();
    };
    const pause=()=>stop();
    for(const event of ['playing','seeked','ratechange']) element.addEventListener(event,sync);
    for(const event of ['pause','waiting','seeking','ended','error']) element.addEventListener(event,pause);
    element.addEventListener('timeupdate',check);
    sync();
    return () => {
      stop();
      for(const event of ['playing','seeked','ratechange']) element.removeEventListener(event,sync);
      for(const event of ['pause','waiting','seeking','ended','error']) element.removeEventListener(event,pause);
      element.removeEventListener('timeupdate',check);
    };
  },[mode,audio,release,stop]);
  const separate=useCallback(async()=>{
    const id=track?.id,request=generation.current;
    if(!id)return;
    setNotice('');setLoading(true);
    try {
      let token='';try { token=JSON.parse(localStorage.getItem('khalil-auth-token')||'""'); } catch { /* Signed out. */ }
      const result=await apiRequest(`/player/stems/${encodeURIComponent(id)}`,{method:'POST',token});
      if(current.current===id&&generation.current===request) setStatus(value=>({...value,trackId:id,status:result.status==='ready'?'processing':result.status,stage:'Preparing separated channels…'}));
    } catch(error) {if(current.current===id&&generation.current===request){if(error.status===409&&separationAttempt.current.count<32){separationAttempt.current.retryAt=Date.now()+Math.min(60000,15000*2**(separationAttempt.current.count-1));setNotice('Waiting for the audio separator. Channels will prepare automatically.');}else{separationAttempt.current.retryAt=Infinity;setNotice(error.message);}}}
    finally {if(current.current===id&&generation.current===request)setLoading(false);}
  },[track?.id]);
  useEffect(()=>{
    const id=track?.id,attempt=separationAttempt.current;
    if(!active||!id||status.trackId!==id||status.status!=='idle'||!status.canSeparate||loading||attempt.id===id&&(!attempt.retryAt||Date.now()<attempt.retryAt||attempt.count>=32))return;
    separationAttempt.current={id,count:attempt.id===id?attempt.count+1:1,retryAt:0};
    separate();
  },[active,track?.id,status,loading,separate]);
  const toggle=useCallback(async()=>{
    if(mode) {generation.current++;release();setMode(false);setLevels({});return;}
    unlock();
    const graph=audioGraph.current, id=track?.id, request=++generation.current;
    if(!graph?.stemInput) {setNotice('Audio channels are unavailable in this browser.');return;}
    setLoading(true);setNotice('Loading separated channels…');
    try {
      await graph.context.resume();
      const buffers={};
      await Promise.all(status.channels.map(async channel=>{
        const base=apiBaseUrl.replace(/\/api$/,'');
        const response=await fetch(`${base}${channel.url}`,{cache:'no-cache'});
        if(!response.ok)throw new Error('A channel could not be loaded.');
        buffers[channel.name]=await graph.context.decodeAudioData(await response.arrayBuffer());
      }));
      if(request!==generation.current || current.current!==id) return;
      if(STEM_CHANNELS.some(name=>!buffers[name]))throw new Error('The separated channels are incomplete.');
      const lengths=Object.values(buffers).map(buffer=>buffer.duration);
      if(Math.max(...lengths)-Math.min(...lengths)>.03)throw new Error('Channel lengths do not match. Original audio retained.');
      const outputs={},analysers={};
      for(const name of STEM_CHANNELS) {
        outputs[name]=graph.context.createGain();
        outputs[name].gain.value=stemGain(settings.current.mix,name,settings.current.master);
        analysers[name]=graph.context.createAnalyser();analysers[name].fftSize=256;
        outputs[name].connect(analysers[name]);analysers[name].connect(graph.stemInput);
      }
      const state={context:graph.context,buffers,outputs,analysers,sources:[],frame:0};engine.current=state;
      const samples=new Float32Array(256);
      let previous=0;
      const meter=time=>{
        if(engine.current!==state)return;
        state.frame=requestAnimationFrame(meter);
        if(time-previous<70)return;previous=time;
        const measured={};
        for(const name of STEM_CHANNELS) {analysers[name].getFloatTimeDomainData(samples);let sum=0;for(const value of samples)sum+=value*value;measured[name]=Math.min(1,Math.sqrt(sum/samples.length)*4);}
        setLevels(measured);
      };
      state.frame=requestAnimationFrame(meter);
      graph.originalGain.gain.setValueAtTime(0,graph.context.currentTime);
      setMode(true);setNotice('');
    } catch(error) {if(request===generation.current){release();setMode(false);setNotice(error.message||'Could not load the separated channels.');}}
    finally {if(request===generation.current)setLoading(false);}
  },[mode,unlock,audioGraph,track?.id,status.channels,release]);
  useEffect(()=>{
    if(!active||!audioGraph.current?.stemInput||status.status!=='ready'||status.trackId!==track?.id||mode||loading||automaticAttempt.current===track.id)return;
    automaticAttempt.current=track.id;
    toggle();
  },[active,audioGraph,status.status,status.trackId,track?.id,mode,loading,toggle]);
  return {status,notice,loading,mode,mix,levels,automatic:true,active,separate,toggle,change:(name,patch)=>setMix(value=>({...value,[name]:{...value[name],...patch}}))};
}
