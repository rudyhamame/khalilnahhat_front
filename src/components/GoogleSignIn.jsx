import {useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';

let googleScript;
function loadGoogle(){
  if(window.google?.accounts?.id)return Promise.resolve(window.google.accounts.id);
  if(!googleScript)googleScript=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
    script.onload=()=>window.google?.accounts?.id?resolve(window.google.accounts.id):reject(new Error('Google sign-in could not load.'));
    script.onerror=()=>{script.remove();googleScript=null;reject(new Error('Google sign-in could not load.'));};
    document.head.appendChild(script);
  });
  return googleScript;
}

export default function GoogleSignIn({ar,onSignIn,disabled=false}){
  const container=useRef(null),handler=useRef(onSignIn),blocked=useRef(disabled);
  const [status,setStatus]=useState('loading'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const localOriginAlias = window.location.hostname === '127.0.0.1';
  handler.current=onSignIn;blocked.current=disabled;
  useEffect(()=>{
    if (localOriginAlias) return;
    let alive=true,submitting=false,resize;
    setStatus('loading');setError('');
    apiRequest('/auth/google/config').then(async config=>{
      if(!alive)return;
      if(!config.configured){setStatus('unavailable');return;}
      const google=await loadGoogle();
      if(!alive)return;
      google.initialize({client_id:config.clientId,nonce:config.nonce,auto_select:false,callback:async result=>{
        if(!alive||submitting||blocked.current)return;
        submitting=true;setStatus('busy');setError('');
        try{await handler.current({credential:result.credential,nonce:config.nonce});}
        catch(failure){if(alive){setError(failure.message||(ar?'تعذر تسجيل الدخول عبر Google.':'Google sign-in failed.'));setStatus('failed');}}
        finally{submitting=false;}
      }});
      let renderedWidth=0;
      const render=()=>{
        if(!alive||!container.current)return;
        const available=container.current.clientWidth;
        if(!available)return;
        const width=Math.max(200,Math.min(400,available));
        if(width===renderedWidth)return;
        renderedWidth=width;container.current.replaceChildren();
        google.renderButton(container.current,{type:'standard',theme:'filled_black',size:'large',text:'continue_with',shape:'pill',locale:ar?'ar':'en',width});
      };
      resize=new ResizeObserver(render);resize.observe(container.current);render();
      setStatus('ready');
    }).catch(()=>{if(alive){setStatus('failed');setError(ar?'تعذر تحميل تسجيل الدخول عبر Google.':'Could not load Google sign-in.');}});
    return()=>{alive=false;resize?.disconnect();};
  },[ar,attempt]);
  if (localOriginAlias) {
    const localUrl = new URL(window.location.href);
    localUrl.hostname = 'localhost';
    return <div className="access-google"><p>{ar ? 'استخدم localhost لتسجيل الدخول عبر Google أثناء المعاينة.' : 'Use localhost for Google sign-in during local preview.'}</p><a className="access-text-link" href={localUrl.href}>{ar ? 'افتح تسجيل الدخول على localhost' : 'Open sign-in on localhost'}</a></div>;
  }
  return <div className="access-google">
    <div className="access-google-card">
    <div className="access-google-heading"><span>{ar?'الدخول السريع':'QUICK ACCESS'}</span><strong>{ar?'باستخدام حساب Google':'Use your Google account'}</strong><p>{ar?'سجّل الدخول أو أنشئ حساب إيكو بخطوة واحدة.':'Sign in or create your Echo account in one step.'}</p></div>
    <div ref={container} hidden={status!=='ready'||disabled}/>
    {status==='loading'&&<p role="status">{ar?'جارٍ تحميل تسجيل الدخول عبر Google…':'Loading Google sign-in…'}</p>}
    {status==='busy'&&<p role="status">{ar?'جارٍ تسجيل الدخول…':'Signing you in…'}</p>}
    {status==='unavailable'&&<p>{ar?'تسجيل الدخول عبر Google غير متاح حالياً.':'Google sign-in is not available yet.'}</p>}
    {error&&<p className="access-error" role="alert">{error}</p>}
    {status==='failed'&&<button type="button" className="access-text-link" disabled={disabled} onClick={()=>setAttempt(value=>value+1)}>{ar?'إعادة محاولة Google':'Retry Google sign-in'}</button>}
    </div>
    <p className="access-google-divider">{ar?'أو تابع بالبريد الإلكتروني':'or continue with email'}</p>
  </div>;
}
