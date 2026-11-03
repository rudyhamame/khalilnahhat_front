// Cached assets may skip preparation, but a new page still verifies its session.
export function waitForPreflightSession(target,{signal}={}) {
  return new Promise(resolve=>{
    const finish=ready=>{
      target.removeEventListener('echo:session-ready',check);
      signal?.removeEventListener('abort',abort);
      resolve(ready);
    };
    const check=()=>{if(target.documentElement.dataset.echoSessionReady==='true')finish(true);};
    const abort=()=>finish(false);
    target.addEventListener('echo:session-ready',check);
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)abort();else check();
  });
}
