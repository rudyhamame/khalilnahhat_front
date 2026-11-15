import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';

export default function RecordingSessionMetadata({recordingId,token}) {
 const [data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setData(null);setError('');
  apiRequest(`/admin/live-recordings/${recordingId}/metadata`,{token,signal:controller.signal})
   .then(result=>{if(!controller.signal.aborted)setData(result);})
   .catch(failure=>{if(!controller.signal.aborted)setError(failure.message||'Session details could not be loaded.');});
  return()=>controller.abort();
 },[recordingId,token,retry]);
 return <section className="recording-session-metadata" aria-label="Live session details">
  <h4>Live session details</h4>
  {error?<p role="alert">{error} <button type="button" onClick={()=>setRetry(value=>value+1)}>Retry</button></p>:!data?<p role="status">Loading session details…</p>:<>
   <details open><summary>Set list · {data.setList.length}</summary>{data.setList.length?<ol>{data.setList.map(song=><li key={song.id}><strong>{song.track}</strong>{song.artist&&<span> — {song.artist}</span>}{song.duration&&<small>{song.duration}</small>}<small>{song.playState}</small></li>)}</ol>:<p>No songs saved for this session.</p>}</details>
   <details><summary>Audience requests · {data.requests.length}</summary>{data.requests.length?<ol>{data.requests.map(item=><li key={item.id}><strong>{item.track}{item.artist?' — '+item.artist:''}</strong><small>{item.name} · {item.status?.replaceAll('_',' ')}</small>{item.text&&<p>{item.text}</p>}</li>)}</ol>:<p>No requests for this session.</p>}</details>
   <details><summary>Audience comments · {data.comments.length}</summary>{data.comments.length?<ol>{data.comments.map(item=><li key={item.id}><strong>{item.name}</strong><span>{item.hidden?' · Hidden':''}</span><p>{item.text}</p>{item.reply?.text&&<p><strong>DJ Khalil:</strong> {item.reply.text}</p>}</li>)}</ol>:<p>No comments for this session.</p>}</details>
  </>}
 </section>;
}
