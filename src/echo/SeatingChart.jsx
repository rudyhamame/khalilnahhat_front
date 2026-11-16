import {useEffect,useState} from 'react';
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
const Number_=({value,min,max,onCommit,label,suffix})=><label className="sc-field"><span>{label}</span><span className="sc-number"><input key={value} type="number" inputMode="numeric" min={min} max={max} defaultValue={value} onBlur={event=>{const next=Math.round(Number(event.target.value));if(Number.isFinite(next))onCommit(Math.min(max,Math.max(min,next)));else event.target.value=value;}} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>{suffix&&<b>{suffix}</b>}</span></label>;

// Draws the card on a canvas (no library) and downloads it as a PNG, e.g. to upload into Canva.
function downloadPng({title,sub,boxes,ar}){
 const cols=3,w=1200,cw=360,gap=30,pad=60,rows=[];
 for(let i=0;i<boxes.length;i+=cols)rows.push(boxes.slice(i,i+cols));
 const heights=rows.map(row=>Math.max(...row.map(b=>60+Math.max(1,b.names.length)*30)));
 const h=pad*2+110+heights.reduce((a,b)=>a+b+gap,0),canvas=document.createElement('canvas');
 canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
 c.fillStyle='#fff';c.fillRect(0,0,w,h);c.direction=ar?'rtl':'ltr';c.textAlign=ar?'right':'left';
 const x0=ar?w-pad:pad;c.fillStyle='#17262c';c.font='700 44px sans-serif';c.fillText(title,x0,pad+40);
 c.fillStyle='#566';c.font='24px sans-serif';c.fillText(sub,x0,pad+84);
 let y=pad+120;
 rows.forEach((row,r)=>{row.forEach((b,i)=>{const x=pad+(ar?cols-1-i:i)*(cw+gap);
  c.strokeStyle='#17262c33';c.strokeRect(x,y,cw,heights[r]);c.fillStyle='#17262c';c.font='700 26px sans-serif';
  const tx=ar?x+cw-16:x+16;c.fillText(b.label,tx,y+38);c.font='22px sans-serif';
  (b.names.length?b.names:['—']).forEach((n,k)=>c.fillText(n,tx,y+74+k*30));});y+=heights[r]+gap;});
 const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='seating-chart.png';a.click();
}

export default function SeatingChart({plan,setPlan,zones,recommended,guestCount,ar,onClose}){
 const tr=(en,arabic)=>ar?arabic:en,tables=zones.tables,maxTables=60,[card,setCard]=useState(false);
 const set=patch=>setPlan(current=>({...current,...patch}));
 const guestsAt=number=>plan.guests[number]||[];
 const edit=(number,id,patch)=>set({guests:{...plan.guests,[number]:guestsAt(number).map(guest=>guest.id===id?{...guest,...patch}:guest)}});
 const add=number=>set({guests:{...plan.guests,[number]:[...guestsAt(number),{id:`${Date.now()}-${Math.random().toString(36).slice(2,6)}`,first:'',last:''}]}});
 const remove=(number,id)=>set({guests:{...plan.guests,[number]:guestsAt(number).filter(guest=>guest.id!==id)}});
 const named=Object.values(plan.guests).flat().filter(guest=>guest.first||guest.last).length;
 return <aside className="seating-chart" aria-label={tr('Seating chart','مخطط الجلوس')}>
  <header><span><Armchair size={18} aria-hidden="true"/>{tr('Seating chart','مخطط الجلوس')}</span><button type="button" onClick={onClose} aria-label={tr('Close seating chart','إغلاق مخطط الجلوس')}><X size={18}/></button></header>
  <button type="button" className="sc-add" onClick={()=>setCard(true)}><FileDown size={14} aria-hidden="true"/>{tr('View card / PDF','عرض البطاقة / PDF')}</button>
  <p className="sc-summary">{tr(`${named} of ${guestCount||0} guests placed at ${tables.length} tables`,`${named} من ${guestCount||0} ضيف موزعون على ${tables.length} طاولات`)}</p>
  <section className="sc-room" aria-label={tr('Room','الغرفة')}>
   <h4>{tr('Room','الغرفة')}</h4>
   <div className="sc-grid">
    <Number_ label={tr('Width','العرض')} suffix="m" min={8} max={200} value={plan.room.auto?recommended.width:plan.room.width} onCommit={width=>set({room:{auto:false,width,depth:plan.room.auto?recommended.depth:plan.room.depth}})}/>
    <Number_ label={tr('Depth','العمق')} suffix="m" min={8} max={200} value={plan.room.auto?recommended.depth:plan.room.depth} onCommit={depth=>set({room:{auto:false,width:plan.room.auto?recommended.width:plan.room.width,depth}})}/>
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
    <div className="sc-no-print sc-card-bar"><button type="button" onClick={()=>setCard(false)}>{tr('Close','إغلاق')}</button><button type="button" onClick={()=>window.print()}>{tr('Download PDF','تنزيل PDF')}</button><button type="button" onClick={()=>downloadPng({ar,title:tr('Seating chart','مخطط الجلوس'),sub:tr(`${named} of ${guestCount||0} guests · ${tables.length} tables`,`${named} من ${guestCount||0} ضيف · ${tables.length} طاولات`),boxes:tables.map(table=>({label:`${tr('Table','طاولة')} ${table.number}`,names:guestsAt(table.number).filter(guest=>guest.first||guest.last).map(guest=>`${guest.first} ${guest.last}`.trim())}))})}>{tr('Download image','تنزيل صورة')}</button></div>
    <h2>{tr('Seating chart','مخطط الجلوس')}</h2>
    <p>{tr(`${named} of ${guestCount||0} guests · ${tables.length} tables`,`${named} من ${guestCount||0} ضيف · ${tables.length} طاولات`)}</p>
    <div className="sc-card-tables">{tables.map(table=>{const list=guestsAt(table.number).filter(guest=>guest.first||guest.last);return <section key={table.number}><h3>{tr('Table','طاولة')} {table.number}</h3><ul>{list.length?list.map(guest=><li key={guest.id}>{guest.first} {guest.last}</li>):<li className="sc-card-empty">—</li>}</ul></section>;})}</div>
   </div>
  </div>,document.body)}
 </aside>;
}
