import MusicPreferenceValue from './MusicPreferenceValue';
import {musicMessageFields} from '../lib/musicMessageFields';
import {fieldName} from '../lib/eventOrderCore.mjs';
import {Sparkles,UserRound,Phone,MessageSquare} from 'lucide-react';
import './echoChatMessage.css';

const safeHttps=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
// https links (uploaded files and photo links the assistant mentions) become hyperlinks that open in a new tab.
function Linked({text}){
 return text.split(/(https:\/\/[^\s<>()]+)/gu).map((part,index)=>{const trimmed=part.replace(/[.,;:!?]+$/u,''),href=index%2?safeHttps(trimmed):null;return href?<span key={index}><a href={href} target="_blank" rel="noopener noreferrer">{trimmed}</a>{part.slice(trimmed.length)}</span>:part;});
}
function InlineText({text}){
 return text.split(/\*\*([^*]+)\*\*/gu).map((part,index)=>index%2?<strong key={index}><Linked text={part}/></strong>:<Linked key={index} text={part}/>);
}
function MessageText({text}){
 const lines=text.split('\n');
 if(lines.length>1&&lines.every(line=>/^\s*[-*•]\s+/u.test(line)))return <ul className="echo-message-list">{lines.map((line,index)=><li key={index}><InlineText text={line.replace(/^\s*[-*•]\s+/u,'')}/></li>)}</ul>;
 return <p dir="auto"><InlineText text={text}/></p>;
}
export default function EchoChatMessage({message,ar=false}){
 const assistant=message.role==='assistant',voice=message.mode==='voice',Source=voice?Phone:MessageSquare,Avatar=assistant?Sparkles:UserRound;
 const tr=(en,arabic)=>ar?arabic:en;
 const parsed=musicMessageFields(message.content),music=message.musicFields?.length?message.musicFields:parsed.fields;
 const text=parsed.fields.length?parsed.text:message.content;
 return <article className={`ai-booking-message echo-chat-message is-${message.role}`}>
  <header className="echo-message-header"><span className="echo-message-avatar" aria-hidden="true"><Avatar size={13}/></span><strong>{assistant?'Echo AI':tr('You','أنت')}</strong><span className="echo-message-source" data-mode={voice?'voice':'chat'}><Source size={10} aria-hidden="true"/>{voice?tr('Voice call','مكالمة صوتية'):tr('Text','نص')}</span></header>
  <div className="echo-message-body">{text&&<MessageText text={text}/>}</div>
  {music.length>0&&<div className="echo-message-music">{music.map(({path,value},index)=><section className="echo-message-music-section" key={`${path}:${index}`}><h4>{fieldName(path,ar)}</h4><MusicPreferenceValue path={path} value={value} ar={ar}/></section>)}</div>}
  
 </article>;
}
