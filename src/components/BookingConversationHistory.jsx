import { useEffect, useState } from 'react';
import { History, MessageCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';

const date = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function BookingConversationHistory({ token }) {
  const [items,setItems]=useState([]),[selected,setSelected]=useState(''),[conversation,setConversation]=useState(null);
  const [loading,setLoading]=useState(true),[detailLoading,setDetailLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setItems([]);setSelected('');setConversation(null);
    apiRequest('/ai-booking/conversations',{token}).then(data=>{if(active){setItems(data.items);setSelected(data.items[0]?.id||'');}}).catch(()=>{if(active)setError('Could not load your conversations. Please try again.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[token,retry]);
  useEffect(()=>{
    if(!selected)return;
    let active=true;setDetailLoading(true);setConversation(null);setError('');
    apiRequest(`/ai-booking/conversations/${encodeURIComponent(selected)}`,{token}).then(data=>{if(active)setConversation(data.item);}).catch(()=>{if(active)setError('Could not load this conversation. Please try again.');}).finally(()=>{if(active)setDetailLoading(false);});
    return()=>{active=false;};
  },[selected,token]);
  return <section aria-labelledby="conversation-history-title">
    <header className="cw-heading"><div><h1 id="conversation-history-title">Conversation history</h1><p>Your saved AI booking chats and available voice transcripts. Times shown in Toronto time. Audio recordings are not stored here.</p></div><a className="primary-button" href="/#how-to-book">Start a conversation</a></header>
    {error?<div className="cw-panel" role="alert"><p>{error}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>:null}
    {loading?<p role="status">Loading your conversations…</p>:!error&&!items.length?<div className="cw-panel cw-empty"><History size={28}/><h2>No saved conversations yet</h2><p>New conversations will appear here after you accept the AI notice. Earlier unsaved conversations cannot be recovered.</p></div>:items.length>0?<div className="cw-conversations">
      <nav className="cw-conversation-list" aria-label="Saved booking conversations">{items.map(item=><button key={item.id} type="button" aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}><MessageCircle size={16}/><span><strong>{item.title}</strong><small>{date(item.updatedAt)}</small></span></button>)}{items.length===100&&<p>Showing your 100 most recent conversations.</p>}</nav>
      <article className="cw-panel cw-transcript" aria-label="Saved conversation transcript" aria-busy={detailLoading}>{detailLoading?<p role="status">Loading transcript…</p>:conversation?<><h2>Booking conversation</h2><p>Started {date(conversation.createdAt)}</p>{conversation.messages.map(message=><div className={`cw-message is-${message.role}`} key={message.id}><div><strong>{message.role==='user'?'You':'Echo AI'}</strong><small>{message.mode==='voice'?'Voice transcript':'Chat'} · {date(message.createdAt)}</small></div><p dir="auto">{message.content}</p></div>)}</>:null}</article>
    </div>:null}
  </section>;
}
