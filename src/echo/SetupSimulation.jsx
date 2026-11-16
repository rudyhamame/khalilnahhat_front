import {useEffect,useMemo,useRef,useState} from 'react';
import {Armchair,Box,Focus,Hand,LayoutGrid,Minus,Moon,PartyPopper,Plus,RectangleHorizontal,Rotate3D,Sun} from 'lucide-react';
import {layoutEquipment,layoutGuests,layoutRoomZones,recommendedRoomSize} from './simulationLayout';
import SeatingChart,{layoutPlanOf,useSeatingPlan} from './SeatingChart';
import './setupSimulation.css';
export default function SetupSimulation({items,cart,services=[],event,ar=false,active,draftId}){
 const tr=(en,arabic)=>ar?arabic:en,canvas=useRef(null),engine=useRef(null),positions=useRef({}),isActive=useRef(active);isActive.current=active;
 // The room is sized to hold the guest list (stage, dance floor and a seat for everyone) until the visitor types their own size.
 const initialSize=useMemo(()=>recommendedRoomSize(event?.guestCount||0),[]);// eslint-disable-line react-hooks/exhaustive-deps
 const [width,setWidth]=useState(initialSize.width),[depth,setDepth]=useState(initialSize.depth),[_selection,setSelection]=useState(null),[error,setError]=useState(''),[status,setStatus]=useState({loading:true,failed:0});
 const [lights,setLights]=useState(true),[party,setParty]=useState(false);
 const [sceneReady,setSceneReady]=useState(false),[cameraView,setCameraView]=useState('iso');
 const [panning,setPanning]=useState(false),panRef=useRef(false);panRef.current=panning;
 useEffect(()=>{engine.current?.pan(panning);},[panning]);
 const [researchGeometry]=useState(null);
 const [researchHoles]=useState([]);
 const guestCount=event?.guestCount||0;
 const recommended=useMemo(()=>recommendedRoomSize(guestCount),[guestCount]);
 // The room fits the guest list unless the hosts typed their own size.
 useEffect(()=>{const size=plan.room.auto?recommended:plan.room;setWidth(size.width);setDepth(size.depth);},[recommended,plan.room]);
 const [plan,setPlan]=useSeatingPlan(draftId),[seatingOpen,setSeatingOpen]=useState(false);
 const layoutPlan=useMemo(()=>layoutPlanOf(plan),[plan]),planSignature=JSON.stringify(layoutPlan);
 const zones=useMemo(()=>layoutRoomZones(guestCount,width,depth,layoutPlan),[guestCount,width,depth,planSignature]);// eslint-disable-line react-hooks/exhaustive-deps
 const guestLayout=useMemo(()=>layoutGuests(guestCount,width,depth),[guestCount,width,depth]);
 const mode=party?'party':lights?'day':'dark',modeRef=useRef(mode);modeRef.current=mode;
 useEffect(()=>{engine.current?.mode(mode);},[mode]);
 const [retryRoom,setRetryRoom]=useState(0);
 const chosen=useMemo(()=>Object.values(cart).map(line=>({...items.find(item=>item.id===line.id),...line})),[cart,items]);
 const layout=useMemo(()=>layoutEquipment(chosen,width,depth),[chosen,width,depth]);
 const signature=JSON.stringify(chosen.map(item=>[item.id,item.quantity,item.modelUrl]));
 useEffect(()=>{
  let disposed=false;setSceneReady(false);setCameraView('iso');setError('');setSelection(null);setStatus({loading:layout.units.some(item=>item.id),failed:0});
  import('./setupSimulationEngine').then(({createSetupSimulation})=>{if(disposed)return;return createSetupSimulation(canvas.current,{width,depth,boundary:researchGeometry,holes:researchHoles,items:chosen,positions:positions.current,movable:true,ar,grid:false,guests:guestCount,plan:layoutPlan,active:isActive,mode:modeRef,transparentBackground:true,equipmentIndicators:true,backgroundColor:getComputedStyle(canvas.current.closest('.echo')).backgroundColor},value=>{if(!disposed)setSelection(value);},value=>{if(!disposed)setStatus(value);});}).then(value=>{if(!value)return;if(disposed)value.dispose();else{engine.current=value;value.pan(panRef.current);setSceneReady(true);}}).catch(failure=>{console.error('3D room could not start:',failure);if(!disposed)setError(/webgl|context/i.test(String(failure?.message||failure))?tr('The 3D room needs WebGL. Turn on hardware acceleration in your browser, or try another browser.','تتطلب الغرفة دعم WebGL. فعّل تسريع الأجهزة في المتصفح أو جرّب متصفحاً آخر.'):tr('The 3D room could not load. Check your connection and try again.','تعذر تحميل الغرفة ثلاثية الأبعاد. تحقق من الاتصال وحاول مرة أخرى.'));});
  return()=>{disposed=true;engine.current?.dispose();engine.current=null;};
 // Scene rebuilds only when room dimensions or selected unit counts change.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,width,depth,guestCount,planSignature,researchGeometry,researchHoles,retryRoom]);
 const fitRoom=()=>{engine.current?.reset();setCameraView('iso');setPanning(false);};
 const changeView=value=>{setCameraView(value);engine.current?.view(value);};
 const zoom=factor=>{engine.current?.zoom(factor);};
 return <div className="setup-simulation"><div className="simulation-room">
  {!seatingOpen&&<button type="button" className="simulation-seating-toggle" onClick={()=>setSeatingOpen(true)}><Armchair size={17} aria-hidden="true"/>{tr('Seating chart','مخطط الجلوس')}</button>}
  {seatingOpen&&<SeatingChart plan={plan} setPlan={setPlan} zones={zones} recommended={recommended} guestCount={guestCount} ar={ar} onClose={()=>setSeatingOpen(false)}/>}
  <div ref={canvas} tabIndex={-1} className="simulation-canvas" role="img" aria-label={tr('Interactive 3D room showing your selected event equipment','غرفة ثلاثية الأبعاد تعرض معدات فعاليتك المختارة')} onPointerDown={()=>setCameraView('custom')} onWheel={()=>setCameraView('custom')}/>
  {!sceneReady&&!error&&<p className="simulation-view-status" role="status">{tr('Loading your room…','جارٍ تحميل الغرفة…')}</p>}
  {error&&<p className="simulation-error" role="status">{error} <button type="button" className="simulation-retry" onClick={()=>setRetryRoom(value=>value+1)}>{tr('Try again','حاول مرة أخرى')}</button></p>}
  <div className="simulation-camera-dock simulation-icon-dock" role="toolbar" aria-orientation="vertical" aria-label={tr('Camera controls','أدوات الكاميرا')}>
   {/* Icons only: every button keeps a text name for screen readers and a tooltip. */}
   <div className="simulation-drag-modes" role="group" aria-label={tr('Drag behavior','طريقة السحب')}>
    <button type="button" aria-pressed={!panning} aria-label={tr('Rotate','دوران')} title={tr('Rotate','دوران')} disabled={!sceneReady} onClick={()=>setPanning(false)}><Rotate3D size={20} aria-hidden="true"/></button>
    <button type="button" aria-pressed={panning} aria-label={tr('Move','تحريك')} title={tr('Move','تحريك')} disabled={!sceneReady} onClick={()=>setPanning(true)}><Hand size={20} aria-hidden="true"/></button>
   </div>
   <div className="simulation-view-modes" role="group" aria-label={tr('Camera view','منظور الكاميرا')}>
    {[['iso',tr('3D overview','منظور ثلاثي الأبعاد'),Box],['top',tr('From above','من الأعلى'),LayoutGrid],['front',tr('From the front','من الأمام'),RectangleHorizontal]].map(([value,label,Icon])=><button key={value} type="button" aria-pressed={cameraView===value} aria-label={label} title={label} disabled={!sceneReady} onClick={()=>changeView(value)}><Icon size={20} aria-hidden="true"/></button>)}
   </div>
   <div className="simulation-lighting-modes" role="group" aria-label={tr('Lighting','الإضاءة')}>
    {[['day',tr('Daylight','نهارية'),Sun],['dark',tr('Evening','مسائية'),Moon],['party',tr('Party','حفلة'),PartyPopper]].map(([value,label,Icon])=><button key={value} type="button" aria-pressed={mode===value} aria-label={label} title={label} disabled={!sceneReady} onClick={()=>{setParty(value==='party');setLights(value==='day');}}><Icon size={20} aria-hidden="true"/></button>)}
   </div>
   <div className="simulation-zoom-controls" role="group" aria-label={tr('Zoom and fit','التقريب والملاءمة')}>
    <button type="button" aria-label={tr('Zoom out','تصغير')} title={tr('Zoom out','تصغير')} disabled={!sceneReady} onClick={()=>zoom(1.2)}><Minus size={20} aria-hidden="true"/></button>
    <button type="button" aria-label={tr('Zoom in','تكبير')} title={tr('Zoom in','تكبير')} disabled={!sceneReady} onClick={()=>zoom(1/1.2)}><Plus size={20} aria-hidden="true"/></button>
    <button type="button" className="simulation-fit-room" aria-label={tr('Fit room','عرض الغرفة كاملة')} title={tr('Fit room','عرض الغرفة كاملة')} disabled={!sceneReady} onClick={fitRoom}><Focus size={20} aria-hidden="true"/></button>
   </div>
   <p className="simulation-camera-hint" role="status">{panning?tr('Drag to move · scroll or pinch to zoom','اسحب للتحريك · مرّر أو اقرص للتقريب'):tr('Drag the room to rotate it · drag a piece of equipment to move it · scroll or pinch to zoom','اسحب الغرفة لتدويرها · اسحب قطعة معدات لتحريكها · مرّر أو اقرص للتقريب')}</p>
  </div>
  <div className="simulation-caption">{status.unplaced>0&&<span role="status">{tr(`${status.unplaced} equipment pieces need more space. Reduce quantities or the guest count.`,`${status.unplaced} قطع تحتاج إلى مساحة إضافية. قلل الكميات أو عدد الضيوف.`)}</span>}{status.failed>0&&<span>{tr('Some models use a simplified shape.','بعض المعدات معروضة بشكل مبسط.')}</span>}{guestLayout.omitted>0&&<span>{tr(`${guestLayout.shown} of ${guestLayout.total} guests shown.`, `يُعرض ${guestLayout.shown} من ${guestLayout.total} ضيفاً.`)}</span>}{layout.omitted>0&&<span>{tr(`First 60 of ${layout.total} units shown.`,`تُعرض أول 60 من ${layout.total} وحدة.`)}</span>}</div></div>
</div>;
}
