import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleButtonClient} from './googleButtonClient.mjs';
function fixture(){
 let initialize=0,configs=0,callback,time=0,ids=0;
 const google={initialize:options=>{initialize++;callback=options.callback;assert.equal(options.ux_mode,'popup');assert.equal(options.nonce,'server-nonce');}};
 const client=createGoogleButtonClient({loadConfig:async()=>{configs++;return{configured:true,clientId:'client',nonce:'server-nonce'};},loadGoogle:async()=>google,now:()=>time,createState:()=>`button-${++ids}`});
 return {client,send:result=>callback(result),counts:()=>({initialize,configs}),advance:()=>{time+=240001;}};
}
test('concurrent mounts and remounts share one configuration and Google initialization',async()=>{
 const f=fixture();const [a,b]=await Promise.all([f.client.prepare(),f.client.prepare()]);assert.equal(a,b);
 assert.equal(await f.client.prepare(),a);assert.deepEqual(f.counts(),{initialize:1,configs:1});
});
test('credentials go only to the clicked button and retain the initialized server nonce',async()=>{
 const f=fixture(),received=[];await f.client.prepare();
 f.client.subscribe(payload=>received.push(['first',payload]));
 const second=f.client.subscribe(payload=>received.push(['second',payload]));
 await f.send({state:'unknown',credential:'ignored'});assert.equal(received.length,0);
 await f.send({state:second.state,credential:'signed-token'});
 assert.deepEqual(received,[['second',{credential:'signed-token',nonce:'server-nonce'}]]);
 await f.send({state:second.state,credential:'duplicate'});assert.equal(received.length,1);
 await assert.rejects(f.client.prepare(),/reload/);assert.equal(f.counts().initialize,1);
});
test('disabled and unmounted buttons cannot receive or consume credentials',async()=>{
 const f=fixture(),received=[];await f.client.prepare();
 const disabled=f.client.subscribe(payload=>received.push(payload),()=>false);
 const removed=f.client.subscribe(payload=>received.push(payload));removed.unsubscribe();
 await f.send({state:disabled.state,credential:'disabled'});await f.send({state:removed.state,credential:'removed'});assert.equal(received.length,0);
 const active=f.client.subscribe(payload=>received.push(payload));await f.send({state:active.state,credential:'active'});assert.equal(received.length,1);
});
test('expired challenges require a fresh page instead of reinitializing Google',async()=>{
 const f=fixture();await f.client.prepare();f.advance();await assert.rejects(f.client.prepare(),/reload/);assert.equal(f.counts().initialize,1);
});
test('popup bridge keeps its original nonce and refuses a conflicting challenge',async()=>{
 let options;
 const client=createGoogleButtonClient({loadConfig:async()=>({configured:true,clientId:'client',nonce:'unused-nonce'}),loadGoogle:async()=>({initialize:value=>{options=value;}})});
 await client.prepare({clientId:'client',nonce:'bridge-nonce'});assert.equal(options.nonce,'bridge-nonce');
 await assert.rejects(client.prepare({clientId:'client',nonce:'different-nonce'}),/reload/);
});
