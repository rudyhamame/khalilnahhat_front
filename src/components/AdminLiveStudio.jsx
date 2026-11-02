import {useEffect,useRef,useState} from 'react';
import {Radio,VideoOff,Minimize2,Maximize2,RefreshCw,Settings,X} from 'lucide-react';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {useWebrtcBroadcast} from '../hooks/useWebrtcBroadcast';
import {apiRequest} from '../lib/api';
import AdminSelect from './AdminSelect';
import {PREVIEW_FORMATS,previewFormat} from '../lib/previewFormats';
import ObsBroadcast from './ObsBroadcast';
import WebrtcViewer from './WebrtcViewer';
import LiveDestinations from './LiveDestinations';
import MicLevelMeter from './MicLevelMeter';
import LiveGoalPicker from './LiveGoalPicker';
import AdminLiveAudience from './AdminLiveAudience';
import './adminLiveStudio.css';

export default function AdminLiveStudio({token,enabled,liveStream:initial,onLiveStreamChange,onReviewLiveRequest}) {
 const {item:liveStream,loading,error,update}=useLiveStatus({token,admin:true,enabled,initial});
 const [broadcastSource,setBroadcastSource]=useState('browser'),[retry,setRetry]=useState(0);
 const [previewFormatId,setPreviewFormatId]=useState(()=>{try{return previewFormat(localStorage.getItem('echo-admin-preview-orientation')).id;}catch{return previewFormat().id;}});
 const format=previewFormat(previewFormatId),previewRatio=format.w/format.h;
 const [previewAudioControlsTarget,setPreviewAudioControlsTarget]=useState(null),[liveFullscreen,setLiveFullscreen]=useState(false);
 const [title,setTitle]=useState('');
 const liveFrame=useRef(null),settingsDialog=useRef(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const sync=()=>setLiveFullscreen(document.fullscreenElement===liveFrame.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
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
                <div className="admin-live-monitor" data-orientation={previewRatio<1?'portrait':previewRatio>1?'landscape':'square'} style={{'--preview-ratio':`${format.w} / ${format.h}`}}>
                <div className="admin-live-preview-frame-shell" ref={liveFrame}>
                  <div className="admin-live-preview-head">
                    <p className="detail-label">Preview</p>
                    <span>{isLiveOnAir ? 'On air' : webrtc.isPreviewing?'Private preview':'Offline'}</span>
                    {isLiveOnAir&&!webrtc.isBroadcasting&&<button type="button" className="admin-live-fullscreen" onClick={()=>setRetry(value=>value+1)} aria-label="Reconnect preview" title="Reconnect preview"><RefreshCw size={14}/></button>}
                    <button type="button" className="admin-live-settings-open" aria-haspopup="dialog" aria-label="Stream settings" title="Stream settings" onClick={()=>settingsDialog.current?.showModal()}><Settings size={18} aria-hidden="true"/></button>
                    <button type="button" className="admin-live-fullscreen" onClick={toggleLiveFullscreen} aria-label={liveFullscreen ? 'Exit full screen' : 'Full screen'} title={liveFullscreen ? 'Exit full screen' : 'Full screen'}>{liveFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                  </div>
                  {webrtc.isPreviewing||webrtc.previewBusy||webrtc.isBroadcasting||webrtc.isConnecting ? <video ref={webrtc.videoRef} className="admin-live-preview-frame" autoPlay playsInline muted/> : isLiveOnAir ? <WebrtcViewer key={session+':'+retry} token={token} sessionIdentity={session} muted showAudioControls audioControlsTarget={previewAudioControlsTarget}/> : liveStream?.posterImage ? <img className="admin-live-preview-image" src={liveStream.posterImage} alt="" aria-hidden="true"/> : <div className="admin-live-preview-empty"><VideoOff size={18}/><span>{reserved?'Connecting source…':'No live source'}</span></div>}
                </div>
                </div>
<section className="studio-console" aria-label="Browser studio controls">
 <header><div><p className="detail-label">ECHO STUDIO</p><h3>Your camera. Your sound.</h3></div><span className="studio-status">{webrtc.isBroadcasting?'Live from this browser':webrtc.isPreviewing?'Private preview · not on air':obsSelected?'OBS secondary source':'Browser studio'}</span></header>
 {obsSelected?<p>OBS is selected{isLiveOnAir?' and on air':''}. Use Stream settings to manage it. End its connection before switching to the browser studio.</p>:<>
 <label className="studio-title">Live stream title<input value={title} placeholder={liveStream?.title||'Name your live set'} maxLength={180} disabled={webrtc.isConnecting} onChange={event=>setTitle(event.target.value)}/></label>
 <div className="studio-inputs">
  <label>Camera · GoPro USB webcam<AdminSelect aria-label="Studio camera" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.selectedVideoDeviceId} onChange={event=>webrtc.setSelectedVideoDeviceId(event.target.value)}><option value="">Default camera</option>{webrtc.videoInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Camera ${index+1}`}</option>)}</AdminSelect></label>
  <label>Audio · mic/aux or built-in microphone<AdminSelect aria-label="Studio audio input" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.selectedAudioDeviceId} onChange={event=>webrtc.setSelectedAudioDeviceId(event.target.value)}><option value="">Default input</option>{webrtc.audioInputs.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Audio input ${index+1}`}</option>)}</AdminSelect></label>
  <label>Audio mode<AdminSelect aria-label="Studio audio mode" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.audioMode} onChange={event=>webrtc.setAudioMode(event.target.value)}><option value="music">Music / aux · natural stereo</option><option value="voice">Voice · speech processing</option></AdminSelect></label>
  <label>Capture quality<AdminSelect aria-label="Studio capture quality" disabled={captureLocked||reserved||isLiveOnAir} value={webrtc.quality} onChange={event=>webrtc.setQuality(event.target.value)}><option value="720">720p · 30 fps</option><option value="360">360p · low bandwidth</option></AdminSelect></label>
  <label>Camera framing<AdminSelect aria-label="Studio framing" value={previewFormatId} disabled={captureLocked||reserved||isLiveOnAir} onChange={chooseFormat}>{PREVIEW_FORMATS.filter(item=>['youtube-landscape','instagram-reel-portrait'].includes(item.id)).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</AdminSelect></label>
 </div>
 <p className="studio-help">Choose the GoPro exposed by its USB webcam driver, then select one audio input. Preview requests device permission; device names appear after permission is granted. Close preview to change capture settings. Use headphones to avoid feedback.</p>
 <MicLevelMeter deviceId={webrtc.selectedAudioDeviceId} track={webrtc.micMediaStreamTrack} enabled={enabled&&Boolean(webrtc.micMediaStreamTrack)} showVocalTune={webrtc.audioMode==='voice'}/>
 <div className="studio-transport" role="group" aria-label="Studio transport">
  {!isLiveOnAir&&!reserved&&!webrtc.isBroadcasting&&<><button type="button" className="admin-live-control" disabled={webrtc.isConnecting||webrtc.previewBusy} onClick={webrtc.isPreviewing?webrtc.closePreview:webrtc.preparePreview}>{webrtc.previewBusy?'Opening devices…':webrtc.isPreviewing?'Close private preview':'Open private preview'}</button><button type="button" className="admin-live-control admin-live-control-start" disabled={!webrtc.isPreviewing||webrtc.isConnecting||webrtc.previewBusy} onClick={()=>webrtc.goLive(broadcastTitle)}><Radio size={16}/>Go live on Echo</button></>}
  {(webrtc.isPreviewing||webrtc.isBroadcasting)&&<><button type="button" className="admin-live-control" onClick={webrtc.toggleMicrophone} aria-pressed={webrtc.micMuted}>{webrtc.micMuted?'Unmute input':'Mute input'}</button><button type="button" className="admin-live-control" onClick={webrtc.toggleCamera} aria-pressed={webrtc.cameraOff}>{webrtc.cameraOff?'Enable camera':'Disable camera'}</button></>}
  {(isLiveOnAir||reserved)&&<button type="button" className="admin-live-control admin-live-control-delete" disabled={webrtc.isConnecting} onClick={webrtc.endLive}>End {liveStream?.broadcastSource==='android'?'Android':'Echo'} live stream</button>}
 </div>
 </>}
 {webrtc.statusMessage&&<p className="admin-request-feedback" role="status">{webrtc.statusMessage}</p>}
 <p className="admin-live-access-note">Echo audience must sign in. YouTube and Instagram audiences follow those platforms’ access settings. Keep this tab open while using its camera/audio.</p>
</section>
<LiveDestinations token={token} enabled={enabled} roomName={liveStream?.webrtcRoomName} isLive={isLiveOnAir} mode={liveStream?.broadcastMode}/>
<dialog ref={settingsDialog} className="admin-live-settings-dialog" aria-labelledby="admin-live-settings-title" onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close();}}>
 <header className="admin-live-settings-head"><h3 id="admin-live-settings-title">Stream settings · secondary sources</h3><button type="button" className="admin-live-settings-close" aria-label="Close stream settings" onClick={()=>settingsDialog.current?.close()}><X size={18}/></button></header>
 <fieldset className="admin-live-settings" disabled={loading||Boolean(error)}>
  <LiveGoalPicker token={token} goal={liveStream?.goal} onChange={apply}/>
  <label>Source<AdminSelect aria-label="Live stream source" value={obsSelected?'obs':'browser'} disabled={reserved||isLiveOnAir||captureLocked} onChange={event=>setBroadcastSource(event.target.value)}><option value="browser">Echo browser studio · primary</option><option value="obs">OBS Studio · secondary</option></AdminSelect></label>
  {obsSelected&&<ObsBroadcast token={token} title={broadcastTitle} item={liveStream} onUpdate={item=>{apply(item);setTitle('');}}/>}
  <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot"/>
 </fieldset>
</dialog>
              </div>
            </div>
              </div>
            </div>

           
          </section>

 );
}
