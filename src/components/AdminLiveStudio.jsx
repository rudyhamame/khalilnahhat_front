import {useCallback,useEffect,useRef,useState} from 'react';
import {Radio,VideoOff,Minimize2,Maximize2,RefreshCw,Camera,Mic,Layers,Share2,FlipHorizontal2,Sun,Eye,EyeOff,LoaderCircle,Square,FolderOpen,ChevronDown,TriangleAlert,Info,X,Pause,Play} from 'lucide-react';
import {adminToast} from './adminToast';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {useWebrtcBroadcast} from '../hooks/useWebrtcBroadcast';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {startDirectRecording,recoverRecordings} from '../lib/directRecording';
import RecordingProgress,{RecordingStats} from './RecordingProgress';
import RecordingHistory from './RecordingHistory';
import PauseBanner from './PauseBanner';
import MicStrip from './MicStrip';
import {useAutoDuck} from '../hooks/useAutoDuck';
import PausePhotoPicker from './PausePhotoPicker';
import {loadPausePhoto,preparePausePhoto} from '../lib/pausePhoto';
import CollabPanel,{CollabLandscapeOverlay,SourceCountChoice,SourceCard} from './CollabPanel';
import {useSecondSource} from '../hooks/useSecondSource';
import {useCollabOutputs} from '../hooks/useCollabOutputs';
import {chooseDiskRecordingFolder,reuseRememberedFolder} from '../lib/diskRecordingStore';
import {saveLocalRecordingMp4} from '../lib/localRecordingMp4';
import {uploadDirectRecordingChunk} from '../lib/directRecordingUpload';
import CameraAppearanceControls from './CameraAppearanceControls';
import AdminSelect from './AdminSelect';
import ObsBroadcast from './ObsBroadcast';
import WebrtcViewer from './WebrtcViewer';
import StudioPreviewMirror from './StudioPreviewMirror';
import LiveDestinations from './LiveDestinations';
import {LIVE_AUDIO_CONTROLS} from '../lib/liveAudioProcessing';
import VocalCorrectionControl from './VocalCorrectionControl';
import VoiceTestMeter from './VoiceTestMeter';
import LiveGoalPicker from './LiveGoalPicker';
import AdminLiveAudience from './AdminLiveAudience';
import LiveSourcePicker from './LiveSourcePicker';
import AudioInputPicker from './AudioInputPicker';
import './adminLiveStudio.css';

const SETTINGS_TABS=[['studio','Source',Layers],['appearance','Lighting',Sun],['destinations','Destinations',Share2]];


function LiveElapsedTimer({session}) {
 const [startedAt]=useState(()=>{
  const now=Date.now();
  try {
   const saved=JSON.parse(sessionStorage.getItem('echo-studio-live-clock')||'null');
   if(session&&saved?.session===session&&Number.isFinite(saved.startedAt)&&saved.startedAt<=now)return saved.startedAt;
   if(session)sessionStorage.setItem('echo-studio-live-clock',JSON.stringify({session,startedAt:now}));
  }catch{/* The clock still runs when browser storage is unavailable. */}
  return now;
 });
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const seconds=Math.max(0,Math.floor((now-startedAt)/1000));
 const elapsed=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(value=>String(value).padStart(2,'0')).join(':');
 return <time className="studio-live-elapsed" dateTime={`PT${seconds}S`} aria-label={`Live elapsed time ${elapsed}`} title="Elapsed time since this studio connected to the live session">{elapsed}</time>;
}

