import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Armchair,FileDown,Plus,Trash2,X} from 'lucide-react';
import {MODEL_SIZES} from './simulationLayout';
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
 // Per table: the number the hosts typed for it, else the count of guests named there, else nothing (the engine then shares the remaining guests evenly).
 const numbers=[...Object.keys(plan.guests),...Object.keys(plan.counts||{})].map(Number).filter(Number.isInteger);
 const top=Math.max(0,...numbers),seated=Array.from({length:top},(_,index)=>{const typed=plan.counts?.[index+1],named=(plan.guests[index+1]||[]).filter(guest=>guest.first||guest.last).length;return Number.isInteger(typed)?typed:named>0?named:null;});
 return {columns:plan.columns,tables:plan.tables,seated:seated.some(value=>value!==null)?seated:undefined};
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

// Top-down plan in metres (x right, z towards the door wall). Every object of the 3D room is drawn: room, DJ booth, dance floor, tables with chairs, cake table, sweetheart table, columns,
// every piece of rented equipment, plants, windows, paintings and the door. Items the visitor moved in the 3D room are drawn where they now stand.
function Blueprint({tr,ar,width,depth,zones,world={}}){
 const {dance,tables,columns,stageEnd}=zones,stageW=Math.min(10,width*.6),doorZ=depth/2-1.6,pad=1.2;
 const label=(x,z,text,size=.45,anchor='middle',fill='#17262c')=><text x={x} y={z} fontSize={size} textAnchor={anchor} fill={fill} fontFamily="Arial,sans-serif">{text}</text>;
 const where=(key,x,z,rotation=0)=>{const saved=world.positions?.[key];return saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z)?{x:saved.x,z:saved.z,rotation:Number.isFinite(saved.rotation)?saved.rotation:rotation}:{x,z,rotation};};
 const turn=(item)=>`rotate(${-item.rotation*180/Math.PI} ${item.x} ${item.z})`;
 // Equipment: every unit is a numbered marker; the legend names each kind of item and how many there are.
 const units=(world.units||[]).map(unit=>({...unit,...where(unit.key,unit.x,unit.z,unit.rot||0)})),names=[...new Set(units.map(unit=>(ar&&unit.nameAr)||unit.name||unit.id))];
 const sizeOf=unit=>{const [w,,d]=MODEL_SIZES[unit.kind]||[.5,.5,.5];return [Math.min(3.2,Math.max(.3,w)),Math.min(2,Math.max(.3,d))];};
 // Wall features use the same formulas as the 3D room.
 const z0=-depth/2+1.6,z1=depth/2-(depth>=6?2.4:1),span=z1-z0,windowCount=span>1.6?Math.max(1,Math.min(6,Math.floor(span/2.4))):0;
 const windows=Array.from({length:windowCount},(_,i)=>z0+span/windowCount*(i+.5)),paintings=Array.from({length:Math.max(0,windowCount-1)},(_,i)=>z0+span/windowCount*(i+1));
 const plants=[-1,1].map(sign=>({x:sign*(width/2-.55),z:-depth/2+.6}));
 const cake=world.cake?where('room:cake:1',world.cake.x,world.cake.z):null,sweet=world.sweetheart?where('room:sweetheart:1',world.sweetheart.x,world.sweetheart.z):null;
 const placedTables=tables.map(table=>({...table,...where(`room:table:${table.number}`,table.x,table.z,table.rotation)})),placedChairs=table=>{const base=tables.find(t=>t.number===table.number),dx=table.x-base.x,dz=table.z-base.z,turned=table.rotation-base.rotation,cos=Math.cos(turned),sin=Math.sin(turned);return base.chairs.map(chair=>{const rx=chair.x-base.x,rz=chair.z-base.z;return {x:table.x+rx*cos+rz*sin,z:table.z-rx*sin+rz*cos};});};
 const placedColumns=columns.map((column,i)=>({...column,...where(`room:column:${i+1}`,column.x,column.z)}));
 const legend=[
  [tr('Tables with chairs','طاولات مع كراسي'),placedTables.length],[tr('Columns','أعمدة'),placedColumns.length],[tr('DJ booth','كشك DJ'),1],[tr('Dance floor','ساحة الرقص'),1],
  ...(cake?[[tr('Cake table','طاولة الكعكة'),1]]:[]),...(sweet?[[tr('Sweetheart table','طاولة العروسين'),1]]:[]),
  [tr('Windows','نوافذ'),windows.length],[tr('Paintings','لوحات'),paintings.length],[tr('Potted plants','نباتات'),plants.length],[tr('Door','الباب'),depth>=6?1:0],
 ].filter(([,count])=>count>0);
 return <>
  <h2>{tr('Room blueprint','مخطط الغرفة')}</h2>
  <p>{tr(`${width} × ${depth} m · ${tables.length} tables · ${columns.length} columns · ${units.length} equipment pieces`,`${width} × ${depth} م · ${tables.length} طاولات · ${columns.length} أعمدة · ${units.length} قطعة معدات`)}</p>
  <svg viewBox={`${-width/2-pad} ${-depth/2-pad} ${width+pad*2} ${depth+pad*2+.8}`} style={{width:'100%',height:'auto',display:'block',direction:'ltr'}} role="img" aria-label={tr('Room blueprint','مخطط الغرفة')}>
   <rect x={-width/2} y={-depth/2} width={width} height={depth} fill="#fff" stroke="#17262c" strokeWidth=".14"/>
   <rect x={-stageW/2} y={-depth/2} width={stageW} height={stageEnd+depth/2} fill="#e3d3a3" stroke="#17262c" strokeWidth=".06"/>
   <rect x="-1.6" y={-depth/2+1.3} width="3.2" height="1" fill="#17262c" opacity=".85"/>
   {label(0,-depth/2+2.75,tr('DJ BOOTH','كشك DJ'))}
   <rect x={dance.x-dance.w/2} y={dance.z-dance.d/2} width={dance.w} height={dance.d} fill="#17262c14" stroke="#17262c" strokeWidth=".06" strokeDasharray=".25 .15"/>
   {label(dance.x,dance.z+.15,tr('DANCE FLOOR','ساحة الرقص'))}
   {windows.map((z,i)=><line key={`w${i}`} x1={-width/2} x2={-width/2} y1={z-.75} y2={z+.75} stroke="#5aa2c8" strokeWidth=".16"/>)}
   {paintings.map((z,i)=><line key={`p${i}`} x1={-width/2+.12} x2={-width/2+.12} y1={z-.45} y2={z+.45} stroke="#b8975a" strokeWidth=".1"/>)}
   {plants.map((plant,i)=><circle key={`pl${i}`} cx={plant.x} cy={plant.z} r=".35" fill="#7aa36a" stroke="#17262c" strokeWidth=".04"/>)}
   {placedTables.map(table=><g key={table.number}>
    {placedChairs(table).map((chair,i)=><circle key={i} cx={chair.x} cy={chair.z} r=".22" fill="#fff" stroke="#17262c" strokeWidth=".05"/>)}
    <ellipse cx={table.x} cy={table.z} rx={1.04*table.size} ry={.68*table.size} transform={turn(table)} fill="#f4efe2" stroke="#17262c" strokeWidth=".06"/>
    {label(table.x,table.z+.16,table.number,.5)}</g>)}
   {cake&&<g><circle cx={cake.x} cy={cake.z} r=".82" fill="#f7e9ee" stroke="#17262c" strokeWidth=".06"/><circle cx={cake.x} cy={cake.z} r=".3" fill="#fff" stroke="#b8975a" strokeWidth=".05"/>{label(cake.x,cake.z+1.35,tr('CAKE','الكعكة'),.36)}</g>}
   {sweet&&<g transform={turn(sweet)}><rect x={sweet.x-.9} y={sweet.z-.42} width="1.8" height=".85" fill="#f4efe2" stroke="#17262c" strokeWidth=".06"/>{[-.42,.42].map(dx=><circle key={dx} cx={sweet.x+dx} cy={sweet.z-.75} r=".22" fill="#fff" stroke="#17262c" strokeWidth=".05"/>)}{label(sweet.x,sweet.z+1.0,tr('SWEETHEART','العروسان'),.34)}</g>}
   {placedColumns.map((column,i)=><circle key={i} cx={column.x} cy={column.z} r=".3" fill="#17262c"/>)}
   {units.map((unit,i)=>{const [w,d]=sizeOf(unit),n=names.indexOf((ar&&unit.nameAr)||unit.name||unit.id)+1;return <g key={unit.key||i}><rect x={unit.x-w/2} y={unit.z-d/2} width={w} height={d} transform={turn(unit)} fill="#cfe3f5" stroke="#17262c" strokeWidth=".05"/>{label(unit.x,unit.z+.14,`E${n}`,Math.min(.4,Math.max(.25,Math.min(w,d)*.7)))}</g>;})}
   <rect x={-width/2-.08} y={doorZ-.8} width=".16" height="1.6" fill="#fff" stroke="#17262c" strokeWidth=".05"/>
   <path d={`M${-width/2} ${doorZ-.8} A1.6 1.6 0 0 1 ${-width/2+1.6} ${doorZ+.8}`} fill="none" stroke="#17262c" strokeWidth=".04"/>
   {label(-width/2+.2,doorZ+1.5,tr('DOOR','الباب'),.4,'start')}
   {label(0,depth/2+pad+.2,`${width} m`,.45,'middle','#566')}
   <text transform={`translate(${width/2+pad-.3} 0) rotate(90)`} fontSize=".45" textAnchor="middle" fill="#566" fontFamily="Arial,sans-serif">{depth} m</text>
  </svg>
  <h3>{tr('Everything in the room','كل ما في الغرفة')}</h3>
  <ul style={{columns:2,fontSize:12,margin:'4px 0 8px',paddingInlineStart:18}}>{legend.map(([name,count])=><li key={name}>{name} × {count}</li>)}{names.map((name,i)=><li key={`e${i}`}>E{i+1} · {name} × {units.filter(unit=>((ar&&unit.nameAr)||unit.name||unit.id)===name).length}</li>)}</ul>
  <p style={{fontSize:12}}>{tr('Table numbers match the seating chart. Distances are in metres. Items you moved in the 3D room are drawn where they now stand.','أرقام الطاولات تطابق مخطط الجلوس. المسافات بالأمتار. العناصر التي حرّكتها في الغرفة ثلاثية الأبعاد تظهر في مكانها الحالي.')}</p>
 </>;
}

