import {useCallback,useEffect,useRef,useState} from 'react';
import {capturePresentationSource} from '../lib/livePresentationSource';
import {captureAudioSource} from '../lib/audioSource';
// Source B: a second camera, a shared tab/window, a video file or a still image. Owns its own stream; never touches source A.
export function useSecondSource({capture=capturePresentationSource,media=globalThis.navigator?.mediaDevices}={}){
  const [state,setState]=useState({kind:'',label:'',stream:null,busy:false,error:''});
  const handle=useRef(null),generation=useRef(0);
  // The portrait source's sound is chosen apart from its picture: none | tab | file.
  const [audio,setAudio]=useState({mode:'none',track:null,error:''});
  const separate=useRef(null);
  const release=useCallback(()=>{const current=handle.current;handle.current=null;current?.cleanup?.();},[]);
  const dropSeparate=useCallback(()=>{separate.current?.cleanup?.();separate.current=null;},[]);
  const endWith=useCallback((message='')=>{generation.current++;release();setState({kind:'',label:'',stream:null,busy:false,error:message});},[release]);
  const stop=useCallback(()=>{endWith('');dropSeparate();setAudio({mode:'none',track:null,error:''});},[endWith,dropSeparate]);
  const start=useCallback(async(kind,{deviceId='',file=null,label=''}={})=>{
    const request=++generation.current;release();setState({kind,label,stream:null,busy:true,error:''});
    try{
      let stream,cleanup;
      if(kind==='camera'){
        if(!media?.getUserMedia)throw new Error('Camera access is unavailable in this browser.');
        stream=await media.getUserMedia({video:{...(deviceId?{deviceId:{exact:deviceId}}:{}),width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},audio:false});
        cleanup=()=>stream.getTracks().forEach(track=>track.stop());
        // Unplugged or taken by another app: say so instead of leaving a silent black box in the picture.
        stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(request===generation.current)endWith('The portrait source stopped. Open it again to continue.');},{once:true});
      }else{
        const source=await capture({kind,file,width:1280,height:720,onEnded:()=>{if(request===generation.current)endWith('Sharing stopped. Choose the portrait source again to continue.');}});
        stream=source.stream;cleanup=source.cleanup;handle.current={...source};
      }
      if(request!==generation.current){cleanup();return;}
      handle.current={...handle.current,cleanup};
      setState({kind,label:label||file?.name||'',stream,busy:false,error:''});
    }catch(error){if(request===generation.current)setState({kind:'',label:'',stream:null,busy:false,error:error.message||'Could not open this source.'});}
  },[media,capture,release,endWith]);
  // The picture's own sound (a shared tab, a video file) follows the picture when that is what was chosen.
  useEffect(()=>{
    setAudio(current=>{
      if(current.mode==='none'||separate.current)return current;
      const own=(current.mode==='tab'&&state.kind==='display')||(current.mode==='file'&&state.kind==='video');
      if(!own)return current;
      const track=state.stream?.getAudioTracks()[0]||null;
      return {mode:current.mode,track,error:track||!state.stream?'':'This picture has no sound.'};
    });
  },[state.stream,state.kind]);
  // Called from a click: a tab's sound can only be requested inside a user gesture.
  const chooseAudio=useCallback(async(mode,{file=null}={})=>{
    dropSeparate();
    if(mode==='none'){setAudio({mode:'none',track:null,error:''});return;}
    const own=(mode==='tab'&&state.kind==='display')||(mode==='file'&&state.kind==='video');
    if(own){const track=state.stream?.getAudioTracks()[0]||null;setAudio({mode,track,error:track?'':'This picture has no sound.'});return;}
    try{
      const captured=await captureAudioSource({kind:mode,file,onEnded:()=>{dropSeparate();setAudio({mode:'none',track:null,error:'The portrait sound stopped.'});}});
      separate.current=captured;setAudio({mode,track:captured.stream.getAudioTracks()[0]||null,error:''});
    }catch(error){setAudio({mode:'none',track:null,error:error?.name==='NotAllowedError'?'No tab or window was chosen.':(error?.message||'Could not open the sound.')});}
  },[dropSeparate,state.kind,state.stream]);
  useEffect(()=>()=>{generation.current++;release();dropSeparate();},[release,dropSeparate]);
  return {...state,audioMode:audio.mode,audioTrack:audio.track,audioError:audio.error,chooseAudio,start,stop,pause:()=>handle.current?.pause?.(),play:()=>handle.current?.play?.(),restart:()=>handle.current?.restart?.()};
}
