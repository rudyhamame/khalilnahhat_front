import {useEffect,useRef,useState} from 'react';
import {Radio,VideoOff,Minimize2,Maximize2,RefreshCw,Settings,X,FlipHorizontal2,Sun,Eye,EyeOff,LoaderCircle} from 'lucide-react';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {useWebrtcBroadcast} from '../hooks/useWebrtcBroadcast';
import {apiRequest} from '../lib/api';
import CameraAppearanceControls from './CameraAppearanceControls';
import AdminSelect from './AdminSelect';
import {PREVIEW_FORMATS,previewFormat} from '../lib/previewFormats';
import ObsBroadcast from './ObsBroadcast';
import WebrtcViewer from './WebrtcViewer';
import LiveDestinations from './LiveDestinations';
import {LIVE_AUDIO_CONTROLS} from '../lib/liveAudioProcessing';
import MicLevelMeter from './MicLevelMeter';
import VoiceTestMeter from './VoiceTestMeter';
import LiveGoalPicker from './LiveGoalPicker';
import AdminLiveAudience from './AdminLiveAudience';
import './adminLiveStudio.css';

const SETTINGS_TABS=[['studio','Echo Studio'],['camera','Camera'],['audio','Audio'],['controls','Live controls'],['destinations','Stream Destinations']];

