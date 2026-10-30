import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventOrder,voiceGreetingInstructions,updateOrderField,missingOrderFields} from './eventOrderCore.mjs';

test('greeting recaps what is filled and names what is still empty',()=>{
  let order=createEventOrder();
  const empty=voiceGreetingInstructions(order);
  assert.match(empty,/nothing filled in yet/);assert.match(empty,/greeting/);assert.match(empty,/role/);assert.match(empty,/AI booking assistant/);
  order=updateOrderField(order,'event.type','wedding',{ai:true});
  const text=voiceGreetingInstructions(order);
  assert.match(text,/wedding/);assert.doesNotMatch(text,/nothing filled in yet/);
  const open=missingOrderFields(order).filter(field=>field.key!=='event.type');
  assert.ok(open.length>0);
});
test('Arabic greeting is written in Arabic',()=>{
  assert.match(voiceGreetingInstructions(createEventOrder(),true),/بالعربية/);
});
