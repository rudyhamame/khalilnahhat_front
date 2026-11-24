import contract from './bookingJourneyContract.json' with {type:'json'};
// API stage labels are distinct from internal acceptance/payment states.
function fallbackStage(request,definition){
 if(!definition?.facts.length)return null;
 if(definition.facts.includes('isBooked'))return 'booked';
 if(definition.facts.includes('showsPrices'))return 'quote_ready';
 if(request.availability?.status==='unavailable')return 'unavailable';
 if(request.availability?.status==='available'||request.availabilityAcceptedAt)return 'available';
 return 'requested';
}
export function bookingStatusLabel(request,ar=false){
 const definition=contract.statuses[request.status],stage=request.journey?.clientStatus||fallbackStage(request,definition),display=contract.clientStages?.[stage]||definition;
 return (ar?display?.labelAr:display?.label)||request.journey?.label||request.status||'';
}
export function clientBookingJourney(request,ar=false){
 const definition=contract.statuses[request.status],stage=request.journey?.clientStatus||fallbackStage(request,definition),display=contract.clientStages?.[stage];
 const facts=Object.fromEntries(Object.keys(contract.facts).map(key=>[key,definition?.facts.includes(key)||false]));
 const path=display?contract.clientPath.map(key=>key==='available'&&stage==='unavailable'?'unavailable':key).map(key=>({status:key,...contract.clientStages[key]})):[];
 const journey={...facts,label:display?.label||definition?.label||'Status unavailable',step:display?.step??null,clientNext:display?.clientNext||definition?.clientNext||'none',path,clientStatus:stage,canDiscussAvailability:stage==='unavailable',...request.journey};
 return {...journey,label:bookingStatusLabel({...request,journey},ar),path:journey.path.map(entry=>({...entry,label:ar?(contract.clientStages[entry.status]?.labelAr||entry.labelAr||entry.label):entry.label}))};
}
