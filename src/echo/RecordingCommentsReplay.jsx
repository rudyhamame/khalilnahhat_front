import {useEffect,useRef,useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {commentsAtTime} from '../lib/recordingCommentReplay';
const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export default function RecordingCommentsReplay({recordingId,part='all',token,currentTime=0,version=0}){
 const [data,setData]=useState(null),[error,setError]=useState('');const list=useRef(null);
 useEffect(()=>{let canceled=false;const controller=new AbortController();setData(null);setError('');apiRequest(`/admin/live-recordings/${recordingId}/comments?part=${encodeURIComponent(part)}`,{token,signal:controller.signal}).then(value=>{if(!canceled)setData(value);}).catch(problem=>{if(!canceled)setError(problem.message||'Comments could not be loaded.');});return()=>{canceled=true;controller.abort();};},[recordingId,part,token,version]);
 const visible=commentsAtTime(data?.items||[],currentTime);
 const last=visible.at(-1),lastKey=last?last.id+Boolean(last.reply):'';
 useEffect(()=>{if(list.current)list.current.scrollTop=list.current.scrollHeight;},[lastKey]);
 return <section className="recording-comments-replay" aria-labelledby="recording-comments-title">
  <header><h4 id="recording-comments-title"><MessageCircle size={16}/>Comments replay</h4><time>{clock(currentTime)}</time></header>
  {data?.approximate&&<p className="recording-comments-note">Comment timing is approximate for this older recording.</p>}
  <div className="recording-comments-list" ref={list}>
   {error?<p role="status">{error}</p>:!data?<p role="status">Loading comments…</p>:!data.items.length?<p>No comments were saved for this recording.</p>:!visible.length?<p>Comments will appear at their original time as the video plays.</p>:<ol>{visible.map(item=><li key={item.id}><div><strong>{item.name}</strong><time>{clock(item.atSec)}</time></div><p>{item.text}</p>{item.reply&&<blockquote><strong>Host</strong><p>{item.reply.text}</p></blockquote>}</li>)}</ol>}
  </div>
 </section>;
}
