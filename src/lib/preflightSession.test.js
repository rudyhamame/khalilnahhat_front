import {test} from 'node:test';
import assert from 'node:assert/strict';
import {waitForPreflightSession} from './preflightSession.js';
const page=ready=>Object.assign(new EventTarget(),{documentElement:{dataset:{echoSessionReady:String(ready)}}});
test('a returning tab waits for login detection before revealing its content',async()=>{
  const target=page(false);let revealed=false;
  const pending=waitForPreflightSession(target).then(()=>{revealed=true;});
  await Promise.resolve();assert.equal(revealed,false);
  target.dispatchEvent(new Event('echo:session-ready'));
  await Promise.resolve();assert.equal(revealed,false);
  target.documentElement.dataset.echoSessionReady='true';
  target.dispatchEvent(new Event('echo:session-ready'));
  await pending;assert.equal(revealed,true);
});
test('an already verified signed-in or signed-out session can proceed',async()=>{
  assert.equal(await waitForPreflightSession(page(true)),true);
});
test('unmounting cancels the session wait without reporting readiness',async()=>{
  const controller=new AbortController();
  const pending=waitForPreflightSession(page(false),{signal:controller.signal});
  controller.abort();assert.equal(await pending,false);
});
