import {useCallback,useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw,LockKeyhole,ChevronDown,Radio,Square,Check,AlertCircle} from 'lucide-react';
import {createPortal} from 'react-dom';
import {apiRequest} from '../lib/api';

const labels={youtube:'YouTube',instagram:'Instagram'};
const defaults={youtube:'rtmps://a.rtmps.youtube.com/live2',instagram:'rtmps://live-upload.instagram.com:443/rtmp'};
function PlatformMark({platform,size=23}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{platform==='youtube'?<><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></>:<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>}</svg>;
}
function Destination({item,token,roomName,canStart,onRefresh,ready,toolbarTarget,onFeedback,onSetup}){
 const [serverUrl,setServerUrl]=useState(item.serverUrl||defaults[item.platform]),[streamKey,setStreamKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [accessConfirmed,setAccessConfirmed]=useState(item.accessConfirmed===true);
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const active=['starting','live','stopping'].includes(item.state);
 const stateLabel=({idle:'Not sending',ended:'Output ended',starting:'Starting output',live:'Sending media',stopping:'Stopping output',failed:'Output failed',error:'Output error'})[item.state]||item.state||'Not sending';
 const startHint=!ready?'Administrator setup required':!item.configured?'Save a connection to continue':!item.accessConfirmed?'Confirm Live Producer access to continue':!canStart?'Go live on Echo before starting this output':active?'This output is already active':'Ready to send your live video';
 const needsSetup=!ready||!item.configured||!item.accessConfirmed||!canStart;
 const toolbarLabel=active?'Stop '+labels[item.platform]+' output':needsSetup?'Open '+labels[item.platform]+' Live options':'Go live on '+labels[item.platform];
 const run=async(action)=>{
  if(busy)return;setBusy(true);setError('');onFeedback?.('');
  try{
   await apiRequest('/admin/live-destinations/'+item.platform+(action==='save'?'':'/'+action),{token,method:action==='save'?'PUT':'POST',body:action==='save'?{serverUrl,streamKey,accessConfirmed}:{roomName:action==='stop'?item.roomName:roomName}});
   if(alive.current){setStreamKey('');await onRefresh();}
  }catch(e){if(alive.current){const message=e.message||'Destination could not be updated.';setError(message);onFeedback?.(labels[item.platform]+': '+message);}}
  finally{if(alive.current)setBusy(false);}
 };
 return <><section className="studio-destination" data-destination={item.platform} aria-label={labels[item.platform]+' destination'}>
  <header className="destination-card-head"><div className="destination-platform"><span className="destination-platform-icon"><PlatformMark platform={item.platform}/></span><div><h4>{labels[item.platform]}</h4><small>{item.platform==='youtube'?'Landscape output':'Portrait output'}</small></div></div><a className="destination-platform-link" href={item.platform==='youtube'?'https://studio.youtube.com':'https://www.instagram.com/'} target="_blank" rel="noreferrer" aria-label={'Open '+labels[item.platform]} title={'Open '+labels[item.platform]}><ExternalLink size={16} aria-hidden="true"/></a></header>
  <div className="destination-state-row"><span className="destination-state" data-state={item.state} role="status"><i aria-hidden="true"/>{stateLabel}</span><span className="destination-format">{item.format}</span></div>
  <div className="destination-connection"><span>{item.configured?<Check size={14} aria-hidden="true"/>:<LockKeyhole size={14} aria-hidden="true"/>}{item.configured?'Connection saved securely':'Connection needed'}</span>{item.platform==='instagram'&&<span>{item.accessConfirmed?'Access confirmed':'Access not confirmed'}</span>}</div>
  <p className="destination-instructions">{item.platform==='instagram'?'After the preview appears in Instagram Live Producer, confirm Go Live there.':'Prepare an encoder stream in YouTube Studio before sending video.'}</p>
  {item.platform==='instagram'&&!item.accessConfirmed&&<p className="studio-eligibility" role="status"><AlertCircle size={15} aria-hidden="true"/><span>Ready for later. Confirm Live Producer access when this account becomes eligible.</span></p>}
  {item.error&&<p className="destination-feedback" role="status">{item.error}</p>}
  <div className="destination-transport"><p className="destination-start-hint">{startHint}</p><div className="studio-destination-actions"><button type="button" className="admin-live-control destination-send" disabled={busy||active||!canStart||!ready||!item.configured||!item.accessConfirmed} onClick={()=>run('start')}><Radio size={15} aria-hidden="true"/>Send to {labels[item.platform]}</button><button type="button" className="admin-live-control destination-stop" disabled={busy||!active} onClick={()=>run('stop')}><Square size={13} aria-hidden="true"/>Stop output</button></div></div>
  <details><summary><span><LockKeyhole size={14} aria-hidden="true"/>{item.configured?'Connection settings':'Set up connection'}</span><ChevronDown size={15} aria-hidden="true"/></summary><form onSubmit={event=>{event.preventDefault();run('save');}}>
   {item.platform==='instagram'&&<label className="studio-access-confirmation"><input type="checkbox" checked={accessConfirmed} disabled={active||busy} onChange={e=>setAccessConfirmed(e.target.checked)}/>I have confirmed Live Producer access in this Instagram account</label>}
   <label>Secure server URL<input value={serverUrl} onChange={e=>setServerUrl(e.target.value)} disabled={active||busy} required type="url" autoComplete="off"/></label>
   <label>Stream key<input type="password" value={streamKey} onChange={e=>setStreamKey(e.target.value)} disabled={active||busy} required autoComplete="new-password" spellCheck="false" maxLength={2048} placeholder={item.configured?'Saved securely · enter a new key to replace':'Paste the platform stream key'}/></label>
   <button className="admin-live-control" type="submit" disabled={active||busy||!streamKey||!ready}>Save secure connection</button>
   <small className="destination-security-note">Keys are write-only and encrypted on the API server. Never put them in chat. {item.platform==='instagram'&&'Check Live Producer eligibility and copy the current connection details for your session.'}</small>
  </form></details>
  {error&&<p className="destination-feedback" role="alert">{error}</p>}
 </section>{toolbarTarget&&createPortal(<button type="button" className="admin-live-fullscreen studio-social-output" aria-label={toolbarLabel} aria-pressed={active} title={active?toolbarLabel:labels[item.platform]+' Live · '+startHint} disabled={busy||item.state==='stopping'} onClick={()=>active?run('stop'):needsSetup?onSetup?.(item.platform):run('start')}><PlatformMark platform={item.platform} size={18}/></button>,toolbarTarget)}</>;
}
export default function LiveDestinations({token,enabled,roomName,isLive,mode,toolbarTarget,onFeedback,onSetup}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const generation=useRef(0);
 const cancelRequests=useCallback(()=>{generation.current++;},[]);
 const refresh=useCallback(async()=>{const request=++generation.current;try{const value=await apiRequest('/admin/live-destinations',{token});if(request===generation.current){setData(value);setError('');}}catch(e){if(request===generation.current)setError(e.message||'Destinations unavailable.');}},[token]);
 useEffect(()=>{if(!enabled)return undefined;let closed=false,timer;const poll=async()=>{await refresh();if(!closed)timer=setTimeout(poll,15000);};poll();return()=>{closed=true;cancelRequests();clearTimeout(timer);};},[enabled,refresh,cancelRequests]);
 return <section className="studio-destinations" aria-label="Streaming destinations"><header><div><p className="detail-label">STREAM DESTINATIONS</p><h3>Your live destinations</h3></div><button type="button" className="admin-live-control destination-refresh" onClick={refresh}><RefreshCw size={14} aria-hidden="true"/>Refresh status</button></header>
  <p className="destinations-intro">Echo viewers and recording use the existing live session. Start each social output when you are ready. “Sending media” confirms the media service output, not that a platform has made it public.</p>
  {!data&&!error&&<p role="status">Loading destinations…</p>}
  {error&&<p className="destination-feedback" role="alert">{error}</p>}
  {data&&!data.ready&&<p role="status">Administrator setup required: LiveKit and the private destination encryption key must be configured on the API server.</p>}
  {mode==='whep'&&isLive&&<p>OBS relay is active. End it before switching to the browser studio for these social destinations.</p>}
  <div className="studio-destinations-grid">{data?.items.map(item=><Destination key={item.platform} item={item} token={token} roomName={roomName} canStart={isLive&&mode==='webrtc'} ready={data.ready} onRefresh={refresh} toolbarTarget={toolbarTarget} onFeedback={onFeedback} onSetup={onSetup}/>)}</div>
  {toolbarTarget&&['youtube','instagram'].filter(platform=>!data?.items.some(item=>item.platform===platform)).map(platform=>createPortal(<button type="button" className="admin-live-fullscreen studio-social-output" aria-label={'Open '+labels[platform]+' Live options'} title={labels[platform]+' Live · connection settings'} onClick={()=>onSetup?.(platform)}><PlatformMark platform={platform} size={18}/></button>,toolbarTarget,platform))}
 </section>;
}
