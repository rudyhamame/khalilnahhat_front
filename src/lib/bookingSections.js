// The one place that says what an order contains, in the two service sections the site is built around:
// 1. DJ Khalil's main service, 2. the other rental services (MC first, each with its equipment).
// The booking review, concept map, client draft and submitted-request views all read this instead of re-deriving it.
export function bookingSections(order,rentals=[]){
 const chosen=order.equipment||[],services=order.services||[];
 return {
  dj:services.includes('dj')||order.music?.djRequested===true,
  rentals:rentals.map(service=>{
   const mc=service.selectionField==='music.mcRequested',used=service.equipment.some(item=>chosen.some(line=>line.id===item.id)&&!item.isSet);
   // A rental service is only a category of equipment: it is "on" when one of its equipment items is chosen. DJ and MC are the real services (own booking switches).
   const on=mc?(used||order.music?.mcRequested===true):used||(service.bookingServiceId!=='rental'&&services.includes(service.bookingServiceId));
   return {...service,on,equipment:service.equipment.map(item=>({...item,quantity:chosen.find(line=>line.id===item.id)?.quantity||0}))};
  }),
 };
}
