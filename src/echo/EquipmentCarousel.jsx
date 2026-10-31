import './equipmentCarousel.css';

// Horizontal 3D wheel of a service's equipment inside the stage; it turns on its own and pauses on hover or focus.
export default function EquipmentCarousel({items,render,ar=false}){
  const n=items.length,radius=Math.max(230,n*70);
  return <div className="setup-carousel" style={{'--n':n,'--radius':`${radius}px`}} role="group" aria-label={ar?'المعدات':'Equipments'}>
    <div className="setup-carousel-ring">
      {items.map((item,i)=><div key={item.id} className="setup-carousel-slot" style={{'--i':i}}>{render(item)}</div>)}
    </div>
  </div>;
}
