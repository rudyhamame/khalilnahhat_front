import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountEventDraft} from './accountEventDraft.js';
test('draft writes are serialized and delete waits for in-flight saves',async()=>{
  let version=0;const calls=[];
  const client=accountEventDraft(async(path,options)=>{
    if(!options)return {item:version?{version}:null};calls.push(options.method);
    await new Promise(resolve=>setTimeout(resolve,5));
    if(options.method==='PUT'){assert.equal(options.body.version,version);return {item:{version:++version}};}
    assert.match(path,new RegExp(`version=${version}$`));return {removed:true,conversationRemoved:true};
  });
  await client.load();await Promise.all([client.save({a:1}),client.save({a:2}),client.remove()]);
  assert.deepEqual(calls,['PUT','PUT','DELETE']);
});
test('conflict blocks subsequent writes instead of overwriting another device',async()=>{
  let writes=0;const states=[];
  const client=accountEventDraft(async(path,options)=>{if(!options)return {item:{version:3}};writes++;throw Object.assign(new Error('conflict'),{status:409});},state=>states.push(state));
  await client.load();assert.equal(await client.save({}),false);assert.equal(await client.save({}),false);assert.equal(writes,1);assert.equal(states.at(-1),'conflict');
});
test('failed saves never report account-saved, and can be retried',async()=>{
  let fail=true;const states=[];const client=accountEventDraft(async(path,options)=>{if(!options)return {item:null};if(fail)throw new Error('offline');return {item:{version:1}};},state=>states.push(state));
  await client.load();await client.save({});assert.equal(states.at(-1),'account-failed');fail=false;assert.equal(await client.save({}),true);assert.equal(states.at(-1),'account-saved');
});
test('failed deletion preserves the server version so retry deletes the same draft',async()=>{
 let fail=true;const calls=[];
 const client=accountEventDraft(async(path,options)=>{
  if(!options)return {item:{version:7}};
  calls.push([path,options.method]);
  if(fail)throw new Error('offline');
  if(options.method==='PUT'){assert.equal(options.body.version,0);return {item:{version:1}};}
  return {removed:true,conversationRemoved:true};
 });
 await client.load();assert.equal(await client.remove(),false);
 fail=false;assert.equal(await client.remove(),true);
 assert.deepEqual(calls,[['/ai-booking/event-draft?version=7','DELETE'],['/ai-booking/event-draft?version=7','DELETE']]);
 assert.equal(await client.save({equipment:[]},'new-draft'),true);
});
test('explicit deletion recovers a blocked save conflict and deletes the fresh version of the same draft',async()=>{
 let loads=0,removed=false;const deletes=[],states=[];
 const client=accountEventDraft(async(path,options)=>{
  if(!options)return {item:removed?null:{draftId:'same',version:++loads===1?3:5}};
  if(options.method==='PUT')throw Object.assign(new Error('stale'),{status:409});
  deletes.push(path);assert.match(path,/version=5(?:&|$)/);removed=true;return {removed:true,conversationRemoved:true};
 },state=>states.push(state));
 await client.load();assert.equal(await client.save({},'same'),false);assert.equal(states.at(-1),'conflict');
 assert.equal(await client.remove({draftId:'same'}),true);assert.equal(removed,true);assert.equal(deletes.length,1);
});
test('delete retries a concurrent save conflict but never deletes a replacement draft',async()=>{
 for(const replaced of [false,true]){
  let loads=0,deletes=0;
  const client=accountEventDraft(async(path,options)=>{
   if(!options){loads++;return {item:{draftId:loads<3?'old':replaced?'new':'old',version:loads<3?1:2}};}
   deletes++;if(deletes===1)throw Object.assign(new Error('stale'),{status:409});
   assert.match(path,/version=2(?:&|$)/);return {removed:true,conversationRemoved:true};
  });
  await client.load();assert.equal(await client.remove({draftId:'old'}),!replaced);assert.equal(deletes,replaced?1:2);
 }
});
test('unconfirmed deletion fails and does not reset the version',async()=>{
 const states=[];let attempts=0;
 const client=accountEventDraft(async(path,options)=>{if(!options)return {item:{version:9}};assert.match(path,/version=9$/);return ++attempts===1?{}:{removed:true};},state=>states.push(state));
 await client.load();assert.equal(await client.remove(),false);assert.equal(states.at(-1),'delete-failed');assert.equal(await client.remove(),true);
});
