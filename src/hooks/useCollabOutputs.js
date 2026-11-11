import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createCollabStream,OVERLAY_SIDES} from '../lib/collabCompositor';
import {effectiveFormat,normalizeFormat} from '../lib/outputFormat';
import {paintLook,lookActive} from '../lib/lookPaint';
import {startLiveFrameClock} from '../lib/liveFrameClock';
/**
 * The Studio's outputs.
 *   One source:  Send = Landscape | Portrait | Landscape + Portrait (as before).
 *   Two sources: always both. The whole output is ONE landscape 16:9 picture: the landscape source fills it and the
 *                portrait source is a full-height 9:16 window flush with one edge. Portrait destinations get the portrait source on its own.
 * The compositor runs only while something needs it: the Source tab, or a live that publishes the collab picture.
 */
export function useCollabOutputs({getPrimaryVideo,second,primaryReady,tabActive,pan=.5,look=null}){
  const [count,setCountState]=useState(()=>{try{return localStorage.getItem('echo-output-sources')==='2'?2:1;}catch{return 1;}});
  const [format,setFormatState]=useState(()=>{try{return normalizeFormat(localStorage.getItem('echo-output-format'));}catch{return 'both';}});
  const setFormat=useCallback(value=>{const next=normalizeFormat(value);setFormatState(next);try{localStorage.setItem('echo-output-format',next);}catch{/* Session choice still works. */}},[]);
  const [side,setSideState]=useState(()=>{try{const saved=localStorage.getItem('echo-output-side');return OVERLAY_SIDES.some(([id])=>id===saved)?saved:'right';}catch{return 'right';}});
  const setSide=useCallback(value=>{setSideState(value);try{localStorage.setItem('echo-output-side',value);}catch{/* Session choice still works. */}},[]);
  // Pan of the landscape source inside its area (the portrait source's pan arrives as `pan`).
  const [panA,setPanAState]=useState(()=>{try{const saved=Number(localStorage.getItem('echo-landscape-pan'));return localStorage.getItem('echo-landscape-pan')!==null&&saved>=0&&saved<=1?saved:.5;}catch{return .5;}});
  const setPanA=useCallback(value=>{const next=Math.max(0,Math.min(1,Number(value)||0));setPanAState(next);try{localStorage.setItem('echo-landscape-pan',String(next));}catch{/* Session choice still works. */}},[]);
  const [landscape,setLandscape]=useState(null);
  const compositor=useRef(null),bVideo=useRef(null),holdRef=useRef(null),lookRef=useRef(look);lookRef.current=look;
  const useFormat=effectiveFormat(count,format);
  // B plays in a hidden element so the compositor can read its frames.
  useEffect(()=>{
    if(!second.stream){bVideo.current=null;return undefined;}
    const video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=second.stream;void video.play().catch(()=>{});bVideo.current=video;
    return()=>{video.pause();video.srcObject=null;if(bVideo.current===video)bVideo.current=null;};
  },[second.stream]);
  // Frames are read lazily, so a re-created preview element needs no restart.
  const sources=useMemo(()=>({get a(){return getPrimaryVideo();},get b(){return bVideo.current;}}),[getPrimaryVideo]);
  const needed=count===2&&(tabActive||primaryReady);
  useEffect(()=>{
    if(!needed)return undefined;
    const made=createCollabStream({a:null,b:null,side,pan});made.set({videos:sources,hold:holdRef.current,panA,look:lookRef.current});compositor.current=made;setLandscape(made.stream);
    return()=>{made.stop();compositor.current=null;setLandscape(null);};
  },[needed,sources]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{compositor.current?.set({side,pan,panA});},[side,pan,panA]);
  useEffect(()=>{compositor.current?.set({look});},[look]);
  // Pause live: this 16:9 photo replaces both sources in the collab picture (null = back to the sources).
  const setHold=useCallback(photo=>{holdRef.current=photo||null;compositor.current?.set({hold:holdRef.current});},[]);
  // The portrait source goes through the same look (Beauty & lighting) before it is previewed and published. The copy always runs in
  // Two sources, so turning the look on or off never swaps the published track.
  const [portraitLooked,setPortraitLooked]=useState(null);
  useEffect(()=>{
    if(count!==2||!second.stream){setPortraitLooked(null);return undefined;}
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=720;canvas.height=1280;
    const draw=()=>{
      const video=bVideo.current;if(!video||video.readyState<2||!video.videoWidth)return;
      if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}
      const settings=lookRef.current;
      if(lookActive(settings))paintLook(ctx,video,canvas.width,canvas.height,settings);else{ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(video,0,0,canvas.width,canvas.height);}
      stream.getVideoTracks()[0]?.requestFrame?.();
    };
    const stream=canvas.captureStream(30);draw();const stop=startLiveFrameClock(draw,30);setPortraitLooked(stream);
    return()=>{stop();stream.getTracks().forEach(track=>track.stop());setPortraitLooked(null);};
  },[count,second.stream]);
  const portraitStream=count===2?(portraitLooked||second.stream):null;
  const hasB=Boolean(second.stream);
  const issue=count===2&&!hasB?'Two sources need the portrait source. Open it, or switch back to One source.':'';
  const latest=useRef({});latest.current={count,landscape,second,portraitStream};
  // Read at go-live time: landscape is the collab picture; the portrait destinations get the portrait source on its own.
  const getOutputs=useCallback(()=>{
    const s=latest.current;if(s.count!==2)return {landscape:null,portrait:null};
    return {landscape:s.landscape?.getVideoTracks()[0]||null,portrait:s.portraitStream?.getVideoTracks()[0]||null};
  },[]);
  // The portrait source's sound, mixed into the live with the landscape source's audio.
  const getPortraitAudio=useCallback(()=>latest.current.count===2?latest.current.second.audioTrack||null:null,[]);
  const setCount=useCallback(next=>{setCountState(next);try{localStorage.setItem('echo-output-sources',String(next));}catch{/* Session choice still works. */}},[]);
  return {format:useFormat,setFormat,count,setCount,side,setSide,nativePortrait:useFormat==='portrait',
    landscapePreview:count===2?landscape:null,portraitPreview:portraitStream,
    landscapeTag:count===2?(side==='left'?'Portrait left':side==='right'?'Portrait right':'Portrait mini'):'',portraitTag:count===2?'Portrait source':'',hasB,issue,getOutputs,getPortraitAudio,setHold,panA,setPanA};
}
