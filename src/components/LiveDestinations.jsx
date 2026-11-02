import {useCallback,useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';

const labels={youtube:'YouTube',instagram:'Instagram'};
const defaults={youtube:'rtmps://a.rtmps.youtube.com/live2',instagram:'rtmps://live-upload.instagram.com:443/rtmp'};
function Destination({item,token,roomName,canStart,onRefresh,ready}){
 const [serverUrl,setServerUrl]=useState(item.serverUrl||defaults[item.platform]),[streamKey,setStreamKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const active=['starting','live','stopping'].includes(item.state);
 const run=async(action)=>{
  if(busy)return;setBusy(true);setError('');
  try{
   await apiRequest('/admin/live-destinations/'+item.platform+(action==='save'?'':'/'+action),{token,method:action==='save'?'PUT':'POST',body:action==='save'?{serverUrl,streamKey}:{roomName:action==='stop'?item.roomName:roomName}});
   if(alive.current){setStreamKey('');await onRefresh();}
  }catch(e){if(alive.current)setError(e.message||'Destination could not be updated.');}
  finally{if(alive.current)setBusy(false);}
 };
 return <section className="studio-destination" aria-label={labels[item.platform]+' destination'}>
  <header><h4>{labels[item.platform]}</h4><span role="status">{item.state==='live'?'Sending media':item.state}</span></header>
  <p>{item.format}{item.platform==='instagram'?' · Confirm Go Live in Instagram Live Producer after its preview appears.':' · Set up an encoder stream in YouTube Studio first.'}</p>
  {item.error&&<p role="status">{item.error}</p>}
  <div className="studio-destination-actions"><button type="button" className="admin-live-control" disabled={busy||active||!canStart||!ready||!item.configured} onClick={()=>run('start')}>Send to {labels[item.platform]}</button><button type="button" className="admin-live-control" disabled={busy||!active} onClick={()=>run('stop')}>Stop output</button><a href={item.platform==='youtube'?'https://studio.youtube.com':'https://www.instagram.com/'} target="_blank" rel="noreferrer">Open {labels[item.platform]}</a></div>
  <details><summary>{item.configured?'Replace connection settings':'Set up connection'}</summary><form onSubmit={event=>{event.preventDefault();run('save');}}>
   <label>Secure server URL<input value={serverUrl} onChange={e=>setServerUrl(e.target.value)} disabled={active||busy} required type="url" autoComplete="off"/></label>
   <label>Stream key<input type="password" value={streamKey} onChange={e=>setStreamKey(e.target.value)} disabled={active||busy} required autoComplete="new-password" spellCheck="false" maxLength={2048} placeholder={item.configured?'Saved securely · enter a new key to replace':'Paste the platform stream key'}/></label>
   <button className="admin-live-control" type="submit" disabled={active||busy||!streamKey||!ready}>Save secure connection</button>
   <small>Keys are write-only and encrypted on the API server. Never put them in chat. {item.platform==='instagram'&&'Check Live Producer eligibility and copy the current connection details for your session.'}</small>
  </form></details>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
export default function LiveDestinations({token,enabled,roomName,isLive,mode}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const generation=useRef(0);
 const cancelRequests=useCallback(()=>{generation.current++;},[]);
 const refresh=useCallback(async()=>{const request=++generation.current;try{const value=await apiRequest('/admin/live-destinations',{token});if(request===generation.current){setData(value);setError('');}}catch(e){if(request===generation.current)setError(e.message||'Destinations unavailable.');}},[token]);
 useEffect(()=>{if(!enabled)return undefined;let closed=false,timer;const poll=async()=>{await refresh();if(!closed)timer=setTimeout(poll,15000);};poll();return()=>{closed=true;cancelRequests();clearTimeout(timer);};},[enabled,refresh,cancelRequests]);
 return <section className="studio-destinations" aria-label="Streaming destinations"><header><div><p className="detail-label">STREAM DESTINATIONS</p><h3>One studio. Your channels.</h3></div><button type="button" className="admin-live-control" onClick={refresh}>Refresh status</button></header>
  <p>Echo viewers and recording use the existing live session. Start each social output when you are ready. “Sending media” confirms the media service output, not that a platform has made it public.</p>
  {error&&<p role="alert">{error}</p>}
  {data&&!data.ready&&<p role="status">Administrator setup required: LiveKit and the private destination encryption key must be configured on the API server.</p>}
  {mode==='whep'&&isLive&&<p>OBS relay is active. End it before switching to the browser studio for these social destinations.</p>}
  <div className="studio-destinations-grid">{data?.items.map(item=><Destination key={item.platform} item={item} token={token} roomName={roomName} canStart={isLive&&mode==='webrtc'} ready={data.ready} onRefresh={refresh}/>)}</div>
 </section>;
}
