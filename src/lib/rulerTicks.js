// Ruler ticks in output pixels: a major tick (labelled) every "nice" step, minor ticks between.
const NICE=[10,20,25,40,50,80,100,160,200,250,320,400,500];
const stepFor=(length,target=8)=>NICE.find(step=>length/step<=target)||NICE.at(-1);
export const rulerTicks=(length,step=stepFor(length))=>{
  const minor=step/5,ticks=[];
  for(let value=0;value<=length+.001;value+=minor){const major=Math.abs(value%step)<.001||Math.abs(value%step-step)<.001;ticks.push({value:Math.round(value),major,percent:value/length*100});}
  return {step,ticks};
};
