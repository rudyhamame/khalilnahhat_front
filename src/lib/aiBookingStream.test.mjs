import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readBookingResponse,voiceConversationContext} from './aiBookingStream.mjs';
const stream=(events)=>new Response(events.map(event=>JSON.stringify(event)).join('\n')+'\n',{headers:{'Content-Type':'application/x-ndjson'}});
test('reply deltas are provisional; final reply and patch commit together',async()=>{
 const deltas=[];const result=await readBookingResponse(stream([{type:'reply.delta',delta:'Hello'},{type:'reply.delta',delta:' مرحبا'},{type:'complete',reply:'Hello مرحبا!',orderPatch:[{path:'event.type',value:'wedding'}]}]),delta=>deltas.push(delta));
 assert.equal(deltas.join(''),'Hello مرحبا');assert.equal(result.reply,'Hello مرحبا!');assert.equal(result.orderPatch[0].value,'wedding');
});
test('dropped or failed streams never return a partial order',async()=>{
 for(const events of [[{type:'reply.delta',delta:'Partial'}],[{type:'reply.delta',delta:'Partial'},{type:'error',message:'Please retry.'}]])await assert.rejects(readBookingResponse(stream(events)),/retry/i);
 await assert.rejects(readBookingResponse(stream([{type:'complete',reply:'Hello',orderPatch:{unsafe:true}}])),/Invalid/);
});
test('NDJSON handles split UTF-8 and stream boundaries',async()=>{
 const bytes=new TextEncoder().encode(JSON.stringify({type:'reply.delta',delta:'مرحبا 🎉'})+'\n'+JSON.stringify({type:'complete',reply:'مرحبا 🎉',orderPatch:[]})+'\n');
 const body=new ReadableStream({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}});
 let reply='';const result=await readBookingResponse(new Response(body,{headers:{'Content-Type':'application/x-ndjson'}}),delta=>{reply+=delta;});
 assert.equal(reply,'مرحبا 🎉');assert.equal(result.reply,reply);
});
test('legacy JSON servers and sanitized HTTP errors remain compatible',async()=>{
 assert.deepEqual(await readBookingResponse(Response.json({reply:'Hi',draft:{eventType:'wedding'}})),{reply:'Hi',draft:{eventType:'wedding'}});
 await assert.rejects(readBookingResponse(Response.json({message:'Please sign in.'},{status:401})),/Please sign in/);
});
test('Voice receives bounded history with speaker roles and the current order',()=>{
 const messages=Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:String(i)+'x'.repeat(2000)}));
 const context=voiceConversationContext(messages,{'event.type':'wedding'});
 const data=JSON.parse(context.slice(context.indexOf('{')));
 assert.equal(data.conversation.length,12);assert.equal(data.conversation[0].role,'user');assert.equal(data.conversation[1].role,'assistant');
 assert.ok(data.conversation.every(message=>message.content.length<=1000));assert.equal(data.order['event.type'],'wedding');assert.match(context,/assistant suggestions are not client facts/);
});
