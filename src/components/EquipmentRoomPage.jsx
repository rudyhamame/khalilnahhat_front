import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Move,RotateCcw,RotateCw} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {layoutEquipment} from '../echo/simulationLayout';
import './equipmentRoomPage.css';

// A full page with the 3D room, where the admin drags one piece of equipment to where it stands in every client's room.
// The standard 14 x 12 m room, back wall first. Fields below the 3D view give exact numbers (applied on Enter / leaving the field).
const ROOM_W=14,ROOM_D=12;
const round=(value,step=.05)=>Math.round(value/step)*step;
const fixed=value=>Number(round(value).toFixed(2));
export default function EquipmentRoomPage({item,allItems,token,onClose,onSaved,report}){
 const stage=useRef(null),engine=useRef(null);
 const auto=useMemo(()=>{const unit=layoutEquipment([{...item,roomPlacement:null,quantity:1}],ROOM_W,ROOM_D).units[0];return unit?{x:fixed(unit.x),fromBack:fixed(unit.z+ROOM_D/2),rotation:Math.round((unit.rot||0)*180/Math.PI),height:fixed(unit.y||0)}:{x:0,fromBack:2,rotation:0,height:0};},[item]);// eslint-disable-line react-hooks/exhaustive-deps
 const [place,setPlace]=useState(()=>item.roomPlacement?{...item.roomPlacement}:auto),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const start=useRef(place);
 // This page has its own address (?place=<id>) so the browser Back button returns to the equipment list.
 useEffect(()=>{
  const url=new URL(window.location.href);url.searchParams.set('place',item.id);window.history.pushState({eqPlace:true},'',url);
  const onPop=()=>onClose();window.addEventListener('popstate',onPop);
  return()=>{window.removeEventListener('popstate',onPop);const now=new URL(window.location.href);if(now.searchParams.has('place')){now.searchParams.delete('place');window.history.replaceState(window.history.state,'',now);}};
 },[item.id]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  let disposed=false;
  const items=allItems.filter(row=>row.isActive!==false&&!row.isSet||row.id===item.id).map(row=>({...row,quantity:1,...(row.id===item.id?{roomPlacement:start.current}:{})}));
  import('../echo/setupSimulationEngine').then(({createSetupSimulation})=>{if(disposed)return;return createSetupSimulation(stage.current,{width:ROOM_W,depth:ROOM_D,boundary:null,holes:[],items,positions:{},grid:true,guests:0,active:{current:true},mode:{current:'day'},movableId:item.id},unit=>{
   if(disposed||!unit||unit.id!==item.id)return;
   setPlace(current=>({...current,x:fixed(unit.x),fromBack:fixed(unit.z+ROOM_D/2),rotation:Math.round(unit.rotation*180/Math.PI)}));
  },status=>{if(!disposed&&status&&!status.loading)setLoading(false);});}).then(value=>{if(!value)return;if(disposed)value.dispose();else{engine.current=value;value.select(`${item.id}:0`);setLoading(false);}}).catch(failure=>{console.error('3D room could not start:',failure);if(!disposed){setLoading(false);setError(/webgl|context/i.test(String(failure?.message||failure))?'The 3D room needs WebGL. Turn on hardware acceleration in your browser, or try another browser.':'The 3D room could not load. Check your connection and try again.');}});
  return()=>{disposed=true;engine.current?.dispose();engine.current=null;};
 },[item.id]);// eslint-disable-line react-hooks/exhaustive-deps
 const apply=(field,min,max)=>event=>{
  if(event.type==='keydown'&&event.key!=='Enter')return;
  const value=Number(event.target.value);if(!Number.isFinite(value))return;const next=Math.max(min,Math.min(max,value));
  setPlace(current=>({...current,[field]:next}));
  if(field==='x')engine.current?.move('x',next);else if(field==='fromBack')engine.current?.move('z',next-ROOM_D/2);else if(field==='rotation')engine.current?.rotateTo(next*Math.PI/180);else if(field==='height')engine.current?.move('y',next);
 };
 const save=async placement=>{
  setBusy(true);
  try{await apiRequest(`/equipment/${item.id}`,{method:'PATCH',token,body:{roomPlacement:placement}});report(placement?`${item.name} placed in the 3D room.`:`${item.name} back to its automatic position.`);await onSaved();onClose();}
  catch(problem){report(problem.message||'The placement could not be saved.',true);}finally{setBusy(false);}
 };
 const field=(label,name,min,max,step,hint)=><label>{label}<input key={`${name}${place[name]}`} type="number" step={step} min={min} max={max} defaultValue={place[name]} onBlur={apply(name,min,max)} onKeyDown={apply(name,min,max)}/><small>{hint}</small></label>;
 return <div className="eq-room-page" role="region" aria-label={`Place ${item.name} in the 3D room`}>
  <header>
   <button type="button" className="eq-room-back" disabled={busy} onClick={onClose}><ArrowLeft size={16} aria-hidden="true"/>Back</button>
   <div><small>3D ROOM</small><h2>Place {item.name}</h2></div>
   <span className="eq-room-spacer"/>
   <button type="button" className="eq-place-auto" disabled={busy||!item.roomPlacement} onClick={()=>save(null)}><RotateCcw size={14} aria-hidden="true"/>Use automatic position</button>
   <button type="button" className="eq-place-save" disabled={busy||Boolean(error)} onClick={()=>save({x:place.x,fromBack:place.fromBack,rotation:place.rotation,height:place.height})}>{busy?'Saving…':'Save placement'}</button>
  </header>
  <div className="eq-room-body">
   <div className="eq-room-stage" ref={stage}>{loading&&!error&&<p role="status">Loading the 3D room…</p>}{error&&<p role="alert">{error}</p>}</div>
   <aside>
    <p className="eq-room-help"><Move size={13} aria-hidden="true"/>Drag {item.name} in the room. Drag empty space to turn the view, scroll to zoom. Clients see it here by default in their 3D room.</p>
    {field('Across the room (m)','x',-ROOM_W/2,ROOM_W/2,.05,'0 = centre, − left, + right')}
    {field('From the back wall (m)','fromBack',0,ROOM_D,.05,'0 = against the back wall')}
    {field('Turn (degrees)','rotation',-360,360,5,'0 faces the guests')}
    {field('Height off the floor (m)','height',0,10,.05,'For hung lights and projectors')}
    <button type="button" className="eq-room-turn" onClick={()=>engine.current?.rotate()}><RotateCw size={14} aria-hidden="true"/>Turn 45°</button>
   </aside>
  </div>
 </div>;
}
