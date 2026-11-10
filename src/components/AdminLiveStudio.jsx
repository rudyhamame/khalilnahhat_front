import {useCallback,useEffect,useRef,useState} from 'react';
import {Radio,VideoOff,Minimize2,Maximize2,RefreshCw,Camera,Mic,Layers,Share2,FlipHorizontal2,Sun,Eye,EyeOff,LoaderCircle,Square,FolderOpen,ChevronDown,TriangleAlert,Info,X} from 'lucide-react';
import {adminToast} from './adminToast';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {useWebrtcBroadcast} from '../hooks/useWebrtcBroadcast';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {startDirectRecording,recoverRecordings} from '../lib/directRecording';
import RecordingProgress,{RecordingStats} from './RecordingProgress';
import RecordingHistory from './RecordingHistory';
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
import './adminLiveStudio.css';

const SETTINGS_TABS=[['studio','Source',Layers],['camera','Camera',Camera],['audio','Audio',Mic],['appearance','Lighting',Sun],['controls','Live controls',Radio],['destinations','Destinations',Share2]];


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
 // The folder is the truth for the progress panel: parts on disk, parts OVH confirmed, and whether OVH accepted the finish.
 const [pipelineLocal,setPipelineLocal]=useState(null),[serverRec,setServerRec]=useState(null);
 // OVH's view of the same recording (status and how many parts Cloudinary already holds), refreshed while it is still moving.
 useEffect(()=>{const id=pipelineLocal?.id;if(!id||!token||serverRec?.id===id&&['ready','partial'].includes(serverRec.status))return undefined;let stop=false,timer;
  const poll=async()=>{try{const result=await apiRequest('/admin/live-recordings',{token});const found=(result.items||[]).find(item=>item.id===id);if(!stop)setServerRec(found?{id,status:found.status,parts:found.partCount||0}:null);}catch{/* next poll */}if(!stop)timer=setTimeout(poll,4000);};
  void poll();return()=>{stop=true;clearTimeout(timer);};},[pipelineLocal?.id,token]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{const timer=setInterval(async()=>{const store=diskStore.current;if(!store)return;
  const latest=(await store.sessions()).filter(item=>item.filename).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
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
 const startRecording=({id,tracks})=>{if(!diskStore.current)throw new Error('Choose a recording folder before going live.');setRecordedBytes(0);setSavedBytes(0);setRecordingMessage('');return startDirectRecording({id,tracks,store:diskStore.current,status:recordingStatus,upload:async(...args)=>{const result=await uploadRecordingChunk(...args);setSavedBytes(value=>value+(args[2]?.byteLength||0));return result;},finish:finishRecording,onStatus:setRecordingMessage,onProgress:setRecordedBytes});};
 const folderRequired=saveLive&&(!diskStore.current||askRecordingFolder&&!folderChosenForNextLive.current);
 const [folderHint,setFolderHint]=useState(0);
 useEffect(()=>{if(!folderRequired)setFolderHint(0);},[folderRequired]);
 useEffect(()=>{if(!folderHint)return;const timer=setTimeout(()=>setFolderHint(0),5000);return()=>clearTimeout(timer);},[folderHint]);
 const recordingReady=!localBusy&&!folderRequired;
 const beforeGoLive=()=>{
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
 const webrtc=useWebrtcBroadcast({onGoLive:start,onEndLive:end,onReady:ready,onStartRecording:startRecording,requireRecording:saveServer,recordingEnabled:saveServer,expectedRoom:liveStream?.webrtcRoomName});
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
 const previewReply=webrtc.statusMessage.startsWith('Private preview ready.')||webrtc.statusMessage==='Preview closed.';
 const folderWarning=folderRequired&&Boolean(folderHint);
 const recordingHint=recordingMessage&&!/up to date|uploaded/i.test(recordingMessage)?recordingMessage:'';
 const controlHint=folderWarning?'Choose a recording folder in Live Source before going live.':recordingHint||localMessage||destinationFeedback||(!previewReply&&webrtc.statusMessage)||'';
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
 const autoResumed=useRef(false);
 useEffect(()=>{try{if(webrtc.isBroadcasting)sessionStorage.setItem('echo-live-tab',liveStream?.webrtcRoomName||'1');else if(!loading&&!isLiveOnAir)sessionStorage.removeItem('echo-live-tab');}catch{/* storage unavailable */}},[webrtc.isBroadcasting,loading,isLiveOnAir,liveStream?.webrtcRoomName]);
 useEffect(()=>{if(autoResumed.current||loading||!isLiveOnAir||liveStream?.broadcastSource!=='browser'||webrtc.isBroadcasting||webrtc.sourceKind!=='camera'||(saveLive&&!folderName))return;let mine=false;try{mine=Boolean(sessionStorage.getItem('echo-live-tab'));}catch{/* ignore */}if(!mine)return;autoResumed.current=true;void reconnectLive();},[loading,isLiveOnAir,liveStream?.broadcastSource,webrtc.isBroadcasting,webrtc.sourceKind,folderName]);// eslint-disable-line react-hooks/exhaustive-deps
 liveNow.current=isLiveOnAir||webrtc.isBroadcasting;
 const studioState=isLiveOnAir||webrtc.isBroadcasting?'live':webrtc.previewBusy?'opening':webrtc.isConnecting||reserved?'connecting':webrtc.isPreviewing?'preview':'offline';
 const previewActive=webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting||isLiveOnAir;
 const captureLocked=webrtc.isConnecting||webrtc.previewBusy||webrtc.isPreviewing||webrtc.isBroadcasting;
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
              <div className="admin-live-preview">
                <div className="admin-live-monitor studio-preview-pair" ref={liveFrame} aria-label="Landscape and portrait previews">
                <section className="studio-preview-window" aria-label="Landscape preview">
                 <header className="studio-preview-window-head"><h4>Landscape</h4><span><bdi>16:9</bdi></span></header>
                 <div className="admin-live-preview-frame-shell studio-preview-landscape" ref={primaryFrame}>

                  <div className="studio-output-source-target" ref={setLandscapeIndicators}/>
                  {webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting ? <video ref={webrtc.videoRef} className="admin-live-preview-frame" autoPlay playsInline muted/> : isLiveOnAir ? <WebrtcViewer key={session+':'+retry} token={token} sessionIdentity={session} muted showAudioControls audioControlsTarget={previewAudioControlsTarget}/> : liveStream?.posterImage ? <img className="admin-live-preview-image" src={liveStream.posterImage} alt="" aria-hidden="true"/> : <div className="admin-live-preview-empty"><VideoOff size={18}/><span>{reserved?'Connecting source…':'No live source'}</span></div>}
                 </div>
                </section>
                <StudioPreviewMirror primaryRef={primaryFrame} active={previewActive} posterImage={liveStream?.posterImage} waiting={reserved} indicatorRef={setPortraitIndicators} pan={webrtc.portraitPan} onPan={webrtc.setPortraitPan}/>
                </div>
                <AdminLiveAudience token={token} session={isLiveOnAir?session:null} enabled={enabled} onReview={onReviewLiveRequest}/>
<section ref={settingsArea} className="studio-control-dock" aria-labelledby="studio-controller-title">
 <header className="studio-controller-heading"><h3 id="studio-controller-title">Studio controls</h3><div className="studio-controller-tools"><div className="studio-control-status" data-state={studioState} role="status"><strong>{{live:'On air',opening:'Opening preview',connecting:'Connecting',preview:'Private preview',offline:'Offline'}[studioState]}</strong></div>{studioState==='live'&&<LiveElapsedTimer key={session||'local-live'} session={session}/>}{statusBadges.map(badge=><span key={badge.key} className="studio-badge" data-tone={badge.tone} title={badge.title}>{badge.text}</span>)}<button type="button" className="admin-live-fullscreen studio-heading-fullscreen" onClick={toggleLiveFullscreen} aria-label={liveFullscreen ? 'Exit full screen' : 'Full screen'} title={liveFullscreen ? 'Exit full screen' : 'Full screen'}>{liveFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button></div></header>
 <div className="studio-control-bar">
  <div className="studio-control-actions" role="group" aria-label="Preview and broadcast actions">
                    {(()=>{const otherLive=legacyObs||((isLiveOnAir||reserved)&&!webrtc.isBroadcasting);return <>
                      <button type="button" className="admin-live-fullscreen studio-preview-toggle" disabled={webrtc.isConnecting||webrtc.previewBusy||webrtc.isBroadcasting||otherLive} aria-label={webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview'} title={webrtc.isBroadcasting?'Preview stays open while you are live':otherLive?'Preview is controlled by the current source':webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview · not on air'} onClick={webrtc.isPreviewing?webrtc.closePreview:webrtc.preparePreview}>{webrtc.previewBusy?<LoaderCircle size={18} className="studio-opening-spinner" aria-hidden="true"/>:webrtc.isPreviewing||webrtc.isBroadcasting?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}<span>{webrtc.previewBusy?'Opening…':webrtc.isPreviewing?'Close preview':'Open preview'}</span></button>
                      {webrtc.isBroadcasting
                        ?<button type="button" className="admin-live-fullscreen studio-go-live is-live" disabled={webrtc.isConnecting} aria-label="End live" title="End live" onClick={webrtc.endLive}><Square size={16} fill="currentColor" aria-hidden="true"/><span>End live</span></button>
                        :isLiveOnAir&&liveStream?.broadcastSource==='browser'
                          ?<><button type="button" className="admin-live-fullscreen studio-go-live" disabled={resumeBusy||webrtc.previewBusy||webrtc.isConnecting} aria-label="Reconnect this browser to the live stream" title="Reacquire the selected source and continue the active live" onClick={reconnectLive}><RefreshCw size={17} className={resumeBusy?'studio-opening-spinner':undefined} aria-hidden="true"/><span>{resumeBusy?'Reconnecting…':'Reconnect live'}</span></button><button type="button" className="admin-live-fullscreen studio-go-live is-live" disabled={resumeBusy||webrtc.isConnecting} aria-label="End live" title="End this live without reconnecting" onClick={stopLive}><Square size={16} fill="currentColor" aria-hidden="true"/><span>End live</span></button></>
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
 <LiveSourcePicker value={webrtc.sourceKind} disabled={captureLocked||reserved||isLiveOnAir||loading||Boolean(error)} onSelect={webrtc.selectSource}/>
 <label className="studio-title"><span className="studio-field-caption">SESSION TITLE <b className="studio-required" aria-hidden="true">*</b></span><input required aria-required="true" aria-invalid={detailsTried&&!title.trim()} className={detailsTried&&!title.trim()?'is-invalid':''} value={title} placeholder="Name your live set" maxLength={180} disabled={webrtc.isConnecting} onChange={event=>setTitle(event.target.value)}/></label>
 <fieldset className="admin-live-settings studio-source-settings" disabled={loading||Boolean(error)}>
  <LiveGoalPicker token={token} goal={goalChoice} onChange={apply} onPick={id=>{setGoalChoice(id);setDetailsTried(false);}} invalid={detailsTried&&!goalChoice}/>
  {['image','video'].includes(webrtc.sourceKind)&&<label>Source file<input type="file" accept={webrtc.sourceKind==='image'?'image/*':'video/*'} disabled={captureLocked||reserved||isLiveOnAir} onChange={event=>{const file=event.target.files?.[0];if(file)webrtc.selectSource(webrtc.sourceKind,file);}}/>{webrtc.sourceFile&&<small>{webrtc.sourceFile.name}</small>}</label>}
  {webrtc.sourceKind==='display'&&<p>Open private preview to choose the tab or window. Enable “Share tab audio” in the browser picker when you want its sound.</p>}
  {webrtc.sourceKind==='video'&&(webrtc.isPreviewing||webrtc.isBroadcasting)&&<div role="group" aria-label="Source video playback"><button type="button" onClick={webrtc.playSource}>Play video</button><button type="button" onClick={webrtc.pauseSource}>Pause video</button><button type="button" onClick={webrtc.restartSource}>Restart video</button></div>}
  {legacyObs&&<ObsBroadcast token={token} item={liveStream} onUpdate={item=>{apply(item);setTitle('');}}/>}
  <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot"/>
 </fieldset>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-camera" aria-labelledby="studio-settings-tab-camera" hidden={settingsTab!=='camera'} tabIndex={0}>
 <section className="studio-console" aria-label="Camera settings">
 <header><h3>Camera & capture</h3></header>
 <div className="studio-inputs">
  <label>Camera · GoPro USB webcam<AdminSelect aria-label="Studio camera" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.selectedVideoDeviceId} onChange={event=>webrtc.setSelectedVideoDeviceId(event.target.value)}><option value="">Default camera</option>{webrtc.videoInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Camera ${index+1}`}</option>)}</AdminSelect></label>
  <label>Capture quality<AdminSelect aria-label="Studio capture quality" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.quality} onChange={event=>webrtc.setQuality(event.target.value)}><option value="1080">1080p · Full HD · 30 fps</option><option value="720">720p · 30 fps</option><option value="360">360p · low bandwidth</option></AdminSelect></label>
 </div>
 <div className="studio-control-actions"><button type="button" className="admin-live-fullscreen studio-camera-mirror" aria-label="Mirror camera left/right" aria-pressed={webrtc.cameraMirrored} title={webrtc.cameraMirrored?'Restore camera orientation · affects live output':'Mirror camera left/right · affects live output'} disabled={!(webrtc.isPreviewing||webrtc.isBroadcasting)||webrtc.cameraOff||webrtc.mirrorBusy||webrtc.previewBusy||webrtc.isConnecting} onClick={webrtc.toggleCameraMirror}><FlipHorizontal2 size={17} aria-hidden="true"/><span>Mirror camera</span></button></div>
 <p className="studio-help">Close the private preview to change the camera or quality. Higher quality uses more bandwidth.{webrtc.videoInputs.some(device=>!device.label)&&' Device names appear after you allow camera access.'}</p>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-audio" aria-labelledby="studio-settings-tab-audio" hidden={settingsTab!=='audio'} tabIndex={0}>
 <section className="studio-console" aria-label="Audio settings">
 <header><h3>Audio</h3><p>Use headphones to avoid feedback. Close the preview to change the input.</p></header>
 <div className="studio-block"><h4 className="studio-label">Input</h4><div className="studio-inputs"><label><span className="studio-sr-only">Audio input</span><AdminSelect aria-label="Studio audio input" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.selectedAudioDeviceId} onChange={event=>webrtc.setSelectedAudioDeviceId(event.target.value)}><option value="">Default input</option>{webrtc.audioInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Audio input ${index+1}`}</option>)}</AdminSelect></label></div></div>
 <div className="studio-block"><h4 className="studio-label">Levels</h4>
 <div className="studio-audio-meters">
                  <VoiceTestMeter track={webrtc.micMediaStreamTrack} deviceId={webrtc.selectedAudioDeviceId} muted={webrtc.micMuted} canEnable={webrtc.isPreviewing&&!webrtc.previewBusy&&webrtc.sourceKind!=='camera'} onToggle={webrtc.toggleMicrophone} inputLevel={webrtc.microphoneLevel} onLevelChange={webrtc.updateMicrophoneLevel}/>
                  <VoiceTestMeter source track={webrtc.sourceAudioTrack} muted={webrtc.sourceAudioMuted} onToggle={webrtc.toggleSourceAudio} inputLevel={webrtc.sourceLevel} onLevelChange={webrtc.updateSourceLevel}/>
 </div>
 </div>
 <div className="studio-block"><h4 className="studio-label">Effects</h4>
  {(()=>{const micLocked=webrtc.processingBusy||webrtc.previewBusy||webrtc.isConnecting||(isLiveOnAir&&!webrtc.isBroadcasting),srcLocked=webrtc.sourceProcessingBusy||webrtc.previewBusy||webrtc.isConnecting||(isLiveOnAir&&!webrtc.isBroadcasting),srcAny=Object.values(webrtc.sourceProcessingSupported).some(Boolean);
  const notes=[webrtc.processingMessage,webrtc.sourceProcessingMessage,...LIVE_AUDIO_CONTROLS.filter(control=>webrtc.processing[control.key]&&webrtc.processingApplied?.[control.key]===false).map(control=>`Your browser did not apply ${control.label.toLowerCase()} to the microphone.`),...LIVE_AUDIO_CONTROLS.filter(control=>webrtc.sourceProcessing[control.key]&&webrtc.sourceProcessingApplied?.[control.key]===false).map(control=>`Your browser did not apply ${control.label.toLowerCase()} to the source.`)].filter(Boolean);
  return <>
  <div className="studio-fx" role="group" aria-label="Audio effects">
   <div className="studio-fx-head" aria-hidden="true"><span/><b>Mic</b><b>Source</b></div>
   {LIVE_AUDIO_CONTROLS.map(control=><div className="studio-fx-row" key={control.key}><span><strong>{control.label}</strong><small>{control.help}</small></span>
    <input type="checkbox" role="switch" aria-label={`${control.label} for the microphone`} checked={webrtc.processing[control.key]} disabled={micLocked} onChange={event=>webrtc.updateAudioProcessing({[control.key]:event.target.checked})}/>
    <input type="checkbox" role="switch" aria-label={`${control.label} for the source`} title={webrtc.sourceProcessingSupported[control.key]?undefined:'This source does not support this effect'} checked={webrtc.sourceProcessing[control.key]} disabled={srcLocked||!webrtc.sourceProcessingSupported[control.key]} onChange={event=>webrtc.updateSourceAudioProcessing({[control.key]:event.target.checked})}/></div>)}
   {webrtc.sourceKind==='camera'&&<div className="studio-fx-row"><span><strong>Pitch controls</strong><small>Shows the vocal pitch correction panel below.</small></span><input type="checkbox" role="switch" aria-label="Pitch controls" checked={webrtc.pitchCorrectionEnabled} disabled={captureLocked||reserved||isLiveOnAir} onChange={event=>webrtc.setPitchCorrectionEnabled(event.target.checked)}/><span/></div>}
  </div>
  {!srcAny&&<p className="studio-help">Source effects need a shared tab or window with audio.</p>}
  <div className="studio-fx-actions"><button type="button" className="admin-live-control" disabled={micLocked} onClick={()=>{webrtc.updateAudioProcessing(null);if(Object.values(webrtc.sourceProcessing).some(Boolean))webrtc.updateSourceAudioProcessing(null);}}>Reset effects</button></div>
  {notes.length>0&&<p className="studio-audio-applied" role="status">{notes.join(' · ')}</p>}
  </>;})()}
 </div>
 {webrtc.pitchCorrectionEnabled&&<VocalCorrectionControl inline/>}
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-appearance" aria-labelledby="studio-settings-tab-appearance" hidden={settingsTab!=='appearance'} tabIndex={0}>
 <CameraAppearanceControls value={webrtc.cameraAppearance} onChange={webrtc.updateCameraAppearance} disabled={webrtc.mirrorBusy||webrtc.previewBusy||webrtc.isConnecting||webrtc.cameraOff||(isLiveOnAir&&!webrtc.isBroadcasting)}/>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-controls" aria-labelledby="studio-settings-tab-controls" hidden={settingsTab!=='controls'} tabIndex={0}>
 <section className="studio-console" aria-label="Live stream controls">
 <header><h3>Live controls</h3></header>
 {legacyObs?<p>Disconnect the legacy OBS connection in the Echo Studio tab before starting another source.</p>:<>
 <div className="studio-transport" role="group" aria-label="Studio transport">
  {(webrtc.isPreviewing||webrtc.isBroadcasting)&&<><button type="button" className="admin-live-control" onClick={webrtc.toggleMicrophone} aria-pressed={webrtc.micMuted}>{webrtc.micMuted?'Unmute input':'Mute input'}</button><button type="button" className="admin-live-control" onClick={webrtc.toggleCamera} aria-pressed={webrtc.cameraOff}>{webrtc.cameraOff?'Enable camera':'Disable camera'}</button></>}
 </div>
 </>}
 <p className="admin-live-access-note">Echo audience must sign in. YouTube and Instagram audiences follow those platforms’ access settings. Keep this tab open while using its camera/audio.</p>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-destinations" aria-labelledby="studio-settings-tab-destinations" hidden={settingsTab!=='destinations'} tabIndex={0}>
<LiveDestinations compact onFeedback={setDestinationFeedback} onSetup={openDestination} landscapeTarget={landscapeIndicators} portraitTarget={portraitIndicators} token={token} enabled={enabled} roomName={liveStream?.webrtcRoomName} isLive={isLiveOnAir} mode={liveStream?.broadcastMode}/>
 </div>
 </div>
</section>
              </div>
<div className="studio-audience-requests-slot studio-recording-slot">
 <section className="studio-recording-card rec-card" aria-label="Recording">
 <header className="rec-head"><div className="rec-title"><h3 id="studio-save-live-title">Record this live</h3>{saveLive&&(isLiveOnAir||webrtc.isBroadcasting)&&<em className="studio-rec-pill"><i aria-hidden="true"/>REC</em>}</div><input type="checkbox" role="switch" aria-labelledby="studio-save-live-title" checked={saveLive} disabled={captureLocked||reserved||isLiveOnAir||localBusy||loading||Boolean(error)} onChange={event=>{const value=event.target.checked;setSaveLive(value);try{localStorage.setItem('echo-save-live-recording',String(value));}catch{/* Session preference still works. */}}}/></header>
 <div className="rec-scroll">
 {saveLive?<>
  <RecordingStats local={pipelineLocal} live={isLiveOnAir||webrtc.isBroadcasting} recorded={recordedBytes} saved={savedBytes} message={recordingMessage} serverStatus={serverRec?.status||rec?.status} cloudParts={serverRec?.parts||0}/>
  <section className="rec-block"><h4 className="rec-label">Destination</h4>
   <button className={`studio-folder-button${folderRequired&&folderHint?' is-warning':''}`} type="button" disabled={webrtc.isConnecting||webrtc.previewBusy||webrtc.isBroadcasting||localBusy} onClick={()=>void chooseFolder(Boolean(folderName))}><span className="studio-folder-icon" aria-hidden="true"><FolderOpen size={18}/></span><span><strong>{localBusy?'Working…':folderName||(rememberedName?'Use “'+rememberedName+'” again':'Choose a folder')}</strong><small>{folderRequired?(rememberedName&&!folderName?'One click to allow it again':'Required before going live'):folderName?'Click to pick another folder':'Computer or connected USB drive'}</small></span></button>
   <label className="rec-toggle-row"><span><strong>Ask for the folder every live</strong><small>Turn off to keep using the same folder.</small></span><input type="checkbox" role="switch" aria-label="Ask for the folder every live" checked={askRecordingFolder} disabled={captureLocked||reserved||isLiveOnAir||localBusy} onChange={event=>setAskRecordingFolder(event.target.checked)}/></label>
   <p className="rec-flow" aria-label="Recording route"><span>Your folder</span><i aria-hidden="true">→</i><span>OVH</span><i aria-hidden="true">→</i><span>Cloudinary</span></p>
  </section>
  <section className="rec-block"><h4 className="rec-label">Progress</h4><RecordingProgress local={pipelineLocal} folder={folderName} live={isLiveOnAir||webrtc.isBroadcasting} recorded={recordedBytes} saved={savedBytes} message={recordingMessage} serverStatus={serverRec?.status||rec?.status} cloudParts={serverRec?.parts||0}/></section>
 </>:<p className="rec-off">Recording is off. This live will not be saved.</p>}
 <section className="rec-block"><h4 className="rec-label">History</h4><RecordingHistory token={token} active refreshKey={isLiveOnAir||webrtc.isBroadcasting} localFiles={localFiles} blocked={!folderName||localBusy||webrtc.isConnecting||webrtc.isBroadcasting} onRebuild={restoreLocalFile} onMp4={saveLocalMp4} onPurge={purgeLocalFile}/></section>
 </div>
 </section>
</div>
            </div>
              </div>
            </div>

           
          </section>

 );
}
