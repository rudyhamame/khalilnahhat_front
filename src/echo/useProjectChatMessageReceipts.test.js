import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(){
 const effects=[],slots=[],requests=[];let cursor=0,response={acknowledged:true},reject=false,pending=null,hold=false;
 const document={hidden:false};
 const source=fs.readFileSync(new URL('./useProjectChatMessageReceipts.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default function','function');
 const Hook=vm.runInNewContext(source+';useProjectChatMessageReceipts',{
  useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useEffect:fn=>effects.push(fn),useCallback:fn=>fn,document,
  acknowledgeEchoProjectChatMessages:async(ids,seen,token)=>{requests.push({ids:[...ids],seen,token});if(hold)return new Promise(resolve=>pending=resolve);if(reject)throw Error('Unavailable');return response;},
 });
 const render=(token='admin-token',userId='me')=>{cursor=0;return Hook({token,userId});};
 const acknowledge=render(),cleanup=effects[0]();
 return {document,requests,acknowledge,cleanup,render,mountLatest:()=>effects.at(-1)(),fail(value){reject=value;},respond(value){response=value;},hold(){hold=true;},release(){hold=false;pending({acknowledged:true});}};
}
const rows=[{id:'mine',senderId:'me'},{id:'theirs',senderId:'other'},{id:'theirs',senderId:'other'}];
test('receipts exclude your own messages and preserve the distinction between delivery and visible display',async()=>{
 const f=fixture();await f.acknowledge(rows,false);assert.equal(f.requests.length,1);assert.equal(f.requests[0].ids.join(','),'theirs');assert.equal(f.requests[0].seen,false);
 await f.acknowledge(rows,false);assert.equal(f.requests.length,1);
 f.document.hidden=true;await f.acknowledge(rows,true);assert.equal(f.requests.length,1,'hidden pages must not report Seen');
 f.document.hidden=false;await f.acknowledge(rows,true);assert.equal(f.requests.length,2);assert.equal(f.requests[1].seen,true);
 await f.acknowledge(rows,true);assert.equal(f.requests.length,2);f.cleanup();
});
test('failed or unconfirmed acknowledgements stay retryable',async()=>{
 const f=fixture();f.fail(true);await f.acknowledge(rows,false);f.fail(false);f.respond({});await f.acknowledge(rows,false);f.respond({acknowledged:true});await f.acknowledge(rows,false);assert.equal(f.requests.length,3);
 await f.acknowledge(rows,false);assert.equal(f.requests.length,3);f.cleanup();
});
test('replaced credentials cannot transfer acknowledgement state to another session',async()=>{
 const f=fixture();f.hold();const old=f.acknowledge(rows,false);f.cleanup();const next=f.render('new-token');const cleanup=f.mountLatest();f.release();await old;await next(rows,false);assert.equal(f.requests.length,2);assert.equal(f.requests[1].token,'new-token');cleanup();
});
