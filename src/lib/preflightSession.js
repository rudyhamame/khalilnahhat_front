// A mounted page verifies bootstrap completion before preflight can reveal it.
export function waitForPreflightSession(target,{signal}={}) {
  return new Promise(resolve=>{
    const finish=ready=>{
      target.removeEventListener('echo:session-ready',check);
      signal?.removeEventListener('abort',abort);
      resolve(ready);
    };
    const check=()=>{if(target.documentElement.dataset.echoSessionReady==='true')finish(target.documentElement.dataset.echoSessionFailed!=='true');};
    const abort=()=>finish(false);
    target.addEventListener('echo:session-ready',check);
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)abort();else check();
  });
}
