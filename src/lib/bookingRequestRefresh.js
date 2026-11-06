// Keep the open admin Booking requests tab current without blanking its last
// successful list on a transient failure or overlapping slow requests.
export function startBookingRequestRefresh({read,apply,onError=()=>{},visible=()=>true,schedule=setInterval,unschedule=clearInterval,events=globalThis.window,period=15000}){
 let disposed=false,pending=false;
 const refresh=async()=>{
  if(disposed||pending||!visible())return;
  pending=true;
  try{const payload=await read();if(!disposed&&Array.isArray(payload?.items))apply(payload.items);}
  catch(error){if(!disposed)onError(error);}
  finally{pending=false;}
 };
 const timer=schedule(refresh,period);
 events?.addEventListener('focus',refresh);
 events?.addEventListener('visibilitychange',refresh);
 void refresh();
 return()=>{disposed=true;unschedule(timer);events?.removeEventListener('focus',refresh);events?.removeEventListener('visibilitychange',refresh);};
}
