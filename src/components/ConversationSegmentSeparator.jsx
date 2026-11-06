import './conversationSegmentSeparator.css';

export default function ConversationSegmentSeparator({message,previous,ar=false,as:Tag='div'}){
 if(!previous)return null;
 const gap=Date.parse(message.createdAt)-Date.parse(previous.createdAt);
 const changed=message.segmentId&&message.segmentId!==previous.segmentId;
 if(!changed&&message.mode===previous.mode&&!(gap>15*60*1000))return null;
 const voice=message.mode==='voice';
 const label=voice?(ar?'مكالمة صوتية جديدة':'Voice call resumed'):(ar?'استئناف المحادثة النصية':'Text conversation resumed');
 const at=Date.parse(message.createdAt);
 return <Tag className="conversation-segment-separator" role="separator" aria-label={label}><span>{label}{Number.isFinite(at)&&<> · <time dateTime={message.createdAt}>{new Date(at).toLocaleString(ar?'ar-CA':'en-CA',{timeZone:'America/Toronto',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time></>}</span></Tag>;
}
