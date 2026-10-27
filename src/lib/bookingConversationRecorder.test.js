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
