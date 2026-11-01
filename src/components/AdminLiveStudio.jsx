import {useEffect,useRef,useState} from 'react';
import {Radio,Video,VideoOff,Minimize2,Maximize2,RefreshCw,Settings,X} from 'lucide-react';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {useWebrtcBroadcast} from '../hooks/useWebrtcBroadcast';
import {apiRequest} from '../lib/api';
import AdminSelect from './AdminSelect';
import ObsBroadcast from './ObsBroadcast';
import WebrtcViewer from './WebrtcViewer';
import MicLevelMeter from './MicLevelMeter';
import LiveGoalPicker from './LiveGoalPicker';
import AdminLiveAudience from './AdminLiveAudience';
import './adminLiveStudio.css';

export default function AdminLiveStudio({token,enabled,liveStream:initial,onLiveStreamChange,onReviewLiveRequest}) {
 const {item:liveStream,loading,error,refresh,update}=useLiveStatus({token,admin:true,enabled,initial});
 const [broadcastSource,setBroadcastSource]=useState('obs'),[retry,setRetry]=useState(0);
 const [previewOrientation,setPreviewOrientation]=useState(()=>{try{return localStorage.getItem('echo-admin-preview-orientation')==='portrait'?'portrait':'landscape';}catch{return 'landscape';}});
 const [previewAudioControlsTarget,setPreviewAudioControlsTarget]=useState(null),[liveFullscreen,setLiveFullscreen]=useState(false);
 const [title,setTitle]=useState(''),[titleBusy,setTitleBusy]=useState(false),[titleError,setTitleError]=useState('');
 const liveFrame=useRef(null),previewBox=useRef(null),settingsDialog=useRef(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const sync=()=>setLiveFullscreen(document.fullscreenElement===liveFrame.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
 const changePreviewOrientation=event=>{const value=event.target.value;setPreviewOrientation(value);try{localStorage.setItem('echo-admin-preview-orientation',value);}catch{/* Keep this visit's choice. */}};
 // The left column (preview + requests) is exactly as wide as the video frame: the frame fills the monitor's height at its aspect ratio, and the grid follows.
 useEffect(()=>{
  const shell=liveFrame.current,box=previewBox.current,monitor=shell?.parentElement,grid=box?.parentElement;if(!shell||!box||!monitor||!grid)return undefined;
  const narrow=matchMedia('(max-width: 1000px)');
  const fit=()=>{if(narrow.matches){grid.style.removeProperty('--live-left');return;}const extra=Math.max(0,box.getBoundingClientRect().width-monitor.getBoundingClientRect().width),ratio=previewOrientation==='portrait'?9/16:16/9;grid.style.setProperty('--live-left',`${Math.floor(monitor.clientHeight*ratio+extra)}px`);};
  fit();const observer=new ResizeObserver(fit);observer.observe(monitor);narrow.addEventListener('change',fit);
  return()=>{observer.disconnect();narrow.removeEventListener('change',fit);grid.style.removeProperty('--live-left');};
 },[previewOrientation]);
 const toggleLiveFullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else liveFrame.current?.requestFullscreen?.().catch(()=>{});};
 const apply=item=>{if(!alive.current)return;update(item);onLiveStreamChange?.(item);};
 const start=async title=>{const result=await apiRequest('/live-stream/webrtc/go-live',{method:'POST',token,body:{title}});apply(result.item);return result;};
 const end=async roomName=>{const result=await apiRequest('/live-stream/webrtc/end',{method:'POST',token,body:{roomName}});apply(result.item);};
 const ready=async roomName=>{const result=await apiRequest('/live-stream/webrtc/ready',{method:'POST',token,body:{roomName}});apply(result.item);};
 const webrtc=useWebrtcBroadcast({onGoLive:start,onEndLive:end,onReady:ready,expectedRoom:liveStream?.webrtcRoomName});
 const reserved=Boolean(liveStream?.obs?.roomName||liveStream?.webrtcRoomName),isLiveOnAir=Boolean(liveStream?.isLive),session=liveSessionIdentity(liveStream);
 const obsSelected=reserved||isLiveOnAir?liveStream?.broadcastSource==='obs':broadcastSource==='obs';
 const saveTitle=async event=>{event.preventDefault();if(titleBusy)return;setTitleBusy(true);setTitleError('');try{const result=await apiRequest('/live-stream/details',{method:'PATCH',token,body:{title,roomName:liveStream?.obs?.roomName||liveStream?.webrtcRoomName||''}});apply(result.item);setTitle('');}catch(error){setTitleError(error.message);}finally{setTitleBusy(false);}};
 return (
          <section id="admin-live-stream" className="admin-panel admin-live-stream-panel" aria-label="Live studio">
            <div><div className="section-label admin-panel-head">
              <div className="admin-panel-head-copy">
                <p className="section-number">
                  <span className="section-number-mark">KN//</span>
                  <span className="section-number-value">00</span>
                </p>
                <h2 className="admin-title-with-icon"><Radio size={18} aria-hidden="true" /><span className="admin-crumb">Live</span><span className="admin-crumb-sep" aria-hidden="true">/</span>Live stream</h2>
              </div>
            </div>

            <div className="admin-live-status-tools"><span>{error?'Status unavailable':loading?'Checking status…':isLiveOnAir?'On air':reserved?'Connecting source':'Offline'}</span><button type="button" className="secondary-button" onClick={()=>{refresh();setRetry(value=>value+1);}}><RefreshCw size={13}/> Refresh</button><a href="/live" target="_blank" rel="noreferrer">Audience view ↗</a></div>
            {error&&<p role="alert" className="admin-request-feedback">{error}</p>}
            </div><div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs">
              <div className="admin-live-tab-panel admin-live-sessions-page-panel" role="tabpanel">
              <div className="admin-live-single has-requests-aside">
              <AdminLiveAudience token={token} session={isLiveOnAir?session:null} enabled={enabled} onReview={onReviewLiveRequest}/>
              <div className="admin-live-preview" ref={previewBox}>
                <div className="admin-live-monitor" data-orientation={previewOrientation}>
                <div className="admin-live-preview-frame-shell" ref={liveFrame}>
                  <div className="admin-live-preview-head">
                    <p className="detail-label">Preview</p>
                    <AdminSelect className="admin-preview-orientation" aria-label="Preview size" value={previewOrientation} onChange={changePreviewOrientation}>
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                    </AdminSelect>
                    <span>{isLiveOnAir ? 'On air' : 'Offline'}</span>
                    {isLiveOnAir&&!webrtc.isBroadcasting&&<button type="button" className="admin-live-fullscreen" onClick={()=>setRetry(value=>value+1)} aria-label="Reconnect preview" title="Reconnect preview"><RefreshCw size={14}/></button>}
                    <button type="button" className="admin-live-settings-open" aria-haspopup="dialog" onClick={()=>settingsDialog.current?.showModal()}><Settings size={14} aria-hidden="true"/>Settings</button>
                    <button type="button" className="admin-live-fullscreen" onClick={toggleLiveFullscreen} aria-label={liveFullscreen ? 'Exit full screen' : 'Full screen'} title={liveFullscreen ? 'Exit full screen' : 'Full screen'}>{liveFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                  </div>
                  {webrtc.isBroadcasting||webrtc.isConnecting ? <video ref={webrtc.videoRef} className="admin-live-preview-frame" autoPlay playsInline muted/> : isLiveOnAir ? <WebrtcViewer key={session+':'+retry} token={token} sessionIdentity={session} muted showAudioControls audioControlsTarget={previewAudioControlsTarget}/> : liveStream?.posterImage ? <img className="admin-live-preview-image" src={liveStream.posterImage} alt="" aria-hidden="true"/> : <div className="admin-live-preview-empty"><VideoOff size={18}/><span>{reserved?'Connecting source…':'No live source'}</span></div>}
                </div>
                </div>
<dialog ref={settingsDialog} className="admin-live-settings-dialog" aria-labelledby="admin-live-settings-title" onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close();}}>
<header className="admin-live-settings-head"><h3 id="admin-live-settings-title">Stream settings</h3><button type="button" className="admin-live-settings-close" aria-label="Close stream settings" onClick={()=>settingsDialog.current?.close()}><X size={18}/></button></header>
<fieldset className="admin-live-settings" disabled={loading||Boolean(error)}>
                <form className="admin-live-title-form" onSubmit={saveTitle}><label className="detail-label">Broadcast title<input aria-label="Broadcast title" value={title} placeholder={liveStream?.title||'Name your live set'} maxLength={180} onChange={event=>setTitle(event.target.value)}/></label><button type="submit" className="secondary-button" disabled={titleBusy||!title.trim()}>{titleBusy?'Saving…':'Save'}</button></form>
                <LiveGoalPicker token={token} goal={liveStream?.goal} onChange={apply}/>
                {liveStream?.broadcastSource==='android'&&<p className="admin-request-feedback">Android camera connected. Manage capture on the phone or end this broadcast below.</p>}
                <div className="live-source-field">
                <p className="detail-label admin-live-setup-title">LIVE STREAM SOURCE</p>
                <label className="obs-source">
                  <AdminSelect aria-label="Broadcast source" value={obsSelected ? 'obs' : 'browser'} disabled={isLiveOnAir || reserved || webrtc.isConnecting} onChange={event => setBroadcastSource(event.target.value)}>
                    <option value="obs">OBS Studio</option><option value="browser">{liveStream?.broadcastSource==='android'?'Android camera':'This browser'}</option>
                  </AdminSelect>
                </label>
                </div>
                <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot" />
                {obsSelected ? <ObsBroadcast token={token} title={liveStream?.title} item={liveStream} onUpdate={apply} /> : <>

                {!isLiveOnAir && !reserved ? (
                  <div className="admin-live-device-picker">
                    <label>
                      <span>Camera</span>
                      <AdminSelect
                        value={webrtc.selectedVideoDeviceId}
                        onChange={(event) => webrtc.setSelectedVideoDeviceId(event.target.value)}
                      >
                        <option value="">Default camera</option>
                        {webrtc.videoInputs.map((device, index) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${index + 1}`}
                          </option>
                        ))}
                      </AdminSelect>
                    </label>
                    <label>
                      <span>Microphone</span>
                      <AdminSelect
                        value={webrtc.selectedAudioDeviceId}
                        onChange={(event) => webrtc.setSelectedAudioDeviceId(event.target.value)}
                      >
                        <option value="">Default microphone</option>
                        {webrtc.audioInputs.map((device, index) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${index + 1}`}
                          </option>
                        ))}
                      </AdminSelect>
                    </label>
                  </div>
                ) : null}
                <MicLevelMeter
                  deviceId={webrtc.selectedAudioDeviceId}
                  track={webrtc.micMediaStreamTrack}
                  enabled={
                    enabled && !obsSelected && Boolean(webrtc.micMediaStreamTrack)
                  }
                />
                <div className="admin-live-controls" role="group" aria-label="Live controls">
                  <button
                    type="button"
                    className={`admin-live-control ${isLiveOnAir ? 'admin-live-control-delete' : 'admin-live-control-start'}`}
                    onClick={isLiveOnAir||reserved ? webrtc.endLive : () => webrtc.goLive(liveStream?.title)}
                    disabled={webrtc.isConnecting}
                  >
                    {isLiveOnAir ? <VideoOff size={16} /> : <Video size={16} />}
                    <span>
                      {webrtc.isConnecting
                        ? 'Working...'
                        : isLiveOnAir||reserved
                          ? liveStream?.broadcastSource==='android'?'End Android Broadcast':'End Browser Broadcast'
                          : 'Go Live From Browser'}
                    </span>
                  </button>
                  {isLiveOnAir ? (
                    <span className="live-stream-badge">
                      <Radio size={14} />
                      LIVE
                    </span>
                  ) : null}
                </div>
                </>}
                {webrtc.statusMessage&&<p className="admin-request-feedback" role="status">{webrtc.statusMessage}</p>}
                {titleError&&<p className="admin-request-feedback" role="alert">{titleError}</p>}
                <p className="admin-live-access-note">Signed-in audience only · Echo AI Administrator uses these same controls and verification checks.</p>
                </fieldset>
</dialog>
              </div>
            </div>
              </div>
            </div>

           
          </section>

 );
}
