import contract from './bookingJourneyContract.json' with {type:'json'};
// Older saved responses may not carry the API's precomputed journey yet.
export function bookingStatusLabel(request,ar=false){
 const definition=contract.statuses[request.status]||Object.values(contract.statuses).find(status=>status.label===request.journey?.label);
 return (ar?definition?.labelAr:definition?.label)||request.journey?.label||request.status||'';
}
export function clientBookingJourney(request,ar=false){
 const definition=contract.statuses[request.status];
 const facts=Object.fromEntries(Object.keys(contract.facts).map(key=>[key,definition?.facts.includes(key)||false]));
 const journey={...facts,label:definition?.label||request.status||'Status unavailable',step:definition?.step??null,clientNext:definition?.clientNext||'none',path:contract.path.map(status=>({status,label:contract.statuses[status].label})),...request.journey};
 return ar?{...journey,label:bookingStatusLabel(request,true),path:journey.path.map(entry=>({...entry,label:contract.statuses[entry.status]?.labelAr||entry.label}))}:journey;
}
