import './bookingDraftConversation.css';

export default function BookingDraftConversation({conversation}){
 if(!conversation)return null;
 const messages=conversation.messages||[];
 return <details className="booking-draft-conversation"><summary>Echo AI conversation <span>({messages.length} messages · text and voice)</span></summary>
  {messages.length?<ol>{messages.map((message,index)=><li key={message.id||index}>
   <header><strong>{message.role==='assistant'?'Echo AI':'Client'}</strong><span>{message.mode==='voice'?'Voice call':'Text'}</span>{message.createdAt&&<time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('en-CA')}</time>}</header>
   <p dir="auto">{message.content}</p>
  </li>)}</ol>:<p>No Echo AI messages were recorded for this draft.</p>}
 </details>;
}
