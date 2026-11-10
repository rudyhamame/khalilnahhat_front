import {useCallback,useEffect,useRef,useState} from 'react';
import {Radio,VideoOff,Minimize2,Maximize2,RefreshCw,Camera,Mic,Layers,Share2,FlipHorizontal2,Sun,Eye,EyeOff,LoaderCircle,Square,HardDrive,Cloud,FolderOpen,ChevronDown,RotateCcw,TriangleAlert,Info} from 'lucide-react';
import {adminToast} from './adminToast';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {useWebrtcBroadcast} from '../hooks/useWebrtcBroadcast';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {startDirectRecording,recoverRecordings} from '../lib/directRecording';
import {startLocalRecording as captureLocalRecording,downloadLocalRecording} from '../lib/localLiveRecording';
import {chooseDiskRecordingFolder} from '../lib/diskRecordingStore';
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

const formatBytes=bytes=>bytes>=1024**3?`${(bytes/1024**3).toFixed(2)} GB`:`${Math.max(1,Math.round(bytes/1024**2))} MB`;

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
 const [title,setTitle]=useState('');
 const [saveLive,setSaveLive]=useState(()=>{try{return localStorage.getItem('echo-save-live-recording')!=='false';}catch{return true;}});
 const [recordingDestination,setRecordingDestination]=useState(()=>{try{const value=localStorage.getItem('echo-recording-destination');return ['server','local','both'].includes(value)?value:'server';}catch{return 'server';}});
 const diskStore=useRef(null),folderChosenForNextLive=useRef(false);
 const [askRecordingFolder,setAskRecordingFolder]=useState(true);
 const [localFiles,setLocalFiles]=useState([]),[localMessage,setLocalMessage]=useState(''),[localBusy,setLocalBusy]=useState(false),[folderName,setFolderName]=useState('');
 const saveServer=saveLive&&recordingDestination!=='local',saveLocal=saveLive&&recordingDestination!=='server';
 const chooseFolder=async()=>{
  setLocalBusy(true);setLocalMessage('');
  try{const store=await chooseDiskRecordingFolder();diskStore.current=store;setFolderName(store.directory.name);setLocalFiles(await store.sessions());setLocalMessage('Recording folder ready. Any previous saved parts are listed below.');folderChosenForNextLive.current=true;return store;}
  catch(error){if(error.name!=='AbortError')setLocalMessage(error.message);return null;}
  finally{setLocalBusy(false);}
 };
 const restoreLocalFile=async file=>{
  setLocalBusy(true);setLocalMessage('Rebuilding '+file.format+' video from saved parts…');
  try{await downloadLocalRecording(file,{store:diskStore.current});setLocalMessage(file.filename+' saved in '+diskStore.current.directory.name+'. Recovery parts were kept.');}
  catch(error){setLocalMessage('Could not rebuild the file: '+error.message+'. Saved parts remain in your folder.');}
  finally{setLocalBusy(false);}
 };
 const saveLocalMp4=async file=>{
  setLocalBusy(true);
  try{const filename=await saveLocalRecordingMp4(file,{store:diskStore.current,onStatus:setLocalMessage});setLocalMessage(filename+' saved in '+diskStore.current.directory.name+'. Original recovery parts were kept.');}
  catch(error){setLocalMessage('Could not save MP4: '+error.message);}
  finally{setLocalBusy(false);}
 };
 const startLocalRecording=async({tracks})=>{
  if(!diskStore.current)throw new Error('Choose a local recording folder before going live.');
  const store=diskStore.current;
  return captureLocalRecording({tracks,store,onStatus:setLocalMessage,onFiles:async files=>{
   setLocalFiles(current=>[...files,...current.filter(file=>!files.some(saved=>saved.id===file.id))]);setLocalBusy(true);
   try{const errors=[];for(const file of files){try{await downloadLocalRecording(file,{store});}catch(error){errors.push(file.format+': '+error.message);}}if(errors.length)throw new Error('Saved chunks need recovery: '+errors.join(' · '));}
   finally{setLocalBusy(false);}
  }});
 };
 const [settingsTab,setSettingsTab]=useState('studio');
 const [landscapeIndicators,setLandscapeIndicators]=useState(null),[portraitIndicators,setPortraitIndicators]=useState(null);
 const [destinationFeedback,setDestinationFeedback]=useState('');
 const [audienceRequestsTarget,setAudienceRequestsTarget]=useState(null);
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
 const broadcastTitle=title.trim()||liveStream?.title||'';
 const apply=item=>{if(!alive.current)return;update(item);onLiveStreamChange?.(item);};
 const start=async title=>{if(localBusy)throw new Error('Wait for local saving or recovery to finish.');if(folderRequired)throw new Error('Choose a recording folder before going live.');const result=await apiRequest('/live-stream/webrtc/go-live',{method:'POST',token,body:{title,recordingMode:'direct',saveRecording:saveServer}});apply(result.item);setTitle('');return result;};
 const end=async roomName=>{try{const result=await apiRequest('/live-stream/webrtc/end',{method:'POST',token,body:{roomName}});apply(result.item);}finally{if(askRecordingFolder)folderChosenForNextLive.current=false;}};
 const ready=async roomName=>{const result=await apiRequest('/live-stream/webrtc/ready',{method:'POST',token,body:{roomName}});apply(result.item);};
 const resume=async()=>apiRequest('/live-stream/webrtc/resume',{method:'POST',token});
 const uploadRecordingChunk=useCallback((id,sequence,bytes,mime)=>uploadDirectRecordingChunk({baseUrl:apiBaseUrl,token,id,sequence,bytes,mime}),[token]);
 const finishRecording=useCallback((id,body)=>apiRequest(`/live-stream/recordings/${id}/finish`,{method:'POST',token,body,signal:AbortSignal.timeout(30000)}),[token]);
 const [recordingMessage,setRecordingMessage]=useState('');
 useEffect(()=>{if(!enabled||!token)return;let pending=false;const retry=async()=>{if(pending)return;pending=true;try{await recoverRecordings({upload:uploadRecordingChunk,finish:finishRecording,onStatus:setRecordingMessage});}catch{/* Retry local storage access on the next pass. */}finally{pending=false;}};void retry();const timer=setInterval(()=>void retry(),30000);window.addEventListener('online',retry);return()=>{clearInterval(timer);window.removeEventListener('online',retry);};},[enabled,token,uploadRecordingChunk,finishRecording]);
 const [recordedBytes,setRecordedBytes]=useState(0),[savedBytes,setSavedBytes]=useState(0);
 const startRecording=({id,tracks})=>startDirectRecording({id,tracks,upload:async(...args)=>{const result=await uploadRecordingChunk(...args);setSavedBytes(value=>value+(args[2]?.byteLength||0));return result;},finish:finishRecording,onStatus:setRecordingMessage,onProgress:setRecordedBytes});
 const folderRequired=saveLocal&&(!diskStore.current||askRecordingFolder&&!folderChosenForNextLive.current);
 const [folderHint,setFolderHint]=useState(0);
 useEffect(()=>{if(!folderRequired)setFolderHint(0);},[folderRequired]);
 useEffect(()=>{if(!folderHint)return;const timer=setTimeout(()=>setFolderHint(0),5000);return()=>clearTimeout(timer);},[folderHint]);
 const recordingReady=!localBusy&&!folderRequired;
 const beforeGoLive=()=>{
  if(recordingReady)return true;
  setSettingsTab('studio');setLocalMessage(localBusy?'Wait for local saving or recovery to finish.':'');
  if(folderRequired)setFolderHint(Date.now());
  requestAnimationFrame(()=>{const button=settingsArea.current?.querySelector('.studio-folder-button');button?.scrollIntoView({block:'nearest'});button?.focus({preventScroll:true});});
  return false;
 };
 const webrtc=useWebrtcBroadcast({onGoLive:start,onEndLive:end,onReady:ready,onStartRecording:startRecording,onStartLocalRecording:saveLocal?startLocalRecording:undefined,requireRecording:saveServer,recordingEnabled:saveServer,expectedRoom:liveStream?.webrtcRoomName});
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
 const controlHint=folderWarning?'Choose a recording folder in Live Source before going live.':destinationFeedback||(!previewReply&&webrtc.statusMessage)||'';
 useEffect(()=>{
  if(enabled&&previewReply)adminToast(webrtc.statusMessage.trim());
 },[enabled,previewReply,webrtc.statusMessage]);
 useEffect(()=>{if(enabled&&webrtc.startError)adminToast(webrtc.startError,true);},[enabled,webrtc.startError]);
 const reserved=Boolean(liveStream?.obs?.roomName||liveStream?.webrtcRoomName),isLiveOnAir=Boolean(liveStream?.isLive),session=liveSessionIdentity(liveStream);
 const legacyObs=Boolean(liveStream?.obs?.roomName);
 useEffect(()=>{if(!isLiveOnAir&&!webrtc.isBroadcasting){setRecordedBytes(0);setSavedBytes(0);}},[isLiveOnAir,webrtc.isBroadcasting]);
 const rec=liveStream?.recording,recProblem=[rec?.warning,rec?.error].filter(Boolean).join(' · ');
 const shortUpload=text=>/up to date/i.test(text)?'Uploads synced':text.length>38?text.slice(0,36)+'…':text;
 const statusBadges=[];
 if(reserved||isLiveOnAir){
  if(legacyObs&&liveStream?.obs?.saveRecording===false||(!rec&&!saveLive))statusBadges.push({key:'rec',text:'Recording off',tone:'muted',title:'Live only, no recording'});
  else if(saveLocal&&!saveServer)statusBadges.push({key:'rec',text:'Recording locally',tone:'ok',title:'Saved on this computer'});
  else if(rec){const state=rec.captureState||'unknown',saved=Math.min(savedBytes,recordedBytes);statusBadges.push({key:'rec',text:`${state.charAt(0).toUpperCase()+state.slice(1)}${recordedBytes>0?` · ${formatBytes(recordedBytes)}`:''}${recordedBytes>0&&saved<recordedBytes?` · Saved ${formatBytes(saved)}`:''}`,tone:recProblem?'warn':['recording','active','ready'].includes(state)?'ok':'muted',title:recProblem||'Recording capture state'});}
  else statusBadges.push({key:'rec',text:'Recording pending',tone:'muted',title:'Recording status not yet confirmed'});
  if(recProblem&&!rec)statusBadges.push({key:'problem',text:'Recording issue',tone:'warn',title:recProblem});
 }
 if(recordingMessage&&!/up to date/i.test(recordingMessage))statusBadges.push({key:'upload',text:shortUpload(recordingMessage),tone:/up to date|uploaded/i.test(recordingMessage)?'ok':'warn',title:recordingMessage});
 if(localMessage)statusBadges.push({key:'local',text:shortUpload(localMessage),tone:'muted',title:localMessage});
 // Refresh survival: browser capture dies with the page, so this same tab re-acquires the camera and resumes the live.
 const autoResumed=useRef(false);
 useEffect(()=>{try{if(webrtc.isBroadcasting)sessionStorage.setItem('echo-live-tab',liveStream?.webrtcRoomName||'1');else if(!loading&&!isLiveOnAir)sessionStorage.removeItem('echo-live-tab');}catch{/* storage unavailable */}},[webrtc.isBroadcasting,loading,isLiveOnAir,liveStream?.webrtcRoomName]);
 useEffect(()=>{if(autoResumed.current||loading||!isLiveOnAir||liveStream?.broadcastSource!=='browser'||webrtc.isBroadcasting||webrtc.sourceKind!=='camera')return;let mine=false;try{mine=Boolean(sessionStorage.getItem('echo-live-tab'));}catch{/* ignore */}if(!mine)return;autoResumed.current=true;void reconnectLive();},[loading,isLiveOnAir,liveStream?.broadcastSource,webrtc.isBroadcasting,webrtc.sourceKind]);// eslint-disable-line react-hooks/exhaustive-deps
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
            </div>
            {error&&<p role="alert" className="admin-request-feedback">{error}</p>}
            </div><div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs">
              <div className="admin-live-tab-panel admin-live-sessions-page-panel" role="tabpanel">
              <div className="admin-live-single has-requests-aside">
              <AdminLiveAudience token={token} session={isLiveOnAir?session:null} enabled={enabled} onReview={onReviewLiveRequest} requestsTarget={audienceRequestsTarget}/>
              <div className="admin-live-preview">
                <div className="admin-live-monitor studio-preview-pair" ref={liveFrame} aria-label="Landscape and portrait previews">
                <section className="studio-preview-window" aria-label="Landscape preview">
                 <header className="studio-preview-window-head"><h4>Landscape</h4><span><bdi>16:9</bdi></span></header>
                 <div className="admin-live-preview-frame-shell studio-preview-landscape" ref={primaryFrame}>

                  <div className="studio-output-source-target" ref={setLandscapeIndicators}/>
                  {webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting ? <video ref={webrtc.videoRef} className="admin-live-preview-frame" autoPlay playsInline muted/> : isLiveOnAir ? <WebrtcViewer key={session+':'+retry} token={token} sessionIdentity={session} muted showAudioControls audioControlsTarget={previewAudioControlsTarget}/> : liveStream?.posterImage ? <img className="admin-live-preview-image" src={liveStream.posterImage} alt="" aria-hidden="true"/> : <div className="admin-live-preview-empty"><VideoOff size={18}/><span>{reserved?'Connecting source…':'No live source'}</span></div>}
                 </div>
                </section>
                <StudioPreviewMirror primaryRef={primaryFrame} active={previewActive} posterImage={liveStream?.posterImage} waiting={reserved} indicatorRef={setPortraitIndicators}/>
                </div>
                <div className="studio-audience-requests-slot" ref={setAudienceRequestsTarget}/>
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
 <div className={`studio-control-hint${folderWarning?' is-warning':' is-info'}${controlHint?'':' is-empty'}`} role="status" aria-live="polite">{folderWarning?<TriangleAlert size={17} aria-hidden="true"/>:<Info size={17} aria-hidden="true"/>}<p>{controlHint||'Studio status messages appear here.'}</p></div>
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
 <header className="studio-source-heading"><div><p className="detail-label">LIVE SOURCE</p><h3>What’s going live?</h3></div><span className="studio-status">{webrtc.isBroadcasting?'Live from this browser':webrtc.isPreviewing?'Private preview · not on air':legacyObs?'Legacy OBS connection':'Browser studio'}</span></header>
 <LiveSourcePicker value={webrtc.sourceKind} disabled={captureLocked||reserved||isLiveOnAir||loading||Boolean(error)} onSelect={webrtc.selectSource}/>
 <label className="studio-title"><span className="studio-field-caption">SESSION TITLE</span><input value={title} placeholder={liveStream?.title||'Name your live set'} maxLength={180} disabled={webrtc.isConnecting} onChange={event=>setTitle(event.target.value)}/></label>
 <fieldset className="admin-live-settings studio-source-settings" disabled={loading||Boolean(error)}>
  <LiveGoalPicker token={token} goal={liveStream?.goal} onChange={apply}/>
  {['image','video'].includes(webrtc.sourceKind)&&<label>Source file<input type="file" accept={webrtc.sourceKind==='image'?'image/*':'video/*'} disabled={captureLocked||reserved||isLiveOnAir} onChange={event=>{const file=event.target.files?.[0];if(file)webrtc.selectSource(webrtc.sourceKind,file);}}/>{webrtc.sourceFile&&<small>{webrtc.sourceFile.name}</small>}</label>}
  {webrtc.sourceKind==='display'&&<p>Open private preview to choose the tab or window. Enable “Share tab audio” in the browser picker when you want its sound.</p>}
  {webrtc.sourceKind==='video'&&(webrtc.isPreviewing||webrtc.isBroadcasting)&&<div role="group" aria-label="Source video playback"><button type="button" onClick={webrtc.playSource}>Play video</button><button type="button" onClick={webrtc.pauseSource}>Pause video</button><button type="button" onClick={webrtc.restartSource}>Restart video</button></div>}
  {legacyObs&&<ObsBroadcast token={token} item={liveStream} onUpdate={item=>{apply(item);setTitle('');}}/>}
  <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot"/>
 </fieldset>
 <section className="studio-recording-card" aria-label="Recording settings">
 <label className="studio-save-live"><span><strong>Record this live</strong><small id="studio-save-live-help">{saveLive?'Keep a copy when your session ends.':'Broadcast without saving a copy.'}</small></span><input type="checkbox" role="switch" aria-label="Save live after closing" aria-describedby="studio-save-live-help" checked={saveLive} disabled={captureLocked||reserved||isLiveOnAir||localBusy||loading||Boolean(error)} onChange={event=>{const value=event.target.checked;setSaveLive(value);try{localStorage.setItem('echo-save-live-recording',String(value));}catch{/* Session preference still works. */}}}/></label>
 {saveLive&&<div className="studio-recording-options">
  <span className="studio-field-caption">SAVE TO</span>
  <div className="studio-recording-destinations" role="group" aria-label="Recording destination">
   {[['server','Cloud',Cloud],['local','Computer',HardDrive],['both','Both',Layers]].map(([value,label,Icon])=><button key={value} type="button" aria-pressed={recordingDestination===value} disabled={captureLocked||reserved||isLiveOnAir||localBusy||loading||Boolean(error)} onClick={()=>{setRecordingDestination(value);try{localStorage.setItem('echo-recording-destination',value);}catch{/* Session preference still works. */}}}><Icon size={16} aria-hidden="true"/><span>{label}</span></button>)}
  </div>
  <p className="studio-destination-summary">{recordingDestination==='server'?'Saved to Live Recordings on OVH.':recordingDestination==='both'?'Cloud recording + a local 16:9 copy with audio.':'A local 16:9 video with audio. Saved in recoverable parts.'}</p>
  {saveLocal&&<div className="studio-disk-settings">
   <button className={`studio-folder-button${folderRequired&&folderHint?' is-warning':''}`} type="button" disabled={webrtc.isConnecting||webrtc.previewBusy||reserved||isLiveOnAir||localBusy} onClick={()=>void chooseFolder()}><FolderOpen size={19} aria-hidden="true"/><span><strong>{localBusy?'Working…':folderName||'Choose a folder'}</strong><small>{folderRequired?'Required before going live':folderName?'Change folder or recover files':'Computer or connected USB drive'}</small></span><ChevronDown size={15} aria-hidden="true"/></button>
   <label className="studio-recording-folder-choice"><input type="checkbox" checked={askRecordingFolder} disabled={captureLocked||reserved||isLiveOnAir||localBusy} onChange={event=>setAskRecordingFolder(event.target.checked)}/>Choose a folder for each live</label>
   <details className="studio-recording-help"><summary>How saving & recovery work</summary><p>Parts are saved to disk about every 4 seconds. When the live ends, the video is rebuilt in this folder. Recovery parts are kept. New recordings prefer MP4 when supported. For older WebM recordings, Save MP4 converts at playback speed; keep Studio open until it finishes.</p><p>Use desktop Chrome or Edge on HTTPS. Keep Studio visible, your computer awake and the drive connected until saving finishes. To recover a recording, reconnect the drive and choose the same folder.</p></details>
  </div>}
 </div>}
 {localFiles.length>0&&<section className="studio-local-recordings" aria-label="Saved recordings"><h4 className="studio-local-recordings-heading"><RotateCcw size={14} aria-hidden="true"/>Saved recordings <span>{localFiles.length}</span></h4><p>Recovery folder: {folderName}</p>{localFiles.map(file=><div key={file.id}><span><strong>{file.format==='portrait'?'Portrait · 9:16':'Landscape · 16:9'}</strong><small>{file.filename} · {file.complete?'Complete capture':'Recovered / partial capture'} · {file.count} parts</small></span><button type="button" disabled={localBusy||webrtc.isConnecting||reserved||isLiveOnAir} onClick={()=>void restoreLocalFile(file)}>Rebuild video</button>{!file.filename.endsWith('.mp4')&&<button type="button" disabled={localBusy||webrtc.isConnecting||reserved||isLiveOnAir} onClick={()=>void saveLocalMp4(file)}>Save MP4</button>}</div>)}</section>}
 </section>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-camera" aria-labelledby="studio-settings-tab-camera" hidden={settingsTab!=='camera'} tabIndex={0}>
 <section className="studio-console" aria-label="Camera settings">
 <header><h3>Camera & capture</h3></header>
 <p>Close private preview before changing the camera or capture quality.</p>
 <div className="studio-inputs">
  <label>Camera · GoPro USB webcam<AdminSelect aria-label="Studio camera" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.selectedVideoDeviceId} onChange={event=>webrtc.setSelectedVideoDeviceId(event.target.value)}><option value="">Default camera</option>{webrtc.videoInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Camera ${index+1}`}</option>)}</AdminSelect></label>
  <label>Capture quality<AdminSelect aria-label="Studio capture quality" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.quality} onChange={event=>webrtc.setQuality(event.target.value)}><option value="1080">1080p · Full HD · 30 fps</option><option value="720">720p · 30 fps</option><option value="360">360p · low bandwidth</option></AdminSelect></label>
 </div>
 <div className="studio-control-actions"><button type="button" className="admin-live-fullscreen studio-camera-mirror" aria-label="Mirror camera left/right" aria-pressed={webrtc.cameraMirrored} title={webrtc.cameraMirrored?'Restore camera orientation · affects live output':'Mirror camera left/right · affects live output'} disabled={!(webrtc.isPreviewing||webrtc.isBroadcasting)||webrtc.cameraOff||webrtc.mirrorBusy||webrtc.previewBusy||webrtc.isConnecting} onClick={webrtc.toggleCameraMirror}><FlipHorizontal2 size={17} aria-hidden="true"/><span>Mirror camera</span></button></div>
 <p className="studio-help">Higher capture quality uses more bandwidth and graphics resources.</p>
 <p className="studio-help">Device names appear after camera permission is granted.</p>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-audio" aria-labelledby="studio-settings-tab-audio" hidden={settingsTab!=='audio'} tabIndex={0}>
 <section className="studio-console" aria-label="Audio settings">
 <header><h3>Audio input & voice</h3></header>
 <p>Choose one mic/aux or built-in microphone input. Close preview to switch inputs. Use headphones to avoid feedback.</p>
 <div className="studio-inputs">
  <label>Audio · mic/aux or built-in microphone<AdminSelect aria-label="Studio audio input" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.selectedAudioDeviceId} onChange={event=>webrtc.setSelectedAudioDeviceId(event.target.value)}><option value="">Default input</option>{webrtc.audioInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Audio input ${index+1}`}</option>)}</AdminSelect></label>
 </div>
 <div className="studio-audio-meters">
                  <VoiceTestMeter track={webrtc.micMediaStreamTrack} deviceId={webrtc.selectedAudioDeviceId} muted={webrtc.micMuted} canEnable={webrtc.isPreviewing&&!webrtc.previewBusy&&webrtc.sourceKind!=='camera'} onToggle={webrtc.toggleMicrophone} inputLevel={webrtc.microphoneLevel} onLevelChange={webrtc.updateMicrophoneLevel}/>
                  <VoiceTestMeter source track={webrtc.sourceAudioTrack} muted={webrtc.sourceAudioMuted} onToggle={webrtc.toggleSourceAudio} inputLevel={webrtc.sourceLevel} onLevelChange={webrtc.updateSourceLevel}/>
 </div>
 <fieldset className="studio-audio-processing" disabled={webrtc.processingBusy||webrtc.previewBusy||webrtc.isConnecting||(isLiveOnAir&&!webrtc.isBroadcasting)}>
  <legend>Optional microphone effects</legend>
  <div className="studio-audio-switches">{LIVE_AUDIO_CONTROLS.map(control=><label key={control.key} title={control.help}><input type="checkbox" checked={webrtc.processing[control.key]} onChange={event=>webrtc.updateAudioProcessing({[control.key]:event.target.checked})}/><span>{control.label}</span></label>)}</div>
  {webrtc.sourceKind==='camera'&&<label><input type="checkbox" checked={webrtc.pitchCorrectionEnabled} disabled={captureLocked||reserved||isLiveOnAir} onChange={event=>webrtc.setPitchCorrectionEnabled(event.target.checked)}/>Pitch controls</label>}
  <button type="button" className="admin-live-control" onClick={()=>webrtc.updateAudioProcessing(null)}>Reset effects</button>
  {webrtc.processingApplied&&<p className="studio-audio-applied">Input reports: {LIVE_AUDIO_CONTROLS.map(control=>`${control.label}: ${webrtc.processingApplied[control.key]===null?'not reported':webrtc.processingApplied[control.key]?'on':'off'}`).join(' · ')}</p>}
  {webrtc.processingMessage&&<p role="status">{webrtc.processingMessage}</p>}
 </fieldset>
 <fieldset className="studio-audio-processing" disabled={webrtc.sourceProcessingBusy||webrtc.previewBusy||webrtc.isConnecting||(isLiveOnAir&&!webrtc.isBroadcasting)}>
  <legend>Optional source effects</legend>
  <div className="studio-audio-switches">{LIVE_AUDIO_CONTROLS.map(control=><label key={control.key} title={webrtc.sourceProcessingSupported[control.key]?'Apply only to source audio':'This source does not support this effect'}><input type="checkbox" checked={webrtc.sourceProcessing[control.key]} disabled={!webrtc.sourceProcessingSupported[control.key]} onChange={event=>webrtc.updateSourceAudioProcessing({[control.key]:event.target.checked})}/><span>{control.label}</span></label>)}</div>
  {!Object.values(webrtc.sourceProcessingSupported).some(Boolean)&&<p>These effects are unavailable for the selected source. Source audio stays unchanged.</p>}
  <button type="button" className="admin-live-control" disabled={!Object.values(webrtc.sourceProcessing).some(Boolean)} onClick={()=>webrtc.updateSourceAudioProcessing(null)}>Reset source effects</button>
  {webrtc.sourceProcessingApplied&&Object.values(webrtc.sourceProcessingApplied).some(value=>value!==null)&&<p className="studio-audio-applied">Source reports: {LIVE_AUDIO_CONTROLS.map(control=>`${control.label}: ${webrtc.sourceProcessingApplied[control.key]===null?'not reported':webrtc.sourceProcessingApplied[control.key]?'on':'off'}`).join(' · ')}</p>}
  {webrtc.sourceProcessingMessage&&<p role="status">{webrtc.sourceProcessingMessage}</p>}
 </fieldset>
 {webrtc.pitchCorrectionEnabled&&<VocalCorrectionControl inline/>}
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-appearance" aria-labelledby="studio-settings-tab-appearance" hidden={settingsTab!=='appearance'} tabIndex={0}>
 <CameraAppearanceControls value={webrtc.cameraAppearance} onChange={webrtc.updateCameraAppearance} disabled={webrtc.mirrorBusy||webrtc.previewBusy||webrtc.isConnecting||webrtc.cameraOff||(isLiveOnAir&&!webrtc.isBroadcasting)}/>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-controls" aria-labelledby="studio-settings-tab-controls" hidden={settingsTab!=='controls'} tabIndex={0}>
 <section className="studio-console" aria-label="Live stream controls">
 <header><h3>Live controls</h3></header>
 <p>Open private preview and go live using the controls above. Mute or stop the current session here.</p>
 {legacyObs?<p>Disconnect the legacy OBS connection in the Echo Studio tab before starting another source.</p>:<>
 <div className="studio-transport" role="group" aria-label="Studio transport">
  {(webrtc.isPreviewing||webrtc.isBroadcasting)&&<><button type="button" className="admin-live-control" onClick={webrtc.toggleMicrophone} aria-pressed={webrtc.micMuted}>{webrtc.micMuted?'Unmute input':'Mute input'}</button><button type="button" className="admin-live-control" onClick={webrtc.toggleCamera} aria-pressed={webrtc.cameraOff}>{webrtc.cameraOff?'Enable camera':'Disable camera'}</button></>}
  {(isLiveOnAir||reserved)&&<button type="button" className="admin-live-control admin-live-control-delete" disabled={webrtc.isConnecting} onClick={stopLive}>End {liveStream?.broadcastSource==='android'?'Android':'Echo'} live stream</button>}
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
            </div>
              </div>
            </div>

           
          </section>

 );
}
