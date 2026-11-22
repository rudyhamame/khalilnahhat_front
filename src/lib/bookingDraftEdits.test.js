import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventOrder,getPath} from './eventOrderCore.mjs';
import {prepareBookingDraftEdit,createAiTaskWriter} from './bookingDraftEdits.js';
import {resolveDraftEquipment} from './draftEquipment.js';
import {normalizeEventOrder} from './eventOrderCore.mjs';
import {sectionLines} from './bookingReviewModel.js';
import {bookingGoal} from './bookingGoals.js';
import {accountEventDraft} from './accountEventDraft.js';

const equipment=[{id:'speaker',name:'Speaker',category:'sound',minQuantity:1,stockTracked:true,quantityOwned:4,availableQuantity:4}];
const catalog=[{id:'sound',kind:'service',category:'sound',isActive:true}];
test('manual removal works when another saved item is missing or exceeds current stock',()=>{
 const before=createEventOrder();
 before.services=['sound'];
 before.equipment=[{id:'speaker',name:'Speaker',quantity:2},{id:'retired',name:'Retired item',quantity:1},{id:'remove-me',name:'Remove me',quantity:1}];
 const equipment=[{id:'speaker',name:'Speaker',category:'sound',stockTracked:true,availableQuantity:1}];
 const remaining=before.equipment.filter(row=>row.id!=='remove-me');
 const result=prepareBookingDraftEdit(before,[{path:'equipment',value:remaining}],{source:'manual',equipment,catalog});
 assert.deepEqual(result.rejectedFields,[]);
 assert.equal(result.draftUpdated,true);
 const cart=resolveDraftEquipment(result.order.equipment,equipment,{previous:before.equipment});
 assert.deepEqual(cart.map(({id,quantity})=>({id,quantity})),remaining.map(({id,quantity})=>({id,quantity})));
 assert.equal(cart.find(row=>row.id==='retired').name,'Retired item');
 for(const rows of [[...remaining,{id:'invented',quantity:1}],[{id:'speaker',quantity:3}]]){
  const invalid=prepareBookingDraftEdit(before,[{path:'equipment',value:rows}],{source:'manual',equipment,catalog});
  assert.deepEqual(invalid.rejectedFields,['equipment']);
  assert.equal(invalid.draftUpdated,false);
 }
});
test('clearing optional venue details survives draft save, reload and booking review',async()=>{
 const path='event.venue.addressDetails';
 const initial=prepareBookingDraftEdit(createEventOrder(),[
  {path:'event.venue.name',value:'Test Banquet Hall'},
  {path:'event.venue.city',value:'Toronto'},
  {path,value:'Toronto'},
 ],{source:'manual'}).order;
 let saved={version:1,order:initial};
 const request=async(url,options)=>{
  assert.equal(url,'/ai-booking/event-draft');
  if(!options)return {item:structuredClone(saved)};
  assert.equal(options.method,'PUT');
  assert.equal(options.body.version,saved.version);
  saved={version:saved.version+1,order:normalizeEventOrder(JSON.parse(JSON.stringify(options.body.order)))};
  return {item:structuredClone(saved)};
 };
 for(const value of [null,'']){
  const client=accountEventDraft(request);
  await client.load();
  const result=prepareBookingDraftEdit(initial,[{path,value}],{source:'manual'});
  assert.deepEqual(result.rejectedFields,[]);
  assert.equal(result.draftUpdated,true);
  assert.equal(getPath(result.order,path),value);
  assert.equal(await client.save(result.order),true);
  const reloaded=(await accountEventDraft(request).load()).order;
  const line=sectionLines(reloaded,bookingGoal('event'),false).lines.find(line=>line.key===path);
  assert.equal(line.empty,true);
  assert.equal(line.value,'Not set yet');
  assert.equal(reloaded.event.venue.city,'Toronto');
  assert.equal(reloaded.event.venue.name,'Test Banquet Hall');
 }
});
test('one atomic receipt covers dates, venue, DJ/MC decisions and equipment',()=>{
 const patch=[{path:'event.type',value:'wedding'},{path:'event.date',value:'2027-06-20'},{path:'event.startTime',value:'18:00'},{path:'event.endTime',value:'01:00'},{path:'event.venue.name',value:'Client selected venue'},{path:'music.djRequested',value:'true'},{path:'music.mcRequested',value:'false'},{path:'equipment',value:'[{"id":"speaker","quantity":2}]'}];
 const before=createEventOrder();
 const result=prepareBookingDraftEdit(before,patch,{equipment,catalog});
 assert.deepEqual(result.rejectedFields,[]);assert.equal(result.updatedFields.length,patch.length);
 assert.equal(result.order.event.type,'wedding');assert.equal(result.order.event.endTime,'01:00');
 assert.ok(result.order.services.includes('dj'));assert.ok(result.order.services.includes('sound'));
 assert.deepEqual(result.order.equipment,[{id:'speaker',quantity:2}]);assert.equal(before.event.type,null);
});
test('modifications preserve unrelated fields and invalid equipment cannot enter the draft',()=>{
 const first=prepareBookingDraftEdit(createEventOrder(),[{path:'event.type',value:'wedding'},{path:'event.date',value:'2027-06-20'},{path:'equipment',value:[{id:'speaker',quantity:2}]}],{equipment,catalog});
 const next=prepareBookingDraftEdit(first.order,[{path:'event.type',value:'graduation'},{path:'equipment',value:[{id:'speaker',quantity:99}]},{path:'status',value:'confirmed'}],{equipment,catalog});
 assert.equal(next.order.event.type,'graduation');assert.equal(next.order.event.date,'2027-06-20');assert.equal(next.order.equipment[0].quantity,2);
 assert.deepEqual(next.rejectedFields,['equipment','status']);assert.equal(next.order.status,undefined);
});
test('tasks confirm only after account save, with a serial queue for text and voice',async()=>{
 const writer=createAiTaskWriter(),records=[],calls=[];let finishSave;
 const first=writer.enqueue([{task:{label:'Event: Wedding'},changes:[{path:'event.type',value:'wedding'}]}],{
  isCurrent:()=>true,record:rows=>records.push(...rows),commit:async changes=>{calls.push('first');await new Promise(resolve=>finishSave=resolve);return {saved:true,draftUpdated:true,updatedFields:changes};},
 });
 const second=writer.enqueue([{task:{label:'Date'},changes:[{path:'event.date',value:'2027-06-20'}]}],{isCurrent:()=>true,record:rows=>records.push(...rows),commit:async changes=>{calls.push('second');return {saved:true,draftUpdated:true,updatedFields:changes};}});
 await new Promise(setImmediate);assert.deepEqual(calls,['first']);assert.equal(records.length,0);
 finishSave();await Promise.all([first,second,writer.flush()]);assert.deepEqual(calls,['first','second']);assert.ok(records.every(task=>task.confirmed));
});
test('a failed save remains pending and cannot be reported as confirmed',async()=>{
 const writer=createAiTaskWriter();let tasks;
 await writer.enqueue([{task:{path:'event.type'},changes:[{path:'event.type',value:'wedding'}]}],{isCurrent:()=>true,record:rows=>tasks=rows,commit:async changes=>({saved:false,draftUpdated:true,updatedFields:changes})});
 assert.equal(tasks[0].confirmed,false);
});
test('switching or deleting a draft discards queued work and late task receipts',async()=>{
 const writer=createAiTaskWriter();let current=true,complete,recorded=0,commits=0;
 const options={isCurrent:()=>current,record:()=>recorded++,commit:async changes=>{commits++;await new Promise(resolve=>complete=resolve);return {saved:true,updatedFields:changes};}};
 const item=[{task:{path:'event.type'},changes:[{path:'event.type',value:'wedding'}]}];
 const first=writer.enqueue(item,options),second=writer.enqueue(item,options);
 await new Promise(setImmediate);current=false;complete();await Promise.all([first,second]);
 assert.equal(recorded,0);assert.equal(commits,1);
});

test('manual and AI edits reject every account contact including reset attempts',()=>{
 const before=createEventOrder();Object.assign(before.customer,{firstName:'Original',lastName:'Client',email:'original@example.invalid',phone:'4165550199',company:'Original Company'});
 for(const source of ['manual','ai'])for(const value of ['Changed',null]){
  const paths=['customer.firstName','customer.lastName','customer.email','customer.phone','customer.company'];
  const result=prepareBookingDraftEdit(before,paths.map(path=>({path,value})),{source});
  assert.deepEqual(result.order.customer,before.customer);assert.deepEqual(result.rejectedFields,paths);assert.deepEqual(result.updatedFields,[]);assert.equal(result.draftUpdated,false);
 }
});
