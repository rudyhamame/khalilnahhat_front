import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {fitViewport} from './fitViewport';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {useCart} from './cart';
import {useEventOrder} from './eventOrderContext';
import {SimulationBoundary} from './ServiceVinyl';
import './setupSimulation.css';
import './room3d.css';

const SetupSimulation=lazy(()=>import('./SetupSimulation'));
// The 3D Room is its own viewport, under Echo AI. The 3D scene loads only when the visitor is close to it.
export default function Room3D({lang}){
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const cart=useCart(),order=useEventOrder(),{equipment:items}=useRentalCatalog();
  const section=useRef(null),[near,setNear]=useState(false),[visible,setVisible]=useState(false);
  useEffect(()=>{
    const node=section.current;if(!node||typeof IntersectionObserver==='undefined'){setNear(true);setVisible(true);return undefined;}
    const close=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)setNear(true);},{rootMargin:'150% 0px'}),seen=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{threshold:.1});
    close.observe(node);seen.observe(node);
    return()=>{close.disconnect();seen.disconnect();};
  },[]);
  const changeQuantity=(item,quantity)=>order?.setEquipment(item,quantity);
  return fitViewport(<section id="room-3d" ref={section} className="echo-section echo-room-3d setup-showcase" aria-labelledby="room-3d-title" dir={ar?'rtl':'ltr'}>
    <div className="room-3d-shell">
      <header className="service-vinyl-heading setup-showcase-heading"><div><p id="room-3d-title" className="echo-eyebrow">05 / {tr('3D ROOM','الغرفة ثلاثية الأبعاد')}</p></div></header>
      <div className="room-3d-stage">{near&&<SimulationBoundary ar={ar}><Suspense fallback={<p className="simulation-loading" role="status">{tr('Building your room…','جارٍ إنشاء الغرفة…')}</p>}><SetupSimulation items={items} cart={cart} onQuantity={changeQuantity} services={order?.order.services||[]} event={order?.order.event} onGuestCount={value=>order?.setField('event.guestCount',value)} active={visible} ar={ar}/></Suspense></SimulationBoundary>}</div>
    </div>
  </section>);
}
