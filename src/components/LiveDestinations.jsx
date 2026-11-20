import {useCallback,useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw,Radio,Square,Check,Trash2,KeyRound} from 'lucide-react';
import {createPortal} from 'react-dom';
import {apiRequest} from '../lib/api';
import {formatAllows,formatBlockedReason} from '../lib/outputFormat';
import './studioDestinations.css';
import {destinationLabels,destinationSources,destinationSourceState} from '../lib/liveDestinationSources';

const labels=destinationLabels;
const platformLinks={youtube:'https://studio.youtube.com',instagram:'https://www.instagram.com/',tiktok:'https://www.tiktok.com/live/creator'};
const defaults={youtube:'rtmps://a.rtmps.youtube.com/live2',instagram:'rtmps://live-upload.instagram.com:443/rtmp',tiktok:''};
function PlatformMark({platform,size=23}){
 if(platform==='tiktok')return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 1h-4v14.7a3.2 3.2 0 1 1-2.8-3.2V8.4a7.3 7.3 0 1 0 6.8 7.3V8.2a10 10 0 0 0 5.4 1.6V5.7A5.5 5.5 0 0 1 16.6 1Z"/></svg>;
 if(platform==='youtube')return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></svg>;
 if(platform==='instagram')return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
 return null;
}
function Destination({item,token,roomName,canStart,blockedReason='',onRefresh,onDeleted,ready,onFeedback}){
 const portrait=item.platform!=='youtube';
 const [serverUrl,setServerUrl]=useState(item.serverUrl||defaults[item.platform]),[streamKey,setStreamKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [accessConfirmed,setAccessConfirmed]=useState(item.accessConfirmed===true),[editing,setEditing]=useState(false),[notice,setNotice]=useState('');
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const active=['starting','live','stopping'].includes(item.state);
 const stateLabel=({idle:'Not sending',ended:'Ended',starting:'Starting',live:'Sending',stopping:'Stopping',failed:'Failed',error:'Error'})[item.state]||'Not sending';
 const accessLabel=item.platform==='tiktok'?'external streaming':'Live Producer';
 const sendable=canStart&&ready&&item.configured&&item.accessConfirmed;
 const why=active?'':!ready?'Administrator setup required.':!item.configured?'Add the server URL and stream key to connect.':!item.accessConfirmed?'Confirm '+accessLabel+' access in the connection form.':!canStart?(blockedReason||'Start your OBS stream on Echo first.'):'';
 const help=item.platform==='tiktok'?'In TikTok LIVE, prepare an external streaming session and copy its server URL and stream key.':item.platform==='instagram'?'In Instagram Live Producer, copy the server URL and a fresh stream key. Press Go Live there after the preview appears.':'In YouTube Studio, open Go Live and copy the stream key.';
 const showForm=editing||!item.configured;
 const run=async action=>{
  if(busy)return;setBusy(true);setError('');setNotice('');onFeedback?.('');
  try{
   const result=await apiRequest('/admin/live-destinations/'+item.platform+(['save','delete'].includes(action)?'':'/'+action),{token,deleteMessage:'Delete the saved connection settings for '+item.platform+'?',method:action==='delete'?'DELETE':action==='save'?'PUT':'POST',body:action==='delete'?undefined:action==='save'?{serverUrl,streamKey,accessConfirmed}:{roomName}});
   if(action==='delete'&&(result.deleted!==true||result.item?.platform!==item.platform||result.item?.configured!==false))throw Error('The server could not confirm the stream key was deleted. Refresh and try again.');
   if(alive.current){setStreamKey('');setEditing(false);if(action==='delete'){onDeleted?.(result.item);setNotice('Saved stream key deleted.');}else await onRefresh();}
  }catch(e){if(e.cancelled)return;if(alive.current){const message=e.message||'Destination could not be updated.';setError(message);onFeedback?.(labels[item.platform]+': '+message);}}
  finally{if(alive.current)setBusy(false);}
 };
 return <article className="sd-card" data-platform={item.platform} data-state={item.state} aria-label={labels[item.platform]+' destination'}>
  <header className="sd-head"><span className="sd-icon"><PlatformMark platform={item.platform} size={20}/></span><div className="sd-name"><h4>{labels[item.platform]}</h4><small>{portrait?'Portrait · 9:16':'Landscape · 16:9'}</small></div><span className="sd-state" role="status"><i aria-hidden="true"/>{stateLabel}</span><a className="sd-link" href={platformLinks[item.platform]} target="_blank" rel="noreferrer" aria-label={'Open '+labels[item.platform]}><ExternalLink size={15} aria-hidden="true"/></a></header>
  {item.error&&<p className="sd-alert" role="status">{item.error}</p>}
  <div className="sd-actions"><button type="button" className="sd-primary" disabled={busy||active||!sendable} onClick={()=>run('start')}><Radio size={15} aria-hidden="true"/>Go live on {labels[item.platform]}</button><button type="button" className="sd-secondary" disabled={busy||!active} onClick={()=>run('stop')}><Square size={13} aria-hidden="true"/>Stop</button></div>
  {why&&<p className="sd-why">{why}</p>}
  <div className="sd-connection"><span className="sd-saved" data-saved={item.configured}>{item.configured?<><Check size={14} aria-hidden="true"/>Stream key saved</>:<><KeyRound size={14} aria-hidden="true"/>Not connected</>}</span>{item.configured&&!editing&&<button type="button" className="sd-text" disabled={active||busy} onClick={()=>setEditing(true)}>Edit</button>}</div>
  {showForm&&<form className="sd-form" onSubmit={event=>{event.preventDefault();run('save');}}>
   <p className="sd-help">{help}</p>
   {portrait&&<label className="sd-check"><input type="checkbox" checked={accessConfirmed} disabled={active||busy} onChange={e=>setAccessConfirmed(e.target.checked)}/>I have {accessLabel} access on this account</label>}
   <label className="sd-field"><span>Server URL</span><input value={serverUrl} onChange={e=>setServerUrl(e.target.value)} disabled={active||busy} required type="url" autoComplete="off" placeholder={item.platform==='tiktok'?'Paste the server URL from TikTok':undefined}/></label>
   {item.platform==='tiktok'&&serverUrl.startsWith('rtmp:')&&<p className="sd-help">TikTok supplied an unencrypted RTMP connection. Use RTMPS if TikTok provides it.</p>}
   <label className="sd-field"><span>Stream key</span><input type="password" value={streamKey} onChange={e=>setStreamKey(e.target.value)} disabled={active||busy} required autoComplete="new-password" spellCheck="false" maxLength={2048} placeholder={item.configured?'Enter a new key to replace the saved one':'Paste the stream key'}/></label>
   <div className="sd-form-actions"><button type="submit" className="sd-primary" disabled={active||busy||!streamKey||!ready}>Save connection</button>{item.configured&&<button type="button" className="sd-secondary" onClick={()=>{setEditing(false);setStreamKey('');}}>Cancel</button>}{item.configured&&<button type="button" className="sd-danger" disabled={active||busy} title={active?'Stop this output before deleting its key':undefined} onClick={()=>run('delete')}><Trash2 size={14} aria-hidden="true"/>Delete key</button>}</div>
   <p className="sd-fine">Stored encrypted. Never share your stream key.</p>
  </form>}
  {notice&&<p className="sd-why" role="status">{notice}</p>}
  {error&&<p className="sd-alert" role="alert">{error}</p>}
 </article>;
}
function SourceIndicators({items,roomName,orientation,unavailable}){
 return <div className="studio-output-sources" role="status" aria-label={`${orientation} output destinations`}>
  {destinationSources(items,roomName,orientation).map(item=>{
   const state=destinationSourceState(item.state,unavailable);
   return <span key={item.platform} className="studio-output-source" data-state={unavailable?'unknown':item.state} title={`${orientation==='landscape'?'Landscape':'Portrait'} → ${labels[item.platform]} · ${state}`}>
    <i aria-hidden="true"/><PlatformMark platform={item.platform} size={14}/><span className="studio-output-source-copy"><strong>{labels[item.platform]}</strong><small>{state}</small></span>
   </span>;
  })}
 </div>;
}
export default function LiveDestinations({format='both',token,enabled,roomName,isLive,mode,landscapeTarget,portraitTarget,onFeedback}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const generation=useRef(0);
 const cancelRequests=useCallback(()=>{generation.current++;},[]);
 const refresh=useCallback(async()=>{const request=++generation.current;try{const value=await apiRequest('/admin/live-destinations',{token});if(request===generation.current){setData(value);setError('');}}catch(e){if(e.cancelled)return;if(request===generation.current)setError(e.message||'Destinations unavailable.');}},[token]);
 useEffect(()=>{setData(null);setError('');if(!enabled)return undefined;let closed=false,timer;const poll=async()=>{await refresh();if(!closed)timer=setTimeout(poll,15000);};poll();return()=>{closed=true;cancelRequests();clearTimeout(timer);};},[enabled,refresh,cancelRequests]);
 const sourceLive=Boolean(isLive)&&['webrtc','whep'].includes(mode);
 return <section className="sd" aria-label="Streaming destinations">
  <div className="sd-source" data-live={sourceLive}><i aria-hidden="true"/><div><strong>{sourceLive?'Live on Echo':'Not live yet'}</strong><small>{sourceLive?'Send it to a platform when you are ready.':'Start your OBS stream first, then send it to a platform.'}</small></div><button type="button" className="sd-icon-button" onClick={refresh} aria-label="Refresh destination status" title="Refresh status"><RefreshCw size={15} aria-hidden="true"/></button></div>
  {!data&&!error&&<p role="status" className="sd-why">Loading destinations…</p>}
  {error&&<p className="sd-alert" role="alert">{error}</p>}
  {data&&!data.ready&&<p className="sd-alert" role="status">Administrator setup required: the OBS relay (or LiveKit) and the private destination encryption key must be configured on the API server.</p>}
  <div className="sd-list">{data?.items.map(item=><Destination key={item.platform} item={item} token={token} roomName={roomName} blockedReason={formatBlockedReason(format,item.platform)} canStart={sourceLive&&formatAllows(format,item.platform)} ready={data.ready} onRefresh={refresh} onDeleted={deleted=>{cancelRequests();setData(current=>current?{...current,items:current.items.map(row=>row.platform===deleted.platform?deleted:row)}:current);}} onFeedback={onFeedback}/>)}</div>
  {enabled&&landscapeTarget&&createPortal(<SourceIndicators items={data?.items} roomName={roomName} orientation="landscape" unavailable={Boolean(error)}/>,landscapeTarget)}
  {enabled&&portraitTarget&&createPortal(<SourceIndicators items={data?.items} roomName={roomName} orientation="portrait" unavailable={Boolean(error)}/>,portraitTarget)}
 </section>;
}
