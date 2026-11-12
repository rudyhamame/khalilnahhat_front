import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiBaseUrl } from '../lib/api';
import { initialStemMix, STEM_CHANNELS, STEM_REQUIRED, stemGain, scheduleStemSources, stemDecodeBytes, STEM_DECODE_LIMIT } from '../lib/stemMix';

export default function useStemPlayer({audio, track, audioGraph, unlock, master, active=false}) {
  const [status,setStatus] = useState({status:'idle',channels:[]});
  const [notice,setNotice] = useState('');
  const [loading,setLoading] = useState(false);
  const [mode,setMode] = useState(false);
  const [mix,setMix] = useState(initialStemMix);
  const levelRefs = useRef({});
  const downloads = useRef(null);
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
    downloads.current?.abort();downloads.current=null;
    stop();
    const graph=engine.current;
    engine.current=null;
    if(graph) { clearInterval(graph.timer); for(const node of Object.values(graph.outputs)) node.disconnect(); for(const node of Object.values(graph.analysers)) node.disconnect(); }
    for(const node of Object.values(levelRefs.current).flat())node?.style.setProperty('--channel-level','0');
    audioGraph.current?.originalGain?.gain.setValueAtTime(1,audioGraph.current.context.currentTime);
  },[audioGraph,stop]);
  useEffect(() => {
    let canceled=false, timer,failures=0;const controller=new AbortController();
    const version=generation;
    version.current++;
    automaticAttempt.current=null;
    separationAttempt.current={id:null,count:0,retryAt:0};
    release(); setMode(false); setLoading(false); setMix(initialStemMix());  setNotice(''); setStatus({status:'idle',channels:[]});
    if(!active||!track?.id)return ()=>{controller.abort();version.current++;release();};
    const refresh = async () => {
      if(!track?.id) return;
      let poll=false;
      try {
        const value=await apiRequest(`/player/stems/${encodeURIComponent(track.id)}`,{signal:controller.signal});
        failures=0;poll=['idle','processing','queued'].includes(value.status);
        if(!canceled) setStatus({...value,trackId:track.id});
      } catch(error) {poll=error.status!==404&&++failures<3;if(!canceled) setStatus({status:'unavailable',channels:[],stage:error.status===404?'Separation is unavailable for this recording.':'Could not connect to the audio separator.'}); }
      finally { if(!canceled&&poll) timer=setTimeout(refresh,4000); }
    };
    refresh();
    return () => {canceled=true;controller.abort();clearTimeout(timer);version.current++;release();};
  },[active,track?.id,track?.audioUrl,release]); // Track switches cancel stale decodes and restore original audio.
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
    if(mode) {generation.current++;release();setMode(false);return;}
    if(!active)return;
    unlock();
    const graph=audioGraph.current, id=track?.id, request=++generation.current;
    if(!graph?.stemInput) {setNotice('Audio channels are unavailable in this browser.');return;}
    const controller=new AbortController();downloads.current?.abort();downloads.current=controller;
    setLoading(true);setNotice('Loading separated channels…');
    try {
      await graph.context.resume();
      if(stemDecodeBytes(Number(status.duration||audio.current?.duration),graph.context.sampleRate,status.channels.length)>STEM_DECODE_LIMIT)throw new Error('This recording is too long to load separated channels within the mixer memory limit. Original audio remains available.');
      const buffers={};let decodedBytes=0;
      // Decode one channel at a time; canceled track/mixer requests cannot
      // continue downloading or retain a second set of full-length PCM buffers.
      for(const channel of status.channels){
        if(controller.signal.aborted||request!==generation.current)return;
        const base=apiBaseUrl.replace(/\/api$/,'');
        const response=await fetch(/^https:/.test(channel.url)?channel.url:`${base}${channel.url}`,{cache:'no-cache',signal:controller.signal});
        if(!response.ok)throw new Error('A channel could not be loaded.');
        const buffer=await graph.context.decodeAudioData(await response.arrayBuffer());
        decodedBytes+=buffer.length*buffer.numberOfChannels*Float32Array.BYTES_PER_ELEMENT;
        if(decodedBytes>STEM_DECODE_LIMIT)throw new Error('Separated channels exceeded the mixer memory limit. Original audio remains available.');
        if(STEM_CHANNELS.includes(channel.name))buffers[channel.name]=buffer;
      }
      if(request!==generation.current || current.current!==id) return;
      if(STEM_REQUIRED.some(name=>!buffers[name]))throw new Error('The separated channels are incomplete.');
      const lengths=Object.values(buffers).map(buffer=>buffer.duration);
      if(Math.max(...lengths)-Math.min(...lengths)>.03)throw new Error('Channel lengths do not match. Original audio retained.');
      const outputs={},analysers={};
      for(const name of STEM_CHANNELS) {
        outputs[name]=graph.context.createGain();
        outputs[name].gain.value=stemGain(settings.current.mix,name,settings.current.master);
        analysers[name]=graph.context.createAnalyser();analysers[name].fftSize=256;
        outputs[name].connect(analysers[name]);analysers[name].connect(graph.stemInput);
      }
      const state={context:graph.context,buffers,outputs,analysers,sources:[],timer:0};engine.current=state;
      const samples=new Float32Array(256);
      state.timer=setInterval(()=>{
        if(engine.current!==state)return;
        const audible=!document.hidden&&!audio.current?.paused&&!audio.current?.seeking;
        for(const name of STEM_CHANNELS){
          let level=0;
          if(audible){analysers[name].getFloatTimeDomainData(samples);let sum=0;for(const value of samples)sum+=value*value;level=Math.min(1,Math.sqrt(sum/samples.length)*4);}
          for(const node of levelRefs.current[name]||[])node?.style.setProperty('--channel-level',String(level));
        }
      },100);
      graph.originalGain.gain.setValueAtTime(0,graph.context.currentTime);
      setMode(true);setNotice('');
    } catch(error) {if(request===generation.current){release();setMode(false);setNotice(error.message||'Could not load the separated channels.');}}
    finally {if(request===generation.current)setLoading(false);}
  },[active,mode,unlock,audioGraph,track?.id,status.channels,status.duration,release,audio]);
  useEffect(()=>{
    if(!active||!audioGraph.current?.stemInput||status.status!=='ready'||status.trackId!==track?.id||mode||loading||automaticAttempt.current===track.id)return;
    automaticAttempt.current=track.id;
    toggle();
  },[active,audioGraph,status.status,status.trackId,track?.id,mode,loading,toggle]);
  return {status,notice,loading,mode,mix,levelRefs,automatic:true,active,separate,toggle,change:(name,patch)=>setMix(value=>({...value,[name]:{...value[name],...patch}}))};
}
