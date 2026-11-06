import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventOrder,getPath} from './eventOrderCore.mjs';
import {prepareBookingDraftEdit,createAiTaskWriter} from './bookingDraftEdits.js';

const equipment=[{id:'speaker',name:'Speaker',category:'sound',minQuantity:1,stockTracked:true,quantityOwned:4,availableQuantity:4}];
const catalog=[{id:'sound',kind:'service',category:'sound',isActive:true}];
test('one atomic receipt covers dates, venue, contact, DJ/MC decisions and equipment',()=>{
 const patch=[{path:'event.type',value:'wedding'},{path:'event.date',value:'2027-06-20'},{path:'event.startTime',value:'18:00'},{path:'event.endTime',value:'01:00'},{path:'event.venue.name',value:'Client selected venue'},{path:'customer.phone',value:'4165550100'},{path:'music.djRequested',value:'true'},{path:'music.mcRequested',value:'false'},{path:'equipment',value:'[{"id":"speaker","quantity":2}]'}];
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
