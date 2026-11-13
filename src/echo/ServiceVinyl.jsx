import {useRentalCatalog} from '../lib/useRentalCatalog';
import {displayImageUrl} from '../lib/displayImage';
import {rentalServices,rentalServiceEquipment} from '../lib/numberedRentalCatalog';
import RentalWorkbench from './RentalWorkbench';
import {isEquipmentSet} from '../components/equipmentSets';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const {catalog,equipment:items,failed}=useRentalCatalog();
  const services=useMemo(()=>rentalServices(catalog),[catalog]);
  const selected=Math.max(0,services.findIndex(item=>item.id===selectedServiceId)),service=services[selected];
  const page=useRef(null),artwork=displayImageUrl(service?.imageUrl);
  useLayoutEffect(()=>{
    const shell=page.current?.closest('.echo');
    if(!shell||!artwork)return;
    shell.style.setProperty('--rental-page-art',`url(${JSON.stringify(artwork)})`);
    shell.classList.add('has-rental-art');
    return()=>{shell.classList.remove('has-rental-art');shell.style.removeProperty('--rental-page-art');};
  },[artwork]);
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
  return <section ref={page} id="services" className="echo-section echo-service-vinyl setup-showcase rental-workbench rental-workbench--tabs" dir={ar?'rtl':'ltr'} aria-label={ar?'خدمات التأجير والمعدات':'Rental services and equipment'}>
    <RentalWorkbench services={services} service={service} items={suggested} selectedItem={previewEquipment||suggested.find(row=>!isEquipmentSet(row))||suggested[0]||null} onService={item=>{setSelected(item.id);setPreviewEquipment(undefined);}} onEquipment={setPreviewEquipment} cart={cart} onQuantity={changeQuantity} ar={ar} failed={failed}/>
  </section>;
}
