import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Armchair,FileDown,Plus,Trash2,X} from 'lucide-react';
import './seatingChart.css';

// The hosts' plan for the 3D Room: room size, number of columns and tables, and who sits at which numbered table.
// For now it is kept in this browser (per draft); saving it to the booking is the next step.
const EMPTY={room:{auto:true,width:14,depth:12},columns:null,tables:null,guests:{}};
export function useSeatingPlan(draftId){
 const key=`echo-seating-plan:${draftId||'local'}`;
 const read=()=>{try{return {...EMPTY,...JSON.parse(localStorage.getItem(key)||'{}')};}catch{return EMPTY;}};
 const [plan,setPlan]=useState(read);
 useEffect(()=>{setPlan(read());},[key]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(plan));}catch{/* Optional: the plan then lasts for this visit only. */}},[key,plan]);
 return [plan,setPlan];
}
// What the layout needs from the plan: counts only, so typing a name never rebuilds the 3D room.
export function layoutPlanOf(plan){
 const numbers=Object.keys(plan.guests).map(Number).filter(Number.isInteger);
 const top=Math.max(0,...numbers),counts=Array.from({length:top},(_,index)=>(plan.guests[index+1]||[]).filter(guest=>guest.first||guest.last).length);
 return {columns:plan.columns,tables:plan.tables,seated:counts.some(Boolean)?counts:undefined};
}
const Number_=({value,min,max,onCommit,label,suffix,live=false})=>{
 const [text,setText]=useState(String(value)),focused=useRef(false);
 useEffect(()=>{if(!focused.current)setText(String(value));},[value]);
 const commit=raw=>{const next=raw.trim()===''?NaN:Number(raw);const valid=Number.isFinite(next)?Math.min(max,Math.max(min,Math.round(next))):value;setText(String(valid));if(valid!==value)onCommit(valid);};
 return <label className="sc-field"><span>{label}</span><span className="sc-number"><input type="number" inputMode="numeric" min={min} max={max} step="1" value={text}
  onFocus={()=>{focused.current=true;}}
  onChange={event=>{const raw=event.target.value;setText(raw);const next=event.target.valueAsNumber;if(live&&Number.isFinite(next)&&next>=min&&next<=max&&Math.round(next)!==value)onCommit(Math.round(next));}}
  onBlur={()=>{focused.current=false;commit(text);}}
  onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>{suffix&&<b>{suffix}</b>}</span></label>;
};

