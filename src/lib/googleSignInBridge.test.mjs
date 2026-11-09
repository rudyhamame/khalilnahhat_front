import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GOOGLE_SIGN_IN_ORIGIN,isLocalSignInOrigin,readGoogleBridgeRequest,isGoogleBridgeResponse} from './googleSignInBridge.mjs';

const request={origin:'http://192.168.68.60:5176',state:'a'.repeat(64),nonce:'b'.repeat(64),clientId:'123-example.apps.googleusercontent.com'};
test('the sign-in relay accepts exact local origins only',()=>{
 for(const origin of [request.origin,'http://10.0.0.2:5176','https://172.16.0.2:5176','http://127.0.0.1:5176','http://localhost:5176','http://[::1]:5176'])assert.equal(isLocalSignInOrigin(origin),true,origin);
 for(const origin of ['https://evil.example','http://192.168.68.60.evil.example:5176','http://172.32.0.1:5176',request.origin+'/login','null','file:///tmp/login','http://user@192.168.68.60:5176'])assert.equal(isLocalSignInOrigin(origin),false,origin);
});
test('relay requests require a valid return origin, state, nonce and Google client',()=>{
 const hash='#'+new URLSearchParams(request);assert.deepEqual(readGoogleBridgeRequest(hash),{...request,ar:false});
 for(const change of [{origin:'https://evil.example'},{nonce:''},{state:'short'},{clientId:'untrusted'}])assert.equal(readGoogleBridgeRequest('#'+new URLSearchParams({...request,...change})),null);
});
test('credentials are accepted only from the opened HTTPS popup and matching challenge',()=>{
 const popup={},pending={popup,...request};
 const event={origin:GOOGLE_SIGN_IN_ORIGIN,source:popup,data:{type:'echo:google-credential',state:request.state,nonce:request.nonce,credential:'signed-token'}};
 assert.equal(isGoogleBridgeResponse(event,pending),true);
 for(const change of [{origin:'https://evil.example'},{source:{}},{data:{...event.data,state:'wrong'}},{data:{...event.data,nonce:'wrong'}},{data:{...event.data,credential:''}},{data:{...event.data,credential:'x'.repeat(16001)}},{data:{...event.data,type:'other'}}])assert.equal(isGoogleBridgeResponse({...event,...change},pending),false);
 assert.equal(isGoogleBridgeResponse(event,null),false);
});
