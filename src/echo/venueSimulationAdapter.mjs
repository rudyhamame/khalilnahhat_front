export function simulationFromRecord(record,{conceptual=false}={}){
 const report=record?.report;if(!report)throw new Error('Choose a saved research result first.');
 if(conceptual)return {level:'conceptual',boundary:null,label:'Fictional concept layout; this does not reproduce the venue’s actual dimensions or shape.',recordId:record._id};
 const manual=record.manual;
 if(manual?.simulation)return {...manual.simulation,label:'User-supplied indoor boundary; architectural features remain unverified.',recordId:record._id};
 if(manual?.widthM&&manual?.depthM){const w=manual.widthM,d=manual.depthM;return {widthM:w,depthM:d,boundary:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],level:'manual',label:'User-supplied dimensions; room features and equipment positions are illustrative.',recordId:record._id};}
 const simulation=report.simulation;
 if(!conceptual&&simulation?.boundary&&['verified','estimated'].includes(simulation.level))return {...simulation,label:`${simulation.level==='verified'?'Verified room dimensions':'Estimated room geometry'} · equipment placement and architectural appearance are illustrative.`,recordId:record._id};
 throw new Error('The indoor boundary is unknown. Choose a conceptual layout or enter measured room dimensions.');
}

export function boundaryArea(boundary,holes=[]){const area=ring=>Math.abs(ring.reduce((sum,p,i)=>{const next=ring[(i+1)%ring.length];return sum+p[0]*next[1]-next[0]*p[1];},0))/2;return Math.round((area(boundary)-holes.reduce((sum,ring)=>sum+area(ring),0))*100)/100;}
