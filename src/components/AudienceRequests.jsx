import {useEffect,useRef,useState} from 'react';
import {Download,ExternalLink,Music2,Radio,RefreshCw,Search,Trash2} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import {audioConversionPending,rawAudioDownloadUrl} from '../lib/rawSetListAudio';
import './audienceRequests.css';
import RequestSongMetadata from './RequestSongMetadata';

const displayDate=value=>value&&!Number.isNaN(new Date(value).getTime())?new Date(value).toLocaleString():'';
const httpUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
const isWav=item=>item.audioPreparation==='raw'||/\.wav(?:$|[?#])/i.test(item.audioOriginalName||item.audioUrl||'');
export default function AudienceRequests({token,liveStream,onReview}){
 const live=useLiveStatus({token,admin:true,initial:liveStream});
 const stream=live.item,onAir=Boolean(stream?.isLive),session=onAir?liveSessionIdentity(stream):'';
 const [feed,setFeed]=useState({token,items:[],loading:true,error:''}),[retry,setRetry]=useState(0);
 const [search,setSearch]=useState(''),[scope,setScope]=useState('all'),[filter,setFilter]=useState('all');
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false),revision=useRef(0),owner=useRef(token);owner.current=token;
 useEffect(()=>{
  if(!token)return;
  let active=true,timer,inFlight=false;const controller=new AbortController();
  const refresh=async()=>{
   if(!active||inFlight)return;
   if(document.hidden){timer=setTimeout(refresh,3000);return;}
   inFlight=true;const version=revision.current;
   try{const result=await apiRequest('/live-requests/admin',{token,signal:controller.signal});if(active&&version===revision.current)setFeed({token,items:result.items||[],loading:false,error:''});}
   catch(error){if(active)setFeed(previous=>({...previous,items:previous.token===token?previous.items:[],token,error:error.message||'Requests could not be refreshed.',loading:false}));}
   finally{inFlight=false;if(active)timer=setTimeout(refresh,3000);}
  };
  const visible=()=>{if(!document.hidden){clearTimeout(timer);void refresh();}};
  void refresh();document.addEventListener('visibilitychange',visible);
  return()=>{active=false;controller.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
 },[token,retry]);
 const refresh=()=>{setRetry(value=>value+1);live.refresh();};
 const run=async(id,operation)=>{
  if(lock.current)return;lock.current=true;setBusy(id);setNotice('');revision.current++;const account=token;
  try{const message=await operation();if(owner.current===account)setNotice(message||'Request updated.');}
  catch(error){if(owner.current===account&&!error.cancelled)setNotice(error.message||'The request could not be updated.');}
  finally{lock.current=false;if(owner.current===account){setBusy('');refresh();}}
 };
 const deleteRequest=item=>run('delete:'+item.id,async()=>{
  await apiRequest('/live-requests/'+encodeURIComponent(item.id),{method:'DELETE',token,deleteMessage:'Delete the audience request “'+(item.track||'Song request')+'” and its uploaded files permanently?'});
  revision.current++;
  if(owner.current===token)setFeed(previous=>previous.token===token?{...previous,items:previous.items.filter(request=>request.id!==item.id)}:previous);
  return 'Audience request deleted.';
 });
 const convert=item=>run(item.id,async()=>{await apiRequest('/live-requests/'+encodeURIComponent(item.id)+'/to-wav',{method:'POST',token});return 'WAV preparation started. The download will appear here when ready.';});
 const fetchMetadata=item=>run('metadata:'+item.id,async()=>{await apiRequest('/live-requests/'+encodeURIComponent(item.id)+'/metadata',{method:'POST',token});return 'YouTube song metadata saved.';});
 const review=(item,decision)=>run(item.id,async()=>{
  const result=await onReview(item.id,{session,decision});
  if(decision==='approved'&&result?.item?.requestStatus!=='approved')return result?.item?.requestStatus==='duplicate'?'This song is already in the set list. No duplicate was added.':'Request status updated.';
  if(decision==='approved'&&item.sourcePlatform==='youtube'&&item.sourceUrl&&!item.audioUrl){await apiRequest('/live-requests/'+encodeURIComponent(item.id)+'/to-wav',{method:'POST',token});return 'Added to the set list. Preparing the WAV download…';}
  return decision==='approved'?'Added to the set list.':'Request rejected.';
 });
 const current=feed.token===token?feed:{items:[],loading:true,error:''};
 const requests=current.items,now=Date.now();
 const scoped=scope==='current'?requests.filter(item=>session&&item.broadcastSessionId===session):requests;
 const ready=item=>Boolean(rawAudioDownloadUrl(item));
 const query=search.trim().toLowerCase();
 const items=scoped.filter(item=>(filter==='all'||filter==='ready'&&ready(item)||filter==='pending'&&item.requestStatus==='pending_admin')&&(!query||[item.track,item.artist,item.requesterName,item.requesterEmail,item.message,item.confirmationCode].some(value=>String(value||'').toLowerCase().includes(query))));
 return <section className="admin-panel audience-requests-page" aria-labelledby="audience-requests-title">
  <header className="ar-page-head"><div><h2 id="audience-requests-title">Audience Requests</h2><p>YouTube song requests, song metadata and converted WAV files.</p></div><button type="button" className="ar-button" onClick={refresh}><RefreshCw size={15}/>Refresh</button></header>
  <section className={'ar-stream'+(onAir?' is-live':'')} aria-label="Current live stream">
   <span className="ar-stream-icon"><Radio size={25}/></span><div className="ar-stream-copy"><span className="ar-stream-state">{live.loading?'Checking live status…':onAir?'ON AIR':'OFFLINE'}</span><h3>{onAir?stream.title||'Live session':'No live stream is on air'}</h3>{onAir?<p>{stream.statusLabel||'Live now'}{displayDate(stream.liveStartedAt)&&<> · Started {displayDate(stream.liveStartedAt)}</>}{stream.goal==='recording'?' · Recording session':''}</p>:<p>Saved audience requests and ready downloads remain available below.</p>}</div>{onAir&&<a className="ar-button" href="/live" target="_blank" rel="noopener noreferrer">Open live page<ExternalLink size={14}/></a>}
  </section>
  {live.error&&<p className="ar-error" role="status">Live status could not be refreshed. {live.error}</p>}
  <dl className="ar-stats"><div><dt>Requests</dt><dd>{scoped.length}</dd></div><div><dt>Needs review</dt><dd>{scoped.filter(item=>item.requestStatus==='pending_admin').length}</dd></div><div><dt>Audio ready</dt><dd>{scoped.filter(ready).length}</dd></div></dl>
  <div className="ar-filters"><label className="ar-search"><span>Search requests</span><span><Search size={16}/><input type="search" value={search} placeholder="Song, artist or client" onChange={event=>setSearch(event.target.value)}/></span></label><label><span>Broadcast</span><select aria-label="Broadcast" value={scope} onChange={event=>setScope(event.target.value)}><option value="all">All broadcasts</option><option value="current">Current live{onAir?'':' (offline)'}</option></select></label><label><span>Show</span><select aria-label="Show requests" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">All requests</option><option value="pending">Needs review</option><option value="ready">Audio ready</option></select></label></div>
  {notice&&<p className="ar-notice" role="status">{notice}</p>}{current.error&&<p className="ar-error" role="alert">{current.error} Showing the last available requests.</p>}
  {current.loading?<p className="ar-empty" role="status">Loading audience requests…</p>:!items.length?<p className="ar-empty">{scope==='current'&&!onAir?'Go live to receive requests for a new broadcast.':search||filter!=='all'?'No requests match these filters.':'No audience requests yet.'}</p>:<ol className="ar-request-list">{items.map(item=>{
   const audio=rawAudioDownloadUrl(item),source=httpUrl(item.sourceUrl),pending=audioConversionPending(item,now),wav=isWav(item),status=(item.requestStatus||'pending_admin').replaceAll('_',' '),currentRequest=Boolean(session&&item.broadcastSessionId===session);
   return <li key={item.id} className="ar-request"><div className="ar-request-info"><div className="ar-request-heading"><span className="ar-song-icon"><Music2 size={20}/></span><div><h3>{item.track||'Song request'}</h3><p>{item.artist||'Artist not supplied'}</p></div><span className="ar-chip">{status}</span></div>
    <dl className="ar-request-meta"><div><dt>Client</dt><dd>{item.requesterName||'Audience'}{item.requesterEmail&&<small>{item.requesterEmail}</small>}</dd></div><div><dt>Requested</dt><dd>{displayDate(item.createdAt)||'Date unavailable'}{item.confirmationCode&&<small>{item.confirmationCode}</small>}</dd></div><div><dt>Source</dt><dd>{source?<a href={source} target="_blank" rel="noopener noreferrer">{item.sourcePlatform||'Open source'}<ExternalLink size={12}/></a>:item.sourcePlatform||'Manual request'}{currentRequest&&<small>Current live</small>}</dd></div></dl>
    <RequestSongMetadata item={item} busy={Boolean(busy)} fetching={busy==='metadata:'+item.id} onFetch={()=>void fetchMetadata(item)}/>
    {item.message&&<p className="ar-request-message">{item.message}</p>}
    {currentRequest&&item.requestStatus==='pending_admin'&&onReview&&<div className="ar-review"><button type="button" className="ar-button is-primary" disabled={Boolean(busy)||Boolean(live.error)||Boolean(current.error)} onClick={()=>void review(item,'approved')}>{busy===item.id?'Saving…':'Approve & add to set list'}</button><button type="button" className="ar-button" disabled={Boolean(busy)||Boolean(live.error)||Boolean(current.error)} onClick={()=>void review(item,'rejected')}>Reject</button></div>}
   </div><div className="ar-request-audio"><strong>{audio?(wav?'WAV ready to download':'Audio ready to download'):pending?'Preparing WAV…':item.audioPreparation==='failed'?'Preparation failed':'Awaiting WAV conversion'}</strong>
    {audio?<><audio controls preload="none" src={httpUrl(item.audioUrl)} aria-label={'Preview '+(item.track||'requested audio')}/><a className="ar-button is-download" href={audio} download target="_blank" rel="noopener noreferrer"><Download size={15}/>{wav?'Download WAV':'Download audio'}</a></>:<><p>{pending?'This request updates automatically when the WAV file is ready.':item.audioError||(item.sourcePlatform==='youtube'&&source?'Prepare the audio to get a WAV download for your mixer.':'No downloadable audio source was provided.')}</p>{item.sourcePlatform==='youtube'&&source&&<button type="button" className="ar-button" disabled={Boolean(busy)||pending} onClick={()=>void convert(item)}><RefreshCw size={14}/>{pending?'Converting…':busy===item.id?'Starting…':item.audioPreparation?'Retry WAV':'Prepare WAV'}</button>}</>}
    <button type="button" className="ar-button is-danger" disabled={Boolean(busy)} aria-label={'Delete request: '+(item.track||'Song request')} onClick={()=>void deleteRequest(item)}><Trash2 size={14}/>{busy==='delete:'+item.id?'Deleting…':'Delete request'}</button>
   </div></li>;
  })}</ol>}
 </section>;
}
