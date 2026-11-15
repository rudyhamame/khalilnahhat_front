// A trackpad starts with small deltas and ends with inertia. Accumulate the
// start, then consume the rest so a single gesture advances one viewport.
export function createViewportWheelGesture(){
 let lastTime=-Infinity,distance=0,handled=false;
 return (event,time)=>{
  if(time-lastTime>=140){distance=0;handled=false;}
  lastTime=time;
  if(handled||Math.abs(event.deltaY)<=Math.abs(event.deltaX))return 0;
  const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?800:1);
  if(distance*pixels<0)distance=0;
  distance+=pixels;
  if(Math.abs(distance)<12)return 0;
  handled=true;
  return Math.sign(distance);
 };
}
