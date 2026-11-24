import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clientBookingJourney,bookingStatusLabel} from './clientBookingJourney.js';
import contract from './bookingJourneyContract.json' with {type:'json'};
const statusWith=fact=>Object.entries(contract.statuses).find(([,value])=>value.facts.includes(fact))[0];
test('client sees four stages with an unavailable branch and bilingual labels',()=>{
 const initialStatus=contract.path[0];
 for(const [request,stage] of [[{status:initialStatus},'requested'],[{status:initialStatus,availability:{status:'available'}},'available'],[{status:initialStatus,availability:{status:'unavailable'}},'unavailable'],[{status:statusWith('awaitingClient')},'quote_ready'],[{status:statusWith('isBooked')},'booked']]){
 const result=clientBookingJourney(request);assert.equal(result.clientStatus,stage);assert.equal(result.label,contract.clientStages[stage].label);assert.equal(result.path.length,4);assert.equal(bookingStatusLabel(request,true),contract.clientStages[stage].labelAr);
 if(stage==='unavailable')assert.equal(result.path[1].status,'unavailable');
 }
});
test('server facts preserve payment and quote actions while showing the new client labels',()=>{
 const request={status:statusWith('canRecordDeposit'),journey:{clientStatus:'quote_ready',canRecordDeposit:true,clientNext:'pay_deposit',path:contract.clientPath.map(status=>({status,...contract.clientStages[status]}))}};
 const result=clientBookingJourney(request);assert.equal(result.label,'Booking quote ready');assert.equal(result.canRecordDeposit,true);assert.equal(result.clientNext,'pay_deposit');
});
