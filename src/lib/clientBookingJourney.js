import contract from './bookingJourneyContract.json';
// Older saved responses may not carry the API's precomputed journey yet.
export function clientBookingJourney(request){
 const definition=contract.statuses[request.status];
 const facts=Object.fromEntries(Object.keys(contract.facts).map(key=>[key,definition?.facts.includes(key)||false]));
 return {...facts,label:definition?.label||request.status||'Status unavailable',step:definition?.step??null,clientNext:definition?.clientNext||'none',path:contract.path.map(status=>({status,label:contract.statuses[status].label})),...request.journey};
}
