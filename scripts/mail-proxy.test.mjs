import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer as createHttpServer} from 'node:http';
import {createServer as createViteServer} from 'vite';
import {fileURLToPath} from 'node:url';

// Exercise the real Vite proxy against isolated upstreams; no provider or email is contacted.
test('mail stays on the central service with authentication, body and retry IDs intact',async t=>{
 const requests=[];
 const upstream=async name=>{
  const server=createHttpServer(async(req,res)=>{
   let body='';for await(const chunk of req)body+=chunk;
   requests.push({name,url:req.url,authorization:req.headers.authorization,origin:req.headers.origin,body});
   const status=name==='mail'&&!req.headers.authorization?401:req.url.endsWith('/unavailable')?503:200;
   res.writeHead(status,{'Content-Type':'application/json'});
   res.end(JSON.stringify({upstream:name}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
 };
 const originalMail=process.env.VITE_MAIL_PROXY_TARGET,originalBackend=process.env.VITE_BACKEND_PROXY_TARGET;
 process.env.VITE_MAIL_PROXY_TARGET=await upstream('mail');
 process.env.VITE_BACKEND_PROXY_TARGET=await upstream('local');
 const restore=(key,value)=>value===undefined?delete process.env[key]:process.env[key]=value;
 t.after(()=>{restore('VITE_MAIL_PROXY_TARGET',originalMail);restore('VITE_BACKEND_PROXY_TARGET',originalBackend);});
 const vite=await createViteServer({configFile:fileURLToPath(new URL('../vite.config.js',import.meta.url)),logLevel:'silent',server:{host:'127.0.0.1',port:0,strictPort:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]}});
 t.after(()=>vite.close());await vite.listen();
 const base=`http://127.0.0.1:${vite.httpServer.address().port}`;
 assert.equal((await fetch(base+'/api/admin/mail/status')).status,401);
 const headers={Authorization:'Bearer isolated-test-session','Content-Type':'application/json',Origin:base};
 const draft={requestId:'e902ce62-dbb9-4c92-8cb4-e5778812eb98',to:['fixture@example.invalid'],subject:'Fixture',text:'Not sent'};
 const response=await fetch(base+'/api/admin/mail/send',{method:'POST',headers,body:JSON.stringify(draft)});
 assert.equal((await response.json()).upstream,'mail');
 const sent=requests.at(-1);assert.equal(sent.authorization,headers.Authorization);assert.equal(sent.origin,undefined);assert.deepEqual(JSON.parse(sent.body),draft);
 for(const path of ['/api/admin/mail/send/'+draft.requestId,'/api/admin/mail/messages?folderId=1']){
  assert.equal((await(await fetch(base+path,{headers})).json()).upstream,'mail');
 }
 await fetch(base+'/api/admin/mail/status',{headers:{...headers,Origin:'https://unrelated.example'}});
 assert.equal(requests.at(-1).origin,'https://unrelated.example');
 assert.equal((await fetch(base+'/api/admin/mail/unavailable',{headers})).status,503);
 assert.equal(requests.at(-1).name,'mail');
 assert.equal((await(await fetch(base+'/api/live-stream')).json()).upstream,'local');
});
