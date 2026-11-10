import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createCollabStream} from '../lib/collabCompositor';
import {effectiveFormat,normalizeFormat} from '../lib/outputFormat';
/**
 * The Studio's outputs.
 *   One source:  Send = Landscape | Portrait | Landscape + Portrait (as before).
 *   Two sources: always both. The whole output is ONE landscape 16:9 picture: the landscape source fills it and the
 *                portrait source is a full-height 9:16 window flush with one edge. Portrait destinations get the portrait source on its own.
 * The compositor runs only while something needs it: the Source tab, or a live that publishes the collab picture.
 */
export function useCollabOutputs({getPrimaryVideo,second,primaryReady,tabActive,pan=.5}){
  const [count,setCountState]=useState(1);
  const [format,setFormatState]=useState(()=>{try{return normalizeFormat(localStorage.getItem('echo-output-format'));}catch{return 'both';}});
  const setFormat=useCallback(value=>{const next=normalizeFormat(value);setFormatState(next);try{localStorage.setItem('echo-output-format',next);}catch{/* Session choice still works. */}},[]);
  const [side,setSide]=useState('right');
  const [landscape,setLandscape]=useState(null);
  const compositor=useRef(null),bVideo=useRef(null);
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
    const made=createCollabStream({a:null,b:null,side,pan});made.set({videos:sources});compositor.current=made;setLandscape(made.stream);
    return()=>{made.stop();compositor.current=null;setLandscape(null);};
  },[needed,sources]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{compositor.current?.set({side,pan});},[side,pan]);
  const hasB=Boolean(second.stream);
  const issue=count===2&&!hasB?'Two sources need the portrait source. Open it, or switch back to One source.':'';
  const latest=useRef({});latest.current={count,landscape,second};
  // Read at go-live time: landscape is the collab picture; the portrait destinations get the portrait source on its own.
  const getOutputs=useCallback(()=>{
    const s=latest.current;if(s.count!==2)return {landscape:null,portrait:null};
    return {landscape:s.landscape?.getVideoTracks()[0]||null,portrait:s.second.stream?.getVideoTracks()[0]||null};
  },[]);
  // The portrait source's sound, mixed into the live with the landscape source's audio.
  const getPortraitAudio=useCallback(()=>latest.current.count===2?latest.current.second.audioTrack||null:null,[]);
  const setCount=useCallback(next=>{setCountState(next);},[]);
  return {format:useFormat,setFormat,count,setCount,side,setSide,nativePortrait:useFormat==='portrait',
    landscapePreview:count===2?landscape:null,portraitPreview:count===2?second.stream:null,
    landscapeTag:count===2?'Collab · Portrait overlay':'',portraitTag:count===2?'Portrait Source':'',hasB,issue,getOutputs,getPortraitAudio};
}
