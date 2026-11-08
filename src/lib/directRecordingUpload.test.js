import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadDirectRecordingChunk} from './directRecordingUpload.js';
const options={baseUrl:'/api',token:'test',id:'one',sequence:0,bytes:new ArrayBuffer(4),mime:'video/webm'};
test('binary upload passes the original bytes and requires a server acknowledgement',async()=>{
 const result=await uploadDirectRecordingChunk({...options,fetchImpl:async(url,request)=>{
  assert.equal(url,'/api/live-stream/recordings/one/chunks/0');assert.equal(request.body,options.bytes);assert.equal(request.headers['X-Recording-Mime'],'video/webm');
  return Response.json({nextSequence:1});
 }});assert.equal(result.nextSequence,1);
 for(const body of [{},{nextSequence:0},{nextSequence:'1'}])await assert.rejects(uploadDirectRecordingChunk({...options,fetchImpl:async()=>Response.json(body)}),/did not acknowledge/);
});
test('proxy HTML failures preserve HTTP status and retry timing',async()=>{
 await assert.rejects(uploadDirectRecordingChunk({...options,fetchImpl:async()=>new Response('<html>Busy</html>',{status:503,headers:{'Retry-After':'15'}})}),error=>{
  assert.equal(error.status,503);assert.equal(error.retryAfterMs,15000);assert.match(error.message,/HTTP 503/);return true;
 });
});
test('server failure reasons and expired authentication remain actionable',async()=>{
 await assert.rejects(uploadDirectRecordingChunk({...options,fetchImpl:async()=>Response.json({message:'Recording disk is full.'},{status:507})}),{status:507,message:'Recording disk is full.'});
 await assert.rejects(uploadDirectRecordingChunk({...options,fetchImpl:async()=>new Response('',{status:401})}),{status:401,message:'Sign in again to resume uploading.'});
});
test('network failures and timeouts explain that upload can recover',async()=>{
 await assert.rejects(uploadDirectRecordingChunk({...options,fetchImpl:async()=>{throw new TypeError('Failed to fetch');}}),/Check your connection/);
 await assert.rejects(uploadDirectRecordingChunk({...options,fetchImpl:async()=>{throw new DOMException('timeout','TimeoutError');}}),/timed out/);
});
