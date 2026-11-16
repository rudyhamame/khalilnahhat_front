import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBookingConversationRecorder } from './bookingConversationRecorder.js';

test('recorder serializes batches and preserves message IDs across retries',async()=>{
  const writes=[];let fail=true;
  const recorder=createBookingConversationRecorder(async body=>{writes.push(structuredClone(body));if(fail)throw new Error('offline');});
  await assert.rejects(recorder.save([{role:'user',content:'Wedding',mode:'chat'}]));
  fail=false;await recorder.retry();
  assert.deepEqual(writes[0],writes[1]);
  await recorder.save([{role:'assistant',content:'What date?',mode:'voice'}]);
  assert.equal(writes[2].id,writes[0].id);assert.equal(writes[2].messages.length,1);
  assert.equal(writes[2].messages[0].mode,'voice');
});
test('separate recorders have independent conversation IDs',()=>{
  assert.notEqual(createBookingConversationRecorder(()=>{}).id,createBookingConversationRecorder(()=>{}).id);
});

test('a completed chapter with null metadata cannot poison later messages',async()=>{
 const writes=[],recorder=createBookingConversationRecorder(async body=>writes.push(body));
 await recorder.save([{role:'assistant',content:'What would you like to adjust?',mode:'chat',fieldPath:null,section:'booking',face:null}]);
 await recorder.save([{role:'user',content:'Lighting please',mode:'chat'}]);
 assert.equal(writes.length,2);assert.equal(writes[0].messages[0].fieldPath,undefined);assert.equal(writes[0].messages[0].face,undefined);
});
test('failed messages survive recreation and stay isolated by account and booking',async()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const id=crypto.randomUUID(),message={id:crypto.randomUUID(),role:'user',mode:'voice',content:'Please add an MC.'};
 const failed=createBookingConversationRecorder(async()=>{throw Error('offline');},id,{owner:'alice',storage});
 await assert.rejects(failed.save([message]));
 assert.equal(createBookingConversationRecorder(()=>{},id,{owner:'bob',storage}).pendingMessages().length,0);
 assert.equal(createBookingConversationRecorder(()=>{},crypto.randomUUID(),{owner:'alice',storage}).pendingMessages().length,0);
 const writes=[],restored=createBookingConversationRecorder(async body=>writes.push(body),id,{owner:'alice',storage});
 assert.deepEqual(restored.pendingMessages(),[message]);const receipt=await restored.retry();
 assert.deepEqual(writes[0].messages,[message]);assert.deepEqual(receipt.messageIds,[message.id]);
 const reopened=createBookingConversationRecorder(()=>{},id,{owner:'alice',storage});assert.equal(reopened.pendingMessages().length,0);assert.deepEqual((await reopened.retry()).messageIds,[message.id]);
});
test('long multilingual recaps are complete, bounded, and idempotent',async()=>{
 const writes=[],recorder=createBookingConversationRecorder(async body=>writes.push(body));
 const message={id:crypto.randomUUID(),role:'assistant',mode:'chat',content:'مرحبا 🎵'.repeat(1600)};
 await recorder.save([message]);const saved=writes.flatMap(body=>body.messages);
 assert.ok(saved.length>1);assert.equal(saved.map(row=>row.content).join(''),message.content);
 assert.ok(saved.every(row=>row.content.length<=4000));assert.ok(writes.every(body=>new TextEncoder().encode(JSON.stringify(body)).length<64000));
 const count=writes.length;await recorder.save([message]);assert.equal(writes.length,count);
});
