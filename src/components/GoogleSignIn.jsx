import {useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import {GOOGLE_SIGN_IN_ORIGIN,isLocalSignInOrigin,isGoogleBridgeResponse} from '../lib/googleSignInBridge.mjs';

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

export default function GoogleSignIn({ar,onSignIn,disabled=false,challenge,compact=false}){
  const container=useRef(null),handler=useRef(onSignIn),blocked=useRef(disabled);
  const bridgeConfig=useRef(null),pending=useRef(null);
  const [status,setStatus]=useState('loading'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const bridgeRequired=typeof window!=='undefined'&&window.location.hostname!=='localhost'&&isLocalSignInOrigin(window.location.origin);
  handler.current=onSignIn;blocked.current=disabled;
  useEffect(()=>{
    let alive=true,submitting=false,resize;
    setStatus('loading');setError('');
    bridgeConfig.current=null;
    const receive=async event=>{
      if(!alive||submitting||blocked.current||!isGoogleBridgeResponse(event,pending.current))return;
      const {credential,nonce}=event.data;
      pending.current.popup.close();pending.current=null;
      submitting=true;setStatus('busy');setError('');
      try{await handler.current({credential,nonce});}
      catch(failure){if(alive){setError(failure.message||(ar?'تعذر تسجيل الدخول عبر Google.':'Google sign-in failed.'));setStatus('failed');}}
      finally{submitting=false;}
    };
    if(bridgeRequired)window.addEventListener('message',receive);
    const closed=bridgeRequired?setInterval(()=>{
      if(pending.current?.popup.closed){pending.current=null;if(alive&&!submitting)setStatus('ready');}
    },500):null;
    apiRequest('/auth/google/config').then(async config=>{
      if(!alive)return;
      if(!config.configured){setStatus('unavailable');return;}
      if(bridgeRequired){bridgeConfig.current=config;setStatus('ready');return;}
      if(challenge){
        if(config.clientId!==challenge.clientId)throw new Error('Google sign-in configuration does not match.');
        config={...config,nonce:challenge.nonce};
      }
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
    return()=>{alive=false;resize?.disconnect();clearInterval(closed);window.removeEventListener('message',receive);pending.current?.popup.close();pending.current=null;};
  },[ar,attempt,bridgeRequired,challenge]);
  const openBridge=()=>{
    const config=bridgeConfig.current;if(!config||disabled)return;
    const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
    const url=new URL('/google-signin.html',GOOGLE_SIGN_IN_ORIGIN);
    url.hash=new URLSearchParams({origin:window.location.origin,state,nonce:config.nonce,clientId:config.clientId,lang:ar?'ar':'en'}).toString();
    const popup=window.open(url.href,`echo-google-${state}`,'popup,width=500,height=650');
    if(!popup){setError(ar?'اسمح بالنوافذ المنبثقة لتسجيل الدخول عبر Google.':'Allow pop-ups to continue with Google.');return;}
    pending.current?.popup.close();pending.current={popup,state,nonce:config.nonce};setError('');setStatus('busy');
  };
  return <div className={compact?"access-google access-google--compact":"access-google"}>
    <div className="access-google-card">
    {!compact&&<div className="access-google-heading"><span>{ar?'الدخول السريع':'QUICK ACCESS'}</span><strong>{ar?'باستخدام حساب Google':'Use your Google account'}</strong><p>{ar?'سجّل الدخول أو أنشئ حساب إيكو بخطوة واحدة.':'Sign in or create your Echo account in one step.'}</p></div>}
    <div ref={container} hidden={bridgeRequired||status!=='ready'||disabled}/>
    {bridgeRequired&&status==='ready'&&<button type="button" className="google-bridge-button" disabled={disabled} onClick={openBridge}><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg><span>{ar?'المتابعة باستخدام Google':'Continue with Google'}</span></button>}
    {status==='loading'&&<p role="status">{ar?'جارٍ تحميل تسجيل الدخول عبر Google…':'Loading Google sign-in…'}</p>}
    {status==='busy'&&<p role="status">{ar?'جارٍ تسجيل الدخول…':'Signing you in…'}</p>}
    {status==='unavailable'&&<p>{ar?'تسجيل الدخول عبر Google غير متاح حالياً.':'Google sign-in is not available yet.'}</p>}
    {error&&<p className="access-error" role="alert">{error}</p>}
    {status==='failed'&&<button type="button" className="access-text-link" disabled={disabled} onClick={()=>setAttempt(value=>value+1)}>{ar?'إعادة محاولة Google':'Retry Google sign-in'}</button>}
    </div>
    <p className="access-google-divider">{ar?'أو تابع بالبريد الإلكتروني':'or continue with email'}</p>
  </div>;
}
