import {useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import StudioSetList from './StudioSetList';

export default function AdminLiveAudience({token,session,enabled,onReview,liveSessions=[],setListActions={}}) {
 const [filter,setFilter]=useState('pending_admin');
 const [feed,setFeed]=useState({session:null,requests:[],comments:[],loading:true,error:''});
 const [busy,setBusy]=useState(''),[feedback,setFeedback]=useState(''),[retry,setRetry]=useState(0);
 const previousSession=useRef(null);
 const [replyId,setReplyId]=useState(''),[draft,setDraft]=useState(''),[note,setNote]=useState('');
 // Comments flow like a live chat: oldest at the top, newest at the bottom, following the latest unless the admin scrolls up.
 const flow=useRef(null),stick=useRef(true),[atLatest,setAtLatest]=useState(true);
 const scrollToLatest=behavior=>{const el=flow.current;if(!el)return;el.scrollTo({top:el.scrollHeight,behavior});stick.current=true;setAtLatest(true);};
 const onFlowScroll=()=>{const el=flow.current;if(!el)return;const near=el.scrollHeight-el.scrollTop-el.clientHeight<48;stick.current=near;setAtLatest(near);};
 const revision=useRef(0),action=useRef(false),binding=useRef({token,session});binding.current={token,session};
 useEffect(()=>{
  let cancelled=false,timer;const controller=new AbortController();
  setFeed(current=>current.session===session?current:{session,requests:[],comments:[],loading:Boolean(session),error:''});
  if(previousSession.current!==session){setFeedback('');previousSession.current=session;}
  if(!enabled||!token||!session)return undefined;
  const refresh=async()=>{
   const version=revision.current;
   const results=await Promise.allSettled([apiRequest('/live-requests/admin?broadcast=current',{token,signal:controller.signal}),apiRequest('/live-comments/admin?session='+encodeURIComponent(session),{token,signal:controller.signal})]);
   if(!cancelled&&version===revision.current) {
    setFeed(current=>{
     const [requests,comments]=results;const valid=result=>result.status==='fulfilled'&&result.value.session===session;
     return {session,requests:valid(requests)?requests.value.items:current.requests,comments:valid(comments)?comments.value.items:current.comments,loading:false,error:results.every(valid)?'':'Audience updates are unavailable. Reconnecting automatically…'};
    });
   }
   if(!cancelled)timer=setTimeout(tick,2000);
  };
  // Hidden tabs do not poll; showing the tab again fetches straight away.
  const tick=()=>{if(document.hidden){timer=setTimeout(tick,2000);return;}refresh();};
  const onVisible=()=>{if(!document.hidden&&!cancelled){clearTimeout(timer);refresh();}};
  document.addEventListener('visibilitychange',onVisible);
  refresh();return()=>{cancelled=true;controller.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[token,session,enabled,retry]);
 const run=async(id,operation)=>{
  if(action.current)return;action.current=true;setBusy(id);setFeedback('');revision.current++;
  const owner=binding.current;
  try {await operation();if(binding.current.token===owner.token&&binding.current.session===owner.session){setFeedback('Change saved.');setRetry(value=>value+1);}}
  catch(error){if(binding.current.token===owner.token&&binding.current.session===owner.session){setFeedback(error.message||'Could not save. Please try again.');setRetry(value=>value+1);}}
  finally {action.current=false;setBusy('');}
 };
 const current=feed.session===session?feed:{requests:[],comments:[],loading:true};
 const approve=item=>run(item.id,async()=>{const reviewed=await onReview(item.id,{session,decision:'approved'});if(item.sourcePlatform==='youtube'&&item.sourceUrl&&reviewed?.item?.requestStatus==='approved'){await apiRequest('/live-requests/'+item.id+'/to-wav',{method:'POST',token});await setListActions.onRefresh?.();}});
 // The host answers a comment (shown under it for everyone), or writes to the room directly.
 const sendReply=item=>run(item.id,async()=>{await apiRequest('/live-comments/'+item.id+'/reply',{method:'POST',token,body:{session,text:draft.trim()}});setReplyId('');setDraft('');});
 const sendNote=event=>{event.preventDefault();const text=note.trim();if(!text||!session)return;void run('compose',async()=>{await apiRequest('/live-comments',{method:'POST',token,body:{session,text}});setNote('');});};
 const comments=[...current.comments].sort((x,y)=>new Date(x.createdAt)-new Date(y.createdAt));
 useEffect(()=>{if(stick.current)scrollToLatest('smooth');},[comments.length]);
 const pending=current.requests.filter(item=>['pending_admin','reviewing'].includes(item.requestStatus));
 const items=filter==='all'?current.requests:pending;
 const requests=<aside className="admin-live-requests-aside" aria-label="Audience requests">
   <div className="admin-request-section-head"><h3>Audience requests <span>{current.requests.length}</span></h3></div>
   {(feedback||current.error)&&<p className="admin-request-feedback" role="status">{feedback||current.error}</p>}
   {!session?<p className="admin-live-empty">Requests appear when you go live.</p>:current.loading?<p role="status">Loading audience activity…</p>:<>
    <label className="admin-live-request-filter">Show <select value={filter} onChange={event=>setFilter(event.target.value)}><option value="pending_admin">Needs review</option><option value="all">All requests</option></select></label>
    {!items.length&&<p className="admin-live-empty">{filter==='all'?'No requests yet.':'No requests awaiting review.'}</p>}
    {items.map(item=><article className="admin-request-card" key={item.id}>
     <header><strong>{item.track||'Track pending'}</strong><span>{item.aiSummary||item.message||item.confirmationCode}</span></header>
     <p><span>Artist:</span><b>{item.artist||'Artist not supplied'}</b></p>
     <p><span>Requested by:</span><b>{item.requesterName||'Audience'}</b></p>
     <p><span>Source:</span><b>{item.sourcePlatform||'manual'} {item.sourceUrl&&<a className="admin-request-link" href={item.sourceUrl} target="_blank" rel="noreferrer">Open link</a>}</b></p>
     <p><span>Queue fit:</span><b>{item.suggestedInsertLabel||'Queue suggestion pending'}</b></p>
     <p><span>Status:</span><b className={'admin-request-status admin-request-status-'+item.requestStatus}>{item.requestStatus.replaceAll('_',' ')}</b></p>
     {item.audioPreparation&&<p><span>Audio:</span><b>{item.audioPreparation==='raw'?'Raw · ready to download':item.audioPreparation==='converting'?'Converting…':item.audioError||'Conversion failed'}</b></p>}
     <div className="admin-request-actions admin-request-table-actions">
      {item.requestStatus==='reviewing'&&<button type="button" className="secondary-button" disabled={Boolean(busy)||Boolean(current.error)} onClick={()=>run(item.id,()=>apiRequest('/live-requests/'+item.id+'/recover',{method:'POST',token,body:{session}}))}>Recover interrupted review</button>}
      {item.requestStatus==='pending_admin'&&<><button type="button" className="primary-button" disabled={Boolean(busy)||Boolean(current.error)} onClick={()=>approve(item)}>{busy===item.id?'Preparing…':item.sourcePlatform==='youtube'&&item.sourceUrl?'CONVERT & ADD':'APPROVE'}</button><button type="button" className="secondary-button" disabled={Boolean(busy)||Boolean(current.error)} onClick={()=>run(item.id,()=>onReview(item.id,{session,decision:'rejected'}))}>REJECT</button></>}
     </div>
    </article>)}
   </>}
  </aside>;
 return <div className="admin-live-left-column">
  <StudioSetList items={liveSessions} token={token} actions={setListActions}/>
  <aside className="admin-live-comments-aside" aria-label="Audience comments">
   <div className="admin-request-section-head"><h3>Audience comments <span>{current.comments.length}</span></h3></div>
   {!session?<p className="admin-live-empty">Comments appear when you go live.</p>:!current.loading&&!current.comments.length?<p className="admin-live-empty">No comments yet.</p>:null}
   <ol className="admin-comment-flow" ref={flow} onScroll={onFlowScroll} aria-live="polite" aria-label="Live comment flow">
    {comments.map(item=><li className={'admin-comment-line'+(item.hidden?' is-hidden':'')} key={item.id}>
     <time dateTime={new Date(item.createdAt).toISOString()}>{new Date(item.createdAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time>
     <p><strong>{item.name}</strong> <span className="admin-comment-text">{item.text}</span></p>
     {item.reply?.text&&replyId!==item.id&&<p className="admin-comment-reply"><strong>You</strong>{item.reply.text}</p>}
     <button type="button" className="admin-comment-moderate" disabled={Boolean(busy)||Boolean(current.error)} onClick={()=>run(item.id,()=>apiRequest('/live-comments/'+item.id+'/moderation',{method:'PATCH',token,body:{session,hidden:!item.hidden}}))}>{busy===item.id?'Saving…':item.hidden?'Restore':'Hide'}</button>
     {replyId===item.id
      ?<form className="admin-comment-reply-form" onSubmit={event=>{event.preventDefault();sendReply(item);}}>
        <input autoFocus aria-label={'Reply to '+item.name} placeholder="Reply to everyone in the room…" maxLength={280} enterKeyHint="send" value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){setReplyId('');setDraft('');}}}/>
        <button type="submit" disabled={Boolean(busy)||(!draft.trim()&&!item.reply?.text)}>{draft.trim()||!item.reply?.text?'Send':'Remove'}</button>
        <button type="button" className="is-quiet" onClick={()=>{setReplyId('');setDraft('');}}>Cancel</button>
       </form>
      :<button type="button" className="admin-comment-reply-button" disabled={Boolean(busy)||Boolean(current.error)} onClick={()=>{setReplyId(item.id);setDraft(item.reply?.text||'');}}>{item.reply?.text?'Edit reply':'Reply'}</button>}
    </li>)}
   </ol>
   <form className="admin-comment-reply-form admin-comment-compose" onSubmit={sendNote}>
    <input aria-label="Comment to the room" placeholder={session?'Write a comment to the room…':'Comments open when you go live'} maxLength={280} enterKeyHint="send" value={note} onChange={event=>setNote(event.target.value)} disabled={!session||Boolean(current.error)}/>
    <button type="submit" disabled={Boolean(busy)||!note.trim()||!session||Boolean(current.error)}>{busy==='compose'?'…':'Send'}</button>
   </form>
   {!atLatest&&<button type="button" className="admin-comment-latest" onClick={()=>scrollToLatest('smooth')}>↓ Latest comments</button>}
  </aside>
  {requests}
 </div>;
}
