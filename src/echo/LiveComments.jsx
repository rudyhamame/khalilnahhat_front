import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send} from 'lucide-react';
import {apiRequest} from '../lib/api';
import LiveSignInPrompt from './LiveSignInPrompt';
export default function LiveComments({user,token,live,active,ar,sessionIdentity,overlay=false}) {
  const tr=(en,arabic)=>ar?arabic:en;
  const signedIn=Boolean(user&&token);
  const [items,setItems]=useState([]),[session,setSession]=useState(null),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const generation=useRef(null),feed=useRef(null),follow=useRef(true);
  useEffect(()=>{if(overlay&&active&&follow.current&&feed.current)feed.current.scrollTop=feed.current.scrollHeight;},[items,overlay,active]);
  useEffect(()=>{
    const version={canceled:false};generation.current=version;let timer;
    setItems([]);setSession(null);setError('');setText('');setBusy(false);
    if(!active||!live||!signedIn||!sessionIdentity)return()=>{version.canceled=true;};
    const refresh=async()=>{
      try{const data=await apiRequest(`/live-comments?session=${encodeURIComponent(sessionIdentity)}`,{token});if(!version.canceled&&version===generation.current&&data.session===sessionIdentity){setSession(data.session);setItems(data.items||[]);setError('');}}
      catch{if(!version.canceled&&version===generation.current)setError(ar?'التعليقات غير متاحة مؤقتاً.':'Comments are temporarily unavailable.');}
      finally{if(!version.canceled&&version===generation.current)timer=setTimeout(refresh,6000);}
    };
    refresh();return()=>{version.canceled=true;clearTimeout(timer);};
  },[live,active,ar,sessionIdentity,signedIn,token]);
  const submit=async event=>{
    event.preventDefault();if(!signedIn||!text.trim()||!session||busy)return;
    const version=generation.current;setBusy(true);setError('');
    try{const result=await apiRequest('/live-comments',{token,method:'POST',body:{session,text:text.trim()}});if(!version.canceled&&version===generation.current){setItems(current=>[...current.filter(item=>item.id!==result.item.id),result.item].slice(-20));setText('');}}
    catch(e){if(!version.canceled&&version===generation.current)setError(e.message||tr('Could not send your comment.','تعذر إرسال التعليق.'));}
    finally{if(!version.canceled&&version===generation.current)setBusy(false);}
  };
  return <section className={`home-live-comments home-live-card${overlay?' is-overlay':''}`} id="home-live-comments-content" aria-labelledby="live-comments-title">
    <header><span><MessageCircle size={15}/><h3 id="live-comments-title">{tr('Room notes','تعليقات الجمهور')}</h3></span><small>{tr('COMMENTS','التعليقات')}</small></header>
    {!signedIn?<LiveSignInPrompt ar={ar} kind="comments"/>:<>
    <div ref={feed} onScroll={event=>{const node=event.currentTarget;follow.current=node.scrollHeight-node.clientHeight-node.scrollTop<40;}} className="home-live-comment-feed" aria-label={tr('Live comments','التعليقات المباشرة')} tabIndex={0}>{items.length?items.map(item=><p key={item.id}><strong>{item.name}</strong><span>{item.text}</span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(ar?'ar-CA':'en-CA',{hour:'2-digit',minute:'2-digit'}).format(new Date(item.createdAt))}</time></p>):<p className="home-live-empty">{live?tr('Be the first to say hello.','كن أول من يرسل تحية.'):tr('The conversation opens with the live set.','تُفتح التعليقات عند بدء البث.')}</p>}</div>
    <form onSubmit={submit}><div><input aria-label={tr('Your comment','تعليقك')} placeholder={tr('Leave a little love…','اكتب تعليقاً…')} maxLength={280} value={text} onChange={event=>setText(event.target.value)} disabled={!live}/><button type="submit" aria-label={tr('Send comment','إرسال التعليق')} disabled={!live||!session||!text.trim()||busy}>{busy?'…':<Send size={14}/>}</button></div></form>
    {error&&<p className="home-live-error" role="status">{error}</p>}
    </>}
  </section>;
}
