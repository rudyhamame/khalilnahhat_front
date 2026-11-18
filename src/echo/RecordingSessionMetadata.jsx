import RecordingLoadingHint from './RecordingLoadingHint';
import {useEffect,useRef,useState} from 'react';
import {MoreHorizontal} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {commentsAtTime} from '../lib/recordingCommentReplay';

// Comments column: follows the video in real time by default; the ⋯ menu switches to the full list or shows hidden comments.
function CommentsBox({all,recordingId,part,token,currentTime}){
 const [follow,setFollow]=useState(true),[hidden,setHidden]=useState(false),[menu,setMenu]=useState(false),[timed,setTimed]=useState(null),list=useRef(null);
 useEffect(()=>{if(!follow||timed)return;let off=false;apiRequest(`/admin/live-recordings/${recordingId}/comments?part=${encodeURIComponent(part)}`,{token}).then(r=>{if(!off)setTimed(r.items||[]);}).catch(()=>{if(!off)setFollow(false);});return()=>{off=true;};},[follow,timed,recordingId,part,token]);
 useEffect(()=>setTimed(null),[part]);
 const items=follow&&timed?commentsAtTime(timed,currentTime):all.filter(item=>hidden||!item.hidden),last=items.at(-1);
 useEffect(()=>{if(follow&&list.current)list.current.scrollTop=list.current.scrollHeight;},[follow,last?.id,Boolean(last?.reply)]);
 return <div className="rsm-box"><h5>Audience comments · {follow&&timed?`${items.length} / ${timed.length}`:items.length}<span className="rsm-menu"><button type="button" aria-label="Comment options" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MoreHorizontal size={15}/></button>{menu&&<div role="menu">
  <button type="button" role="menuitemcheckbox" aria-checked={follow} onClick={()=>{setFollow(v=>!v);setMenu(false);}}>{follow?'✓ ':''}Follow the video</button>
  <button type="button" role="menuitemcheckbox" aria-checked={hidden} disabled={follow} onClick={()=>{setHidden(v=>!v);setMenu(false);}}>{hidden?'✓ ':''}Show hidden comments</button></div>}</span></h5>
  {items.length?<ol ref={list}>{items.map(item=><li key={item.id}><strong>{item.name}</strong>{item.hidden&&<span> · Hidden</span>}<p>{item.text}</p>{item.reply?.text&&<p><strong>DJ Khalil:</strong> {item.reply.text}</p>}</li>)}</ol>:<p>{follow&&timed?.length?'Comments appear at their original time as the video plays.':'No comments for this session.'}</p>}</div>;
}

export default function RecordingSessionMetadata({recordingId,token,part='all',currentTime=0}) {
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
  {error?<p role="alert">{error} <button type="button" onClick={()=>setRetry(value=>value+1)}>Retry</button></p>:!data?<RecordingLoadingHint message="Loading session details…"/>:<>
   <div className="rsm-box"><h5>Set list · {data.setList.length}</h5>{data.setList.length?<ol>{data.setList.map(song=><li key={song.id}><strong>{song.track}</strong>{song.artist&&<span> — {song.artist}</span>}{song.duration&&<small>{song.duration}</small>}<small>{song.playState}</small></li>)}</ol>:<p>No songs saved for this session.</p>}</div>
   <div className="rsm-box"><h5>Audience requests · {data.requests.length}</h5>{data.requests.length?<ol>{data.requests.map(item=><li key={item.id}><strong>{item.track}{item.artist?' — '+item.artist:''}</strong><small>{item.name} · {item.status?.replaceAll('_',' ')}</small>{item.text&&<p>{item.text}</p>}</li>)}</ol>:<p>No requests for this session.</p>}</div>
   <CommentsBox all={data.comments} recordingId={recordingId} part={part} token={token} currentTime={currentTime}/>
  </>}
 </section>;
}
