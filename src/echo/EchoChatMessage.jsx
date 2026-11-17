import MusicPreferenceValue from './MusicPreferenceValue';
import {musicMessageFields} from '../lib/musicMessageFields';
import {fieldName} from '../lib/eventOrderCore.mjs';
import {manualBookingFieldHref} from '../lib/bookingAtomReview';
import {formatVenueAddress} from '../lib/venueAddressFormat';
import {Sparkles,UserRound,Phone,MessageSquare} from 'lucide-react';
import './echoChatMessage.css';

const safeHttps=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
// https links (uploaded files and photo links the assistant mentions) become hyperlinks that open in a new tab.
function Linked({text}){
 // [name](https://…) shows the name as the link; a bare https link shows itself.
 return text.split(/(\[[^\]]{1,200}\]\(https:\/\/[^\s<>()]+\)|https:\/\/[^\s<>()]+)/gu).map((part,index)=>{
  if(index%2===0)return part;
  const named=/^\[([^\]]+)\]\((https:\/\/[^\s<>()]+)\)$/u.exec(part);
  if(named){const href=safeHttps(named[2]);return href?<a key={index} href={href} target="_blank" rel="noopener noreferrer">{named[1]}</a>:named[1];}
  const trimmed=part.replace(/[.,;:!?]+$/u,''),href=safeHttps(trimmed);
  return href?<span key={index}><a href={href} target="_blank" rel="noopener noreferrer">{trimmed}</a>{part.slice(trimmed.length)}</span>:part;
 });
}
function InlineText({text}){
 return text.split(/\*\*([^*]+)\*\*/gu).map((part,index)=>index%2?<strong key={index}><Linked text={part}/></strong>:<Linked key={index} text={part}/>);
}
const tableRow=line=>/^\s*\|.*\|\s*$/u.test(line),tableCells=line=>line.trim().replace(/^\||\|$/gu,'').split('|').map(cell=>cell.trim());
function TextBlock({text}){
 const lines=text.split('\n');
 if(lines.length>1&&lines.every(line=>/^\s*[-*•]\s+/u.test(line)))return <ul className="echo-message-list">{lines.map((line,index)=><li key={index}><InlineText text={line.replace(/^\s*[-*•]\s+/u,'')}/></li>)}</ul>;
 return <p dir="auto"><InlineText text={text}/></p>;
}
// Equipment and quantities arrive as a markdown table (| Item | Qty |) and are shown as a real table; everything else is text or a list.
function MessageText({text}){
 const blocks=[];let current=[],table=false;
 const flush=()=>{if(current.length)blocks.push({table,lines:current});current=[];};
 for(const line of text.split('\n')){const isTable=tableRow(line);if(isTable!==table)flush();table=isTable;current.push(line);}
 flush();
 return <>{blocks.map((block,index)=>{
  if(!block.table){const body=block.lines.join('\n').trim();return body?<TextBlock key={index} text={body}/>:null;}
  const rows=block.lines.filter(line=>!/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/u.test(line)).map(tableCells);
  if(rows.length<2)return <TextBlock key={index} text={block.lines.join('\n')}/>;
  const [head,...body]=rows;
  return <table className="echo-message-table" key={index}><thead><tr>{head.map((cell,cellIndex)=><th scope="col" key={cellIndex}>{cell}</th>)}</tr></thead><tbody>{body.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=><td key={cellIndex}><InlineText text={cell}/></td>)}</tr>)}</tbody></table>;
 })}</>;
}
export default function EchoChatMessage({message,ar=false,onAction,onVenueSelect,venueDisabled=false}){
 const assistant=message.role==='assistant',voice=message.mode==='voice',Source=voice?Phone:MessageSquare,Avatar=assistant?Sparkles:UserRound;
 const tr=(en,arabic)=>ar?arabic:en;
 const parsed=musicMessageFields(message.content),music=message.musicFields?.length?message.musicFields:parsed.fields;
 const text=parsed.fields.length?parsed.text:message.content;
 return <article className={`ai-booking-message echo-chat-message is-${message.role}`}>
  <header className="echo-message-header"><span className="echo-message-avatar" aria-hidden="true"><Avatar size={13}/></span><strong>{assistant?'Echo AI':tr('You','أنت')}</strong><span className="echo-message-source" data-mode={voice?'voice':'chat'}><Source size={10} aria-hidden="true"/>{voice?tr('Voice call','مكالمة صوتية'):tr('Text','نص')}</span></header>
  <div className="echo-message-body">{text&&<MessageText text={text}/>}</div>
  {assistant&&message.venueResults?.length>0&&<div className="echo-message-venues" role="group" aria-label={tr('Matching venues','الأماكن المطابقة')} dir={ar?'rtl':'ltr'}>{message.venueResults.map((place,index)=><section className="echo-message-venue" key={`${place.sourceId||place.name}:${index}`}>
   <strong dir="auto">{place.name}</strong>
   <address dir="ltr">{formatVenueAddress(place)}</address>
   {place.sourceAttribution&&<small dir="auto">{place.sourceAttribution}</small>}
   {onVenueSelect&&<button type="button" disabled={venueDisabled} onClick={()=>onVenueSelect(place)} aria-label={tr(`Use venue: ${place.name}`,`استخدام المكان: ${place.name}`)}>{tr('Use this venue','استخدام هذا المكان')}</button>}
  </section>)}</div>}
  {music.length>0&&<div className="echo-message-music">{music.map(({path,value},index)=><section className="echo-message-music-section" key={`${path}:${index}`}><h4>{fieldName(path,ar)}</h4><MusicPreferenceValue path={path} value={value} ar={ar}/></section>)}</div>}
  {message.actions?.some(action=>action.goto||onAction)&&<div className="echo-message-actions" role="group">{message.actions.filter(action=>action.goto||onAction).map(action=>action.goto?<a key={action.label} href={manualBookingFieldHref(action.goto)}>{action.label}</a>:<button type="button" key={action.label} className={action.danger?'is-danger':''} onClick={()=>onAction(action.text)}>{action.label}</button>)}</div>}
 </article>;
}
