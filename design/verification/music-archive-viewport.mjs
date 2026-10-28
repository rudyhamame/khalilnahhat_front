// Resize only the page in our user-selected BrowserAct review session.
import { execFileSync } from 'node:child_process';
const session = 'khalil-music-archive-review';
const metadata = JSON.parse(execFileSync('browser-act', ['--session', session, '--format', 'json', 'get', 'cdp-url'], { encoding: 'utf8' }));
const socket = new WebSocket(metadata.cdp_url);
const pending = new Map(); let id = 0;
const timeout = setTimeout(() => { console.error('Viewport check timed out'); socket.close(); process.exitCode = 1; }, 20000);
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data); const task = pending.get(message.id);
  if (task) { pending.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result); }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const current = ++id; pending.set(current, {resolve, reject}); socket.send(JSON.stringify({id:current, method, params, ...(sessionId ? {sessionId} : {})})); });
try {
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once:true}); socket.addEventListener('error', reject, {once:true}); });
  const targets = await send('Target.getTargets');
  const page = targets.targetInfos.find(target => target.type === 'page' && target.url.startsWith('http://127.0.0.1:5183/'));
  if (!page) throw new Error('The isolated archive review page is not open.');
  const { sessionId } = await send('Target.attachToTarget', {targetId:page.targetId, flatten:true});
  const mobile = process.argv[2] !== 'desktop';
  await send('Emulation.setDeviceMetricsOverride', {width:mobile ? 390 : 1920,height:mobile ? 844 : 1080,deviceScaleFactor:1,mobile}, sessionId);
  console.log(mobile ? 'Review viewport: 390 × 844' : 'Review viewport: 1920 × 1080');
  clearTimeout(timeout);
  // Keep the CDP session attached while BrowserAct captures the emulated page.
  await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  await send('Target.detachFromTarget', {sessionId});
} finally { clearTimeout(timeout); socket.close(); }
