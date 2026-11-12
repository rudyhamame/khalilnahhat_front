import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ChevronDown,ChevronLeft,ChevronRight,ChevronUp,Grid3x3,Hand,Home,Keyboard,Magnet,Move,Moon,RotateCcw,RotateCw,Sun,ZoomIn,ZoomOut} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {layoutEquipment} from '../echo/simulationLayout';
import './equipmentRoomPage.css';

// A full page with the 3D room, where the admin drags one piece of equipment to where it stands in every client's room.
// The standard 14 x 12 m room, back wall first (the stage size fields preview other room sizes; the saved placement is the distance from the back wall and the centre line). Fields below the 3D view give exact numbers (applied on Enter / leaving the field).
const STD_W=14,STD_D=12,ROOMS=[['Small',8,8],['Standard',STD_W,STD_D],['Large',24,18],['Hall',40,30]];
const round=(value,step=.05)=>Math.round(value/step)*step;
const fixed=value=>Number(round(value).toFixed(2));
export default function EquipmentRoomPage({item,allItems,token,onClose,onSaved,report}){
 const stage=useRef(null),engine=useRef(null);
 const auto=useMemo(()=>{const unit=layoutEquipment([{...item,roomPlacement:null,quantity:1}],STD_W,STD_D).units[0];return unit?{x:fixed(unit.x),fromBack:fixed(unit.z+STD_D/2),rotation:Math.round((unit.rot||0)*180/Math.PI),height:fixed(unit.y||0),scale:1}:{x:0,fromBack:2,rotation:0,height:0,scale:1};},[item]);// eslint-disable-line react-hooks/exhaustive-deps
 const [place,setPlace]=useState(()=>item.roomPlacement?{scale:1,...item.roomPlacement}:auto),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [room,setRoom]=useState({w:STD_W,d:STD_D}),placeRef=useRef(place);placeRef.current=place;
 const [panning,setPanning]=useState(false),[grid,setGrid]=useState(true),[snap,setSnap]=useState(true),[day,setDay]=useState(true),[keys,setKeys]=useState(false);
 const snapRef=useRef(snap),gridRef=useRef(grid),dayRef=useRef(day);snapRef.current=snap;gridRef.current=grid;dayRef.current=day;
 useEffect(()=>{engine.current?.pan(panning);},[panning]);
 useEffect(()=>{engine.current?.grid(grid);},[grid]);
 useEffect(()=>{engine.current?.snap(snap?.25:0);},[snap]);
 useEffect(()=>{engine.current?.mode(day?'day':'dark');},[day]);
 // This page has its own address (?place=<id>) so the browser Back button returns to the equipment list.
 useEffect(()=>{
  const url=new URL(window.location.href);url.searchParams.set('place',item.id);window.history.pushState({eqPlace:true},'',url);
  const onPop=()=>onClose();window.addEventListener('popstate',onPop);
  return()=>{window.removeEventListener('popstate',onPop);const now=new URL(window.location.href);if(now.searchParams.has('place')){now.searchParams.delete('place');window.history.replaceState(window.history.state,'',now);}};
 },[item.id]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  let disposed=false;
  const items=allItems.filter(row=>row.isActive!==false&&!row.isSet||row.id===item.id).map(row=>({...row,quantity:1,...(row.id===item.id?{roomPlacement:placeRef.current}:{})}));
  import('../echo/setupSimulationEngine').then(({createSetupSimulation})=>{if(disposed)return;return createSetupSimulation(stage.current,{width:room.w,depth:room.d,boundary:null,holes:[],items,positions:{},grid:true,guests:0,active:{current:true},mode:{current:'day'},movableId:item.id},unit=>{
   if(disposed||!unit||unit.id!==item.id)return;
   setPlace(current=>({...current,x:fixed(unit.x),fromBack:fixed(unit.z+room.d/2),rotation:Math.round(unit.rotation*180/Math.PI),scale:Number((unit.scale||1).toFixed(2))}));
  },status=>{if(!disposed&&status&&!status.loading)setLoading(false);});}).then(value=>{if(!value)return;if(disposed)value.dispose();else{engine.current=value;value.select(`${item.id}:0`);value.snap(snapRef.current?.25:0);value.grid(gridRef.current);value.mode(dayRef.current?'day':'dark');setLoading(false);}}).catch(failure=>{console.error('3D room could not start:',failure);if(!disposed){setLoading(false);setError(/webgl|context/i.test(String(failure?.message||failure))?'The 3D room needs WebGL. Turn on hardware acceleration in your browser, or try another browser.':'The 3D room could not load. Check your connection and try again.');}});
  return()=>{disposed=true;engine.current?.dispose();engine.current=null;};
 },[item.id,room.w,room.d]);// eslint-disable-line react-hooks/exhaustive-deps
 // Keyboard, like a building game: W A S D / arrows pan, Q E orbit, R F tilt, + - zoom, 0 resets the view, G grid, [ ] turn the piece.
 useEffect(()=>{
  const onKey=event=>{
   const target=event.target;if(target&&(target.tagName==='INPUT'||target.tagName==='TEXTAREA'||target.tagName==='SELECT'||target.isContentEditable)||event.ctrlKey||event.metaKey||event.altKey)return;
   const cam=engine.current;if(!cam)return;const step=event.shiftKey?2.5:.8,key=event.key.toLowerCase();
   const actions={w:()=>cam.panBy(0,step),arrowup:()=>cam.panBy(0,step),s:()=>cam.panBy(0,-step),arrowdown:()=>cam.panBy(0,-step),a:()=>cam.panBy(-step,0),arrowleft:()=>cam.panBy(-step,0),d:()=>cam.panBy(step,0),arrowright:()=>cam.panBy(step,0),q:()=>cam.orbit(-.2,0),e:()=>cam.orbit(.2,0),r:()=>cam.orbit(0,-.12),f:()=>cam.orbit(0,.12),'+':()=>cam.zoom(.85),'=':()=>cam.zoom(.85),'-':()=>cam.zoom(1.18),_:()=>cam.zoom(1.18),'0':()=>cam.view('iso'),g:()=>setGrid(value=>!value),'[':()=>cam.rotate(),']':()=>cam.rotate(),'?':()=>setKeys(value=>!value)};
   const act=actions[key];if(!act)return;event.preventDefault();act();
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[]);
 const apply=(field,min,max)=>event=>{
  if(event.type==='keydown'&&event.key!=='Enter')return;
  const value=Number(event.target.value);if(!Number.isFinite(value))return;const next=Math.max(min,Math.min(max,value));
  setPlace(current=>({...current,[field]:next}));
  if(field==='x')engine.current?.move('x',next);else if(field==='fromBack')engine.current?.move('z',next-room.d/2);else if(field==='rotation')engine.current?.rotateTo(next*Math.PI/180);else if(field==='height')engine.current?.move('y',next);else if(field==='scale')engine.current?.scaleTo(next);
 };
 const save=async placement=>{
  setBusy(true);
  try{await apiRequest(`/equipment/${item.id}`,{method:'PATCH',token,body:{roomPlacement:placement}});report(placement?`${item.name} placed in the 3D room.`:`${item.name} back to its automatic position.`);await onSaved();onClose();}
  catch(problem){report(problem.message||'The placement could not be saved.',true);}finally{setBusy(false);}
 };
 const resize=axis=>event=>{if(event.type==='keydown'&&event.key!=='Enter')return;const value=Number(event.target.value);if(!Number.isFinite(value))return;const next=Math.max(4,Math.min(80,Math.round(value*2)/2));setRoom(current=>current[axis]===next?current:{...current,[axis]:next});};
 const tool=(Icon,label,onClick,on)=><button type="button" className={'eq-cam-btn'+(on?' is-on':'')} title={label} aria-label={label} aria-pressed={on===undefined?undefined:Boolean(on)} onClick={onClick}><Icon size={16} aria-hidden="true"/></button>;
 const field=(label,name,min,max,step,hint)=><label>{label}<input key={`${name}${place[name]}`} type="number" step={step} min={min} max={max} defaultValue={place[name]} onBlur={apply(name,min,max)} onKeyDown={apply(name,min,max)}/><small>{hint}</small></label>;
 return <div className="eq-room-page" role="region" aria-label={`Place ${item.name} in the 3D room`}>
  <header>
   <button type="button" className="eq-room-back" disabled={busy} onClick={onClose}><ArrowLeft size={16} aria-hidden="true"/>Back</button>
   <div><small>3D ROOM</small><h2>Place {item.name}</h2></div>
   <span className="eq-room-spacer"/>
   <button type="button" className="eq-place-auto" disabled={busy||!item.roomPlacement} onClick={()=>save(null)}><RotateCcw size={14} aria-hidden="true"/>Use automatic position</button>
   <button type="button" className="eq-place-save" disabled={busy||Boolean(error)} onClick={()=>save({x:place.x,fromBack:place.fromBack,rotation:place.rotation,height:place.height,scale:place.scale})}>{busy?'Saving…':'Save placement'}</button>
  </header>
  <div className="eq-room-body">
   <div className="eq-room-stage-wrap">
    <div className="eq-room-stage" ref={stage}>{loading&&!error&&<p role="status">Loading the 3D room…</p>}{error&&<p role="alert">{error}</p>}</div>
    {!error&&<div className="eq-cam" role="toolbar" aria-label="3D room controls">
     <div className="eq-cam-group" aria-label="Zoom">{tool(ZoomIn,'Zoom in (+)',()=>engine.current?.zoom(.8))}{tool(ZoomOut,'Zoom out (−)',()=>engine.current?.zoom(1.25))}</div>
     <div className="eq-cam-group" aria-label="Move the view">{tool(ChevronLeft,'Pan left (A)',()=>engine.current?.panBy(-1.5,0))}<span>{tool(ChevronUp,'Pan forward (W)',()=>engine.current?.panBy(0,1.5))}{tool(ChevronDown,'Pan back (S)',()=>engine.current?.panBy(0,-1.5))}</span>{tool(ChevronRight,'Pan right (D)',()=>engine.current?.panBy(1.5,0))}{tool(Hand,'Drag to pan',()=>setPanning(value=>!value),panning)}</div>
     <div className="eq-cam-group" aria-label="Rotate and tilt the view">{tool(RotateCcw,'Orbit left (Q)',()=>engine.current?.orbit(-.35,0))}{tool(RotateCw,'Orbit right (E)',()=>engine.current?.orbit(.35,0))}{tool(ChevronUp,'Tilt up (R)',()=>engine.current?.orbit(0,-.15))}{tool(ChevronDown,'Tilt down (F)',()=>engine.current?.orbit(0,.15))}</div>
     <div className="eq-cam-group eq-cam-views" aria-label="Views">{[['top','Top'],['front','Front'],['back','Back'],['left','Left'],['right','Right'],['iso','3D']].map(([name,label])=><button key={name} type="button" onClick={()=>engine.current?.view(name)}>{label}</button>)}{tool(Home,'Reset the view (0)',()=>engine.current?.view('iso'))}</div>
     <div className="eq-cam-group" aria-label="Options">{tool(Grid3x3,'Floor grid (G)',()=>setGrid(value=>!value),grid)}{tool(Magnet,'Snap to 25 cm while dragging',()=>setSnap(value=>!value),snap)}{tool(day?Sun:Moon,day?'Daylight (click for night)':'Night (click for daylight)',()=>setDay(value=>!value))}{tool(Keyboard,'Keyboard shortcuts (?)',()=>setKeys(value=>!value),keys)}</div>
    </div>}
    {keys&&<dl className="eq-keys" aria-label="Keyboard shortcuts"><div><dt>W A S D · arrows</dt><dd>Pan (Shift = faster)</dd></div><div><dt>Q · E</dt><dd>Orbit left / right</dd></div><div><dt>R · F</dt><dd>Tilt up / down</dd></div><div><dt>+ · −</dt><dd>Zoom (or mouse wheel)</dd></div><div><dt>0</dt><dd>Reset the view</dd></div><div><dt>G</dt><dd>Floor grid</dd></div><div><dt>[ · ]</dt><dd>Turn the piece 45°</dd></div><div><dt>Mouse</dt><dd>Drag the piece · drag the floor to orbit · right-drag to pan</dd></div></dl>}
   </div>
   <aside>
    <p className="eq-room-help"><Move size={13} aria-hidden="true"/>Drag {item.name} in the room. Drag empty space to turn the view, scroll to zoom. Clients see it here by default in their 3D room.</p>
    <section className="eq-room-size" aria-label="Stage size">
     <h3>Stage size</h3>
     <div className="eq-room-presets">{ROOMS.map(([name,w,d])=><button key={name} type="button" aria-pressed={room.w===w&&room.d===d} onClick={()=>setRoom({w,d})}>{name}</button>)}</div>
     <div className="eq-room-size-fields">
      <label>Width (m)<input key={`w${room.w}`} type="number" min="4" max="80" step="0.5" defaultValue={room.w} onBlur={resize('w')} onKeyDown={resize('w')}/></label>
      <label>Depth (m)<input key={`d${room.d}`} type="number" min="4" max="80" step="0.5" defaultValue={room.d} onBlur={resize('d')} onKeyDown={resize('d')}/></label>
     </div>
     <small>Preview only. Positions are saved from the back wall and the centre line, so the piece keeps its place in every room size.</small>
    </section>
    {field('Across the room (m)','x',-room.w/2,room.w/2,.05,'0 = centre, − left, + right')}
    {field('From the back wall (m)','fromBack',0,room.d,.05,'0 = against the back wall')}
    {field('Turn (degrees)','rotation',-360,360,5,'0 faces the guests')}
    {field('Size (× normal)','scale',.2,5,.05,'1 = true to size · 2 = twice as big')}
    {field('Height off the floor (m)','height',0,10,.05,'For hung lights and projectors')}
    <button type="button" className="eq-room-turn" onClick={()=>engine.current?.rotate()}><RotateCw size={14} aria-hidden="true"/>Turn 45°</button>
   </aside>
  </div>
 </div>;
}
