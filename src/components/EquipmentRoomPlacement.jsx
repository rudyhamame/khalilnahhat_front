import {useEffect,useMemo,useRef,useState} from 'react';
import {Move,RotateCcw,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {equipmentKind,layoutEquipment,MODEL_SIZES} from '../echo/simulationLayout';
import './equipmentRoomPlacement.css';

// The admin sets where one piece of equipment stands in every client's 3D room. A top-down plan of the standard 10 x 8 m room,
// back wall at the top; drag the piece or type exact numbers. Rooms of other sizes keep it the same distance from the back wall.
const ROOM_W=10,ROOM_D=8,SCALE=56,PAD=24;
const snap=value=>Math.round(value*20)/20;
export default function EquipmentRoomPlacement({item,allItems,token,onClose,onSaved,report}){
 const dialog=useRef(null),svg=useRef(null),drag=useRef(null);
 const kind=equipmentKind(item.id),[w,,d]=MODEL_SIZES[kind]||[.5,.5,.5];
 const auto=useMemo(()=>{const unit=layoutEquipment([{...item,roomPlacement:null,quantity:1}],ROOM_W,ROOM_D).units[0];return unit?{x:unit.x,fromBack:unit.z+ROOM_D/2,rotation:Math.round((unit.rot||0)*180/Math.PI),height:unit.y||0}:{x:0,fromBack:2,rotation:0,height:0};},[item]);
 const [place,setPlace]=useState(()=>item.roomPlacement?{...item.roomPlacement}:auto),[busy,setBusy]=useState(false);
 const others=useMemo(()=>layoutEquipment(allItems.filter(row=>row.id!==item.id&&row.isActive!==false&&!row.isSet).map(row=>({...row,quantity:1})),ROOM_W,ROOM_D).units,[allItems,item.id]);
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close();},[]);
 const clampPlace=next=>({...next,x:Math.max(-ROOM_W/2,Math.min(ROOM_W/2,snap(next.x))),fromBack:Math.max(0,Math.min(ROOM_D,snap(next.fromBack)))});
 const pointer=event=>{const box=svg.current.getBoundingClientRect(),scale=box.width/(ROOM_W*SCALE+PAD*2);return {x:(event.clientX-box.left)/scale,y:(event.clientY-box.top)/scale};};
 const down=event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);const at=pointer(event);drag.current={dx:at.x-(PAD+(place.x+ROOM_W/2)*SCALE),dy:at.y-(PAD+place.fromBack*SCALE)};};
 const move=event=>{if(!drag.current)return;const at=pointer(event);setPlace(current=>clampPlace({...current,x:(at.x-drag.current.dx-PAD)/SCALE-ROOM_W/2,fromBack:(at.y-drag.current.dy-PAD)/SCALE}));};
 const up=()=>{drag.current=null;};
 const key=event=>{const step=event.shiftKey?.5:.05,moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];if(!moves)return;event.preventDefault();setPlace(current=>clampPlace({...current,x:current.x+moves[0],fromBack:current.fromBack+moves[1]}));};
 const number=(field,min,max)=>event=>{const value=Number(event.target.value);if(Number.isFinite(value))setPlace(current=>({...current,[field]:Math.max(min,Math.min(max,value))}));};
 const save=async placement=>{
  setBusy(true);
  try{await apiRequest(`/equipment/${item.id}`,{method:'PATCH',token,body:{roomPlacement:placement}});report(placement?`${item.name} placed in the 3D room.`:`${item.name} back to its automatic position.`);await onSaved();onClose();}
  catch(error){report(error.message||'The placement could not be saved.',true);}finally{setBusy(false);}
 };
 const rect=unit=>{const uw=(MODEL_SIZES[unit.kind]?.[0]||.5)*SCALE,ud=(MODEL_SIZES[unit.kind]?.[2]||.5)*SCALE;return {width:Math.max(8,uw),height:Math.max(8,ud)};};
 return <dialog ref={dialog} className="eq-place" aria-labelledby="eq-place-title" onClose={onClose} onCancel={onClose}>
  <header><div><small>3D ROOM</small><h3 id="eq-place-title">Place {item.name}</h3><p>Drag it on the plan, or use the arrow keys (Shift for big steps). Clients see it here by default in their 3D room.</p></div><button type="button" className="eq-place-x" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
  <div className="eq-place-body">
   <svg ref={svg} className="eq-place-plan" viewBox={`0 0 ${ROOM_W*SCALE+PAD*2} ${ROOM_D*SCALE+PAD*2}`} role="img" aria-label="Top-down plan of the room, back wall at the top">
    <rect x={PAD} y={PAD} width={ROOM_W*SCALE} height={ROOM_D*SCALE} className="eq-room"/>
    {Array.from({length:ROOM_W-1},(_,i)=><line key={`v${i}`} x1={PAD+(i+1)*SCALE} y1={PAD} x2={PAD+(i+1)*SCALE} y2={PAD+ROOM_D*SCALE} className="eq-grid"/>)}
    {Array.from({length:ROOM_D-1},(_,i)=><line key={`h${i}`} x1={PAD} y1={PAD+(i+1)*SCALE} x2={PAD+ROOM_W*SCALE} y2={PAD+(i+1)*SCALE} className="eq-grid"/>)}
    <text x={PAD+ROOM_W*SCALE/2} y={PAD-8} className="eq-wall" textAnchor="middle">BACK WALL · stage</text>
    <text x={PAD+ROOM_W*SCALE/2} y={PAD+ROOM_D*SCALE+17} className="eq-wall" textAnchor="middle">FRONT · guests</text>
    {others.map(unit=>{const size=rect(unit);return <g key={unit.key} transform={`translate(${PAD+(unit.x+ROOM_W/2)*SCALE} ${PAD+(unit.z+ROOM_D/2)*SCALE}) rotate(${(unit.rot||0)*180/Math.PI})`}><rect x={-size.width/2} y={-size.height/2} width={size.width} height={size.height} className="eq-ghost"><title>{unit.name}</title></rect></g>;})}
    <g transform={`translate(${PAD+(place.x+ROOM_W/2)*SCALE} ${PAD+place.fromBack*SCALE}) rotate(${place.rotation})`} className="eq-piece" tabIndex={0} role="slider" aria-label={`${item.name} position`} aria-valuetext={`${place.x.toFixed(2)} m from centre, ${place.fromBack.toFixed(2)} m from the back wall`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
     <rect x={-Math.max(8,w*SCALE)/2} y={-Math.max(8,d*SCALE)/2} width={Math.max(8,w*SCALE)} height={Math.max(8,d*SCALE)} rx="3"/><line x1="0" y1="0" x2="0" y2={-Math.max(8,d*SCALE)/2-6}/><circle cx="0" cy="0" r="2.5"/>
    </g>
   </svg>
   <div className="eq-place-fields">
    <label>Across the room (m)<input type="number" step="0.05" min={-ROOM_W/2} max={ROOM_W/2} value={place.x} onChange={number('x',-ROOM_W/2,ROOM_W/2)}/><small>0 = centre, − left, + right</small></label>
    <label>From the back wall (m)<input type="number" step="0.05" min="0" max={ROOM_D} value={place.fromBack} onChange={number('fromBack',0,ROOM_D)}/><small>0 = against the back wall</small></label>
    <label>Turn (degrees)<input type="number" step="5" min="-360" max="360" value={place.rotation} onChange={number('rotation',-360,360)}/><small>0 faces the guests</small></label>
    <label>Height off the floor (m)<input type="number" step="0.05" min="0" max="10" value={place.height} onChange={number('height',0,10)}/><small>For hung lights and projectors</small></label>
    <p className="eq-place-note"><Move size={13} aria-hidden="true"/>Other equipment is shown in grey at its current position.</p>
   </div>
  </div>
  <footer>
   <button type="button" className="eq-place-auto" disabled={busy||!item.roomPlacement} onClick={()=>save(null)}><RotateCcw size={14} aria-hidden="true"/>Use automatic position</button>
   <span className="eq-place-spacer"/>
   <button type="button" className="eq-place-cancel" disabled={busy} onClick={onClose}>Cancel</button>
   <button type="button" className="eq-place-save" disabled={busy} onClick={()=>save({x:place.x,fromBack:place.fromBack,rotation:place.rotation,height:place.height})}>{busy?'Saving…':'Save placement'}</button>
  </footer>
 </dialog>;
}