export default function AdminLiveStudio({token,enabled,liveStream:initial,onLiveStreamChange,onReviewLiveRequest}) {
 const {item:liveStream,loading,error,update}=useLiveStatus({token,admin:true,enabled,initial});
 const [retry,setRetry]=useState(0);
 const [previewAudioControlsTarget,setPreviewAudioControlsTarget]=useState(null),[liveFullscreen,setLiveFullscreen]=useState(false);
 const [dismissedHint,setDismissedHint]=useState('');
 const [title,setTitle]=useState(''),[goalChoice,setGoalChoice]=useState(''),[detailsTried,setDetailsTried]=useState(false);
 const [saveLive,setSaveLive]=useState(()=>{try{return localStorage.getItem('echo-save-live-recording')!=='false';}catch{return true;}});
 const diskStore=useRef(null),folderChosenForNextLive=useRef(false);
 const [askRecordingFolder,setAskRecordingFolder]=useState(true);
 const [localFiles,setLocalFiles]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem('echo-saved-recordings')||'[]');return Array.isArray(saved)?saved:[];}catch{return [];}}),[localMessage,setLocalMessage]=useState(''),[localBusy,setLocalBusy]=useState(false),[folderName,setFolderName]=useState('');
 // The list survives a refresh (details only, never footage); actions work again once the folder is reconnected.
 useEffect(()=>{try{localStorage.setItem('echo-saved-recordings',JSON.stringify(localFiles.map(({id,filename,count,complete,done,uploaded})=>({id,filename,count,complete,done,uploaded}))));}catch{/* The list still shows this session. */}},[localFiles]);
 const saveServer=saveLive;
 const [rememberedName,setRememberedName]=useState('');
 const liveNow=useRef(false);
 // The portrait overlay must line up with the landscape PICTURE, not its title row: publish that row's height to the CSS.
 useEffect(()=>{const pair=liveFrame.current;if(!pair)return undefined;
  const sync=()=>{const head=pair.querySelector('.studio-preview-window[aria-label="Landscape preview"] .studio-preview-window-head');pair.style.setProperty('--landscape-head',`${head?.offsetHeight||0}px`);};
  sync();const observer=new ResizeObserver(sync);observer.observe(pair);return()=>observer.disconnect();},[]);
 const getPrimaryVideo=useCallback(()=>primaryFrame.current?.querySelector('video.admin-live-preview-frame')||null,[]);
 const secondSource=useSecondSource();
 const collabRef=useRef(null);
 // The folder is the truth for the progress panel: parts on disk, parts OVH confirmed, and whether OVH accepted the finish.
 const [pipelineLocal,setPipelineLocal]=useState(null),[serverRec,setServerRec]=useState(null);
 // OVH's view of the same recording (status and how many parts Cloudinary already holds), refreshed while it is still moving.
 useEffect(()=>{const id=pipelineLocal?.id;if(!id||!token||serverRec?.id===id&&['ready','partial'].includes(serverRec.status))return undefined;let stop=false,timer;
  const poll=async()=>{try{const result=await apiRequest('/admin/live-recordings',{token});const found=(result.items||[]).find(item=>item.id===id);if(!stop)setServerRec(found?{id,status:found.status,parts:found.partCount||0,error:found.error||''}:null);}catch{/* next poll */}if(!stop)timer=setTimeout(poll,4000);};
  void poll();return()=>{stop=true;clearTimeout(timer);};},[pipelineLocal?.id,token]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{const timer=setInterval(async()=>{const store=diskStore.current;if(!store)return;
  const sessions=(await store.sessions()).filter(item=>item.filename);
  // The History list reads the same live numbers, so a recording's part count is the same everywhere, never a stale copy.
  setLocalFiles(previous=>{const key=list=>JSON.stringify(list.map(item=>[item.id,item.count,item.uploaded||0,Boolean(item.done)]));return key(previous)===key(sessions)?previous:sessions;});
  const latest=[...sessions].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
  const next=latest&&(liveNow.current||!latest.done||Date.now()-(latest.finishedAt||0)<600000)?{id:latest.id,count:latest.count||0,uploaded:latest.uploaded||0,bytes:latest.bytes||0,done:Boolean(latest.done)}:null;
  setPipelineLocal(prev=>JSON.stringify(prev)===JSON.stringify(next)?prev:next);},1500);return()=>clearInterval(timer);},[]);
 const chooseFolder=async(change=false)=>{
  setLocalBusy(true);setLocalMessage('');
  try{const reused=change?null:await reuseRememberedFolder({ask:true});const store=reused?.store||await chooseDiskRecordingFolder();diskStore.current=store;setFolderName(store.directory.name);setLocalFiles((await store.sessions()).filter(file=>file.filename));setLocalMessage('Recording folder ready. Any previous saved parts are listed below.');folderChosenForNextLive.current=true;void recoverRecordings({store,upload:uploadRecordingChunk,finish:finishRecording,status:recordingStatus,hold:()=>liveNow.current,onStatus:setRecordingMessage}).then(clearStaleHint).catch(()=>{});return store;}
  catch(error){if(error.name!=='AbortError')setLocalMessage(error.message);return null;}
  finally{setLocalBusy(false);}
 };
 const restoreLocalFile=async file=>{
  setLocalBusy(true);setLocalMessage('Building the video from '+file.count+' saved parts…');
  try{await diskStore.current.exportFile(file);setLocalMessage(file.filename+' saved in '+diskStore.current.directory.name+'. Recovery parts were kept.');}
  catch(error){setLocalMessage('Could not build the video: '+error.message+'. Saved parts remain in your folder.');}
  finally{setLocalBusy(false);}
 };
 const purgeLocalFile=async file=>{
  if(!window.confirm(file.done?'Delete '+file.filename+' and its '+file.count+' parts from your folder? It was already uploaded to OVH.':'This recording has NOT been confirmed uploaded to OVH. Deleting '+file.filename+' and its '+file.count+' parts from your folder is permanent. Delete anyway?'))return;
  setLocalBusy(true);
  try{await diskStore.current.purge(file.id);setLocalFiles(current=>current.filter(item=>item.id!==file.id));setLocalMessage('Deleted '+file.filename+' parts.');}
  catch(error){setLocalMessage('Could not delete: '+error.message);}
  finally{setLocalBusy(false);}
 };
 const saveLocalMp4=async file=>{
  setLocalBusy(true);
  try{const filename=await saveLocalRecordingMp4(file,{store:diskStore.current,onStatus:setLocalMessage});setLocalMessage(filename+' saved in '+diskStore.current.directory.name+'. Original recovery parts were kept.');}
  catch(error){setLocalMessage('Could not save MP4: '+error.message);}
  finally{setLocalBusy(false);}
 };
 const [settingsTab,setSettingsTab]=useState('studio');
 const [landscapeIndicators,setLandscapeIndicators]=useState(null),[portraitIndicators,setPortraitIndicators]=useState(null);
 const [destinationFeedback,setDestinationFeedback]=useState('');
  const liveFrame=useRef(null),primaryFrame=useRef(null),settingsArea=useRef(null),alive=useRef(true);
 // Size the control workspace to the visible area, including when status text wraps.
 useEffect(()=>{
  const dock=settingsArea.current,root=dock?.closest('#admin-live-stream');if(!root)return;
  let frame;
  const measure=()=>{
   cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
    const top=dock.getBoundingClientRect().top;
    const footer=root.closest('.admin-workspace')?.querySelector('.aw-workspace-footer');
    const bottom=window.innerHeight-(footer?.getBoundingClientRect().height||0)-16;
    root.style.setProperty('--studio-workspace-height',`${Math.max(240,bottom-Math.max(0,top))}px`);
   });
  };
  const observer=new ResizeObserver(measure);observer.observe(root.firstElementChild);
  window.addEventListener('resize',measure);document.addEventListener('fullscreenchange',measure);measure();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',measure);document.removeEventListener('fullscreenchange',measure);};
 },[]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const sync=()=>setLiveFullscreen(document.fullscreenElement===liveFrame.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
 const toggleLiveFullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else liveFrame.current?.requestFullscreen?.().catch(()=>{});};
 const openDestination=platform=>{
   if(!['youtube','instagram','tiktok'].includes(platform))return;
   setSettingsTab('destinations');
   const dialog=settingsArea.current;if(!dialog)return;
   requestAnimationFrame(()=>{const card=dialog.querySelector(`[data-destination="${platform}"]`);card?.scrollIntoView({block:'nearest'});card?.querySelector('input')?.focus({preventScroll:true});});
 };
 const broadcastTitle=title.trim();
 const apply=item=>{if(!alive.current)return;update(item);onLiveStreamChange?.(item);};
 const start=async title=>{if(localBusy)throw new Error('Wait for local saving or recovery to finish.');if(folderRequired)throw new Error('Choose a recording folder before going live.');const result=await apiRequest('/live-stream/webrtc/go-live',{method:'POST',token,body:{title,recordingMode:'direct',saveRecording:saveServer}});apply(result.item);setTitle('');return result;};
 const end=async roomName=>{try{const result=await apiRequest('/live-stream/webrtc/end',{method:'POST',token,body:{roomName}});apply(result.item);setTitle('');setGoalChoice('');setDetailsTried(false);}finally{if(askRecordingFolder)folderChosenForNextLive.current=false;}};
 const ready=async roomName=>{const result=await apiRequest('/live-stream/webrtc/ready',{method:'POST',token,body:{roomName}});apply(result.item);};
 const resume=async()=>apiRequest('/live-stream/webrtc/resume',{method:'POST',token});
 const uploadRecordingChunk=useCallback((id,sequence,bytes,mime)=>uploadDirectRecordingChunk({baseUrl:apiBaseUrl,token,id,sequence,bytes,mime}),[token]);
 const recordingStatus=useCallback(id=>apiRequest(`/live-stream/recordings/${id}/status`,{token}),[token]);
 // After a refresh, take the remembered folder back automatically when the browser still allows it.
 useEffect(()=>{let cancelled=false;void reuseRememberedFolder().then(async found=>{
  if(cancelled||!found)return;
  if(!found.store){setRememberedName(found.handle.name);return;}
  diskStore.current=found.store;setFolderName(found.handle.name);setRememberedName(found.handle.name);folderChosenForNextLive.current=true;
  setLocalFiles((await found.store.sessions()).filter(file=>file.filename));
 });return()=>{cancelled=true;};},[]);
 const finishRecording=useCallback((id,body)=>apiRequest(`/live-stream/recordings/${id}/finish`,{method:'POST',token,body,signal:AbortSignal.timeout(30000)}),[token]);
 const [recordingMessage,setRecordingMessage]=useState('');
 // Progress notes about the folder are hints: they fade on their own, errors stay until replaced.
 useEffect(()=>{if(!localMessage||/could not|failed|recovery|unavailable|needs/i.test(localMessage))return undefined;const timer=setTimeout(()=>setLocalMessage(''),8000);return()=>clearTimeout(timer);},[localMessage]);
 // The old-recording warning disappears by itself once a recovery pass finds nothing left to upload.
 const clearStaleHint=useCallback(failed=>{if(!failed)setRecordingMessage(message=>message.startsWith('A previous recording')?'':message);},[]);
 useEffect(()=>{if(!enabled||!token)return;let pending=false;const retry=async()=>{if(pending)return;pending=true;try{if(diskStore.current)clearStaleHint(await recoverRecordings({store:diskStore.current,upload:uploadRecordingChunk,finish:finishRecording,status:recordingStatus,hold:()=>liveNow.current,onStatus:setRecordingMessage}));}catch{/* Retry local storage access on the next pass. */}finally{pending=false;}};void retry();const timer=setInterval(()=>void retry(),30000);window.addEventListener('online',retry);return()=>{clearInterval(timer);window.removeEventListener('online',retry);};},[enabled,token,uploadRecordingChunk,finishRecording,recordingStatus,clearStaleHint]);
 const [recordedBytes,setRecordedBytes]=useState(0),[savedBytes,setSavedBytes]=useState(0);
 const startRecording=({id,tracks})=>{if(!diskStore.current)throw new Error('Choose a recording folder before going live.');setRecordedBytes(0);setSavedBytes(0);setRecordingMessage('');return startDirectRecording({id,tracks,title:broadcastTitle,store:diskStore.current,status:recordingStatus,upload:async(...args)=>{const result=await uploadRecordingChunk(...args);setSavedBytes(value=>value+(args[2]?.byteLength||0));return result;},finish:finishRecording,onStatus:setRecordingMessage,onProgress:setRecordedBytes});};
 const folderRequired=saveLive&&(!diskStore.current||askRecordingFolder&&!folderChosenForNextLive.current);
 const [folderHint,setFolderHint]=useState(0);
 useEffect(()=>{if(!folderRequired)setFolderHint(0);},[folderRequired]);
 useEffect(()=>{if(!folderHint)return;const timer=setTimeout(()=>setFolderHint(0),5000);return()=>clearTimeout(timer);},[folderHint]);
 const recordingReady=!localBusy&&!folderRequired;
 const beforeGoLive=()=>{
  if(collab.issue){setSettingsTab('studio');setLocalMessage(collab.issue);return false;}
  if(!title.trim()||!goalChoice){
   setDetailsTried(true);setSettingsTab('studio');setLocalMessage('Enter a session title and choose the live stream goal before going live.');
   requestAnimationFrame(()=>document.querySelector(!title.trim()?'.studio-title input':'.live-goal-picker select')?.focus());
   return false;
  }
  if(recordingReady)return true;
  setSettingsTab('studio');setLocalMessage(localBusy?'Wait for local saving or recovery to finish.':'');
  if(folderRequired)setFolderHint(Date.now());
  requestAnimationFrame(()=>{const button=document.querySelector('.studio-recording-card .studio-folder-button');button?.scrollIntoView({block:'nearest'});button?.focus({preventScroll:true});});
  return false;
 };
 const webrtc=useWebrtcBroadcast({onGoLive:start,onEndLive:end,onReady:ready,onStartRecording:startRecording,getOutputs:()=>collabRef.current?.getOutputs()||{},getPortraitAudio:()=>collabRef.current?.getPortraitAudio()||null,isNativePortrait:()=>Boolean(collabRef.current?.nativePortrait),requireRecording:saveServer,recordingEnabled:saveServer,expectedRoom:liveStream?.webrtcRoomName});
 const collab=useCollabOutputs({getPrimaryVideo,second:secondSource,primaryReady:webrtc.isPreviewing||webrtc.isBroadcasting,tabActive:settingsTab==='studio',pan:webrtc.portraitPan});collabRef.current=collab;
 const stopLive=webrtc.endLive;
 const [resumeBusy,setResumeBusy]=useState(false);
 const reconnectLive=async()=>{
  if(resumeBusy)return;
  if(['image','video'].includes(webrtc.sourceKind)&&!webrtc.sourceFile){setSettingsTab('studio');adminToast('Choose the source file again, then reconnect the live.',true);return;}
  setResumeBusy(true);
  try{
   const prepared=await webrtc.preparePreview({kind:webrtc.sourceKind,file:webrtc.sourceFile});
   if(!prepared)return;
   const claim=await resume();apply(claim.item);await webrtc.goLive('',claim,webrtc.sourceKind);
  }catch(error){adminToast(error.message||'Could not reconnect this live stream.',true);}
  finally{setResumeBusy(false);}
 };
 // Refresh survival: rejoin the live PAUSED on the pause photo. No camera or tab is needed, so it cannot fail on a missing input.
 const restorePaused=async photo=>{
  setResumeBusy(true);
  try{
   if(!await webrtc.preparePausedPreview(photo))return;
   const claim=await resume();apply(claim.item);await webrtc.goLive('',claim,'image',photo);
  }catch(error){adminToast(error.message||'Could not restore the paused live.',true);}
  finally{setResumeBusy(false);}
 };
 const previewReply=webrtc.statusMessage.startsWith('Private preview ready.')||webrtc.statusMessage==='Preview closed.';
 const folderWarning=folderRequired&&Boolean(folderHint);
 const recordingHint=recordingMessage&&!/up to date|uploaded/i.test(recordingMessage)?recordingMessage:'';
 const controlHint=folderWarning?'Choose a recording folder in Live Source before going live.':recordingHint||localMessage||(collab.count===2?secondSource.error:'')||destinationFeedback||(!previewReply&&webrtc.statusMessage)||'';
 useEffect(()=>{
  if(enabled&&previewReply)adminToast(webrtc.statusMessage.trim());
 },[enabled,previewReply,webrtc.statusMessage]);
 useEffect(()=>{if(enabled&&webrtc.startError)adminToast(webrtc.startError,true);},[enabled,webrtc.startError]);
 const reserved=Boolean(liveStream?.obs?.roomName||liveStream?.webrtcRoomName),isLiveOnAir=Boolean(liveStream?.isLive),session=liveSessionIdentity(liveStream);
 const legacyObs=Boolean(liveStream?.obs?.roomName);
 
 const rec=liveStream?.recording,recProblem=[rec?.warning,rec?.error].filter(Boolean).join(' · ');
 const statusBadges=[];
 // The Record this live card already shows recording state; only a real problem earns a badge here.
 if((reserved||isLiveOnAir)&&recProblem)statusBadges.push({key:'problem',text:'Recording issue',tone:'warn',title:recProblem});
 // Refresh survival: browser capture dies with the page, so this same tab re-acquires the camera and resumes the live.
 const [pausePhoto,setPausePhoto]=useState(null),[pauseError,setPauseError]=useState(''),[pickingPhoto,setPickingPhoto]=useState(false);
 const [pauseLoaded,setPauseLoaded]=useState(false);
 useEffect(()=>{void loadPausePhoto().then(setPausePhoto).finally(()=>setPauseLoaded(true));},[]);
 useEffect(()=>{collab.setHold(webrtc.paused&&pausePhoto?pausePhoto.frame:null);},[webrtc.paused,pausePhoto,collab.count,collab.landscapePreview]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{webrtc.setWatermark(collab.count!==2);},[collab.count,webrtc.isPreviewing,webrtc.isBroadcasting]);// eslint-disable-line react-hooks/exhaustive-deps
 // A portrait source chosen while paused reaches viewers (the portrait page) through the published track.
 useEffect(()=>{const track=secondSource.stream?.getVideoTracks()[0];if(webrtc.isBroadcasting&&webrtc.paused&&collab.count===2&&track)void webrtc.setPortraitTrack(track);},[secondSource.stream,webrtc.paused,webrtc.isBroadcasting,collab.count]);// eslint-disable-line react-hooks/exhaustive-deps
 const autoResumed=useRef(false);
 useEffect(()=>{try{if(webrtc.isBroadcasting)sessionStorage.setItem('echo-live-tab',liveStream?.webrtcRoomName||'1');else if(!loading&&!isLiveOnAir)sessionStorage.removeItem('echo-live-tab');}catch{/* storage unavailable */}},[webrtc.isBroadcasting,loading,isLiveOnAir,liveStream?.webrtcRoomName]);
 useEffect(()=>{if(autoResumed.current||loading||!pauseLoaded||!isLiveOnAir||liveStream?.broadcastSource!=='browser'||webrtc.isBroadcasting||!pausePhoto||(saveLive&&!folderName))return;let mine=false;try{mine=Boolean(sessionStorage.getItem('echo-live-tab'));}catch{/* ignore */}if(!mine)return;autoResumed.current=true;void restorePaused(pausePhoto.frame);},[pausePhoto,pauseLoaded,loading,isLiveOnAir,liveStream?.broadcastSource,webrtc.isBroadcasting,webrtc.sourceKind,folderName]);// eslint-disable-line react-hooks/exhaustive-deps
 liveNow.current=isLiveOnAir||webrtc.isBroadcasting;
 const studioState=isLiveOnAir||webrtc.isBroadcasting?'live':webrtc.previewBusy?'opening':webrtc.isConnecting||reserved?'connecting':webrtc.isPreviewing?'preview':'offline';
 const previewActive=webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting||isLiveOnAir;
 const captureLocked=webrtc.isConnecting||webrtc.previewBusy||webrtc.isPreviewing||webrtc.isBroadcasting;
 // Inputs stay selectable while a preview is open (picking one replaces the preview); only a live in progress or an opening preview locks them.
 // Auto leveling: lower the audio input while the voice microphone speaks. The hook gets a steady function so it is not restarted each render.
 const [autoLevel,setAutoLevel]=useState(()=>{try{return localStorage.getItem('echo-auto-level')==='1';}catch{return false;}});
 const duckRef=useRef(null);duckRef.current=webrtc.setDuck;
 const stableDuck=useCallback((factor,smoothing)=>duckRef.current?.(factor,smoothing),[]);
 const ducking=useAutoDuck({stream:webrtc.voiceStream,enabled:autoLevel&&webrtc.voiceOn,setDuck:stableDuck});
 const inputLocked=webrtc.isConnecting||webrtc.previewBusy||webrtc.isBroadcasting;
 // Pause live: a photo replaces the input for viewers; the input can then be changed privately and the live resumed.
 const pauseClick=()=>{if(!pausePhoto){setPauseError('Choose a pause photo first (What’s going live?).');return;}setPauseError(webrtc.pauseLive(pausePhoto.frame,{muteAudio:true})?'':'Pause works while you are live.');};
 const pickPausePhoto=async(item,crop)=>{try{const chosen=await preparePausePhoto(item,{crop});setPausePhoto(chosen);setPauseError('');setPickingPhoto(false);}catch(error){setPauseError(error.message);}};
 return (
          <section id="admin-live-stream" className="admin-panel admin-live-stream-panel" aria-label="Live studio">
            <div><div className="section-label admin-panel-head">
              <div className="admin-panel-head-copy">
                <p className="section-number">
                  <span className="section-number-mark">KN//</span>
                  <span className="section-number-value">00</span>
                </p>
                <h2 className="admin-title-with-icon"><Radio size={18} aria-hidden="true" /><span className="admin-crumb">Live</span><span className="admin-crumb-sep" aria-hidden="true">/</span>Echo Studio</h2>
              </div>
              {controlHint&&controlHint!==dismissedHint&&<div className={`studio-control-hint${folderWarning||recordingHint?' is-warning':' is-info'}`} role="status" aria-live="polite">{folderWarning||recordingHint?<TriangleAlert size={17} aria-hidden="true"/>:<Info size={17} aria-hidden="true"/>}<p>{controlHint}</p><button type="button" className="studio-hint-close" aria-label="Dismiss message" title="Dismiss" onClick={()=>setDismissedHint(controlHint)}><X size={14} aria-hidden="true"/></button></div>}
            </div>
            {error&&<p role="alert" className="admin-request-feedback">{error}</p>}
            </div><div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs">
              <div className="admin-live-tab-panel admin-live-sessions-page-panel" role="tabpanel">
              <div className="admin-live-single has-requests-aside">
              <div className={`admin-live-preview${collab.format==='portrait'?' is-portrait-only':''}`}>
                <div className={`admin-live-monitor studio-preview-pair${collab.format==='landscape'?' is-landscape-only':collab.format==='portrait'?' is-portrait-only':''}${collab.count===2?` is-collab is-collab-${collab.side}`:''}`} ref={liveFrame} aria-label="Landscape and portrait previews">
                <MicStrip on={webrtc.voiceOn} level={webrtc.voiceLevel} stream={webrtc.voiceStream} disabled={!webrtc.isPreviewing&&!webrtc.isBroadcasting} onToggle={()=>void webrtc.setVoice(!webrtc.voiceOn)} onLevel={webrtc.updateVoiceLevel} master={webrtc.masterLevel} onMaster={webrtc.updateMasterLevel} auto={autoLevel} ducking={ducking} onAuto={on=>{setAutoLevel(on);try{localStorage.setItem('echo-auto-level',on?'1':'0');}catch{/* Session choice still works. */}}}/>
                <section className="studio-preview-window" aria-label="Landscape preview" hidden={collab.format==='portrait'}>
                 <header className="studio-preview-window-head"><h4>{collab.count===2?'Collab':'Landscape'}<em className="studio-source-tag">{collab.count===2?collab.landscapeTag:'Landscape Source'}</em></h4><span><bdi>16:9</bdi></span></header>
                 <div className="admin-live-preview-frame-shell studio-preview-landscape" ref={primaryFrame}>

                  <div className="studio-output-source-target" ref={setLandscapeIndicators}/>
                  {webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting ? <><video ref={webrtc.videoRef} className="admin-live-preview-frame" autoPlay playsInline muted/>{collab.landscapePreview&&<CollabLandscapeOverlay stream={collab.landscapePreview} pan={collab.panA} onPan={collab.side.startsWith('mini')||webrtc.paused?undefined:collab.setPanA} getAspect={()=>{const video=getPrimaryVideo();return video?.videoWidth&&video?.videoHeight?video.videoWidth/video.videoHeight:16/9;}}/>}{webrtc.paused&&<PauseBanner stream={webrtc.pausedPreview} onResume={webrtc.resumeLive}/>}</> : isLiveOnAir ? <WebrtcViewer key={session+':'+retry} token={token} sessionIdentity={session} muted showAudioControls audioControlsTarget={previewAudioControlsTarget}/> : liveStream?.posterImage ? <img className="admin-live-preview-image" src={liveStream.posterImage} alt="" aria-hidden="true"/> : <div className="admin-live-preview-empty"><VideoOff size={18}/><span>{reserved?'Connecting source…':'No live source'}</span></div>}
                 </div>
                </section>
                <StudioPreviewMirror standalone={collab.count===2} logo={collab.count!==2} hidden={collab.format==='landscape'||(collab.count===2&&webrtc.paused)} overrideStream={collab.portraitPreview} source={collab.count===2?collab.portraitTag:collab.format==='portrait'?'Source':'Crop of landscape'} primaryRef={primaryFrame} active={previewActive} posterImage={liveStream?.posterImage} waiting={reserved} indicatorRef={setPortraitIndicators} pan={collab.format==='portrait'?.5:webrtc.portraitPan} onPan={collab.format==='portrait'?undefined:webrtc.setPortraitPan}/>
                </div>
                <AdminLiveAudience token={token} session={isLiveOnAir?session:null} enabled={enabled} onReview={onReviewLiveRequest}/>
<section ref={settingsArea} className="studio-control-dock" aria-labelledby="studio-controller-title">
 <header className="studio-controller-heading"><h3 id="studio-controller-title">Studio controls</h3><div className="studio-controller-tools"><div className="studio-control-status" data-state={studioState} role="status"><strong>{{live:'On air',opening:'Opening preview',connecting:'Connecting',preview:'Private preview',offline:'Offline'}[studioState]}</strong></div>{studioState==='live'&&<LiveElapsedTimer key={session||'local-live'} session={session}/>}{statusBadges.map(badge=><span key={badge.key} className="studio-badge" data-tone={badge.tone} title={badge.title}>{badge.text}</span>)}<button type="button" className="admin-live-fullscreen studio-heading-fullscreen" onClick={toggleLiveFullscreen} aria-label={liveFullscreen ? 'Exit full screen' : 'Full screen'} title={liveFullscreen ? 'Exit full screen' : 'Full screen'}>{liveFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button></div></header>
 <div className="studio-control-bar">
  <div className="studio-control-actions" role="group" aria-label="Preview and broadcast actions">
                    {(()=>{const otherLive=legacyObs||((isLiveOnAir||reserved)&&!webrtc.isBroadcasting);return <>
                      <button type="button" className="admin-live-fullscreen studio-preview-toggle" disabled={webrtc.isConnecting||webrtc.previewBusy||webrtc.isBroadcasting||otherLive} aria-label={webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview'} title={webrtc.isBroadcasting?'Preview stays open while you are live':otherLive?'Preview is controlled by the current source':webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview · not on air'} onClick={webrtc.isPreviewing?webrtc.closePreview:webrtc.preparePreview}>{webrtc.previewBusy?<LoaderCircle size={18} className="studio-opening-spinner" aria-hidden="true"/>:webrtc.isPreviewing||webrtc.isBroadcasting?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}<span>{webrtc.previewBusy?'Opening…':webrtc.isPreviewing?'Close preview':'Open preview'}</span></button>
                      {webrtc.isBroadcasting
                        ?<>{webrtc.paused?<button type="button" className="admin-live-fullscreen studio-go-live" disabled={webrtc.previewBusy} aria-label="Resume live" title="Resume the live with the current input" onClick={webrtc.resumeLive}><Play size={16} aria-hidden="true"/><span>Resume live</span></button>:<button type="button" className="admin-live-fullscreen studio-go-live" disabled={webrtc.isConnecting||!pausePhoto} aria-label="Pause live" title={pausePhoto?'Pause: viewers see your photo while you change the input':'Choose a pause photo in “What’s going live?” first'} onClick={pauseClick}><Pause size={16} aria-hidden="true"/><span>Pause live</span></button>}<button type="button" className="admin-live-fullscreen studio-go-live is-live" disabled={webrtc.isConnecting} aria-label="End live" title="End live" onClick={webrtc.endLive}><Square size={16} fill="currentColor" aria-hidden="true"/><span>End live</span></button></>
                        :isLiveOnAir&&liveStream?.broadcastSource==='browser'
                          ?<><button type="button" className="admin-live-fullscreen studio-go-live" disabled={resumeBusy||webrtc.previewBusy||webrtc.isConnecting} aria-label="Reconnect this browser to the live stream" title="Reacquire the selected source and continue the active live" onClick={()=>reconnectLive()}><RefreshCw size={17} className={resumeBusy?'studio-opening-spinner':undefined} aria-hidden="true"/><span>{resumeBusy?'Reconnecting…':'Reconnect live'}</span></button><button type="button" className="admin-live-fullscreen studio-go-live is-live" disabled={resumeBusy||webrtc.isConnecting} aria-label="End live" title="End this live without reconnecting" onClick={stopLive}><Square size={16} fill="currentColor" aria-hidden="true"/><span>End live</span></button></>
                          :<button type="button" className="admin-live-fullscreen studio-go-live" disabled={!webrtc.isPreviewing||webrtc.isConnecting||webrtc.previewBusy||otherLive} aria-label="Go live on Echo" title="Go live on Echo" onClick={()=>{if(beforeGoLive())void webrtc.goLive(broadcastTitle);}}><Radio size={18} aria-hidden="true"/><span>Go live</span></button>}
                    </>;})()}
  </div>
 </div>
 <div className="studio-control-workspace">
 <div className="studio-settings-tabs" role="tablist" aria-orientation="horizontal" aria-label="Stream settings sections" onKeyDown={event=>{
   const tabs=SETTINGS_TABS.map(([id])=>id),index=tabs.indexOf(settingsTab);
   const next=(event.key==='ArrowRight'||event.key==='ArrowDown')?(index+1)%tabs.length:(event.key==='ArrowLeft'||event.key==='ArrowUp')?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
   if(next===null)return;event.preventDefault();setSettingsTab(tabs[next]);event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
 }}>
  {SETTINGS_TABS.map(([id,label,Icon])=><button key={id} type="button" role="tab" title={label} id={`studio-settings-tab-${id}`} aria-controls={`studio-settings-panel-${id}`} aria-selected={settingsTab===id} tabIndex={settingsTab===id?0:-1} onClick={()=>setSettingsTab(id)}><Icon size={16} aria-hidden="true"/><span>{label}</span></button>)}
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-studio" aria-labelledby="studio-settings-tab-studio" hidden={settingsTab!=='studio'} tabIndex={0}>
 <section className="studio-console" aria-label="Session and source">
 <header className="studio-source-heading"><h3>What’s going live?</h3>{legacyObs&&<span className="studio-status">Legacy OBS connection</span>}</header>
 <div className="studio-session-row">
 <label className="studio-title"><span className="studio-field-caption">SESSION TITLE <b className="studio-required" aria-hidden="true">*</b></span><input required aria-required="true" aria-invalid={detailsTried&&!title.trim()} className={detailsTried&&!title.trim()?'is-invalid':''} value={title} placeholder="Name your live set" maxLength={180} disabled={webrtc.isConnecting} onChange={event=>setTitle(event.target.value)}/></label>
 <fieldset className="admin-live-settings studio-goal-fieldset" disabled={loading||Boolean(error)}>
  <LiveGoalPicker token={token} goal={goalChoice} onChange={apply} onPick={id=>{setGoalChoice(id);setDetailsTried(false);}} invalid={detailsTried&&!goalChoice}/>
 </fieldset>
 </div>
 <div className="studio-block pause-settings"><h4 className="studio-label">Pause photo <b className="studio-required" aria-hidden="true">*</b></h4>
  <div className="pause-photo-row">{pausePhoto?<img src={pausePhoto.url} alt="Pause photo"/>:<span className="pause-photo-empty">No photo</span>}
   <div className="pause-photo-copy"><strong>{pausePhoto?'Photo set':'Required to pause the live'}</strong><small>{pausePhoto?'Viewers see it while the live is paused.':'Pause live stays off until you choose one.'}</small></div>
   <button type="button" className="admin-live-control" onClick={()=>setPickingPhoto(true)}>{pausePhoto?'Change':'Choose from gallery'}</button></div>
  <p className="studio-help">Pausing silences the live's sound as well as the picture. Resume brings both back.</p>
  {pauseError&&<p className="studio-help is-warning" role="status">{pauseError}</p>}
  {pickingPhoto&&<PausePhotoPicker token={token} currentId={pausePhoto?.id} onPick={pickPausePhoto} onClose={()=>setPickingPhoto(false)}/>}
 </div>

 <SourceCountChoice format={collab.format} onFormat={collab.setFormat} count={collab.count} locked={webrtc.isBroadcasting||(isLiveOnAir&&!webrtc.isBroadcasting)} onChange={count=>{collab.setCount(count);if(count===1)secondSource.stop();/* A new shape of output: reopen the preview so the source is captured for it (two sources are always 16:9 landscape). */if(webrtc.isPreviewing&&!webrtc.isBroadcasting)webrtc.closePreview();}}/>
 {collab.count!==2&&<div className="studio-block studio-input-block"><h4 className="studio-label">Video input</h4><LiveSourcePicker value={webrtc.sourceKind} disabled={webrtc.paused||webrtc.inputLost?webrtc.previewBusy:(inputLocked||reserved||isLiveOnAir||loading||Boolean(error))} onSelect={webrtc.paused||webrtc.inputLost?(kind,file)=>{void webrtc.setPausedInput({kind,file});}:webrtc.selectSource}/></div>}
 {collab.count!==2&&<div className="studio-block"><h4 className="studio-label">Audio input</h4><AudioInputPicker value={webrtc.audioMode} videoKind={webrtc.sourceKind} disabled={inputLocked||reserved||isLiveOnAir||loading||Boolean(error)} onSelect={webrtc.selectAudio}/></div>}
 {collab.count===2&&<div className="source-stack"><SourceCard letter="L" title="Landscape Source" state={{camera:'Camera',display:'Tab / window',image:'Image',video:'Video'}[webrtc.sourceKind]}><h4 className="studio-label">Video input</h4><LiveSourcePicker value={webrtc.sourceKind} disabled={webrtc.paused||webrtc.inputLost?webrtc.previewBusy:(inputLocked||reserved||isLiveOnAir||loading||Boolean(error))} onSelect={webrtc.paused||webrtc.inputLost?(kind,file)=>{void webrtc.setPausedInput({kind,file});}:webrtc.selectSource}/><h4 className="studio-label">Audio input</h4><AudioInputPicker value={webrtc.audioMode} videoKind={webrtc.sourceKind} disabled={inputLocked||reserved||isLiveOnAir||loading||Boolean(error)} onSelect={webrtc.selectAudio}/></SourceCard><CollabPanel onAudioChange={()=>{if(webrtc.isPreviewing&&!webrtc.isBroadcasting)setTimeout(()=>void webrtc.preparePreview({kind:webrtc.sourceKind,file:webrtc.sourceFile}),60);}} collab={collab} second={secondSource} cameras={webrtc.videoInputs} locked={(webrtc.isBroadcasting&&!webrtc.paused)||(isLiveOnAir&&!webrtc.isBroadcasting&&!webrtc.paused)}/></div>}

 <div className="studio-block voice-field"><h4 className="studio-label">Voice microphone</h4>
  <label className="studio-inputs source-field"><span className="studio-sr-only">Voice microphone device</span><AdminSelect aria-label="Voice microphone device" value={webrtc.voiceDeviceId} onChange={event=>void webrtc.selectVoiceDevice(event.target.value)}><option value="">Default microphone</option>{webrtc.audioInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Microphone ${index+1}`}</option>)}</AdminSelect></label>
  <p className="studio-help">An extra microphone on its own channel, apart from the audio input above. Turn it on with the mic button beside the preview; names appear once a preview has been opened.</p>
 </div>
 <fieldset className="admin-live-settings studio-source-settings" disabled={loading||Boolean(error)}>
  {['image','video'].includes(webrtc.sourceKind)&&<label>Source file<input type="file" accept={webrtc.sourceKind==='image'?'image/*':'video/*'} disabled={captureLocked||reserved||isLiveOnAir} onChange={event=>{const file=event.target.files?.[0];if(file)webrtc.selectSource(webrtc.sourceKind,file);}}/>{webrtc.sourceFile&&<small>{webrtc.sourceFile.name}</small>}</label>}
  {webrtc.sourceKind==='display'&&<p>Open private preview to choose the tab or window. Enable “Share tab audio” in the browser picker when you want its sound.</p>}
  {webrtc.sourceKind==='video'&&(webrtc.isPreviewing||webrtc.isBroadcasting)&&<div role="group" aria-label="Source video playback"><button type="button" onClick={webrtc.playSource}>Play video</button><button type="button" onClick={webrtc.pauseSource}>Pause video</button><button type="button" onClick={webrtc.restartSource}>Restart video</button></div>}
  {legacyObs&&<ObsBroadcast token={token} item={liveStream} onUpdate={item=>{apply(item);setTitle('');}}/>}
  <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot"/>
 </fieldset>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-appearance" aria-labelledby="studio-settings-tab-appearance" hidden={settingsTab!=='appearance'} tabIndex={0}>
 <CameraAppearanceControls value={webrtc.cameraAppearance} onChange={webrtc.updateCameraAppearance} disabled={webrtc.mirrorBusy||webrtc.previewBusy||webrtc.isConnecting||webrtc.cameraOff||(isLiveOnAir&&!webrtc.isBroadcasting)}/>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-destinations" aria-labelledby="studio-settings-tab-destinations" hidden={settingsTab!=='destinations'} tabIndex={0}>
<LiveDestinations format={collab.format} compact onFeedback={setDestinationFeedback} onSetup={openDestination} landscapeTarget={landscapeIndicators} portraitTarget={portraitIndicators} token={token} enabled={enabled} roomName={liveStream?.webrtcRoomName} isLive={isLiveOnAir} mode={liveStream?.broadcastMode}/>
 </div>
 </div>
</section>
              </div>
<div className="studio-audience-requests-slot studio-recording-slot">
 <section className="studio-recording-card rec-card" aria-label="Recording">
 <header className="rec-head"><div className="rec-title"><h3 id="studio-save-live-title">Record this live</h3>{saveLive&&(isLiveOnAir||webrtc.isBroadcasting)&&<em className="studio-rec-pill"><i aria-hidden="true"/>REC</em>}</div><input type="checkbox" role="switch" aria-labelledby="studio-save-live-title" checked={saveLive} disabled={captureLocked||reserved||isLiveOnAir||localBusy||loading||Boolean(error)} onChange={event=>{const value=event.target.checked;setSaveLive(value);try{localStorage.setItem('echo-save-live-recording',String(value));}catch{/* Session preference still works. */}}}/></header>
 <div className="rec-scroll">
 {saveLive?<>
  <RecordingStats local={pipelineLocal} paused={webrtc.paused||webrtc.inputLost||(isLiveOnAir&&!webrtc.isBroadcasting)} noInput={(webrtc.inputLost||(isLiveOnAir&&!webrtc.isBroadcasting))&&!webrtc.paused} live={isLiveOnAir||webrtc.isBroadcasting} recorded={recordedBytes} saved={savedBytes} message={recordingMessage} serverStatus={serverRec?.status||rec?.status} serverError={serverRec?.error||''} cloudParts={serverRec?.parts||0}/>
  <section className="rec-block"><h4 className="rec-label">Destination</h4>
   <button className={`studio-folder-button${folderRequired&&folderHint?' is-warning':''}`} type="button" disabled={webrtc.isConnecting||webrtc.previewBusy||webrtc.isBroadcasting||localBusy} onClick={()=>void chooseFolder(Boolean(folderName))}><span className="studio-folder-icon" aria-hidden="true"><FolderOpen size={18}/></span><span><strong>{localBusy?'Working…':folderName||(rememberedName?'Use “'+rememberedName+'” again':'Choose a folder')}</strong><small>{folderRequired?(rememberedName&&!folderName?'One click to allow it again':'Required before going live'):folderName?'Click to pick another folder':'Computer or connected USB drive'}</small></span></button>
   <label className="rec-toggle-row"><span><strong>Ask for the folder every live</strong><small>Turn off to keep using the same folder.</small></span><input type="checkbox" role="switch" aria-label="Ask for the folder every live" checked={askRecordingFolder} disabled={captureLocked||reserved||isLiveOnAir||localBusy} onChange={event=>setAskRecordingFolder(event.target.checked)}/></label>
   <p className="rec-flow" aria-label="Recording route"><span>Your folder</span><i aria-hidden="true">→</i><span>OVH</span><i aria-hidden="true">→</i><span>Cloudinary</span></p>
  </section>
  <section className="rec-block"><h4 className="rec-label">Progress</h4><RecordingProgress local={pipelineLocal} paused={webrtc.paused||webrtc.inputLost||(isLiveOnAir&&!webrtc.isBroadcasting)} noInput={(webrtc.inputLost||(isLiveOnAir&&!webrtc.isBroadcasting))&&!webrtc.paused} folder={folderName} live={isLiveOnAir||webrtc.isBroadcasting} recorded={recordedBytes} saved={savedBytes} message={recordingMessage} serverStatus={serverRec?.status||rec?.status} serverError={serverRec?.error||''} cloudParts={serverRec?.parts||0}/></section>
 </>:<p className="rec-off">Recording is off. This live will not be saved.</p>}
 <section className="rec-block"><h4 className="rec-label">History</h4><RecordingHistory liveNow={isLiveOnAir||webrtc.isBroadcasting} currentId={pipelineLocal?.id||''} token={token} active refreshKey={isLiveOnAir||webrtc.isBroadcasting} localFiles={localFiles} blocked={!folderName||localBusy||webrtc.isConnecting||webrtc.isBroadcasting} onRebuild={restoreLocalFile} onMp4={saveLocalMp4} onPurge={purgeLocalFile}/></section>
 </div>
 </section>
</div>
            </div>
              </div>
            </div>

           
          </section>

 );
}
