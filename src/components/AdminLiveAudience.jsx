import {useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import StudioSetList from './StudioSetList';
import {useLiveSetList} from '../hooks/useLiveSetList';
import AdminLiveComments from './AdminLiveComments';

export default function AdminLiveAudience({token,session,enabled,onReview,liveSessions=[],setListActions={}}) {
 const sessionSongs=useLiveSetList({token,session,enabled,initial:liveSessions});
 const [filter,setFilter]=useState('pending_admin');
 const [feed,setFeed]=useState({session:null,requests:[],loading:true,error:''});
 const [busy,setBusy]=useState(''),[feedback,setFeedback]=useState(''),[retry,setRetry]=useState(0);
 const previousSession=useRef(null);
 const revision=useRef(0),action=useRef(false),binding=useRef({token,session});binding.current={token,session};
 useEffect(()=>{
  let cancelled=false,timer;const controller=new AbortController();
  setFeed(current=>current.session===session?current:{session,requests:[],loading:Boolean(session),error:''});
  if(previousSession.current!==session){setFeedback('');previousSession.current=session;}
  if(!enabled||!token||!session)return undefined;
  const refresh=async()=>{
   const version=revision.current;
   const results=await Promise.allSettled([apiRequest('/live-requests/admin?broadcast=current',{token,signal:controller.signal})]);
   if(!cancelled&&version===revision.current) {
    setFeed(current=>{
     const [requests]=results;const valid=result=>result.status==='fulfilled'&&result.value.session===session;
     return {session,requests:valid(requests)?requests.value.items:current.requests,loading:false,error:valid(requests)?'':'Audience updates are unavailable. Reconnecting automatically…'};
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
 const current=feed.session===session?feed:{requests:[],loading:true};
 const approve=item=>run(item.id,async()=>{const reviewed=await onReview(item.id,{session,decision:'approved'});if(item.sourcePlatform==='youtube'&&item.sourceUrl&&reviewed?.item?.requestStatus==='approved'){await apiRequest('/live-requests/'+item.id+'/to-wav',{method:'POST',token});await setListActions.onRefresh?.();}});
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
  <StudioSetList key={session||'offline'} items={sessionSongs} token={token} actions={{...setListActions,onAdd:session?item=>setListActions.onAdd({...item,session}):undefined,onUpdate:session?(id,item)=>setListActions.onUpdate(id,{...item,session}):undefined,onDelete:session?setListActions.onDelete:undefined}}/>
  <aside className="admin-live-comments-aside" aria-label="Audience comments"><AdminLiveComments token={token} session={session} enabled={enabled}/></aside>
  {requests}
 </div>;
}
