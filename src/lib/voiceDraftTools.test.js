import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceDraftTools} from './voiceDraftTools.js';
import {createEventOrder,applyOrderPatch} from './eventOrderCore.mjs';
test('completed voice arguments select date and event before speech ends, exactly once across provider event shapes',async()=>{
 let order=createEventOrder(),executions=0;const sent=[];
 const tools=createVoiceDraftTools({execute:async item=>{executions++;order=applyOrderPatch(order,JSON.parse(item.arguments).updates);return {draftUpdated:true};},send:event=>sent.push(event)});
 const call={call_id:'select-event',name:'update_event_draft',arguments:JSON.stringify({updates:[{path:'event.date',value:'2026-11-14'},{path:'event.type',value:'birthday'}]})};
 tools.begin();await tools.run(call);
 assert.equal(order.event.date,'2026-11-14');assert.equal(order.event.type,'birthday');assert.equal(order.event.startTime,null);
 assert.deepEqual(sent.map(event=>event.type),['conversation.item.create']);
 await tools.run({...call,type:'function_call',status:'completed'});tools.finish('completed');
 assert.equal(executions,1);assert.deepEqual(sent.map(event=>event.type),['conversation.item.create','response.create']);
});
test('multiple fallback tools produce one continuation, while incomplete and obsolete actions are ignored',async()=>{
 const sent=[];let current=true,executions=0;
 const tools=createVoiceDraftTools({execute:async()=>{executions++;return {ok:true};},send:event=>sent.push(event),isCurrent:()=>current});
 tools.begin();const call=id=>({call_id:id,name:'update_event_draft',arguments:'{"updates":[]}'});
 const first=tools.run(call('a')),second=tools.run(call('b'));tools.finish('completed');await Promise.all([first,second]);
 assert.equal(sent.filter(event=>event.type==='response.create').length,1);
 await tools.run({...call('incomplete'),status:'incomplete'});current=false;await tools.run(call('obsolete'));assert.equal(executions,2);
});

test('start and end times commit independently before response completion and preserve other answers',async()=>{
 let order=createEventOrder();order.event.date='2026-11-14';order.event.type='birthday';
 const tools=createVoiceDraftTools({execute:async item=>{order=applyOrderPatch(order,JSON.parse(item.arguments).updates);return {draftUpdated:true};},send:()=>{}});
 const apply=async(id,path,value)=>{tools.begin();await tools.run({call_id:id,name:'update_event_draft',arguments:JSON.stringify({updates:[{path,value}]})});};
 await apply('start','event.startTime','18:00');assert.equal(order.event.startTime,'18:00');assert.equal(order.event.endTime,null);
 await apply('end','event.endTime','02:30');assert.equal(order.event.endTime,'02:30');assert.equal(order.event.startTime,'18:00');
 await apply('correct-end','event.endTime','23:00');assert.equal(order.event.endTime,'23:00');
 await apply('clear-start','event.startTime','null');assert.equal(order.event.startTime,null);assert.equal(order.event.endTime,'23:00');assert.equal(order.event.date,'2026-11-14');assert.equal(order.event.type,'birthday');
});
