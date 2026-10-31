import {useCallback,useEffect,useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,CalendarX2,CalendarCheck2} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './adminAvailability.css';

const pad=n=>String(n).padStart(2,'0');
const keyOf=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
const torontoToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Toronto'});
const clock=minutes=>{const h=Math.floor(minutes/60)%24;return `${h%12||12}:${pad(minutes%60)} ${h<12?'AM':'PM'}`;};
const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Admin calendar: confirmed bookings (read-only) and days the owner marks unavailable. The public Availability calendar reads the same data.
export default function AdminAvailability({token}){
 const today=torontoToday();
 const [focus,setFocus]=useState(()=>({year:Number(today.slice(0,4)),month:Number(today.slice(5,7))-1}));
 const [data,setData]=useState({bookings:{},blocked:[]});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [selected,setSelected]=useState([]),[note,setNote]=useState(''),[anchor,setAnchor]=useState(null);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{setData(await apiRequest(`/admin/availability?year=${focus.year}`,{token}));}
  catch(e){setError(e.message||'Availability could not be loaded.');}
  finally{setLoading(false);}
 },[focus.year,token]);
 useEffect(()=>{load();},[load]);
 const blocked=useMemo(()=>new Map(data.blocked.map(row=>[row.date,row.note||''])),[data.blocked]);
 const cells=useMemo(()=>{
  const first=new Date(focus.year,focus.month,1),offset=first.getDay(),count=new Date(focus.year,focus.month+1,0).getDate();
  return [...Array(offset).fill(null),...Array.from({length:count},(_,i)=>i+1)];
 },[focus]);
 const move=step=>{setSelected([]);setAnchor(null);setFocus(current=>{const d=new Date(current.year,current.month+step,1);return {year:d.getFullYear(),month:d.getMonth()};});};
 const pick=(key,event)=>{
  setNotice('');
  if(event.shiftKey&&anchor){
   const [a,b]=[anchor,key].sort(),range=[];
   for(let d=new Date(`${a}T12:00:00Z`);d<=new Date(`${b}T12:00:00Z`)&&range.length<400;d.setUTCDate(d.getUTCDate()+1))range.push(d.toISOString().slice(0,10));
   setSelected(range);return;
  }
  setAnchor(key);setSelected(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
 };
 const save=async value=>{
  if(!selected.length||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   await apiRequest('/admin/availability/blocked',{token,method:'PUT',body:{dates:selected,blocked:value,...(value&&note.trim()?{note:note.trim()}:{})}});
   setNotice(value?`Marked ${selected.length} day${selected.length===1?'':'s'} unavailable.`:`Marked ${selected.length} day${selected.length===1?'':'s'} available.`);
   setSelected([]);setAnchor(null);setNote('');await load();
  }catch(e){setError(e.message||'Could not save.');}
  finally{setBusy(false);}
 };
 const title=new Date(focus.year,focus.month,1).toLocaleDateString('en-CA',{month:'long',year:'numeric'});
 const monthPrefix=`${focus.year}-${pad(focus.month+1)}-`;
 const upcoming=data.blocked.filter(row=>row.date>=today);
 const anyBlockedSelected=selected.some(key=>blocked.has(key)),anyFreeSelected=selected.some(key=>!blocked.has(key));
 return <section className="admin-availability" aria-label="Availability">
  <header className="aav-bar">
   <div className="aav-nav"><button type="button" aria-label="Previous month" onClick={()=>move(-1)}><ChevronLeft size={16}/></button><h2>{title}</h2><button type="button" aria-label="Next month" onClick={()=>move(1)}><ChevronRight size={16}/></button><button type="button" onClick={()=>{setSelected([]);setFocus({year:Number(today.slice(0,4)),month:Number(today.slice(5,7))-1});}}>Today</button></div>
  </header>
  <div className="aav-layout">
   <div className="aav-calendar" aria-busy={loading}>
    <div className="aav-grid" role="grid" aria-label={title}>
     {WEEKDAYS.map(day=><span key={day} className="aav-weekday" role="columnheader">{day}</span>)}
     {cells.map((day,index)=>{
      if(day===null)return <span key={`blank-${index}`} className="aav-blank"/>;
      const key=keyOf(focus.year,focus.month,day),ranges=data.bookings[key]||[],isBlocked=blocked.has(key),past=key<today,on=selected.includes(key);
      const kind=isBlocked?'blocked':ranges.length?'booked':'free';
      return <button key={key} type="button" role="gridcell" className={`aav-day is-${kind}${past?' is-past':''}${on?' is-selected':''}${key===today?' is-today':''}`} aria-pressed={on} aria-label={`${key}: ${isBlocked?'unavailable':ranges.length?'has a confirmed booking':'free'}`} onClick={event=>pick(key,event)}>
       <b>{day}</b>
       {isBlocked&&<small>Unavailable{blocked.get(key)?` · ${blocked.get(key)}`:''}</small>}
       {ranges.map((range,i)=><small key={i} className="aav-range">{range.end-range.start>=1440?'All day':`${clock(range.start)} – ${clock(range.end)}`}</small>)}
      </button>;
     })}
    </div>
    <div className="aav-legend"><span><i className="is-free"/>Free</span><span><i className="is-booked"/>Confirmed booking</span><span><i className="is-blocked"/>Unavailable (set by you)</span></div>
   </div>
   <aside className="aav-side">
    <h3>{selected.length?`${selected.length} day${selected.length===1?'':'s'} selected`:'Select days'}</h3>
    <label>Note (optional)<input type="text" maxLength={200} value={note} placeholder="e.g. Vacation" onChange={event=>setNote(event.target.value)} disabled={!selected.length||busy}/></label>
    <button type="button" className="aav-primary" disabled={!selected.length||busy||!anyFreeSelected} onClick={()=>save(true)}><CalendarX2 size={15}/> Mark unavailable</button>
    <button type="button" disabled={!selected.length||busy||!anyBlockedSelected} onClick={()=>save(false)}><CalendarCheck2 size={15}/> Mark available</button>
    {selected.length>0&&<button type="button" className="aav-link" onClick={()=>{setSelected([]);setAnchor(null);}}>Clear selection</button>}
    {error&&<p className="aav-error" role="alert">{error}</p>}
    {notice&&<p className="aav-notice" role="status">{notice}</p>}
    <h3>Upcoming unavailable days</h3>
    {upcoming.length?<ul className="aav-list">{upcoming.slice(0,40).map(row=><li key={row.date}><span>{new Date(`${row.date}T12:00:00`).toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}{row.note?<small>{row.note}</small>:null}</span><button type="button" onClick={()=>{setSelected([row.date]);setAnchor(row.date);const [y,m]=row.date.split('-').map(Number);setFocus({year:y,month:m-1});}}>Select</button></li>)}</ul>:<p className="aav-empty">{loading?'Loading…':'No unavailable days set.'}</p>}
    <p className="aav-count">{data.blocked.filter(row=>row.date.startsWith(monthPrefix)).length} unavailable this month</p>
   </aside>
  </div>
 </section>;
}