export default function SeatingChart({plan,setPlan,zones,recommended,guestCount,ar,onClose,world}){
 const tr=(en,arabic)=>ar?arabic:en,tables=zones.tables,maxTables=60,[card,setCard]=useState(false),roomW=plan.room.auto?recommended.width:plan.room.width,roomD=plan.room.auto?recommended.depth:plan.room.depth;
 const [noteOn,setNoteOn]=useState(true);useEffect(()=>{const timer=setTimeout(()=>setNoteOn(false),15000);return()=>clearTimeout(timer);},[]);// the note removes itself after 15 s
 const set=patch=>setPlan(current=>({...current,...patch}));
 const guestsAt=number=>plan.guests[number]||[];
 const edit=(number,id,patch)=>set({guests:{...plan.guests,[number]:guestsAt(number).map(guest=>guest.id===id?{...guest,...patch}:guest)}});
 const add=number=>set({guests:{...plan.guests,[number]:[...guestsAt(number),{id:`${Date.now()}-${Math.random().toString(36).slice(2,6)}`,first:'',last:'',gender:''}]}});
 const remove=(number,id)=>set({guests:{...plan.guests,[number]:guestsAt(number).filter(guest=>guest.id!==id)}});
 const named=Object.values(plan.guests).flat().filter(guest=>guest.first||guest.last).length;
 return <aside className="seating-chart" aria-label={tr('Seating chart','مخطط الجلوس')}>
  <header><span><Armchair size={18} aria-hidden="true"/>{tr('Seating chart','مخطط الجلوس')}</span><button type="button" onClick={onClose} aria-label={tr('Close seating chart','إغلاق مخطط الجلوس')}><X size={18}/></button></header>
  {noteOn&&<p className="sc-note self-destruct-note" role="note">{tr('Guests appear as plain skinless mannequins until you add each guest’s name and gender here. This seating chart is private: it stays on your device only, and Echo does not see it.','سيظهر الضيوف كمجسّمات بلا ملامح إلى أن تضيف اسم كل ضيف وجنسه هنا. مخطط الجلوس خاص بك فقط ويبقى على جهازك، ولا تطّلع عليه Echo.')}</p>}
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
    <label className="sc-count"><span>{tr('Guests at this table','عدد ضيوف هذه الطاولة')}</span><input type="number" min="0" max={seats} inputMode="numeric" value={plan.counts?.[table.number]??''} placeholder={String(table.guests)} aria-label={`${tr('Guests at this table','عدد ضيوف هذه الطاولة')} · ${tr('Table','طاولة')} ${table.number}`} onChange={event=>{const raw=event.target.value,counts={...plan.counts};if(raw==='')delete counts[table.number];else counts[table.number]=Math.min(seats,Math.max(0,Math.floor(Number(raw))));set({counts});}}/></label>
    <ul>{list.map(guest=><li key={guest.id}>
     <input value={guest.first} placeholder={tr('First name','الاسم الأول')} aria-label={`${tr('First name','الاسم الأول')} · ${tr('Table','طاولة')} ${table.number}`} onChange={event=>edit(table.number,guest.id,{first:event.target.value})} maxLength={60}/>
     <input value={guest.last} placeholder={tr('Last name','اسم العائلة')} aria-label={`${tr('Last name','اسم العائلة')} · ${tr('Table','طاولة')} ${table.number}`} onChange={event=>edit(table.number,guest.id,{last:event.target.value})} maxLength={60}/>
     <select value={guest.gender||''} aria-label={`${tr('Gender','الجنس')} · ${tr('Table','طاولة')} ${table.number}`} onChange={event=>edit(table.number,guest.id,{gender:event.target.value})}><option value="">{tr('Gender','الجنس')}</option><option value="m">{tr('Male','ذكر')}</option><option value="f">{tr('Female','أنثى')}</option><option value="x">{tr('Prefer not to say','أفضل عدم الذكر')}</option></select>
     <button type="button" aria-label={tr('Remove guest','إزالة الضيف')} onClick={()=>remove(table.number,guest.id)}><Trash2 size={14}/></button></li>)}</ul>
    <button type="button" className="sc-add" disabled={list.length>=seats} onClick={()=>add(table.number)}><Plus size={14} aria-hidden="true"/>{list.length>=seats?tr('Table is full','الطاولة ممتلئة'):tr('Add a guest','إضافة ضيف')}</button>
   </details></li>;})}</ol>
  </section>
 {card&&createPortal(<div className="sc-card-wrap" role="dialog" aria-modal="true" aria-label={tr('Seating chart card','بطاقة مخطط الجلوس')}>
   <div className="sc-card" dir={ar?'rtl':'ltr'}>
    <div className="sc-no-print sc-card-bar"><button type="button" onClick={()=>setCard(false)}>{tr('Close','إغلاق')}</button><button type="button" onClick={()=>window.print()}>{tr('Download PDF','تنزيل PDF')}</button>{card==='seating'&&<button type="button" onClick={()=>downloadWord({ar,title:tr('Seating chart','مخطط الجلوس'),sub:tr(`${named} of ${guestCount||0} guests · ${tables.length} tables`,`${named} من ${guestCount||0} ضيف · ${tables.length} طاولات`),boxes:tables.map(table=>({label:`${tr('Table','طاولة')} ${table.number}`,names:guestsAt(table.number).filter(guest=>guest.first||guest.last).map(guest=>`${guest.first} ${guest.last}`.trim())}))})}>{tr('Download Word','تنزيل Word')}</button>}</div>
    {card==='blueprint'?<Blueprint tr={tr} ar={ar} width={roomW} depth={roomD} zones={zones} world={world}/>:<>
    <h2>{tr('Seating chart','مخطط الجلوس')}</h2>
    <p>{tr(`${named} of ${guestCount||0} guests · ${tables.length} tables`,`${named} من ${guestCount||0} ضيف · ${tables.length} طاولات`)}</p>
    <div className="sc-card-tables">{tables.map(table=>{const list=guestsAt(table.number).filter(guest=>guest.first||guest.last);return <section key={table.number}><h3>{tr('Table','طاولة')} {table.number}</h3><ul>{list.length?list.map(guest=><li key={guest.id}>{guest.first} {guest.last}</li>):<li className="sc-card-empty">—</li>}</ul></section>;})}</div>
    </>}
   </div>
  </div>,document.body)}
 </aside>;
}
