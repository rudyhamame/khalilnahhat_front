import LiveElapsedTimer from './LiveElapsedTimer';
import {useStudioWorkspaceLayout} from '../hooks/useStudioWorkspaceLayout';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Video,VideoOff,Minimize2,Maximize2,Layers,Share2,Eye,EyeOff,LoaderCircle,Info,X,PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import {adminToast} from './adminToast';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {useWebrtcBroadcast} from '../hooks/useWebrtcBroadcast';
import {apiRequest} from '../lib/api';
import ObsRecordingGuide from './ObsRecordingGuide';
import {startStudioBroadcast} from '../lib/studioRecordingFallback';
import {useAutoDuck} from '../hooks/useAutoDuck';
import {useOutputFormat} from '../hooks/useOutputFormat';
import ObsBroadcast from './ObsBroadcast';
import WebrtcViewer from './WebrtcViewer';
import StudioPreviewMirror from './StudioPreviewMirror';
import LiveDestinations from './LiveDestinations';
import LiveSetListPicker from './LiveSetListPicker';
import AdminLiveAudience from './AdminLiveAudience';
import AdminLiveComments from './AdminLiveComments';
import StudioControlSection from './StudioControlSection';
import './adminLiveStudio.css';
import './studioControls.css';

const OBS_DEVICE=/obs|virtual/i;
const SETTINGS_TABS=[['studio','Setup',Layers],['destinations','Destinations',Share2],['obs','OBS recording',Video]];


