import {useCallback,useEffect,useRef,useState} from 'react';
import {meetingDeviceList,meetingMediaConstraints,replaceMeetingDevice} from '../lib/meetingDevices.mjs';
const cancelled=()=>Object.assign(new Error('Media request cancelled.'),{name:'AbortError'});

export function useMeetingDevices({streamRef,peerRef,ar=false}){
 const [devices,setDevices]=useState({audio:[],video:[]}),[selected,setSelected]=useState({audio:'',video:''}),[busy,setBusy]=useState(false),[previewing,setPreviewing]=useState(false),[previewKind,setPreviewKind]=useState('video'),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const mounted=useRef(true),epoch=useRef(0),working=useRef(false),preferences=useRef({audio:'',video:''}),candidates=useRef({});
 const refresh=useCallback(async()=>{try{if(!navigator.mediaDevices?.enumerateDevices)return;const result=await meetingDeviceList(navigator.mediaDevices);if(mounted.current)setDevices(result);}catch{/* Device labels can be unavailable until permission is granted. */}},[]);
 const reset=useCallback(()=>{epoch.current++;working.current=false;for(const track of Object.values(candidates.current))track.stop();candidates.current={};streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;if(mounted.current){setBusy(false);setPreviewing(false);setError('');setRevision(value=>value+1);}},[streamRef]);
 useEffect(()=>{mounted.current=true;refresh();const mediaDevices=navigator.mediaDevices;mediaDevices?.addEventListener?.('devicechange',refresh);return()=>{mounted.current=false;mediaDevices?.removeEventListener?.('devicechange',refresh);reset();};},[refresh,reset]);
 const getMedia=async kind=>{
  if(working.current)throw cancelled();
  const current=streamRef.current;
  if(current?.getAudioTracks().some(track=>track.readyState==='live')&&(kind!=='video'||current.getVideoTracks().some(track=>track.readyState==='live'))){if(kind!=='video')for(const track of current.getVideoTracks()){current.removeTrack(track);track.stop();}setPreviewing(false);return current;}
  const ticket=++epoch.current;working.current=true;setBusy(true);setError('');
  try{
   const stream=await navigator.mediaDevices.getUserMedia(meetingMediaConstraints(kind,preferences.current));
   if(!mounted.current||ticket!==epoch.current){stream.getTracks().forEach(track=>track.stop());throw cancelled();}
   current?.getTracks().forEach(track=>track.stop());streamRef.current=stream;setPreviewing(false);setRevision(value=>value+1);void refresh();return stream;
  }finally{if(mounted.current&&ticket===epoch.current){working.current=false;setBusy(false);}}
 };
 const change=async(kind,id)=>{
  if(working.current)return;
  const stream=streamRef.current;
  const choose=()=>{preferences.current={...preferences.current,[kind]:id};setSelected({...preferences.current});};
  if(!stream?.getTracks().some(track=>track.kind===kind)){choose();setError('');return;}
  const peer=peerRef.current,ticket=++epoch.current;let candidate;working.current=true;setBusy(true);setError('');
  try{
   const success=await replaceMeetingDevice({kind,deviceId:id,stream,peer,mediaDevices:navigator.mediaDevices,onCandidate:track=>{candidate=track;candidates.current[kind]=track;},isCurrent:()=>mounted.current&&ticket===epoch.current&&streamRef.current===stream&&peerRef.current===peer});
   if(success&&mounted.current&&ticket===epoch.current){choose();setRevision(value=>value+1);void refresh();}
  }catch{if(mounted.current&&ticket===epoch.current)setError(ar?'تعذر تبديل الجهاز. جهازك السابق ما زال محدداً. جرّب جهازاً آخر.':'Could not switch devices. Your previous device is still selected. Try another device.');}
  finally{if(candidates.current[kind]===candidate)delete candidates.current[kind];if(mounted.current&&ticket===epoch.current){working.current=false;setBusy(false);}}
 };
 const togglePreview=async(kind='video')=>{
  if(working.current)return;
  if(previewing&&previewKind===kind){reset();return;}
  try{await getMedia(kind);if(mounted.current){setPreviewKind(kind);setPreviewing(true);}}
  catch(failure){if(failure.name!=='AbortError'&&mounted.current)setError(ar?'تعذر فتح المعاينة. اسمح بالميكروفون والكاميرا وتحقق من أجهزتك.':'Could not open the preview. Allow microphone and camera access and check your devices.');}
 };
 const setEnabled=useCallback((kind,enabled)=>{for(const track of streamRef.current?.getTracks()||[])if(track.kind===kind)track.enabled=enabled;if(candidates.current[kind])candidates.current[kind].enabled=enabled;},[streamRef]);
 return {devices,selected,busy,previewing,previewKind,error,revision,refresh,reset,getMedia,change,togglePreview,setEnabled};
}
