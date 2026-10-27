import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountEventDraft} from './accountEventDraft.js';
test('draft writes are serialized and delete waits for in-flight saves',async()=>{
  let version=0;const calls=[];
  const client=accountEventDraft(async(path,options)=>{
    if(!options)return {item:null};calls.push(options.method);
    await new Promise(resolve=>setTimeout(resolve,5));
    if(options.method==='PUT'){assert.equal(options.body.version,version);return {item:{version:++version}};}
    assert.match(path,new RegExp(`version=${version}$`));return {removed:true};
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
