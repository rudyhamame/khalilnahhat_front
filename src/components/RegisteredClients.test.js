import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise real promotion handlers without a browser session or account change.
function fixture({confirm=true,status=200,body={granted:true,item:{id:'client',isAdmin:true}}}={}){
 const slots=[],requests=[];let cursor=0,confirmations=0;
 const source=fs.readFileSync(new URL('./RegisteredClients.jsx',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default function','function');
 const code=source.slice(0,source.indexOf('  return <section'))+'return {giveAdmin,setItems,items,error,notice,workingId};\n}';
 const Component=vm.runInNewContext(code+';RegisteredClients',{
  useEffect(){},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
  window:{confirm(){confirmations++;return confirm;}},apiBaseUrl:'https://unit.invalid/api',
  fetch:async(url,options)=>{requests.push({url,options});return {ok:status>=200&&status<300,json:async()=>body};},
 });
 const client={id:'client',name:'Client',email:'client@example.invalid',isBlocked:false};
 const render=()=>{cursor=0;return Component({token:'admin-session'});};render().setItems([client]);
 return {client,render,requests,confirmations:()=>confirmations};
}
test('Give admin changes the row only after a confirmed role receipt for that same account',async()=>{
 const f=fixture();await f.render().giveAdmin(f.client);assert.equal(f.requests.length,1);assert.match(f.requests[0].url,/clients\/client\/admin$/);assert.equal(f.requests[0].options.method,'POST');assert.equal(f.requests[0].options.headers.Authorization,'Bearer admin-session');assert.equal(f.render().items.length,0);assert.match(f.render().notice,/now has administrator access/);
});
test('declining the role confirmation or selecting a blocked account sends no promotion request',async()=>{
 const f=fixture({confirm:false});await f.render().giveAdmin(f.client);assert.equal(f.requests.length,0);assert.equal(f.render().items.length,1);
 const blocked=fixture();await blocked.render().giveAdmin({...blocked.client,isBlocked:true});assert.equal(blocked.requests.length,0);assert.equal(blocked.confirmations(),0);
});
for(const [label,options] of [
 ['server rejection',{status:403,body:{message:'Administrator required'}}],
 ['unconfirmed success',{body:{item:{id:'client',isAdmin:true}}}],
 ['wrong account receipt',{body:{granted:true,item:{id:'another-client',isAdmin:true}}}],
 ['non-admin receipt',{body:{granted:true,item:{id:'client',isAdmin:false}}}],
])test(`Give admin retains the client and reports ${label}`,async()=>{
 const f=fixture(options);await f.render().giveAdmin(f.client);assert.equal(f.render().items.length,1);assert.ok(f.render().error);assert.equal(f.render().notice,'');assert.equal(f.render().workingId,'');
});