export default function AdminLiveStudio({token,enabled,liveStream:initial,liveSessions=[],setListActions,onLiveStreamChange,onReviewLiveRequest}) {
 const {item:liveStream,loading,error,update}=useLiveStatus({token,admin:true,enabled,initial});
 const [previewAudioControlsTarget,setPreviewAudioControlsTarget]=useState(null);
 const [dismissedHint,setDismissedHint]=useState('');
 const [setListId,setSetListId]=useState('');
 const [title,setTitle]=useState(''),[detailsTried,setDetailsTried]=useState(false);
 const [cropSlot,setCropSlot]=useState(null);
 const [audience,setAudience]=useState('all'),priorAudience=useRef('all'),[audienceIds,setAudienceIds]=useState([]),[clientQuery,setClientQuery]=useState(''),[clientRows,setClientRows]=useState([]);
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
 const apply=item=>{if(!alive.current)return;update(item);onLiveStreamChange?.(item);};
 // The browser never records: on the OVH transport the relay records on the server, otherwise nothing is recorded.
 const start=async (title,outputs)=>{
  const result=await startStudioBroadcast({title,outputs,setListId,saveRecording:ovhRecording,audience,audienceUserIds:audienceIds,transport:ovhRecording?'ovh':'livekit',request:body=>apiRequest('/live-stream/webrtc/go-live',{method:'POST',token,body}),hasFolder:()=>false,askLocalOnly:async()=>false});
  apply(result.item);setTitle('');return result;};
 const end=async roomName=>{const result=await apiRequest('/live-stream/webrtc/end',{method:'POST',token,body:{roomName}});apply(result.item);setTitle('');setSetListId('none');setDetailsTried(false);};
 const ready=async roomName=>{const result=await apiRequest('/live-stream/webrtc/ready',{method:'POST',token,body:{roomName}});apply(result.item);};
 const webrtc=useWebrtcBroadcast({onGoLive:start,onEndLive:end,onReady:ready,getOutputs:()=>({}),getPortraitAudio:()=>null,isNativePortrait:()=>output.nativePortrait,requireRecording:ovhRecording,recordingEnabled:ovhRecording,expectedRoom:liveStream?.webrtcRoomName});
 const output=useOutputFormat();
 const previewReply=webrtc.statusMessage.startsWith('Private preview ready.')||webrtc.statusMessage==='Preview closed.';
 const controlHint=destinationFeedback||(!previewReply&&webrtc.statusMessage)||'';
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
 // After a reload or a halt, bring back what the live was set up with: the pause screen (also kept on the server), the session title.
 useEffect(()=>{if(!isLiveOnAir||!liveStream)return;setTitle(current=>current||liveStream.title||'');setSetListId(liveStream.liveSetListId||'none');},[isLiveOnAir,liveStream?.title,liveStream?.liveSetListId]);// eslint-disable-line react-hooks/exhaustive-deps
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
 // OBS is the only source: Open preview finds its Virtual Camera (and an OBS audio device, if one exists) by name. Nothing else is ever opened.
 const hasAudioInput=Boolean(webrtc.selectedAudioDeviceId);
 const [obsOpening,setObsOpening]=useState(false);
 const openObs=async(silent=false)=>{
  // Browsers hide device names until camera access was granted once: ask briefly, release it, then read the list.
  if(!silent)try{const probe=await navigator.mediaDevices.getUserMedia({video:true});probe.getTracks().forEach(track=>track.stop());}catch{/* the list below may still name it */}
  const devices=await navigator.mediaDevices.enumerateDevices().catch(()=>[]);
  const camera=devices.find(item=>item.kind==='videoinput'&&OBS_DEVICE.test(item.label)),audio=devices.find(item=>item.kind==='audioinput'&&OBS_DEVICE.test(item.label));
  if(!camera){if(!silent)adminToast('OBS Virtual Camera not found. In OBS click Start Virtual Camera, then try again.',true);return;}
  webrtc.setSelectedVideoDeviceId(camera.deviceId);webrtc.setSelectedAudioDeviceId(audio?.deviceId||'');
  void webrtc.selectSource('camera',null,audio?'mic':'none');setObsOpening(true);
 };
 // Opens the private preview by itself when OBS Virtual Camera appears; Go live then waits for the click.
 const autoObs=useRef();autoObs.current=()=>{if(enabled&&!webrtc.isPreviewing&&!webrtc.isBroadcasting&&!webrtc.previewBusy&&!webrtc.isConnecting&&!obsOpening&&!legacyObs&&!isLiveOnAir&&!reserved)void openObs(true);};
 useEffect(()=>{const run=()=>autoObs.current();run();const id=setInterval(run,4000);navigator.mediaDevices?.addEventListener?.('devicechange',run);return()=>{clearInterval(id);navigator.mediaDevices?.removeEventListener?.('devicechange',run);};},[enabled]);
 // Runs on the render after the device ids are set, so the preview opens on OBS exactly once.
 useEffect(()=>{if(!obsOpening)return;setObsOpening(false);void webrtc.preparePreview();},[obsOpening]);// eslint-disable-line react-hooks/exhaustive-deps
 // Picking another mixer device while the private preview is open reopens the preview on it.
 const lastMixer=useRef(webrtc.selectedAudioDeviceId);
 useEffect(()=>{if(lastMixer.current===webrtc.selectedAudioDeviceId)return;lastMixer.current=webrtc.selectedAudioDeviceId;if(webrtc.isPreviewing&&webrtc.audioMode==='mic'){if(webrtc.paused||webrtc.inputLost)void webrtc.setPausedAudio('mic');else if(!webrtc.isBroadcasting)void webrtc.preparePreview();}},[webrtc.selectedAudioDeviceId]);// eslint-disable-line react-hooks/exhaustive-deps
 // Picking another camera while the private preview is open reopens the preview on it.
 const lastCamera=useRef(webrtc.selectedVideoDeviceId);
 useEffect(()=>{if(lastCamera.current===webrtc.selectedVideoDeviceId)return;lastCamera.current=webrtc.selectedVideoDeviceId;if(webrtc.isPreviewing&&webrtc.sourceKind==='camera'){if(webrtc.paused||webrtc.inputLost)void webrtc.setPausedInput({kind:'camera'});else if(!webrtc.isBroadcasting)void webrtc.preparePreview();}},[webrtc.selectedVideoDeviceId]);// eslint-disable-line react-hooks/exhaustive-deps
 const previewFormat=output.format;

 return (
          <section id="admin-live-stream" className="admin-panel admin-live-stream-panel" aria-label="Live studio" data-hide-left={hidden.left?'1':undefined}>
            {error&&<p role="alert" className="admin-request-feedback">{error}</p>}
            <div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs">
              <div className="admin-live-tab-panel admin-live-sessions-page-panel" role="tabpanel">
              <div className="admin-live-single has-requests-aside">
              <div className={`admin-live-preview${previewFormat==='portrait'?' is-portrait-only':''}`}>
                {(webrtc.isPreviewing||webrtc.isBroadcasting)&&<div className="studio-preview-toolbar" role="toolbar" aria-label="Preview tools">{previewFormat!=='landscape'&&<span ref={setCropSlot} className="studio-preview-toolbar-crop"/>}</div>}
                <div className={`admin-live-monitor studio-preview-pair${previewFormat==='landscape'?' is-landscape-only':previewFormat==='portrait'?' is-portrait-only':''}`} ref={liveFrame} aria-label="Landscape and portrait previews">
                <section className="studio-preview-window" aria-label="Landscape preview" hidden={previewFormat==='portrait'}>
                 <header className="studio-preview-window-head"><h4>Landscape<em className="studio-source-tag">Landscape Source</em></h4></header>
                 <div className="admin-live-preview-frame-shell studio-preview-landscape" ref={primaryFrame}>

                  <div className="studio-output-source-target" ref={setLandscapeIndicators}/>
                  {webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting ? <><video ref={webrtc.videoRef} className="admin-live-preview-frame" autoPlay playsInline muted/>{webrtc.preflight&&<div className="pause-banner" role="status"><div className="pause-badge"><LoaderCircle size={13} className="studio-opening-spinner" aria-hidden="true"/><strong>GO LIVE PREFLIGHT</strong></div></div>}</> : isLiveOnAir ? (<WebrtcViewer key={session} token={token} sessionIdentity={session} muted showAudioControls audioControlsTarget={previewAudioControlsTarget}/>) : liveStream?.posterImage ? <img className="admin-live-preview-image" src={liveStream.posterImage} alt="" aria-hidden="true"/> : <div className="admin-live-preview-empty"><VideoOff size={18}/><span>{reserved?'Connecting source…':'No live source'}</span></div>}
                 </div>
                </section>
                {previewFormat!=='landscape'&&<StudioPreviewMirror cropSlot={cropSlot} source={previewFormat==='portrait'?'Source':'Crop of landscape'} primaryRef={primaryFrame} active={previewActive} posterImage={liveStream?.posterImage} waiting={reserved} indicatorRef={setPortraitIndicators} pan={previewFormat==='portrait'?.5:webrtc.portraitPan} onPan={previewFormat==='portrait'?undefined:webrtc.setPortraitPan}/>}
                </div>
                <div className="studio-audience-stack">
              {controlHint&&controlHint!==dismissedHint&&<div className={`studio-control-hint${' is-info'}`} role="status" aria-live="polite"><Info size={17} aria-hidden="true"/><p>{controlHint}</p><button type="button" className="studio-hint-close" aria-label="Dismiss message" title="Dismiss" onClick={()=>setDismissedHint(controlHint)}><X size={14} aria-hidden="true"/></button></div>}
                <AdminLiveAudience setListActions={setListActions} liveSessions={liveSessions} token={token} session={isLiveOnAir?session:null} enabled={enabled} onReview={onReviewLiveRequest}/>
                </div>
<div className="studio-comments-below"><AdminLiveComments token={token} session={isLiveOnAir?session:null} enabled={enabled}/></div>
<section ref={settingsArea} className="studio-control-dock studio-controls-redesign" aria-labelledby="studio-controller-title">
 <header className="studio-controller-heading"><button type="button" className="studio-column-button" onClick={()=>toggleColumn('left')} title={hidden.left?'Open the controls column':'Close the controls column'} aria-label={hidden.left?'Open the controls column':'Close the controls column'} aria-expanded={!hidden.left}>{hidden.left?<PanelLeftOpen size={20}/>:<PanelLeftClose size={20}/>}</button><h3 id="studio-controller-title">Live control</h3><div className="studio-controller-tools"><div className="studio-control-status" data-state={studioState} role="status"><strong>{{preflight:'Go live preflight',live:'On air',opening:'Opening preview',connecting:'Connecting',preview:'Private preview',offline:'OBS disconnected'}[studioState]}</strong></div>{studioState==='live'&&<LiveElapsedTimer key={session||'local-live'} session={session}/>}{statusBadges.map(badge=><span key={badge.key} className="studio-badge" data-tone={badge.tone} title={badge.title}>{badge.text}</span>)}</div></header>
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
 
 <StudioControlSection step="01" title="Session details" description="Give your live set a name."><div className="studio-session-row">
 <label className="studio-title"><span className="studio-field-caption">SESSION TITLE <b className="studio-required" aria-hidden="true">*</b></span><input required aria-required="true" aria-invalid={detailsTried&&!title.trim()} className={detailsTried&&!title.trim()?'is-invalid':''} value={title} placeholder="Name your live set" maxLength={180} disabled={webrtc.isConnecting} onChange={event=>setTitle(event.target.value)}/></label>
 <LiveSetListPicker invalid={detailsTried&&!setListId} token={token} value={setListId} onChange={setSetListId} disabled={webrtc.isConnecting||reserved||isLiveOnAir}/>
 </div></StudioControlSection>
 




 <StudioControlSection step="02" title="Audience" description="Who can see and watch this live."><div className="aud">
<label className="aud-row"><span className="aud-copy"><strong>This live session is test-only</strong><small>Hidden from guests and clients: no live badge, no playback, no live emails.</small></span><input className="aud-switch" type="checkbox" role="switch" aria-label="This live session is test-only" checked={(isLiveOnAir?(liveStream?.audience||'all'):audience)==='admins'} disabled={webrtc.isConnecting||reserved||isLiveOnAir} onChange={event=>{if(event.target.checked){if(audience!=='admins')priorAudience.current=audience;setAudience('admins');}else setAudience(priorAudience.current);}}/></label>
   <div className="aud-row aud-select"><span className="aud-copy"><strong>Live session domain</strong><small>Who can see and watch this live.</small></span>
    <select className="aud-input" aria-label="Live session domain" value={isLiveOnAir?(liveStream?.audience||'all'):audience} disabled={webrtc.isConnecting||reserved||isLiveOnAir} onChange={event=>setAudience(event.target.value)}><option value="all">All (guests, clients, admins)</option><option value="admins">Admins only</option><option value="clients">Clients only (and admins)</option><option value="specific">Specific clients</option></select></div>
   {audience==='specific'&&!isLiveOnAir&&<div className="aud-clients"><input className="aud-input" type="search" placeholder="Search clients" aria-label="Search clients" value={clientQuery} onChange={event=>setClientQuery(event.target.value)}/>{audienceIds.length===0&&<small>Pick at least one client, or only admins will see this live.</small>}<ul>{clientRows.map(client=><li key={client.id}><label><input type="checkbox" checked={audienceIds.includes(client.id)} onChange={event=>setAudienceIds(ids=>event.target.checked?[...ids,client.id]:ids.filter(id=>id!==client.id))}/> {client.name||client.username} <small>{client.email}</small></label></li>)}</ul></div>}
 </div></StudioControlSection>
 <StudioControlSection step="03" title="OBS stream" description="Stream straight from OBS to the OVH relay. Prepare OBS, paste the server and token into OBS, then start streaming. No browser camera is used." className="studio-sources-card"><div className="studio-block"><ObsBroadcast token={token} title={title.trim()} missing={[!title.trim()&&'a session title',!setListId&&'a set list'].filter(Boolean)} item={liveStream} onUpdate={item=>{apply(item);}}/></div></StudioControlSection>
 <fieldset className="admin-live-settings studio-source-settings" disabled={loading||Boolean(error)}>
  <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot"/>
 </fieldset>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-obs" aria-labelledby="studio-settings-tab-obs" hidden={settingsTab!=='obs'} tabIndex={0}><ObsRecordingGuide/></div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-destinations" aria-labelledby="studio-settings-tab-destinations" hidden={settingsTab!=='destinations'} tabIndex={0}>
<LiveDestinations format={output.format} compact onFeedback={setDestinationFeedback} onSetup={openDestination} landscapeTarget={landscapeIndicators} portraitTarget={portraitIndicators} token={token} enabled={enabled} roomName={liveStream?.broadcastMode==='whep'?liveStream?.obs?.roomName:liveStream?.webrtcRoomName} isLive={isLiveOnAir} mode={liveStream?.broadcastMode}/>
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
