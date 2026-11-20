import {useEffect,useRef,useState} from 'react';
import {MessageSquare,CornerDownRight,Eye,EyeOff,Send,ArrowDown,RotateCw,X} from 'lucide-react';
import {useLiveComments} from '../hooks/useLiveComments';
import './adminLiveComments.css';

const clock=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});};
const initial=name=>(String(name||'?').trim()[0]||'?').toUpperCase();
const tone=name=>{let hash=0;for(const char of String(name||''))hash=(hash*31+char.charCodeAt(0))%360;return hash;};

export default function AdminLiveComments({token,session,enabled}){
  const live=useLiveComments({token,session,enabled});
  const [replyId,setReplyId]=useState(''),[draft,setDraft]=useState(''),[note,setNote]=useState('');
  const flow=useRef(null),stick=useRef(true),seen=useRef(0);
  const [away,setAway]=useState(0);
  const count=live.items.filter(item=>!item.failed).length;
  const toLatest=behavior=>{const el=flow.current;if(!el)return;el.scrollTo({top:el.scrollHeight,behavior});stick.current=true;seen.current=live.items.length;setAway(0);};
  const onScroll=()=>{const el=flow.current;if(!el)return;const near=el.scrollHeight-el.scrollTop-el.clientHeight<56;stick.current=near;if(near){seen.current=live.items.length;setAway(0);}};
  // Follow the newest comment like a chat, unless the host scrolled up to read; then offer a "new comments" pill instead.
  useEffect(()=>{if(stick.current)toLatest('smooth');else setAway(Math.max(0,live.items.length-seen.current));},[live.items.length]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{setReplyId('');setDraft('');setNote('');seen.current=0;stick.current=true;},[session]);
  const status=!session?['off','Offline']:!live.online?['warn','Reconnecting…']:['on','Live'];
  const submit=async event=>{event.preventDefault();const text=note;if(!text.trim())return;setNote('');await live.send(text);};
  const submitReply=async(item,event)=>{event.preventDefault();if(await live.reply(item.id,draft)){setReplyId('');setDraft('');}};
  const rows=live.items;
  return <div className="alc">
    <header className="alc-head">
      <h3><MessageSquare size={15} aria-hidden="true"/>Audience comments<span className="alc-count">{count}</span></h3>
      <span className="alc-status" data-state={status[0]} role="status"><i aria-hidden="true"/>{status[1]}</span>
    </header>
    {live.notice&&<p className="alc-notice" role="alert"><span>{live.notice}</span><button type="button" aria-label="Dismiss" onClick={live.clearNotice}><X size={13} aria-hidden="true"/></button></p>}
    <div className="alc-body">
      {!session?<p className="alc-empty">Comments appear when you go live.</p>
        :live.loading?<p className="alc-empty" role="status">Loading comments…</p>
        :!rows.length?<p className="alc-empty">No comments yet. Say hello to the room.</p>:null}
      <ol className="alc-flow" ref={flow} onScroll={onScroll} aria-live="polite" aria-label="Live comment flow">
        {rows.map(item=>{
          const working=Boolean(live.busy[item.id]);
          return <li key={item.id} className={'alc-item'+(item.hidden?' is-hidden':'')+(item.mine?' is-mine':'')+(item.pending?' is-pending':'')+(item.failed?' is-failed':'')}>
            <span className="alc-avatar" style={{'--hue':tone(item.name)}} aria-hidden="true">{initial(item.name)}</span>
            <div className="alc-main">
              <div className="alc-meta"><strong>{item.name}</strong><time dateTime={clock(item.createdAt)?new Date(item.createdAt).toISOString():undefined}>{clock(item.createdAt)}</time>{item.hidden&&<em className="alc-tag">Hidden from the room</em>}</div>
              <p className="alc-text">{item.text}</p>
              {item.pending&&<small className="alc-state">Sending…</small>}
              {item.failed&&<div className="alc-state is-error"><span>Not sent{item.error?' · '+item.error:''}</span><button type="button" onClick={()=>void live.send(item.text,item.id)}><RotateCw size={12} aria-hidden="true"/>Retry</button><button type="button" onClick={()=>live.discard(item.id)}>Discard</button></div>}
              {item.reply?.text&&replyId!==item.id&&<p className="alc-reply"><CornerDownRight size={13} aria-hidden="true"/><span><b>You</b> {item.reply.text}</span></p>}
              {!item.pending&&!item.failed&&!item.mine&&(replyId===item.id
                ?<form className="alc-reply-form" onSubmit={event=>void submitReply(item,event)}>
                  <input autoFocus aria-label={'Reply to '+item.name} placeholder="Reply to everyone in the room…" maxLength={280} enterKeyHint="send" value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){setReplyId('');setDraft('');}}}/>
                  <button type="submit" disabled={working||(!draft.trim()&&!item.reply?.text)}>{working?'…':draft.trim()||!item.reply?.text?'Send':'Remove'}</button>
                  <button type="button" className="is-quiet" onClick={()=>{setReplyId('');setDraft('');}}>Cancel</button>
                </form>
                :<div className="alc-actions">
                  <button type="button" disabled={working} onClick={()=>{setReplyId(item.id);setDraft(item.reply?.text||'');}}><CornerDownRight size={13} aria-hidden="true"/>{item.reply?.text?'Edit reply':'Reply'}</button>
                  <button type="button" disabled={working} onClick={()=>void live.hide(item.id,!item.hidden)}>{item.hidden?<Eye size={13} aria-hidden="true"/>:<EyeOff size={13} aria-hidden="true"/>}{working?'Saving…':item.hidden?'Restore':'Hide'}</button>
                </div>)}
            </div>
          </li>;
        })}
      </ol>
      {away>0&&<button type="button" className="alc-latest" onClick={()=>toLatest('smooth')}><ArrowDown size={13} aria-hidden="true"/>{away} new {away===1?'comment':'comments'}</button>}
    </div>
    <form className="alc-compose" onSubmit={event=>void submit(event)}>
      <input aria-label="Comment to the room" placeholder={session?'Write a comment to the room…':'Comments open when you go live'} maxLength={280} enterKeyHint="send" value={note} onChange={event=>setNote(event.target.value)} disabled={!session}/>
      <button type="submit" aria-label="Send comment" disabled={!session||!note.trim()}><Send size={15} aria-hidden="true"/></button>
    </form>
  </div>;
}
