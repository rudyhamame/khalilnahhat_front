import {useRentalCatalog} from '../lib/useRentalCatalog';
import {rentalServices,rentalServiceEquipment} from '../lib/numberedRentalCatalog';
import RentalWorkbench,{SelectedSoFar} from './RentalWorkbench';
import {isEquipmentSet} from '../components/equipmentSets';
import {useViewportPhase} from './useViewportPhase';
import {fitViewport} from './fitViewport';
import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {useCart} from './cart';
import {useEventOrder} from './eventOrderContext';
import './setupSimulation.css';
class SimulationBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){console.error('Setup simulation failed:',error);}
  render(){
    if(!this.state.failed)return this.props.children;
    const ar=this.props.ar;
    return <div className="simulation-loading" role="alert"><p>{ar?'تعذر فتح المحاكاة. يمكنك إعادة المحاولة أو العودة إلى الخدمات.':'The simulation could not open. Retry or return to services.'}</p><button type="button" onClick={()=>this.setState({failed:false})}>{ar?'إعادة المحاولة':'Retry simulation'}</button></div>;
  }
}
const SetupSimulation=lazy(()=>import('./SetupSimulation'));
import {Box, ArrowLeft} from 'lucide-react';
import './serviceVinyl.css';
import './setupShowcase.css';
import './setupReadability.css';
import './setupEquipmentColumn.css';
// Shared equipment detail styling also used by the former carousel.
import './equipmentCarousel.css';

export default function ServiceVinyl({lang}) {
  const ar=lang.lang==='ar', tr=(en,arabic)=>ar?arabic:en;
  const cart=useCart(),order=useEventOrder();
  const [simulation,setSimulation]=useState(false),[visited,setVisited]=useState(false),[flat,setFlat]=useState(false),[resetting,setResetting]=useState(false);
  useEffect(()=>{const show=event=>{const next=event.detail==='simulation';if(!['explorer','simulation'].includes(event.detail))return;if(next)setVisited(true);setFlat(false);setSimulation(next);};window.addEventListener('echo:rental-face',show);return()=>window.removeEventListener('echo:rental-face',show);},[]);
  // Chrome will not wheel-scroll inside a 3D-flipped face, so drop the 3D transform once the flip has settled.
  useEffect(()=>{if(!simulation)return undefined;const timer=setTimeout(()=>setFlat(true),900);return()=>clearTimeout(timer);},[simulation]);
  // Stage-curtain entrance and outro in both scroll directions: 'in', or 'above'/'below' = which edge it last left through.
  const flipRef=useRef(null);
  const phase=useViewportPhase(flipRef);
  const toggleSimulation=()=>{setVisited(true);if(simulation&&flat){setResetting(true);setFlat(false);requestAnimationFrame(()=>requestAnimationFrame(()=>{setResetting(false);setSimulation(false);}));}else{setFlat(false);setSimulation(value=>!value);}};
  const [selectedServiceId,setSelected]=useState('');
  const {catalog,equipment:items,failed}=useRentalCatalog();
  const services=useMemo(()=>rentalServices(catalog),[catalog]);
  const selected=Math.max(0,services.findIndex(item=>item.id===selectedServiceId)),service=services[selected];
  useEffect(()=>{order?.setRentalServiceId?.(service?.id||'');},[service?.id,order?.setRentalServiceId]);
  // Default to the first available item in the selected service.
  const [equipmentSelection,setPreviewEquipment]=useState(undefined);
  const changeQuantity=(item,quantity)=>order?.setEquipment(item,quantity);
  const eventType=order?.order.event?.type||'';
  const requestedServices=order?.order.services;
  const previousServices=useRef([]),previousEvent=useRef(eventType);
  useEffect(()=>{
    const requested=requestedServices||[];
    const added=requested.find(id=>!previousServices.current.includes(id)&&services.some(item=>item.id===id));
    previousServices.current=requested;
    // Adding equipment can derive one or more services in the draft. Keep an
    // explicitly opened equipment card in place while its quantity is edited.
    // Compare with the displayed service, including the default first service.
    if(added&&added!==service?.id&&!equipmentSelection){setSelected(added);setPreviewEquipment(null);}
  },[requestedServices,services,service?.id,equipmentSelection]);
  useEffect(()=>{if(previousEvent.current===eventType)return;previousEvent.current=eventType;setSelected('');setPreviewEquipment(null);},[eventType]);
  // Sets belong to no service: they are listed under every service (and with none selected); individual equipment follows the chosen service.
  const serviceItems=rentalServiceEquipment(service,items);
  const suggested=(service?.selectionField?[...serviceItems.filter(row=>!isEquipmentSet(row)),...items.filter(isEquipmentSet)]:serviceItems);
  const previewEquipment=equipmentSelection===undefined?(suggested.find(row=>!isEquipmentSet(row))||suggested[0]||null):equipmentSelection&&suggested.find(item=>item.id===equipmentSelection.id)||null;
  const wrapperHeading=(<header className="service-vinyl-heading setup-showcase-heading">
      <div><p id="service-vinyl-title" className="echo-eyebrow">04 / {tr('RENTAL SERVICES AND EQUIPMENTS','خدمات التأجير والمعدات')}</p></div>
      <div className="service-vinyl-selected"><SelectedSoFar cart={cart} onQuantity={changeQuantity} ar={ar}/></div>
      <button type="button" className="setup-simulation-toggle setup-simulation-icon" aria-label={simulation?tr('Back to services','العودة للخدمات'):tr('3D Room Simulation','محاكاة الغرفة ثلاثية الأبعاد')} title={simulation?tr('Back to services','العودة للخدمات'):tr('3D Room Simulation','محاكاة الغرفة ثلاثية الأبعاد')} aria-pressed={simulation} aria-controls="setup-simulation-room" onClick={toggleSimulation}>{simulation?<ArrowLeft size={15} aria-hidden="true"/>:<Box size={15} aria-hidden="true"/>}{!simulation&&<span>{tr('3D Room Simulation','محاكاة الغرفة ثلاثية الأبعاد')}</span>}</button>
    </header>);
  return fitViewport(<section id="services" className="echo-section echo-service-vinyl setup-showcase" aria-labelledby="service-vinyl-title">

    <div ref={flipRef} className={`setup-flip${simulation?' is-flipped':''}${flat?' is-flat':''}${resetting?' is-resetting':''}${phase==='in'?' is-in':` is-away is-away-${phase}`}`}><div className="setup-flip-inner"><div className="setup-flip-front" inert={simulation} aria-hidden={simulation||undefined}>
    <RentalWorkbench heading={wrapperHeading} services={services} service={service} items={suggested} selectedItem={previewEquipment||suggested.find(row=>!isEquipmentSet(row))||suggested[0]||null} onService={item=>{setSelected(item.id);setPreviewEquipment(undefined);}} onEquipment={setPreviewEquipment} cart={cart} onQuantity={changeQuantity} ar={ar} failed={failed}/>
</div><div id="setup-simulation-room" className="setup-flip-back" inert={!simulation} aria-hidden={!simulation||undefined}>{visited&&<SimulationBoundary ar={ar}><Suspense fallback={<p className="simulation-loading" role="status">{tr('Building your room…','جارٍ إنشاء الغرفة…')}</p>}><SetupSimulation items={items} cart={cart} onQuantity={changeQuantity} services={order?.order.services||[]} event={order?.order.event} onGuestCount={value=>order?.setField('event.guestCount',value)} active={simulation} ar={ar}/></Suspense></SimulationBoundary>}</div></div></div>
  </section>);
}
