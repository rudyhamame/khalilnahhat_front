import {Sparkles,UserRound,Phone,MessageSquare} from 'lucide-react';
import {aiMessageBlocks} from '../lib/aiMessageBlocks';
import AiMessageViewportLink from '../components/AiMessageViewportLink';
import './echoChatMessage.css';

function InlineText({text}){
 return text.split(/\*\*([^*]+)\*\*/gu).map((part,index)=>index%2?<strong key={index}>{part}</strong>:part);
}
function MessageText({text}){
 const lines=text.split('\n');
 if(lines.length>1&&lines.every(line=>/^\s*[-*•]\s+/u.test(line)))return <ul className="echo-message-list">{lines.map((line,index)=><li key={index}><InlineText text={line.replace(/^\s*[-*•]\s+/u,'')}/></li>)}</ul>;
 return <p dir="auto"><InlineText text={text}/></p>;
}
export default function EchoChatMessage({message,ar=false}){
 const assistant=message.role==='assistant',voice=message.mode==='voice',Source=voice?Phone:MessageSquare,Avatar=assistant?Sparkles:UserRound;
 const tr=(en,arabic)=>ar?arabic:en;
 return <article className={`ai-booking-message echo-chat-message is-${message.role}`}>
  <header className="echo-message-header"><span className="echo-message-avatar" aria-hidden="true"><Avatar size={13}/></span><strong>{assistant?'Echo AI':tr('You','أنت')}</strong><span className="echo-message-source" data-mode={voice?'voice':'chat'}><Source size={10} aria-hidden="true"/>{voice?tr('Voice call','مكالمة صوتية'):tr('Text','نص')}</span></header>
  <div className="echo-message-body">{assistant?aiMessageBlocks(message.content).map((block,index)=><div className={`echo-message-${block.kind}`} key={index}><MessageText text={block.text}/></div>):<MessageText text={message.content}/>}</div>
  {assistant&&<AiMessageViewportLink message={message} ar={ar}/>}
 </article>;
}
