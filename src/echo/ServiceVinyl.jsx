import SetupNotes from './SetupNotes';
import {useTree} from '../lib/tree';
import {rentalServices,rentalServiceEquipment} from '../lib/numberedRentalCatalog';
import RentalWorkbench from './RentalWorkbench';
import { Component, useEffect, useMemo, useRef, useState } from 'react';
import {useCart} from './cart';
import {useEventOrder} from './eventOrderContext';
import './setupSimulation.css';
export class SimulationBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){console.error('Setup simulation failed:',error);}
  render(){
    if(!this.state.failed)return this.props.children;
    const ar=this.props.ar;
    return <div className="simulation-loading" role="alert"><p>{ar?'تعذر فتح المحاكاة. يمكنك إعادة المحاولة أو العودة إلى الخدمات.':'The simulation could not open. Retry or return to services.'}</p><button type="button" onClick={()=>this.setState({failed:false})}>{ar?'إعادة المحاولة':'Retry simulation'}</button></div>;
  }
}
import './serviceVinyl.css';
import './setupShowcase.css';
import './setupReadability.css';
import './setupEquipmentColumn.css';
// Shared equipment detail styling also used by the former carousel.
import './equipmentCarousel.css';

export default function ServiceVinyl({lang}) {
  const ar=lang.lang==='ar';
  const cart=useCart(),order=useEventOrder();
  const [selectedServiceId,setSelected]=useState('');
  const {catalog,equipment:items,failed}=useTree();
  // MC hosting moved to its own step under DJ Khalil Service (a third-party host), so it is no longer a rental service in this list.
  const services=useMemo(()=>rentalServices(catalog).filter(item=>item.id!=='mc'&&item.selectionField!=='music.mcRequested'),[catalog]);
  const selected=Math.max(0,services.findIndex(item=>item.id===selectedServiceId)),service=services[selected];
  const page=useRef(null);
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
  // Build an individual-equipment list for every service; packaged sets are excluded from the booking UI.
  const serviceSections=useMemo(()=>services.map(service=>({service,items:rentalServiceEquipment(service,items)})),[services,items]);
  const suggested=serviceSections.find(section=>section.service.id===service?.id)?.items||[];
  const previewEquipment=equipmentSelection===undefined?(suggested[0]||null):equipmentSelection&&suggested.find(item=>item.id===equipmentSelection.id)||null;
  return <><section ref={page} id="services" className="echo-section echo-service-vinyl setup-showcase rental-workbench" dir={ar?'rtl':'ltr'} aria-label={ar?'خدمات التأجير والمعدات':'Rental services and equipment'}>
    <RentalWorkbench services={services} sections={serviceSections} service={service} items={suggested} selectedItem={previewEquipment||suggested[0]||null} onService={item=>{setSelected(item.id);setPreviewEquipment(undefined);}} onEquipment={setPreviewEquipment} cart={cart} onQuantity={changeQuantity} ar={ar} failed={failed}/>
  </section><SetupNotes ar={ar}/></>;
}
