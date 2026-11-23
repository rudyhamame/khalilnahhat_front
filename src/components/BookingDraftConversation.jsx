import {Fragment} from 'react';
import ConversationSegmentSeparator from './ConversationSegmentSeparator';
import './bookingDraftConversation.css';

export default function BookingDraftConversation({conversation,expanded=false,ar=false}){
 if(!conversation)return null;
 const messages=conversation.messages||[];
 const content=<>
  {messages.length?<ol>{messages.map((message,index)=><Fragment key={message.id||index}><ConversationSegmentSeparator ar={ar} message={message} previous={messages[index-1]} as="li"/><li>
   <header><strong>{message.role==='assistant'?'Echo AI':ar?'العميل':'Client'}</strong><span>{message.mode==='voice'?(ar?'مكالمة صوتية':'Voice call'):(ar?'نص':'Text')}</span>{message.createdAt&&<time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString(ar?'ar-CA':'en-CA')}</time>}</header>
   <p dir="auto">{message.content}</p>
  </li></Fragment>)}</ol>:<p>{ar?'لم تُسجّل رسائل إيكو AI لهذه المسودة.':'No Echo AI messages were recorded for this draft.'}</p>}
 </>;
 return expanded?<section className="booking-draft-conversation is-expanded" aria-label={ar?'محادثة إيكو AI':'Echo AI conversation'}><header><h3>{ar?'محادثة إيكو AI':'Echo AI conversation'}</h3><span>{messages.length} {ar?'رسالة · نص وصوت':'messages · text & voice'}</span></header>{content}</section>:<details className="booking-draft-conversation"><summary>{ar?'محادثة إيكو AI':'Echo AI conversation'} <span>({messages.length} {ar?'رسالة · نص وصوت':'messages · text and voice'})</span></summary>{content}</details>;
}
