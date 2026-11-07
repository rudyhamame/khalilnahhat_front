import {useCallback,useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw,LockKeyhole,ChevronDown,Radio,Square,Check,AlertCircle,Trash2} from 'lucide-react';
import {createPortal} from 'react-dom';
import {apiRequest} from '../lib/api';

const labels={youtube:'YouTube',instagram:'Instagram',tiktok:'TikTok'};
const platformLinks={youtube:'https://studio.youtube.com',instagram:'https://www.instagram.com/',tiktok:'https://www.tiktok.com/live/creator'};
const defaults={youtube:'rtmps://a.rtmps.youtube.com/live2',instagram:'rtmps://live-upload.instagram.com:443/rtmp',tiktok:''};
function PlatformMark({platform,size=23}){
 if(platform==='tiktok')return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 1h-4v14.7a3.2 3.2 0 1 1-2.8-3.2V8.4a7.3 7.3 0 1 0 6.8 7.3V8.2a10 10 0 0 0 5.4 1.6V5.7A5.5 5.5 0 0 1 16.6 1Z"/></svg>;
 if(platform==='youtube')return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></svg>;
 if(platform==='instagram')return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
 return null;
}
function Destination({item,token,roomName,canStart,onRefresh,onDeleted,ready,toolbarTarget,onFeedback,onSetup}){
 const [serverUrl,setServerUrl]=useState(item.serverUrl||defaults[item.platform]),[streamKey,setStreamKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [accessConfirmed,setAccessConfirmed]=useState(item.accessConfirmed===true);
 const [notice,setNotice]=useState('');
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const active=['starting','live','stopping'].includes(item.state);
 const stateLabel=({idle:'Not sending',ended:'Output ended',starting:'Starting output',live:'Sending media',stopping:'Stopping output',failed:'Output failed',error:'Output error'})[item.state]||item.state||'Not sending';
 const accessLabel=item.platform==='tiktok'?'external streaming':'Live Producer';
 const startHint=!ready?'Administrator setup required':!item.configured?'Save a connection to continue':!item.accessConfirmed?'Confirm '+accessLabel+' access to continue':!canStart?'Go live on Echo before starting this output':active?'This output is already active':'Ready to send your live video';
 const needsSetup=!ready||!item.configured||!item.accessConfirmed||!canStart;
 const toolbarLabel=active?'Stop '+labels[item.platform]+' output':needsSetup?'Open '+labels[item.platform]+' Live options':'Go live on '+labels[item.platform];
 const run=async(action)=>{
  if(busy)return;setBusy(true);setError('');setNotice('');onFeedback?.('');
  try{
   const result=await apiRequest('/admin/live-destinations/'+item.platform+(['save','delete'].includes(action)?'':'/'+action),{token,method:action==='delete'?'DELETE':action==='save'?'PUT':'POST',body:action==='delete'?undefined:action==='save'?{serverUrl,streamKey,accessConfirmed}:{roomName:action==='stop'?item.roomName:roomName}});
   if(action==='delete'&&(result.deleted!==true||result.item?.platform!==item.platform||result.item?.configured!==false))throw Error('The server could not confirm the stream key was deleted. Refresh and try again.');
   if(alive.current){setStreamKey('');if(action==='delete'){onDeleted?.(result.item);setNotice('Saved stream key deleted.');}else await onRefresh();}
  }catch(e){if(alive.current){const message=e.message||'Destination could not be updated.';setError(message);onFeedback?.(labels[item.platform]+': '+message);}}
  finally{if(alive.current)setBusy(false);}
 };
 return <><section className="studio-destination" data-destination={item.platform} aria-label={labels[item.platform]+' destination'}>
  <header className="destination-card-head"><div className="destination-platform"><span className="destination-platform-icon"><PlatformMark platform={item.platform}/></span><div><h4>{labels[item.platform]}</h4><small>{item.platform==='youtube'?'Landscape output':'Portrait output'}</small></div></div><a className="destination-platform-link" href={platformLinks[item.platform]} target="_blank" rel="noreferrer" aria-label={'Open '+labels[item.platform]} title={'Open '+labels[item.platform]}><ExternalLink size={16} aria-hidden="true"/></a></header>
  <div className="destination-state-row"><span className="destination-state" data-state={item.state} role="status"><i aria-hidden="true"/>{stateLabel}</span><span className="destination-format">{item.format}</span></div>
  <div className="destination-connection"><span>{item.configured?<Check size={14} aria-hidden="true"/>:<LockKeyhole size={14} aria-hidden="true"/>}{item.configured?'Connection saved securely':'Connection needed'}</span>{item.platform!=='youtube'&&<span>{item.accessConfirmed?'Access confirmed':'Access not confirmed'}</span>}</div>
  <p className="destination-instructions">{item.platform==='tiktok'?'Prepare an external streaming session in TikTok LIVE, copy its current server URL and stream key, and check its preview and any Go LIVE confirmation there.':item.platform==='instagram'?'After the preview appears in Instagram Live Producer, confirm Go Live there.':'Prepare an encoder stream in YouTube Studio before sending video.'}</p>
  {item.platform!=='youtube'&&!item.accessConfirmed&&<p className="studio-eligibility" role="status"><AlertCircle size={15} aria-hidden="true"/><span>Ready for later. Confirm {accessLabel} access when this account becomes eligible.</span></p>}
  {item.error&&<p className="destination-feedback" role="status">{item.error}</p>}
  <div className="destination-transport"><p className="destination-start-hint">{startHint}</p><div className="studio-destination-actions"><button type="button" className="admin-live-control destination-send" disabled={busy||active||!canStart||!ready||!item.configured||!item.accessConfirmed} onClick={()=>run('start')}><Radio size={15} aria-hidden="true"/>Send to {labels[item.platform]}</button><button type="button" className="admin-live-control destination-stop" disabled={busy||!active} onClick={()=>run('stop')}><Square size={13} aria-hidden="true"/>Stop output</button></div></div>
  <details><summary><span><LockKeyhole size={14} aria-hidden="true"/>{item.configured?'Connection settings':'Set up connection'}</span><ChevronDown size={15} aria-hidden="true"/></summary><form onSubmit={event=>{event.preventDefault();run('save');}}>
   {item.platform!=='youtube'&&<label className="studio-access-confirmation"><input type="checkbox" checked={accessConfirmed} disabled={active||busy} onChange={e=>setAccessConfirmed(e.target.checked)}/>I have confirmed {accessLabel} access{item.platform==='tiktok'?' and can obtain a server URL and stream key':''} in this {labels[item.platform]} account</label>}
   <label>{item.platform==='tiktok'?'TikTok server URL (RTMP or RTMPS)':'Secure server URL'}<input placeholder={item.platform==='tiktok'?'Paste the server URL supplied by TikTok':undefined} value={serverUrl} onChange={e=>setServerUrl(e.target.value)} disabled={active||busy} required type="url" autoComplete="off"/></label>
   {item.platform==='tiktok'&&serverUrl.startsWith('rtmp:')&&<small>TikTok supplied an unencrypted RTMP connection. Use RTMPS if TikTok provides it; do not change the supplied protocol yourself.</small>}
   <label>Stream key<input type="password" value={streamKey} onChange={e=>setStreamKey(e.target.value)} disabled={active||busy} required autoComplete="new-password" spellCheck="false" maxLength={2048} placeholder={item.configured?'Saved securely · enter a new key to replace':'Paste the platform stream key'}/></label>
   <button className="admin-live-control" type="submit" disabled={active||busy||!streamKey||!ready}>Save secure connection</button>
   <small className="destination-security-note">Keys are write-only and encrypted on the API server. Never put them in chat. {item.platform!=='youtube'&&'Check '+accessLabel+' eligibility and copy the current connection details for your session.'}</small>
  </form>{item.configured&&<button type="button" className="admin-live-control destination-delete-key" disabled={active||busy} title={active?'Stop this output before deleting its saved key':undefined} onClick={()=>run('delete')}><Trash2 size={14} aria-hidden="true"/>Delete saved stream key</button>}{notice&&<p className="destination-key-notice" role="status">{notice}</p>}</details>
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
  <div className="studio-destinations-grid">{data?.items.map(item=><Destination key={item.platform} item={item} token={token} roomName={roomName} canStart={isLive&&mode==='webrtc'} ready={data.ready} onRefresh={refresh} onDeleted={deleted=>{cancelRequests();setData(current=>current?{...current,items:current.items.map(row=>row.platform===deleted.platform?deleted:row)}:current);}} toolbarTarget={toolbarTarget} onFeedback={onFeedback} onSetup={onSetup}/>)}</div>
  {toolbarTarget&&['youtube','instagram','tiktok'].filter(platform=>!data?.items.some(item=>item.platform===platform)).map(platform=>createPortal(<button type="button" className="admin-live-fullscreen studio-social-output" aria-label={'Open '+labels[platform]+' Live options'} title={labels[platform]+' Live · connection settings'} onClick={()=>onSetup?.(platform)}><PlatformMark platform={platform} size={18}/></button>,toolbarTarget,platform))}
 </section>;
}
