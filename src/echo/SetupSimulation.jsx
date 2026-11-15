import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Box,Focus,Hand,LayoutGrid,Minus,Moon,PartyPopper,Plus,RectangleHorizontal,Rotate3D,Ruler,SlidersHorizontal,Sun,X} from 'lucide-react';
import EquipmentAvailability from './EquipmentAvailability';
import {displayImageUrl} from '../lib/displayImage';
import {layoutEquipment,layoutGuests,recommendedRoomSize} from './simulationLayout';
import './setupSimulation.css';
import {boundaryArea} from './venueSimulationAdapter.mjs';
export default function SetupSimulation({items,cart,services=[],event,ar=false,active}){
 const tr=(en,arabic)=>ar?arabic:en,canvas=useRef(null),engine=useRef(null),positions=useRef({}),isActive=useRef(active);isActive.current=active;
 // The room is sized to hold the guest list (stage, dance floor and a seat for everyone) until the visitor types their own size.
 const [autoSize,setAutoSize]=useState(true),initialSize=useMemo(()=>recommendedRoomSize(event?.guestCount||0),[]);// eslint-disable-line react-hooks/exhaustive-deps
 const [width,setWidth]=useState(initialSize.width),[depth,setDepth]=useState(initialSize.depth),[widthText,setWidthText]=useState(String(initialSize.width)),[depthText,setDepthText]=useState(String(initialSize.depth)),[_selection,setSelection]=useState(null),[error,setError]=useState(''),[status,setStatus]=useState({loading:true,failed:0});
 const setupPanel=useRef(null),setupToggle=useRef(null),setupId=useId(),[setupOpen,setSetupOpen]=useState(false);
 const [lights,setLights]=useState(true),[party,setParty]=useState(false);
 const [sceneReady,setSceneReady]=useState(false),[cameraView,setCameraView]=useState('iso');
 const [panning,setPanning]=useState(false),panRef=useRef(false);panRef.current=panning;
 useEffect(()=>{engine.current?.pan(panning);},[panning]);
 const [researchGeometry,setResearchGeometry]=useState(null);
 const [researchHoles,setResearchHoles]=useState([]);
 const roomArea=researchGeometry?boundaryArea(researchGeometry,researchHoles):Math.round(width*depth*100)/100;
 const [simulationLabel,setSimulationLabel]=useState('');
 const guestCount=event?.guestCount||0;
 const recommended=useMemo(()=>recommendedRoomSize(guestCount),[guestCount]);
 useEffect(()=>{if(!autoSize)return;setResearchGeometry(null);setResearchHoles([]);setWidth(recommended.width);setDepth(recommended.depth);setWidthText(String(recommended.width));setDepthText(String(recommended.depth));},[autoSize,recommended]);
 const guestLayout=useMemo(()=>layoutGuests(guestCount,width,depth),[guestCount,width,depth]);
 const mode=party?'party':lights?'day':'dark',modeRef=useRef(mode);modeRef.current=mode;
 useEffect(()=>{engine.current?.mode(mode);},[mode]);
 // Typed room sizes rebuild the 3D scene, so they apply once typing pauses.
 useEffect(()=>{const timer=setTimeout(()=>{const w=parseFloat(widthText),d=parseFloat(depthText);if(w>=3&&w<=200&&w!==width)setWidth(w);if(d>=3&&d<=200&&d!==depth)setDepth(d);},500);return()=>clearTimeout(timer);},[widthText,depthText]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{setWidthText(String(width));},[width]);
 useEffect(()=>{setDepthText(String(depth));},[depth]);
 const [retryRoom,setRetryRoom]=useState(0);
 const chosen=useMemo(()=>Object.values(cart).map(line=>({...items.find(item=>item.id===line.id),...line})),[cart,items]);
 const layout=useMemo(()=>layoutEquipment(chosen,width,depth),[chosen,width,depth]);
 const signature=JSON.stringify(chosen.map(item=>[item.id,item.quantity,item.modelUrl]));
 useEffect(()=>{
  let disposed=false;setSceneReady(false);setCameraView('iso');setError('');setSelection(null);setStatus({loading:layout.units.some(item=>item.id),failed:0});
  import('./setupSimulationEngine').then(({createSetupSimulation})=>{if(disposed)return;return createSetupSimulation(canvas.current,{width,depth,boundary:researchGeometry,holes:researchHoles,items:chosen,positions:positions.current,grid:false,guests:guestCount,active:isActive,mode:modeRef,transparentBackground:true,equipmentIndicators:true,backgroundColor:getComputedStyle(canvas.current.closest('.echo')).backgroundColor},value=>{if(!disposed)setSelection(value);},value=>{if(!disposed)setStatus(value);});}).then(value=>{if(!value)return;if(disposed)value.dispose();else{engine.current=value;value.pan(panRef.current);setSceneReady(true);}}).catch(failure=>{console.error('3D room could not start:',failure);if(!disposed)setError(/webgl|context/i.test(String(failure?.message||failure))?tr('The 3D room needs WebGL. Turn on hardware acceleration in your browser, or try another browser.','تتطلب الغرفة دعم WebGL. فعّل تسريع الأجهزة في المتصفح أو جرّب متصفحاً آخر.'):tr('The 3D room could not load. Check your connection and try again.','تعذر تحميل الغرفة ثلاثية الأبعاد. تحقق من الاتصال وحاول مرة أخرى.'));});
  return()=>{disposed=true;engine.current?.dispose();engine.current=null;};
 // Scene rebuilds only when room dimensions or selected unit counts change.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,width,depth,guestCount,researchGeometry,researchHoles,retryRoom]);
 const fitRoom=()=>{engine.current?.reset();setCameraView('iso');setPanning(false);};
 const changeView=value=>{setCameraView(value);engine.current?.view(value);};
 const zoom=factor=>{engine.current?.zoom(factor);};
 return <div className="setup-simulation"><div className="simulation-room">
  <header className="simulation-room-heading">
   <div className="simulation-room-intro"><span>{tr('ECHO / ROOM PLANNER','إيكو / مخطط الغرفة')}</span><h3>{tr('Your event, in 3D.','فعاليتك، بثلاثة أبعاد.')}</h3><p>{width} × {depth} m <span>·</span> {layout.total} {tr('equipment units','وحدة معدات')}</p></div>
   <button ref={setupToggle} type="button" className="simulation-setup-toggle" aria-haspopup="dialog" aria-controls={setupId} aria-expanded={setupOpen} onClick={()=>{setupPanel.current?.showModal();setSetupOpen(true);}}><SlidersHorizontal size={17} aria-hidden="true"/><span>{tr('Your setup','تجهيزاتك')}</span></button>
  </header>
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
   <p className="simulation-camera-hint" role="status">{panning?tr('Drag to move · scroll or pinch to zoom','اسحب للتحريك · مرّر أو اقرص للتقريب'):tr('Drag to rotate · scroll or pinch to zoom','اسحب للدوران · مرّر أو اقرص للتقريب')}</p>
  </div>
  <div className="simulation-caption">{simulationLabel}{status.unplaced>0&&<span role="status">{tr(`${status.unplaced} equipment pieces need more space. Increase the room size or reduce quantities.`,`${status.unplaced} قطع تحتاج إلى مساحة إضافية. زد أبعاد الغرفة أو قلل الكميات.`)}</span>}{status.failed>0&&<span>{tr('Some models use a simplified shape.','بعض المعدات معروضة بشكل مبسط.')}</span>}{guestLayout.omitted>0&&<span>{tr(`${guestLayout.shown} of ${guestLayout.total} guests shown.`, `يُعرض ${guestLayout.shown} من ${guestLayout.total} ضيفاً.`)}</span>}{layout.omitted>0&&<span>{tr(`First 60 of ${layout.total} units shown.`,`تُعرض أول 60 من ${layout.total} وحدة.`)}</span>}</div></div>
 <dialog ref={setupPanel} id={setupId} className="simulation-sidebar simulation-setup-panel" aria-labelledby={`${setupId}-title`} onClose={()=>{setSetupOpen(false);setupToggle.current?.focus({preventScroll:true});}} onClick={event=>{if(event.target!==event.currentTarget)return;const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.currentTarget.close();}}>
  <button type="button" className="simulation-setup-close" aria-label={tr('Close your setup','إغلاق التجهيزات')} onClick={()=>setupPanel.current?.close()}><X size={20}/></button>
  <header className="sim-side-head"><span id={`${setupId}-title`}>{tr('YOUR SETUP','تجهيزاتك')}</span><strong>{layout.total} <small>{layout.total===1?tr('unit','وحدة'):tr('units','وحدات')}</small></strong>{services.length>0&&<div className="simulation-services">{services.map(service=><span key={service}>{service.replaceAll('_',' ')}</span>)}</div>}</header>
  <section className="sim-section" aria-label={tr('Equipment','المعدات')}>
   <h4 className="sim-title"><span>{tr('Equipment','المعدات')}</span><b>{chosen.length}</b></h4>
   {chosen.length?<ul className="sim-items">{chosen.map(item=><li key={item.id}><button type="button" className="sim-item" onClick={()=>engine.current?.select(`${item.id}:0`)} aria-label={`${tr('Show in the room','عرض في الغرفة')}: ${item.name}`}>
    <span className="sim-thumb" aria-hidden="true">{item.imageUrl?<img src={displayImageUrl(item.imageUrl)} alt="" loading="lazy"/>:<Box size={18}/>}</span>
    <span className="sim-item-text"><strong>{ar?(item.nameAr||item.name):item.name}</strong><EquipmentAvailability item={item} ar={ar}/></span>
    <span className="sim-qty" aria-label={tr('Quantity','الكمية')}>×{item.quantity}</span></button></li>)}</ul>:<p className="sim-empty">{tr('Choose equipment on the Services page.','اختر المعدات من صفحة الخدمات.')}</p>}
  </section>
  <section className="sim-section simulation-dimensions" aria-label={tr('Room size','مساحة الغرفة')}>
   <h4 className="sim-title"><span><Ruler size={13} aria-hidden="true"/>{tr('Room size','مساحة الغرفة')}</span><b>{roomArea} m²</b></h4>
   <p className="sim-fit">{autoSize?tr(`Sized for your ${guestCount||0} guests: stage, dance floor and a seat for everyone.`,`مقاس لـ ${guestCount||0} ضيف: المسرح وحلبة الرقص ومقعد للجميع.`):<button type="button" onClick={()=>setAutoSize(true)}>{tr(`Fit the room to my ${guestCount||0} guests`,`ملاءمة الغرفة لـ ${guestCount||0} ضيف`)}</button>}</p>
   <div className="sim-size-grid"><label>{tr('Room width','عرض الغرفة')}<span className="simulation-size-input"><input type="number" inputMode="decimal" min="3" max="200" step="0.5" value={widthText} onChange={event=>{setAutoSize(false);setResearchGeometry(null);setSimulationLabel('');setWidthText(event.target.value);}} onBlur={()=>setWidthText(String(width))}/><b>m</b></span></label><label>{tr('Room depth','عمق الغرفة')}<span className="simulation-size-input"><input type="number" inputMode="decimal" min="3" max="200" step="0.5" value={depthText} onChange={event=>{setAutoSize(false);setResearchGeometry(null);setSimulationLabel('');setDepthText(event.target.value);}} onBlur={()=>setDepthText(String(depth))}/><b>m</b></span></label></div>
  </section>
  <small className="simulation-stock-note">{tr('Stock is shown for reference. Event-date availability is confirmed with your quote.','المخزون للمرجع. يُؤكد التوفر لتاريخ الفعالية مع عرض السعر.')}</small>
 </dialog></div>;
}
