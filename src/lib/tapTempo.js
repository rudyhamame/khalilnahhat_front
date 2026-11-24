export function createTapTempo(){
 let key='',last=null,intervals=[];
 return {tap(nextKey,now,{rate=1,position=0}={}){
  if(nextKey!==key){key=nextKey;last=null;intervals=[];}
  const interval=last==null?0:now-last;last=now;
  if(interval<250||interval>2000){intervals=[];return null;}
  intervals.push(interval);intervals=intervals.slice(-8);
  const sorted=[...intervals].sort((a,b)=>a-b),middle=sorted[Math.floor(sorted.length/2)];
  const bpm=60000/middle/(rate>0?rate:1);
  if(bpm<50||bpm>220)return null;
  const period=60/bpm;
  return {manualBpm:Math.round(bpm*10)/10,manualBeatOffset:((position%period)+period)%period,taps:intervals.length+1};
 },reset(){key='';last=null;intervals=[];}};
}
