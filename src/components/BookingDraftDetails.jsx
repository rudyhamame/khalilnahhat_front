import {contract,getPath,isAnswered} from '../lib/eventOrderCore.mjs';
import {eventTypeLabel} from '../lib/eventTypeLabel';
import {dialectRecord} from '../lib/dialects';

const labels={dj:'DJ service',mc:'MC hosting & announcements',sound:'Sound systems',lighting:'Lighting',led:'LED walls',fx:'Special effects',rental:'Equipment rental',corporate:'Corporate services',whatsapp:'WhatsApp'};
const readable=value=>labels[value]||String(value).replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
const planningLabels={brideName:'Bride’s name',groomName:'Groom’s name',timeline:'Event timeline',partyEntrances:'Party entrances',entranceSongs:'Entrance songs',firstDance:'First dance',parentDances:'Parent dances',dinnerMusic:'Dinner music',cakeCutting:'Cake cutting',announcements:'Announcements',mustPlay:'Must-play songs',doNotPlay:'Do-not-play songs',specialRequests:'Planning requests',musicUploads:'Music references'};
const safeLink=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}};

function DraftValue({field,value}){
 if(!isAnswered(value))return <span className="bd-missing">Not provided yet</span>;
 if(typeof value==='boolean')return value?'Yes':'No';
 if(Array.isArray(value))return <ul className="bd-value-list">{value.map((item,index)=>{
  if(field.type==='links'){
   const href=safeLink(item);
   return <li key={index}>{href?<a href={href} target="_blank" rel="noopener noreferrer">{item}</a>:String(item)}</li>;
  }
  if(field.type==='attachments')return <li key={index}>{safeLink(item.url)?<a href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a>:item.name}{item.comment&&<> — {item.comment}</>}</li>;
  if(field.type==='pairs')return <li key={index}>{item.language}{item.dialect?' · '+(dialectRecord(item.dialect)?.display_name||item.dialect):''}</li>;
  if(field.type==='songs')return typeof item==='string'?<li key={index}>{item}</li>:<li key={index}>{item.phase&&<strong>{readable(item.phase)} · </strong>}{[item.song,item.artist].filter(Boolean).join(' — ')}{safeLink(item.link)&&<> · <a href={safeLink(item.link)} target="_blank" rel="noopener noreferrer">Song link</a></>}</li>;
  return <li key={index}>{field.key==='music.dialects'?dialectRecord(item)?.display_name||readable(item):field.options?readable(item):String(item)}</li>;
 })}</ul>;
 if(field.key==='event.type')return eventTypeLabel(value);
 return field.options?readable(value):String(value);
}

export default function BookingDraftDetails({order}){
 const sections=contract.sections.filter(section=>!section.gate||getPath(order,section.gate)===true).map(section=>({...section,fields:section.fields.filter(field=>!field.hidden||isAnswered(getPath(order,field.key))).filter(field=>field.type!=='coordinate'&&!field.key.startsWith('event.venue.source')).filter(field=>field.required||isAnswered(getPath(order,field.key)))}));
 const planning=Object.entries(planningLabels).filter(([key])=>isAnswered(order.planning?.[key])).map(([key,label])=>({key:'planning.'+key,label,type:key==='musicUploads'?'links':'textarea'}));
 if(planning.length)sections.push({id:'planning',title:'Event planning',fields:planning});
 return <div className="bd-details">
  {sections.map(section=><section className="bd-section" key={section.id} aria-labelledby={'bd-'+section.id}><h3 id={'bd-'+section.id}>{section.title.replace(' (optional)','')}</h3>{section.fields.length?<dl>{section.fields.map(field=><div key={field.key}><dt>{field.label.replace(/ \(optional[^)]*\)/g,'')}</dt><dd><DraftValue field={field} value={getPath(order,field.key)}/></dd></div>)}</dl>:<p className="bd-missing">No details added yet.</p>}</section>)}
  <section className="bd-section" aria-labelledby="bd-equipment"><h3 id="bd-equipment">Equipment & complete sets</h3>{order.equipment?.length?<ul className="bd-equipment-list">{order.equipment.map((item,index)=><li key={item.id||index}><span>{item.name||readable(item.id)}</span><strong>Qty {item.quantity}</strong></li>)}</ul>:<p className="bd-missing">No equipment selected yet.</p>}</section>
 </div>;
}
