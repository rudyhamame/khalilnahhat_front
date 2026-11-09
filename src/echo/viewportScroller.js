// One critically damped motion owns navigation. A bounded virtual target gives
// long trips a cruising speed while retaining gradual acceleration and braking.
export function createViewportScroller({read,write,requestFrame,cancelFrame,now,viewportHeight,reducedMotion=()=>false,blocked=()=>false,onFinish=()=>{}}){
 let frame=null,target=null,velocity=0,lastTime=0,running=false;
 const stop=reason=>{
  if(frame!==null)cancelFrame(frame);
  frame=null;target=null;velocity=0;
  const wasRunning=running;running=false;
  if(wasRunning)onFinish(reason);
 };
 const tick=time=>{
  frame=null;
  if(blocked()){stop('cancelled');return;}
  const goal=target?.();
  if(!Number.isFinite(goal)){stop('cancelled');return;}
  const position=read();
  if(reducedMotion()){write(goal);stop('complete');return;}
  const dt=Math.max(1/240,Math.min(1/30,(time-lastTime)/1000));lastTime=time;
  const omega=2/.24,maxSpeed=Math.max(2000,Math.min(6000,viewportHeight()*5));
  const maxChange=2*maxSpeed/omega;
  const change=Math.max(-maxChange,Math.min(maxChange,position-goal));
  const virtualGoal=position-change,temp=(velocity+omega*change)*dt,decay=Math.exp(-omega*dt);
  let next=virtualGoal+(change+temp)*decay;
  velocity=(velocity-omega*temp)*decay;
  if((goal-position)*(next-goal)>0){next=goal;velocity=0;}
  if(Math.abs(goal-next)<.75&&Math.abs(velocity)<8){write(goal);stop('complete');return;}
  write(next);frame=requestFrame(tick);
 };
 return {
  get running(){return running;},
  navigate(getTarget){
   if(blocked())return false;
   const goal=getTarget();if(!Number.isFinite(goal))return false;
   target=getTarget;
   if(reducedMotion()||Math.abs(goal-read())<.75){const wasRunning=running;write(goal);stop('complete');if(!wasRunning)onFinish('complete');return true;}
   if(!running){running=true;velocity=0;lastTime=now();frame=requestFrame(tick);}
   return true;
  },
  refresh(getTarget){if(!running)this.navigate(getTarget);},
  cancel(){stop('cancelled');},
 };
}