// Word opens an HTML file saved as .doc, so no library is needed.
const esc=text=>String(text).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function downloadWord({title,sub,boxes,ar}){
 const html=`<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body dir="${ar?'rtl':'ltr'}" style="font-family:Arial,sans-serif;color:#17262c"><h1>${esc(title)}</h1><p>${esc(sub)}</p><table width="100%" cellspacing="8" style="border-collapse:separate;table-layout:fixed">${Array.from({length:Math.ceil(boxes.length/3)},(_,r)=>`<tr>${[0,1,2].map(i=>{const b=boxes[r*3+i];return b?`<td width="33%" valign="top" style="border:1px solid #bbb;padding:8px"><b>${esc(b.label)}</b><br/>${(b.names.length?b.names:['—']).map(esc).join('<br/>')}</td>`:'<td width="33%"></td>';}).join('')}</tr>`).join('')}</table></body></html>`;
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff',html],{type:'application/msword'}));a.download='seating-chart.doc';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

// Top-down plan in metres (x right, z towards the door wall): room, DJ stage, dance floor, tables with chairs, columns and the door.
function Blueprint({tr,width,depth,zones}){
 const {dance,tables,columns,stageEnd}=zones,stageW=Math.min(10,width*.6),doorZ=depth/2-1.6,pad=1.2;
 const label=(x,z,text,size=.45,anchor='middle',fill='#17262c')=><text x={x} y={z} fontSize={size} textAnchor={anchor} fill={fill} fontFamily="Arial,sans-serif">{text}</text>;
 return <>
  <h2>{tr('Room blueprint','مخطط الغرفة')}</h2>
  <p>{tr(`${width} × ${depth} m · ${tables.length} tables · ${columns.length} columns`,`${width} × ${depth} م · ${tables.length} طاولات · ${columns.length} أعمدة`)}</p>
  <svg viewBox={`${-width/2-pad} ${-depth/2-pad} ${width+pad*2} ${depth+pad*2+.8}`} style={{width:'100%',height:'auto',display:'block',direction:'ltr'}} role="img" aria-label={tr('Room blueprint','مخطط الغرفة')}>
   <rect x={-width/2} y={-depth/2} width={width} height={depth} fill="#fff" stroke="#17262c" strokeWidth=".14"/>
   <rect x={-stageW/2} y={-depth/2} width={stageW} height={stageEnd+depth/2} fill="#e3d3a3" stroke="#17262c" strokeWidth=".06"/>
   {label(0,-depth/2+(stageEnd+depth/2)/2+.15,tr('DJ STAGE','منصة DJ'))}
   <rect x={dance.x-dance.w/2} y={dance.z-dance.d/2} width={dance.w} height={dance.d} fill="#17262c14" stroke="#17262c" strokeWidth=".06" strokeDasharray=".25 .15"/>
   {label(dance.x,dance.z+.15,tr('DANCE FLOOR','ساحة الرقص'))}
   {tables.map(table=><g key={table.number}>
    {table.chairs.map((chair,i)=><circle key={i} cx={chair.x} cy={chair.z} r=".22" fill="#fff" stroke="#17262c" strokeWidth=".05"/>)}
    <ellipse cx={table.x} cy={table.z} rx="1" ry=".66" transform={`rotate(${-table.rotation*180/Math.PI} ${table.x} ${table.z})`} fill="#f4efe2" stroke="#17262c" strokeWidth=".06"/>
    {label(table.x,table.z+.16,table.number,.5)}</g>)}
   {columns.map((column,i)=><circle key={i} cx={column.x} cy={column.z} r=".3" fill="#17262c"/>)}
   <rect x={-width/2-.08} y={doorZ-.8} width=".16" height="1.6" fill="#fff" stroke="#17262c" strokeWidth=".05"/>
   <path d={`M${-width/2} ${doorZ-.8} A1.6 1.6 0 0 1 ${-width/2+1.6} ${doorZ+.8}`} fill="none" stroke="#17262c" strokeWidth=".04"/>
   {label(-width/2+.2,doorZ+1.5,tr('DOOR','الباب'),.4,'start')}
   {label(0,depth/2+pad+.2,`${width} m`,.45,'middle','#566')}
   <text transform={`translate(${width/2+pad-.3} 0) rotate(90)`} fontSize=".45" textAnchor="middle" fill="#566" fontFamily="Arial,sans-serif">{depth} m</text>
  </svg>
  <p style={{fontSize:12}}>{tr('Table numbers match the seating chart. Distances are in metres.','أرقام الطاولات تطابق مخطط الجلوس. المسافات بالأمتار.')}</p>
 </>;
}

export default function SeatingChart({plan,setPlan,zones,recommended,guestCount,ar,onClose}){
 const tr=(en,arabic)=>ar?arabic:en,tables=zones.tables,maxTables=60,[card,setCard]=useState(false),roomW=plan.room.auto?recommended.width:plan.room.width,roomD=plan.room.auto?recommended.depth:plan.room.depth;
 const set=patch=>setPlan(current=>({...current,...patch}));
 const guestsAt=number=>plan.guests[number]||[];
 const edit=(number,id,patch)=>set({guests:{...plan.guests,[number]:guestsAt(number).map(guest=>guest.id===id?{...guest,...patch}:guest)}});
 const add=number=>set({guests:{...plan.guests,[number]:[...guestsAt(number),{id:`${Date.now()}-${Math.random().toString(36).slice(2,6)}`,first:'',last:''}]}});
 const remove=(number,id)=>set({guests:{...plan.guests,[number]:guestsAt(number).filter(guest=>guest.id!==id)}});
 const named=Object.values(plan.guests).flat().filter(guest=>guest.first||guest.last).length;
 return <aside className="seating-chart" aria-label={tr('Seating chart','مخطط الجلوس')}>
  <header><span><Armchair size={18} aria-hidden="true"/>{tr('Seating chart','مخطط الجلوس')}</span><button type="button" onClick={onClose} aria-label={tr('Close seating chart','إغلاق مخطط الجلوس')}><X size={18}/></button></header>
  <button type="button" className="sc-add" onClick={()=>setCard('seating')}><FileDown size={14} aria-hidden="true"/>{tr('Seating chart / PDF','مخطط الجلوس / PDF')}</button>
  <button type="button" className="sc-add" onClick={()=>setCard('blueprint')}><FileDown size={14} aria-hidden="true"/>{tr('Room blueprint / PDF','مخطط الغرفة / PDF')}</button>
  <p className="sc-summary">{tr(`${named} of ${guestCount||0} guests placed at ${tables.length} tables`,`${named} من ${guestCount||0} ضيف موزعون على ${tables.length} طاولات`)}</p>
  <section className="sc-room" aria-label={tr('Room','الغرفة')}>
   <h4>{tr('Room','الغرفة')}</h4>
   <div className="sc-grid">
    <Number_ live label={tr('Width','العرض')} suffix="m" min={8} max={200} value={plan.room.auto?recommended.width:plan.room.width} onCommit={width=>set({room:{auto:false,width,depth:plan.room.auto?recommended.depth:plan.room.depth}})}/>
    <Number_ live label={tr('Depth','العمق')} suffix="m" min={8} max={200} value={plan.room.auto?recommended.depth:plan.room.depth} onCommit={depth=>set({room:{auto:false,width:plan.room.auto?recommended.width:plan.room.width,depth}})}/>
    <Number_ label={tr('Columns','الأعمدة')} min={0} max={40} value={zones.columns.length} onCommit={columns=>set({columns})}/>
    <Number_ label={tr('Tables','الطاولات')} min={0} max={maxTables} value={tables.length} onCommit={count=>set({tables:count})}/>
   </div>
   {(!plan.room.auto||plan.columns!==null||plan.tables!==null)&&<button type="button" className="sc-reset" onClick={()=>set({room:{...plan.room,auto:true},columns:null,tables:null})}>{tr(`Fit everything to my ${guestCount||0} guests`,`ملاءمة كل شيء لـ ${guestCount||0} ضيف`)}</button>}
  </section>
  <section className="sc-tables" aria-label={tr('Tables','الطاولات')}>
   <h4>{tr('Tables','الطاولات')}</h4>
   {tables.length===0&&<p className="sc-empty">{tr('No tables in this room yet. Raise the number of tables or enlarge the room.','لا توجد طاولات بعد. زد عدد الطاولات أو وسّع الغرفة.')}</p>}
   <ol>{tables.map(table=>{const list=guestsAt(table.number),seats=table.chairs.length;return <li key={table.number}><details>
    <summary><b>{tr('Table','طاولة')} {table.number}</b><span>{list.filter(guest=>guest.first||guest.last).length}/{seats}</span></summary>
    <ul>{list.map(guest=><li key={guest.id}>
     <input value={guest.first} placeholder={tr('First name','الاسم الأول')} aria-label={`${tr('First name','الاسم الأول')} · ${tr('Table','طاولة')} ${table.number}`} onChange={event=>edit(table.number,guest.id,{first:event.target.value})} maxLength={60}/>
     <input value={guest.last} placeholder={tr('Last name','اسم العائلة')} aria-label={`${tr('Last name','اسم العائلة')} · ${tr('Table','طاولة')} ${table.number}`} onChange={event=>edit(table.number,guest.id,{last:event.target.value})} maxLength={60}/>
     <button type="button" aria-label={tr('Remove guest','إزالة الضيف')} onClick={()=>remove(table.number,guest.id)}><Trash2 size={14}/></button></li>)}</ul>
    <button type="button" className="sc-add" disabled={list.length>=seats} onClick={()=>add(table.number)}><Plus size={14} aria-hidden="true"/>{list.length>=seats?tr('Table is full','الطاولة ممتلئة'):tr('Add a guest','إضافة ضيف')}</button>
   </details></li>;})}</ol>
  </section>
 {card&&createPortal(<div className="sc-card-wrap" role="dialog" aria-modal="true" aria-label={tr('Seating chart card','بطاقة مخطط الجلوس')}>
   <div className="sc-card" dir={ar?'rtl':'ltr'}>
    <div className="sc-no-print sc-card-bar"><button type="button" onClick={()=>setCard(false)}>{tr('Close','إغلاق')}</button><button type="button" onClick={()=>window.print()}>{tr('Download PDF','تنزيل PDF')}</button>{card==='seating'&&<button type="button" onClick={()=>downloadWord({ar,title:tr('Seating chart','مخطط الجلوس'),sub:tr(`${named} of ${guestCount||0} guests · ${tables.length} tables`,`${named} من ${guestCount||0} ضيف · ${tables.length} طاولات`),boxes:tables.map(table=>({label:`${tr('Table','طاولة')} ${table.number}`,names:guestsAt(table.number).filter(guest=>guest.first||guest.last).map(guest=>`${guest.first} ${guest.last}`.trim())}))})}>{tr('Download Word','تنزيل Word')}</button>}</div>
    {card==='blueprint'?<Blueprint tr={tr} width={roomW} depth={roomD} zones={zones}/>:<>
    <h2>{tr('Seating chart','مخطط الجلوس')}</h2>
    <p>{tr(`${named} of ${guestCount||0} guests · ${tables.length} tables`,`${named} من ${guestCount||0} ضيف · ${tables.length} طاولات`)}</p>
    <div className="sc-card-tables">{tables.map(table=>{const list=guestsAt(table.number).filter(guest=>guest.first||guest.last);return <section key={table.number}><h3>{tr('Table','طاولة')} {table.number}</h3><ul>{list.length?list.map(guest=><li key={guest.id}>{guest.first} {guest.last}</li>):<li className="sc-card-empty">—</li>}</ul></section>;})}</div>
    </>}
   </div>
  </div>,document.body)}
 </aside>;
}