export default function AdminLiveStudio({token,enabled,liveStream:initial,onLiveStreamChange,onReviewLiveRequest}) {
 const {item:liveStream,loading,error,update}=useLiveStatus({token,admin:true,enabled,initial});
 const [broadcastSource,setBroadcastSource]=useState('browser'),[retry,setRetry]=useState(0);
 const [previewFormatId,setPreviewFormatId]=useState(()=>{try{return previewFormat(localStorage.getItem('echo-admin-preview-orientation')).id;}catch{return previewFormat().id;}});
 const format=previewFormat(previewFormatId),previewRatio=format.w/format.h;
 const [previewAudioControlsTarget,setPreviewAudioControlsTarget]=useState(null),[liveFullscreen,setLiveFullscreen]=useState(false);
 const [title,setTitle]=useState('');
 const [appearanceOpen,setAppearanceOpen]=useState(false);
 const [settingsTab,setSettingsTab]=useState('studio');
 const [socialToolbar,setSocialToolbar]=useState(null);
 const [destinationFeedback,setDestinationFeedback]=useState('');
 const [videoSize,setVideoSize]=useState(null);
 const liveFrame=useRef(null),settingsDialog=useRef(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const sync=()=>setLiveFullscreen(document.fullscreenElement===liveFrame.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
 useEffect(()=>{
   const frame=liveFrame.current;
   const measure=event=>{const video=event.target;if(video?.tagName!=='VIDEO'||!video.videoWidth||!video.videoHeight)return;setVideoSize(previous=>previous?.w===video.videoWidth&&previous?.h===video.videoHeight?previous:{w:video.videoWidth,h:video.videoHeight});};
   frame?.addEventListener('loadedmetadata',measure,true);frame?.addEventListener('resize',measure,true);
   return()=>{frame?.removeEventListener('loadedmetadata',measure,true);frame?.removeEventListener('resize',measure,true);};
 },[]);
 const changePreviewOrientation=event=>{const value=event.target.value;setPreviewFormatId(value);try{localStorage.setItem('echo-admin-preview-orientation',value);}catch{/* Keep this visit's choice. */}};
 const toggleLiveFullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else liveFrame.current?.requestFullscreen?.().catch(()=>{});};
 const broadcastTitle=title.trim()||liveStream?.title||'';
 const apply=item=>{if(!alive.current)return;update(item);onLiveStreamChange?.(item);};
 const start=async title=>{const result=await apiRequest('/live-stream/webrtc/go-live',{method:'POST',token,body:{title}});apply(result.item);setTitle('');return result;};
 const end=async roomName=>{const result=await apiRequest('/live-stream/webrtc/end',{method:'POST',token,body:{roomName}});apply(result.item);};
 const ready=async roomName=>{const result=await apiRequest('/live-stream/webrtc/ready',{method:'POST',token,body:{roomName}});apply(result.item);};
 const webrtc=useWebrtcBroadcast({onGoLive:start,onEndLive:end,onReady:ready,expectedRoom:liveStream?.webrtcRoomName});
 const {setPortrait}=webrtc;
 useEffect(()=>{setPortrait(previewRatio<1);},[previewRatio,setPortrait]);
 const reserved=Boolean(liveStream?.obs?.roomName||liveStream?.webrtcRoomName),isLiveOnAir=Boolean(liveStream?.isLive),session=liveSessionIdentity(liveStream);
 const obsSelected=reserved||isLiveOnAir?liveStream?.broadcastSource==='obs':broadcastSource==='obs';
 const displaySize=(webrtc.isPreviewing||webrtc.isBroadcasting||isLiveOnAir)&&videoSize?videoSize:format;
 const displayRatio=displaySize.w/displaySize.h;
 const captureLocked=webrtc.isConnecting||webrtc.previewBusy||webrtc.isPreviewing||webrtc.isBroadcasting;
 const chooseFormat=event=>{changePreviewOrientation(event);webrtc.setPortrait(previewFormat(event.target.value).w<previewFormat(event.target.value).h);};
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
            {(reserved||isLiveOnAir)&&<p className="admin-live-recording-status" role="status">{obsSelected&&liveStream?.obs?.saveRecording===false?'Recording off · live only':liveStream?.recording?<>Recording capture: {liveStream.recording.captureState||'unknown'} · {liveStream.recording.savedPartCount||0} parts saved{liveStream.recording.warning&&<> · {liveStream.recording.warning}</>}{liveStream.recording.error&&<> · {liveStream.recording.error}</>}</>:'Recording status not yet confirmed'} · <a href="/admin/echo?tab=live-archive">Live Recordings</a></p>}
            {error&&<p role="alert" className="admin-request-feedback">{error}</p>}
            </div><div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs">
              <div className="admin-live-tab-panel admin-live-sessions-page-panel" role="tabpanel">
              <div className="admin-live-single has-requests-aside">
              <AdminLiveAudience token={token} session={isLiveOnAir?session:null} enabled={enabled} onReview={onReviewLiveRequest}/>
              <div className="admin-live-preview">
                <div className="admin-live-monitor" data-orientation={displayRatio<1?'portrait':displayRatio>1?'landscape':'square'} style={{'--preview-ratio':`${displaySize.w} / ${displaySize.h}`,'--preview-max-width':`${70*displayRatio}dvh`}}>
                <div className="admin-live-preview-frame-shell" ref={liveFrame}>
                  <p className="studio-preview-label">Preview</p>
                  <VoiceTestMeter track={webrtc.micMediaStreamTrack} deviceId={webrtc.selectedAudioDeviceId} muted={webrtc.micMuted}/>
                  <div className="admin-live-preview-head" role="group" aria-label="Preview toolbar">
                    {!obsSelected&&!isLiveOnAir&&!reserved&&!webrtc.isBroadcasting&&<>
                      <button type="button" className="admin-live-fullscreen studio-preview-toggle" disabled={webrtc.isConnecting||webrtc.previewBusy} aria-label={webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview'} title={webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview · not on air'} onClick={webrtc.isPreviewing?webrtc.closePreview:webrtc.preparePreview}>{webrtc.previewBusy?<LoaderCircle size={18} className="studio-opening-spinner" aria-hidden="true"/>:webrtc.isPreviewing?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button>
                      <button type="button" className="admin-live-fullscreen studio-go-live" disabled={!webrtc.isPreviewing||webrtc.isConnecting||webrtc.previewBusy} aria-label="Go live on Echo" title="Go live on Echo" onClick={()=>webrtc.goLive(broadcastTitle)}><Radio size={18} aria-hidden="true"/></button>
                    </>}
                    <span className="studio-toolbar-separator" role="separator" aria-orientation="horizontal"/>
                    <div className="studio-social-toolbar" ref={setSocialToolbar} role="group" aria-label="Social live outputs"/>
                    <span className="studio-toolbar-separator" role="separator" aria-orientation="horizontal"/>
                    {isLiveOnAir&&!webrtc.isBroadcasting&&<button type="button" className="admin-live-fullscreen" onClick={()=>setRetry(value=>value+1)} aria-label="Reconnect preview" title="Reconnect preview"><RefreshCw size={14}/></button>}
                    <button type="button" className="admin-live-fullscreen studio-camera-mirror" aria-label="Mirror camera left/right" aria-pressed={webrtc.cameraMirrored} title={webrtc.cameraMirrored?'Restore camera orientation · affects live output':'Mirror camera left/right · affects live output'} disabled={!(webrtc.isPreviewing||webrtc.isBroadcasting)||webrtc.cameraOff||webrtc.mirrorBusy||webrtc.previewBusy||webrtc.isConnecting} onClick={webrtc.toggleCameraMirror}><FlipHorizontal2 size={17} aria-hidden="true"/></button>
                    <button type="button" className="admin-live-fullscreen" aria-label="Beauty and lighting" aria-expanded={appearanceOpen} title="Beauty and lighting · affects live output" onClick={()=>setAppearanceOpen(value=>!value)}><Sun size={17} aria-hidden="true"/></button>
                    <button type="button" className="admin-live-settings-open" aria-haspopup="dialog" aria-label="Stream settings" title="Stream settings" onClick={()=>settingsDialog.current?.showModal()}><Settings size={18} aria-hidden="true"/></button>
                    <button type="button" className="admin-live-fullscreen" onClick={toggleLiveFullscreen} aria-label={liveFullscreen ? 'Exit full screen' : 'Full screen'} title={liveFullscreen ? 'Exit full screen' : 'Full screen'}>{liveFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                  </div>
                  {webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting ? <video ref={webrtc.videoRef} className="admin-live-preview-frame" autoPlay playsInline muted/> : isLiveOnAir ? <WebrtcViewer key={session+':'+retry} token={token} sessionIdentity={session} muted showAudioControls audioControlsTarget={previewAudioControlsTarget}/> : liveStream?.posterImage ? <img className="admin-live-preview-image" src={liveStream.posterImage} alt="" aria-hidden="true"/> : <div className="admin-live-preview-empty"><VideoOff size={18}/><span>{reserved?'Connecting source…':'No live source'}</span></div>}
                  {appearanceOpen&&<CameraAppearanceControls value={webrtc.cameraAppearance} onChange={webrtc.updateCameraAppearance} onClose={()=>setAppearanceOpen(false)} disabled={webrtc.mirrorBusy||webrtc.previewBusy||webrtc.isConnecting||webrtc.cameraOff||(isLiveOnAir&&!webrtc.isBroadcasting)}/>}
                  <div className="studio-preview-status" role="status"><strong>{isLiveOnAir?'On air':webrtc.previewBusy?'Opening preview':webrtc.isConnecting||reserved?'Connecting':webrtc.isPreviewing?'Private preview':'Offline'}</strong>{(destinationFeedback||webrtc.statusMessage)&&<span>{destinationFeedback||webrtc.statusMessage}</span>}</div>
                </div>
                </div>
<dialog ref={settingsDialog} className="admin-live-settings-dialog" aria-labelledby="admin-live-settings-title" onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close();}}>
 <header className="admin-live-settings-head"><h3 id="admin-live-settings-title">Stream settings</h3><button type="button" className="admin-live-settings-close" aria-label="Close stream settings" onClick={()=>settingsDialog.current?.close()}><X size={18}/></button></header>
 <div className="studio-settings-tabs" role="tablist" aria-label="Stream settings sections" onKeyDown={event=>{
   const tabs=SETTINGS_TABS.map(([id])=>id),index=tabs.indexOf(settingsTab);
   const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
   if(next===null)return;event.preventDefault();setSettingsTab(tabs[next]);event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
 }}>
  {SETTINGS_TABS.map(([id,label])=><button key={id} type="button" role="tab" id={`studio-settings-tab-${id}`} aria-controls={`studio-settings-panel-${id}`} aria-selected={settingsTab===id} tabIndex={settingsTab===id?0:-1} onClick={()=>setSettingsTab(id)}>{label}</button>)}
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-studio" aria-labelledby="studio-settings-tab-studio" hidden={settingsTab!=='studio'} tabIndex={0}>
 <section className="studio-console" aria-label="Session and source">
 <header><div><p className="detail-label">ECHO STUDIO</p><h3>Session & source</h3></div><span className="studio-status">{webrtc.isBroadcasting?'Live from this browser':webrtc.isPreviewing?'Private preview · not on air':obsSelected?'OBS secondary source':'Browser studio'}</span></header>
 <label className="studio-title">Live stream title<input value={title} placeholder={liveStream?.title||'Name your live set'} maxLength={180} disabled={webrtc.isConnecting} onChange={event=>setTitle(event.target.value)}/></label>
 <fieldset className="admin-live-settings" disabled={loading||Boolean(error)}>
  <LiveGoalPicker token={token} goal={liveStream?.goal} onChange={apply}/>
  <label>Source<AdminSelect aria-label="Live stream source" value={obsSelected?'obs':'browser'} disabled={reserved||isLiveOnAir||captureLocked} onChange={event=>setBroadcastSource(event.target.value)}><option value="browser">Echo browser studio · primary</option><option value="obs">OBS Studio · secondary</option></AdminSelect></label>
  {obsSelected&&<ObsBroadcast token={token} title={broadcastTitle} item={liveStream} onUpdate={item=>{apply(item);setTitle('');}}/>}
  <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot"/>
 </fieldset>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-camera" aria-labelledby="studio-settings-tab-camera" hidden={settingsTab!=='camera'} tabIndex={0}>
 <section className="studio-console" aria-label="Camera settings">
 <header><h3>Camera & capture</h3></header>
 <p>Close private preview before changing the camera, quality or framing.</p>
 <div className="studio-inputs">
  <label>Camera · GoPro USB webcam<AdminSelect aria-label="Studio camera" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.selectedVideoDeviceId} onChange={event=>webrtc.setSelectedVideoDeviceId(event.target.value)}><option value="">Default camera</option>{webrtc.videoInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Camera ${index+1}`}</option>)}</AdminSelect></label>
  <label>Capture quality<AdminSelect aria-label="Studio capture quality" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.quality} onChange={event=>webrtc.setQuality(event.target.value)}><option value="1080">1080p · Full HD · 30 fps</option><option value="720">720p · 30 fps</option><option value="360">360p · low bandwidth</option></AdminSelect></label>
  <label>Camera framing<AdminSelect aria-label="Studio framing" value={previewFormatId} disabled={captureLocked||reserved||isLiveOnAir} onChange={chooseFormat}>{PREVIEW_FORMATS.filter(item=>['youtube-landscape','instagram-reel-portrait'].includes(item.id)).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</AdminSelect></label>
 </div>
 <p className="studio-help">1080p requests Full HD capture and a higher-quality Echo stream. The camera may provide a lower resolution. Higher quality adds upload and graphics load, especially with beauty filters. YouTube/Instagram outputs and recordings currently use their separate 720p settings.{videoSize&&(webrtc.isPreviewing||webrtc.isBroadcasting)&&<> Camera output: <strong>{videoSize.w} × {videoSize.h}</strong>.</>}</p>
 <p className="studio-help">Choose the GoPro exposed by its USB webcam driver. Preview requests camera permission; device names appear after permission is granted.</p>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-audio" aria-labelledby="studio-settings-tab-audio" hidden={settingsTab!=='audio'} tabIndex={0}>
 <section className="studio-console" aria-label="Audio settings">
 <header><h3>Audio input & voice</h3></header>
 <p>Choose one mic/aux or built-in microphone input. Close preview to switch inputs or audio mode. Use headphones to avoid feedback.</p>
 <div className="studio-inputs">
  <label>Audio · mic/aux or built-in microphone<AdminSelect aria-label="Studio audio input" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.selectedAudioDeviceId} onChange={event=>webrtc.setSelectedAudioDeviceId(event.target.value)}><option value="">Default input</option>{webrtc.audioInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Audio input ${index+1}`}</option>)}</AdminSelect></label>
  <label>Audio mode<AdminSelect aria-label="Studio audio mode" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.audioMode} onChange={event=>webrtc.setAudioMode(event.target.value)}><option value="music">Music / aux · natural stereo</option><option value="voice">Voice · speech processing</option></AdminSelect></label>
 </div>
 <fieldset className="studio-audio-processing" disabled={webrtc.processingBusy||webrtc.previewBusy||webrtc.isConnecting||(isLiveOnAir&&!webrtc.isBroadcasting)}>
  <legend>Live audio · voice echo &amp; noise</legend>
  <p>For voice echo, enable echo cancellation and keep the returned live player muted. Use headphones. These controls affect this browser’s outgoing input, including YouTube; they cannot remove a duplicate audio source in OBS or a mixer.</p>
  <div className="studio-audio-switches">{LIVE_AUDIO_CONTROLS.map(control=><label key={control.key} title={control.help}><input type="checkbox" checked={webrtc.processing[control.key]} onChange={event=>webrtc.updateAudioProcessing({[control.key]:event.target.checked})}/><span>{control.label}<small>{control.help}</small></span></label>)}</div>
  <button type="button" className="admin-live-control" onClick={()=>webrtc.updateAudioProcessing(null)}>Reset to {webrtc.audioMode==='voice'?'voice':'music'} defaults</button>
  {webrtc.processingApplied&&<p className="studio-audio-applied">Input reports: {LIVE_AUDIO_CONTROLS.map(control=>`${control.label}: ${webrtc.processingApplied[control.key]===null?'not reported':webrtc.processingApplied[control.key]?'on':'off'}`).join(' · ')}</p>}
  {webrtc.processingMessage&&<p role="status">{webrtc.processingMessage}</p>}
 </fieldset>
 <MicLevelMeter deviceId={webrtc.selectedAudioDeviceId} track={webrtc.micMediaStreamTrack} enabled={enabled&&Boolean(webrtc.micMediaStreamTrack)} showVocalTune={webrtc.audioMode==='voice'}/>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-controls" aria-labelledby="studio-settings-tab-controls" hidden={settingsTab!=='controls'} tabIndex={0}>
 <section className="studio-console" aria-label="Live stream controls">
 <header><h3>Live controls</h3></header>
 <p>Use the eye and live icons on the preview toolbar to open private preview and go live.</p>
 {obsSelected?<p>OBS is selected. Manage its connection in the Echo Studio tab. End its connection before switching to the browser studio.</p>:<>
 <div className="studio-transport" role="group" aria-label="Studio transport">
  {(webrtc.isPreviewing||webrtc.isBroadcasting)&&<><button type="button" className="admin-live-control" onClick={webrtc.toggleMicrophone} aria-pressed={webrtc.micMuted}>{webrtc.micMuted?'Unmute input':'Mute input'}</button><button type="button" className="admin-live-control" onClick={webrtc.toggleCamera} aria-pressed={webrtc.cameraOff}>{webrtc.cameraOff?'Enable camera':'Disable camera'}</button></>}
  {(isLiveOnAir||reserved)&&<button type="button" className="admin-live-control admin-live-control-delete" disabled={webrtc.isConnecting} onClick={webrtc.endLive}>End {liveStream?.broadcastSource==='android'?'Android':'Echo'} live stream</button>}
 </div>
 </>}
 <p className="admin-live-access-note">Echo audience must sign in. YouTube and Instagram audiences follow those platforms’ access settings. Keep this tab open while using its camera/audio.</p>
 </section>
 </div>
 <div className="studio-settings-panel" role="tabpanel" id="studio-settings-panel-destinations" aria-labelledby="studio-settings-tab-destinations" hidden={settingsTab!=='destinations'} tabIndex={0}>
<LiveDestinations onFeedback={setDestinationFeedback} toolbarTarget={socialToolbar} token={token} enabled={enabled} roomName={liveStream?.webrtcRoomName} isLive={isLiveOnAir} mode={liveStream?.broadcastMode}/>
 </div>
</dialog>
              </div>
            </div>
              </div>
            </div>

           
          </section>

 );
}
