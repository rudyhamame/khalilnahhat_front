import LiveElapsedTimer from './LiveElapsedTimer';
import {useStudioWorkspaceLayout} from '../hooks/useStudioWorkspaceLayout';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Video,Radio,VideoOff,Minimize2,Maximize2,RefreshCw,Layers,Share2,Eye,EyeOff,LoaderCircle,Square,Info,X,PanelLeftClose,PanelLeftOpen,PanelRightClose,PanelRightOpen} from 'lucide-react';
import {adminToast} from './adminToast';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {useWebrtcBroadcast} from '../hooks/useWebrtcBroadcast';
import {apiRequest} from '../lib/api';
import {startStudioBroadcast} from '../lib/studioRecordingFallback';
import MicStrip,{OutputStrip} from './MicStrip';
import {useAutoDuck} from '../hooks/useAutoDuck';
import RatioCards from './RatioCards';
import {useOutputFormat} from '../hooks/useOutputFormat';
import ObsBroadcast from './ObsBroadcast';
import WebrtcViewer from './WebrtcViewer';
import StudioPreviewMirror from './StudioPreviewMirror';
import LiveDestinations from './LiveDestinations';
import LiveGoalPicker from './LiveGoalPicker';
import LiveSetListPicker from './LiveSetListPicker';
import AdminLiveAudience from './AdminLiveAudience';
import StudioControlSection from './StudioControlSection';
import {LIVE_QUALITY,getLiveQuality,setLiveQuality} from '../lib/liveQuality';
import './adminLiveStudio.css';
import './studioControls.css';

const OBS_DEVICE=/obs|virtual/i;
const SETTINGS_TABS=[['studio','Setup',Layers],['destinations','Destinations',Share2]];


