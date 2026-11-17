import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deleteClientAccount} from './deleteClientAccount.js';

function storageFor(values){const entries=new Map(Object.entries(values));return {entries,get length(){return entries.size;},key:index=>[...entries.keys()][index],removeItem:key=>entries.delete(key)};}
test('cancelling account deletion never sends a request or clears the session',async()=>{
 const storage=storageFor({'khalil-auth-token':'token'});
 const removed=await deleteClientAccount({user:{id:'alice'},token:'token',storage,confirm:async()=>false,request:async()=>assert.fail('must not delete')});
 assert.equal(removed,false);assert.equal(storage.entries.get('khalil-auth-token'),'token');
});
test('confirmed deletion calls only the self endpoint and removes only the client cache and session',async()=>{
 const storage=storageFor({'khalil-auth-token':'token','echo-event-order:v1:alice':'draft','echo-event-order:v1:alice:draft-id':'id','echo-booking-conversation:v1:alice:one':'messages','echo-ai-tasks:v1:alice:one':'tasks','echo-atom-review:v1:alice:one':'reviews','echo-event-order:v1:bob':'other draft','echo-event-order:v1:alice2':'other draft','theme':'dark'});
 const removed=await deleteClientAccount({user:{id:'alice'},token:'token',storage,confirm:async()=>true,request:async(path,options)=>{assert.equal(path,'/auth/account');assert.equal(options.method,'DELETE');assert.equal(options.token,'token');assert.deepEqual(options.body,{confirmation:'DELETE'});return {deleted:true};}});
 assert.equal(removed,true);
 assert.deepEqual([...storage.entries.keys()],['echo-event-order:v1:bob','echo-event-order:v1:alice2','theme']);
});
test('failed or unconfirmed server deletion preserves local data and the session',async()=>{
 for(const request of [async()=>{throw Error('offline');},async()=>({deleted:false})]){
  const storage=storageFor({'khalil-auth-token':'token','echo-event-order:v1:alice':'draft'});
  await assert.rejects(deleteClientAccount({user:{id:'alice'},token:'token',storage,confirm:async()=>true,request}));
  assert.equal(storage.entries.size,2);
 }
});
test('successful deletion does not depend on browser storage being available',async()=>{
 assert.equal(await deleteClientAccount({user:{id:'alice'},confirm:async()=>true,request:async()=>({deleted:true})}),true);
});