export default function AdminLiveStudio({token,enabled,liveStream:initial,liveSessions=[],setListActions,onLiveStreamChange,onReviewLiveRequest}) {
 const {item:liveStream,loading,error,update}=useLiveStatus({token,admin:true,enabled,initial});
 const [previewAudioControlsTarget,setPreviewAudioControlsTarget]=useState(null);
 const [dismissedHint,setDismissedHint]=useState('');
 const [setListId,setSetListId]=useState('none');
 const [title,setTitle]=useState(''),[goalChoice,setGoalChoice]=useState(''),[detailsTried,setDetailsTried]=useState(false);
 const [cropSlot,setCropSlot]=useState(null),[hint,setHint]=useState('');
 const [audience,setAudience]=useState('all'),[audienceIds,setAudienceIds]=useState([]),[clientQuery,setClientQuery]=useState(''),[clientRows,setClientRows]=useState([]);
 useEffect(()=>{if(audience!=='specific')return undefined;const controller=new AbortController(),timer=setTimeout(()=>{apiRequest('/admin/clients?'+new URLSearchParams(clientQuery.trim()?{q:clientQuery.trim()}:{}),{token,signal:controller.signal}).then(data=>setClientRows((data.items||[]).filter(client=>!client.isAdmin))).catch(()=>{});},180);return()=>{clearTimeout(timer);controller.abort();};},[audience,clientQuery,token]);
 const ovhRecording=liveStream?.studio?.transport==='ovh';
 // Close the left (controls) and right (recording) columns to give the preview the whole width; remembered in this browser.
 const [hidden,setHidden]=useState(()=>{try{return JSON.parse(localStorage.getItem('echo-studio-hidden-columns')||'{}')||{};}catch{return {};}});
 const toggleColumn=side=>setHidden(current=>{const next={...current,[side]:!current[side]};try{localStorage.setItem('echo-studio-hidden-columns',JSON.stringify(next));}catch{/* still applies */}return next;});
 const [settingsTab,setSettingsTab]=useState('studio');
 const [landscapeIndicators,setLandscapeIndicators]=useState(null),[portraitIndicators,setPortraitIndicators]=useState(null);
 const [destinationFeedback,setDestinationFeedback]=useState('');
  const liveFrame=useRef(null),primaryFrame=useRef(null),settingsArea=useRef(null),alive=useRef(true);
 const {liveFullscreen,toggleLiveFullscreen}=useStudioWorkspaceLayout({liveFrame,settingsArea});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const openDestination=platform=>{
   if(!['youtube','instagram','tiktok'].includes(platform))return;
   setSettingsTab('destinations');
   const dialog=settingsArea.current;if(!dialog)return;
   requestAnimationFrame(()=>{const card=dialog.querySelector(`[data-destination="${platform}"]`);card?.scrollIntoView({block:'nearest'});card?.querySelector('input')?.focus({preventScroll:true});});
 };
 const broadcastTitle=title.trim();
 const apply=item=>{if(!alive.current)return;update(item);onLiveStreamChange?.(item);};
 // The browser never records: on the OVH transport the relay records on the server, otherwise nothing is recorded.
 const start=async (title,outputs)=>{
  const result=await startStudioBroadcast({title,outputs,setListId,saveRecording:ovhRecording,audience,audienceUserIds:audienceIds,transport:ovhRecording?'ovh':'livekit',request:body=>apiRequest('/live-stream/webrtc/go-live',{method:'POST',token,body}),hasFolder:()=>false,askLocalOnly:async()=>false});
  apply(result.item);setTitle('');return result;};
 const end=async roomName=>{const result=await apiRequest('/live-stream/webrtc/end',{method:'POST',token,body:{roomName}});apply(result.item);setTitle('');setGoalChoice('');setSetListId('none');setDetailsTried(false);};
 const ready=async roomName=>{const result=await apiRequest('/live-stream/webrtc/ready',{method:'POST',token,body:{roomName}});apply(result.item);};
 const resume=()=>apiRequest('/live-stream/webrtc/resume',{method:'POST',token});
 const beforeGoLive=()=>{
  if(!title.trim()||!goalChoice){
   setDetailsTried(true);setSettingsTab('studio');setHint('Enter a session title and choose the live stream goal before going live.');
   requestAnimationFrame(()=>document.querySelector(!title.trim()?'.studio-title input':'.live-goal-picker select')?.focus());
   return false;
  }
  return true;
 };
 const webrtc=useWebrtcBroadcast({onGoLive:start,onEndLive:end,onReady:ready,getOutputs:()=>({}),getPortraitAudio:()=>null,isNativePortrait:()=>output.nativePortrait,requireRecording:ovhRecording,recordingEnabled:ovhRecording,expectedRoom:liveStream?.webrtcRoomName});
 const output=useOutputFormat();
 // An ended live must never be "restored after a refresh": End live clears the tab's live marker and blocks the auto-restore.
 const stopLive=()=>webrtc.endLive();
 const [resumeBusy,setResumeBusy]=useState(false);
 // Reconnect only reconnects: it uses the input that is already set (its private preview is open) and never asks for a camera, tab or file.
 const reconnectLive=async()=>{
  if(resumeBusy)return;
  if(!webrtc.sourceChosen||!webrtc.isPreviewing){setSettingsTab('studio');adminToast('No input set. Choose a video input, then reconnect the live.',true);return;}
  setResumeBusy(true);
  try{
   const claim=await resume();apply(claim.item);await webrtc.goLive('',claim,webrtc.sourceKind);
  }catch(error){adminToast(error.message||'Could not reconnect this live stream.',true);}
  finally{setResumeBusy(false);}
 };
 const previewReply=webrtc.statusMessage.startsWith('Private preview ready.')||webrtc.statusMessage==='Preview closed.';
 const controlHint=hint||destinationFeedback||(!previewReply&&webrtc.statusMessage)||'';
 // A hint removes itself after a few seconds (the close button still works at once).
 useEffect(()=>{if(!controlHint)return;const timer=setTimeout(()=>setDismissedHint(controlHint),8000);return()=>clearTimeout(timer);},[controlHint]);
 useEffect(()=>{
  if(enabled&&previewReply)adminToast(webrtc.statusMessage.trim());
 },[enabled,previewReply,webrtc.statusMessage]);
 useEffect(()=>{if(enabled&&webrtc.startError)adminToast(webrtc.startError,true);},[enabled,webrtc.startError]);
 const reserved=Boolean(liveStream?.obs?.roomName||liveStream?.webrtcRoomName),isLiveOnAir=Boolean(liveStream?.isLive),session=liveSessionIdentity(liveStream);
 const legacyObs=Boolean(liveStream?.obs?.roomName)&&liveStream?.broadcastSource!=='browser';
 
 const rec=liveStream?.recording,recProblem=[rec?.warning,rec?.error].filter(Boolean).join(' · ');
 const statusBadges=[];
 // The Record this live card already shows recording state; only a real problem earns a badge here.
 if((reserved||isLiveOnAir)&&recProblem)statusBadges.push({key:'problem',text:'Recording issue',tone:'warn',title:recProblem});
 // After a reload or a halt, bring back what the live was set up with: the pause screen (also kept on the server), the session title and the goal.
 useEffect(()=>{if(!isLiveOnAir||!liveStream)return;setTitle(current=>current||liveStream.title||'');setGoalChoice(current=>current||liveStream.goal||'');setSetListId(liveStream.liveSetListId||'none');},[isLiveOnAir,liveStream?.title,liveStream?.goal,liveStream?.liveSetListId]);// eslint-disable-line react-hooks/exhaustive-deps
 const [inputMeter,setInputMeter]=useState(null),[voiceMeter,setVoiceMeter]=useState(null),[outputMeter,setOutputMeter]=useState(null),[listenStream,setListenStream]=useState(null),[inputMuted,setInputMuted]=useState(false);
 useEffect(()=>{webrtc.setInputMuted(inputMuted);},[inputMuted,webrtc.isPreviewing,webrtc.isBroadcasting,webrtc.previewBusy,webrtc.paused]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{setInputMeter(webrtc.getInputMeterStream());setVoiceMeter(webrtc.getVoiceMeterStream());setOutputMeter(webrtc.getOutputMeterStream());setListenStream(webrtc.getMonitorStream());},[webrtc.isPreviewing,webrtc.isBroadcasting,webrtc.previewBusy,webrtc.paused,webrtc.voiceOn,webrtc.voiceStream]);// eslint-disable-line react-hooks/exhaustive-deps
 const studioState=webrtc.preflight?'preflight':isLiveOnAir||webrtc.isBroadcasting?'live':webrtc.previewBusy?'opening':webrtc.isConnecting||reserved?'connecting':webrtc.isPreviewing?'preview':'offline';
 const previewActive=webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting||isLiveOnAir;
 // Inputs stay selectable while a preview is open (picking one replaces the preview); only a live in progress or an opening preview locks them.
 // Auto leveling: lower the audio input while the voice microphone speaks. The hook gets a steady function so it is not restarted each render.
 const [autoLevel,setAutoLevel]=useState(()=>{try{return localStorage.getItem('echo-auto-level')==='1';}catch{return false;}});
 useEffect(()=>{webrtc.setVoiceClarity(autoLevel);},[autoLevel]);// eslint-disable-line react-hooks/exhaustive-deps
 const duckRef=useRef(null);duckRef.current=webrtc.setDuck;
 const stableDuck=useCallback((factor,smoothing)=>duckRef.current?.(factor,smoothing),[]);
 const ducking=useAutoDuck({stream:webrtc.voiceStream,enabled:autoLevel&&webrtc.voiceOn&&webrtc.voiceLevel>0,setDuck:stableDuck});
 const inputLocked=webrtc.isConnecting||webrtc.previewBusy||webrtc.isBroadcasting;
 // The live is on air but this browser is not sending it (page reloaded, connection lost, live paused with no input): the sources must stay selectable so "Reconnect live" has something to reacquire.
 const reconnectHere=isLiveOnAir&&liveStream?.broadcastSource==='browser'&&!webrtc.isBroadcasting,liveLocksInput=isLiveOnAir&&!reconnectHere,inputsHeld=(reserved&&!reconnectHere)||liveLocksInput;
 const [liveQuality,setQualityState]=useState(()=>getLiveQuality().id),[qualityBusy,setQualityBusy]=useState(false);
 // OBS is the only source: Open preview finds its Virtual Camera (and an OBS audio device, if one exists) by name. Nothing else is ever opened.
 const hasAudioInput=Boolean(webrtc.selectedAudioDeviceId);
 const [obsOpening,setObsOpening]=useState(false);
 const openObs=async()=>{
  // Browsers hide device names until camera access was granted once: ask briefly, release it, then read the list.
  try{const probe=await navigator.mediaDevices.getUserMedia({video:true});probe.getTracks().forEach(track=>track.stop());}catch{/* the list below may still name it */}
  const devices=await navigator.mediaDevices.enumerateDevices().catch(()=>[]);
  const camera=devices.find(item=>item.kind==='videoinput'&&OBS_DEVICE.test(item.label)),audio=devices.find(item=>item.kind==='audioinput'&&OBS_DEVICE.test(item.label));
  if(!camera){adminToast('OBS Virtual Camera not found. In OBS click Start Virtual Camera, then try again.',true);return;}
  webrtc.setSelectedVideoDeviceId(camera.deviceId);webrtc.setSelectedAudioDeviceId(audio?.deviceId||'');
  void webrtc.selectSource('camera',null,audio?'mic':'none');setObsOpening(true);
 };
 // Runs on the render after the device ids are set, so the preview opens on OBS exactly once.
 useEffect(()=>{if(!obsOpening)return;setObsOpening(false);void webrtc.preparePreview();},[obsOpening]);// eslint-disable-line react-hooks/exhaustive-deps
 // Picking another mixer device while the private preview is open reopens the preview on it.
 const lastMixer=useRef(webrtc.selectedAudioDeviceId);
 useEffect(()=>{if(lastMixer.current===webrtc.selectedAudioDeviceId)return;lastMixer.current=webrtc.selectedAudioDeviceId;if(webrtc.isPreviewing&&webrtc.audioMode==='mic'){if(webrtc.paused||webrtc.inputLost)void webrtc.setPausedAudio('mic');else if(!webrtc.isBroadcasting)void webrtc.preparePreview();}},[webrtc.selectedAudioDeviceId]);// eslint-disable-line react-hooks/exhaustive-deps
 // Picking another camera while the private preview is open reopens the preview on it.
 const lastCamera=useRef(webrtc.selectedVideoDeviceId);
 useEffect(()=>{if(lastCamera.current===webrtc.selectedVideoDeviceId)return;lastCamera.current=webrtc.selectedVideoDeviceId;if(webrtc.isPreviewing&&webrtc.sourceKind==='camera'){if(webrtc.paused||webrtc.inputLost)void webrtc.setPausedInput({kind:'camera'});else if(!webrtc.isBroadcasting)void webrtc.preparePreview();}},[webrtc.selectedVideoDeviceId]);// eslint-disable-line react-hooks/exhaustive-deps
 const previewFormat=output.format;
 const changeLiveQuality=async id=>{
  if(id===liveQuality)return;
  const selected=setLiveQuality(id);setQualityState(selected.id);
  if(!webrtc.isPreviewing||webrtc.isBroadcasting||webrtc.previewBusy)return;
  setQualityBusy(true);
  try{
   const devices=null;
   await webrtc.preparePreview({kind:webrtc.sourceKind,file:webrtc.sourceFile,audio:webrtc.audioMode,audioSourceFile:webrtc.audioFile,devices});
  }finally{setQualityBusy(false);}
 };
 const goLiveClick=()=>{if(beforeGoLive())void webrtc.goLive(broadcastTitle);};
 const actionButtons=(()=>{const otherLive=legacyObs||((isLiveOnAir||reserved)&&!webrtc.isBroadcasting);return <>
                      <button type="button" className={`admin-live-fullscreen studio-preview-toggle${webrtc.previewBusy?' st-busy':webrtc.isPreviewing||webrtc.isBroadcasting?' st-ok':''}`} disabled={webrtc.isConnecting||webrtc.previewBusy||webrtc.isBroadcasting||otherLive} aria-label={webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview'} title={webrtc.isBroadcasting?'Preview stays open while you are live':otherLive?'Preview is controlled by the current source':webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview · not on air'} onClick={webrtc.isPreviewing?webrtc.closePreview:()=>{void openObs();}}>{webrtc.previewBusy?<LoaderCircle size={18} className="studio-opening-spinner" aria-hidden="true"/>:webrtc.isPreviewing||webrtc.isBroadcasting?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}<span>{webrtc.previewBusy?'Opening…':webrtc.isPreviewing?'Close preview':'Open preview'}</span></button>
                      {webrtc.isBroadcasting
                        ?<>{webrtc.preflight?<button type="button" className="admin-live-fullscreen studio-go-live st-busy" disabled aria-label="Go live preflight"><LoaderCircle size={16} className="studio-opening-spinner" aria-hidden="true"/><span>Go live preflight</span></button>:null}<button type="button" className={`admin-live-fullscreen studio-go-live is-live ${webrtc.inputLost?'st-lost':webrtc.paused?'st-halted':'st-onair'}`} disabled={webrtc.isConnecting} aria-label="End live" title="End live" onClick={stopLive}><Square size={16} fill="currentColor" aria-hidden="true"/><span>End live</span></button></>
                        :isLiveOnAir&&!webrtc.preflight&&liveStream?.broadcastSource==='browser'
                          ?<><button type="button" className="admin-live-fullscreen studio-go-live st-paused" disabled={resumeBusy||webrtc.previewBusy||webrtc.isConnecting} aria-label="Reconnect this browser to the live stream" title="Reacquire the selected source and continue the active live" onClick={()=>reconnectLive()}><RefreshCw size={17} className={resumeBusy?'studio-opening-spinner':undefined} aria-hidden="true"/><span>{resumeBusy?'Reconnecting…':'Reconnect live'}</span></button><button type="button" className="admin-live-fullscreen studio-go-live is-live st-halted" disabled={resumeBusy||webrtc.isConnecting} aria-label="End live" title="End this live without reconnecting" onClick={stopLive}><Square size={16} fill="currentColor" aria-hidden="true"/><span>End live</span></button></>
                          :<><button type="button" className={`admin-live-fullscreen studio-go-live${webrtc.isConnecting?' st-busy':webrtc.isPreviewing&&!otherLive&&!webrtc.previewBusy?' st-ready':''}`} disabled={!webrtc.isPreviewing||webrtc.isConnecting||webrtc.previewBusy||otherLive} aria-label="Go live on Echo" title="Go live on Echo" onClick={goLiveClick}>{webrtc.preflight?<LoaderCircle size={18} className="studio-opening-spinner" aria-hidden="true"/>:<Radio size={18} aria-hidden="true"/>}<span>{webrtc.preflight?'Go live preflight':'Go live'}</span></button></>}
                    </>;})();
 return (
          <section id="admin-live-stream" className="admin-panel admin-live-stream-panel" aria-label="Live studio" data-hide-left={hidden.left?'1':undefined} data-hide-right={hidden.right?'1':undefined}>
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
              <div className={`admin-live-preview${previewFormat==='portrait'?' is-portrait-only':''}`}>
                {(webrtc.isPreviewing||webrtc.isBroadcasting)&&<div className="studio-preview-toolbar" role="toolbar" aria-label="Preview tools">{previewFormat!=='landscape'&&<span ref={setCropSlot} className="studio-preview-toolbar-crop"/>}</div>}
                <div className={`admin-live-monitor studio-preview-pair${previewFormat==='landscape'?' is-landscape-only':previewFormat==='portrait'?' is-portrait-only':''}`} ref={liveFrame} aria-label="Landscape and portrait previews">
                <MicStrip localMonitor={webrtc.localMonitor} onLocalMute={webrtc.setLocalMonitorMuted} showInput={hasAudioInput} muted={inputMuted} onMute={setInputMuted} voiceMeter={voiceMeter} devices={webrtc.audioInputs} deviceId={webrtc.voiceDeviceId} onPickDevice={async id=>{if(id&&id===webrtc.selectedAudioDeviceId)webrtc.setSelectedAudioDeviceId(webrtc.audioInputs.find(entry=>entry.deviceId&&entry.deviceId!==id)?.deviceId||'');await webrtc.selectVoiceDevice(id);await webrtc.setVoice(true);}} actions={actionButtons} inputStream={inputMeter} on={webrtc.voiceOn} level={webrtc.voiceLevel} stream={webrtc.voiceStream} disabled={!webrtc.isPreviewing&&!webrtc.isBroadcasting} onToggle={()=>void webrtc.setVoice(!webrtc.voiceOn)} onLevel={webrtc.updateVoiceLevel} master={webrtc.masterLevel} onMaster={webrtc.updateMasterLevel} auto={autoLevel} ducking={ducking} onAuto={on=>{setAutoLevel(on);try{localStorage.setItem('echo-auto-level',on?'1':'0');}catch{/* Session choice still works. */}}}/>
                <section className="studio-preview-window" aria-label="Landscape preview" hidden={previewFormat==='portrait'}>
                 <header className="studio-preview-window-head"><h4>Landscape<em className="studio-source-tag">Landscape Source</em></h4></header>
                 <div className="admin-live-preview-frame-shell studio-preview-landscape" ref={primaryFrame}>

                  <div className="studio-output-source-target" ref={setLandscapeIndicators}/>
                  {webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting ? <><video ref={webrtc.videoRef} className="admin-live-preview-frame" autoPlay playsInline muted/>{webrtc.preflight&&<div className="pause-banner" role="status"><div className="pause-badge"><LoaderCircle size={13} className="studio-opening-spinner" aria-hidden="true"/><strong>GO LIVE PREFLIGHT</strong></div></div>}</> : isLiveOnAir ? (<WebrtcViewer key={session} token={token} sessionIdentity={session} muted showAudioControls audioControlsTarget={previewAudioControlsTarget}/>) : liveStream?.posterImage ? <img className="admin-live-preview-image" src={liveStream.posterImage} alt="" aria-hidden="true"/> : <div className="admin-live-preview-empty"><VideoOff size={18}/><span>{reserved?'Connecting source…':'No live source'}</span></div>}
                 </div>
                </section>
                {previewFormat!=='landscape'&&<StudioPreviewMirror cropSlot={cropSlot} source={previewFormat==='portrait'?'Source':'Crop of landscape'} primaryRef={primaryFrame} active={previewActive} posterImage={liveStream?.posterImage} waiting={reserved} indicatorRef={setPortraitIndicators} pan={previewFormat==='portrait'?.5:webrtc.portraitPan} onPan={previewFormat==='portrait'?undefined:webrtc.setPortraitPan}/>}
                <OutputStrip listenStream={listenStream} stream={outputMeter} level={webrtc.outputLevel} onLevel={webrtc.updateOutputLevel} muted={webrtc.outputMuted} onMute={webrtc.setOutputMuted} disabled={!webrtc.isPreviewing&&!webrtc.isBroadcasting}/>
                </div>
                <div className="studio-audience-stack">
              {controlHint&&controlHint!==dismissedHint&&<div className={`studio-control-hint${' is-info'}`} role="status" aria-live="polite"><Info size={17} aria-hidden="true"/><p>{controlHint}</p><button type="button" className="studio-hint-close" aria-label="Dismiss message" title="Dismiss" onClick={()=>setDismissedHint(controlHint)}><X size={14} aria-hidden="true"/></button></div>}
                <AdminLiveAudience setListActions={setListActions} liveSessions={liveSessions} token={token} session={isLiveOnAir?session:null} enabled={enabled} onReview={onReviewLiveRequest}/>
                </div>
<section ref={settingsArea} className="studio-control-dock studio-controls-redesign" aria-labelledby="studio-controller-title">
 <header className="studio-controller-heading"><button type="button" className="studio-column-button" onClick={()=>toggleColumn('left')} title={hidden.left?'Open the controls column':'Close the controls column'} aria-label={hidden.left?'Open the controls column':'Close the controls column'} aria-expanded={!hidden.left}>{hidden.left?<PanelLeftOpen size={20}/>:<PanelLeftClose size={20}/>}</button><h3 id="studio-controller-title">Input control</h3><div className="studio-controller-tools"><div className="studio-control-status" data-state={studioState} role="status"><strong>{{preflight:'Go live preflight',live:'On air',opening:'Opening preview',connecting:'Connecting',preview:'Private preview',offline:'Offline'}[studioState]}</strong></div>{studioState==='live'&&<LiveElapsedTimer key={session||'local-live'} session={session}/>}{statusBadges.map(badge=><span key={badge.key} className="studio-badge" data-tone={badge.tone} title={badge.title}>{badge.text}</span>)}<button type="button" className="admin-live-fullscreen studio-heading-fullscreen" onClick={toggleLiveFullscreen} aria-label={liveFullscreen ? 'Exit full screen' : 'Full screen'} title={liveFullscreen ? 'Exit full screen' : 'Full screen'}>{liveFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button></div></header>
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
 
 <StudioControlSection step="01" title="Session details" description="Give your live set a name and a purpose."><div className="studio-session-row">
 <label className="studio-title"><span className="studio-field-caption">SESSION TITLE <b className="studio-required" aria-hidden="true">*</b></span><input required aria-required="true" aria-invalid={detailsTried&&!title.trim()} className={detailsTried&&!title.trim()?'is-invalid':''} value={title} placeholder="Name your live set" maxLength={180} disabled={webrtc.isConnecting} onChange={event=>setTitle(event.target.value)}/></label>
 <fieldset className="admin-live-settings studio-goal-fieldset" disabled={loading||Boolean(error)}>
  <LiveGoalPicker token={token} goal={goalChoice} onChange={apply} onPick={id=>{setGoalChoice(id);setDetailsTried(false);}} invalid={detailsTried&&!goalChoice}/>
 </fieldset>
 <LiveSetListPicker token={token} value={setListId} onChange={setSetListId} disabled={webrtc.isConnecting||reserved||isLiveOnAir}/>
 </div></StudioControlSection>
 




 <StudioControlSection step="03" title="OBS stream" description="Stream straight from OBS to the OVH relay. Prepare OBS, paste the server and token into OBS, then start streaming. No browser camera is used." className="studio-sources-card"><div className="studio-block"><ObsBroadcast token={token} title={title.trim()} item={liveStream} onUpdate={item=>{apply(item);}}/></div></StudioControlSection>
 <fieldset className="admin-live-settings studio-source-settings" disabled={loading||Boolean(error)}>
  <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot"/>
 </fieldset>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-destinations" aria-labelledby="studio-settings-tab-destinations" hidden={settingsTab!=='destinations'} tabIndex={0}>
<LiveDestinations format={output.format} compact onFeedback={setDestinationFeedback} onSetup={openDestination} landscapeTarget={landscapeIndicators} portraitTarget={portraitIndicators} token={token} enabled={enabled} roomName={liveStream?.webrtcRoomName} isLive={isLiveOnAir} mode={liveStream?.broadcastMode}/>
 </div>
 </div>
</section>
              </div>
<div className="studio-audience-requests-slot studio-recording-slot">
 <section className="studio-recording-card rec-card" aria-label="Recording">
 <header className="rec-head"><button type="button" className="studio-column-button" onClick={()=>toggleColumn('right')} title={hidden.right?'Open the recording column':'Close the recording column'} aria-label={hidden.right?'Open the recording column':'Close the recording column'} aria-expanded={!hidden.right}>{hidden.right?<PanelRightOpen size={20}/>:<PanelRightClose size={20}/>}</button><div className="rec-title"><h3 id="studio-save-live-title">Output control</h3></div></header>
 <div className="rec-scroll">
 <div>
<label className="rec-toggle-row"><span><strong>This live session is test-only</strong><small>Hidden from guests and clients: no live badge, no playback, no live emails.</small></span><input type="checkbox" role="switch" aria-label="This live session is test-only" checked={isLiveOnAir?(liveStream?.audience||'all'):audience==='admins'} disabled={webrtc.isConnecting||reserved||isLiveOnAir} onChange={event=>setAudience(event.target.checked?'admins':'all')}/></label>
   <div className="rec-toggle-row studio-audience-row"><span><strong>Live session domain</strong><small>Who can see and watch this live.</small></span>
    <select aria-label="Live session domain" value={isLiveOnAir?(liveStream?.audience||'all'):audience} disabled={webrtc.isConnecting||reserved||isLiveOnAir} onChange={event=>setAudience(event.target.value)}><option value="all">All (guests, clients, admins)</option><option value="admins">Admins only</option><option value="clients">Clients only (and admins)</option><option value="specific">Specific clients</option></select></div>
   {audience==='specific'&&!isLiveOnAir&&<div className="studio-audience-clients"><input type="search" placeholder="Search clients" aria-label="Search clients" value={clientQuery} onChange={event=>setClientQuery(event.target.value)}/>{audienceIds.length===0&&<small>Pick at least one client, or only admins will see this live.</small>}<ul>{clientRows.map(client=><li key={client.id}><label><input type="checkbox" checked={audienceIds.includes(client.id)} onChange={event=>setAudienceIds(ids=>event.target.checked?[...ids,client.id]:ids.filter(id=>id!==client.id))}/> {client.name||client.username} <small>{client.email}</small></label></li>)}</ul></div>}
 <StudioControlSection step="02a" title="Live output ratio" description="Choose what the live sends. The picture is composed in OBS." className="studio-ratio-card"><div className="studio-block"><RatioCards format={output.format} locked={webrtc.isBroadcasting} onChange={output.setFormat}/></div></StudioControlSection>
 <StudioControlSection step="02b" title="Picture quality" description="Sets what is sent to the server. Match it to the output size in OBS."><div className="studio-block">
  <div className="studio-source-grid ratio-grid" role="group" aria-label="Picture quality">{Object.values(LIVE_QUALITY).map(item=>{const [name,detail]=item.label.split(' · ');return <button key={item.id} type="button" aria-pressed={liveQuality===item.id} disabled={webrtc.isBroadcasting||webrtc.previewBusy||qualityBusy} title={webrtc.isBroadcasting?'Stop the live to change the quality.':item.label} onClick={()=>void changeLiveQuality(item.id)}><Video size={20} aria-hidden="true"/><span><strong>{name}{detail?` · ${detail}`:''}</strong><small>{item.detail}</small></span><i aria-hidden="true"/></button>;})}</div>
  <p className="studio-hint">{qualityBusy?'Restarting the private preview at the new resolution…':LIVE_QUALITY[liveQuality].detail} {webrtc.isPreviewing?'The open private preview updates immediately.':'The selected resolution applies when you open the preview or go live.'} A higher setting needs a stronger upload connection at the venue.</p>
 </div></StudioControlSection>
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
