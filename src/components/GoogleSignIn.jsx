import {useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import {createGoogleButtonClient} from '../lib/googleButtonClient.mjs';
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

const googleButtonClient=import.meta.hot?.data.googleButtonClient||createGoogleButtonClient({loadConfig:()=>apiRequest('/auth/google/config'),loadGoogle});
if(import.meta.hot)import.meta.hot.dispose(data=>{data.googleButtonClient=googleButtonClient;});

export default function GoogleSignIn({ar,onSignIn,disabled=false,challenge,compact=false}){
  const handler=useRef(onSignIn),blocked=useRef(disabled);
  const bridgeConfig=useRef(null),pending=useRef(null),googleIdentity=useRef(null),buttonHost=useRef(null),buttonState=useRef(null);
  const [status,setStatus]=useState('loading'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[buttonVersion,setButtonVersion]=useState(0);
  const bridgeRequired=typeof window!=='undefined'&&window.location.hostname!=='localhost'&&isLocalSignInOrigin(window.location.origin);
  handler.current=onSignIn;blocked.current=disabled;
  useEffect(()=>{
    let alive=true,submitting=false,unsubscribe=()=>{},expires;
    setStatus('loading');setError('');
    bridgeConfig.current=null;googleIdentity.current=null;
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
    const prepare=async()=>{
      if(bridgeRequired){
        const config=await apiRequest('/auth/google/config');
        if(!alive)return;
        if(!config.configured){setStatus('unavailable');return;}
        bridgeConfig.current=config;setStatus('ready');return;
      }
      const session=await googleButtonClient.prepare(challenge);
      if(!alive)return;
      if(!session){setStatus('unavailable');return;}
      const subscription=googleButtonClient.subscribe(async payload=>{
        if(!alive||submitting||blocked.current)return;
        submitting=true;setStatus('busy');setError('');clearTimeout(expires);
        try{await handler.current(payload);}
        catch(failure){if(alive){setError(failure.message||(ar?'تعذر تسجيل الدخول عبر Google.':'Google sign-in failed.'));setStatus('failed');}}
        finally{submitting=false;}
      },()=>alive&&!submitting&&!blocked.current);
      unsubscribe=subscription.unsubscribe;buttonState.current=subscription.state;
      googleIdentity.current=session.google;setButtonVersion(value=>value+1);
      expires=setTimeout(()=>{if(alive&&!submitting){setError(ar?'انتهت مهلة تسجيل الدخول. أعد تحميل الصفحة للمحاولة مجدداً.':'Google sign-in expired. Reload this page to try again.');setStatus('failed');}},Math.max(0,session.expiresAt-Date.now()));
      setStatus('ready');
    };
    prepare().catch(failure=>{if(alive){setStatus('failed');setError(ar?'تعذر تحميل تسجيل الدخول عبر Google. أعد تحميل الصفحة.':failure.message||'Could not load Google sign-in.');}});
    return()=>{alive=false;unsubscribe();clearTimeout(expires);googleIdentity.current=null;buttonState.current=null;clearInterval(closed);window.removeEventListener('message',receive);pending.current?.popup.close();pending.current=null;};
  },[ar,attempt,bridgeRequired,challenge?.clientId,challenge?.nonce]);

  const openBridge=()=>{
    const config=bridgeConfig.current;if(!config||disabled)return;
    const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
    const url=new URL('/google-signin.html',GOOGLE_SIGN_IN_ORIGIN);
    url.hash=new URLSearchParams({origin:window.location.origin,state,nonce:config.nonce,clientId:config.clientId,lang:ar?'ar':'en'}).toString();
    const popup=window.open(url.href,`echo-google-${state}`,'popup,width=500,height=650');
    if(!popup){setError(ar?'اسمح بالنوافذ المنبثقة لتسجيل الدخول عبر Google.':'Allow pop-ups to continue with Google.');return;}
    pending.current?.popup.close();pending.current={popup,state,nonce:config.nonce};setError('');setStatus('busy');
  };
  // A Google-rendered button uses the explicit sign-in flow without relying on
  // One Tap availability or its deprecated prompt status notifications.
  useEffect(()=>{
    if(bridgeRequired||status!=='ready'||!buttonHost.current||!googleIdentity.current)return;
    const element=buttonHost.current,google=googleIdentity.current;
    let width=0;
    const render=()=>{
      const next=Math.min(400,Math.max(200,Math.floor(element.clientWidth||400)));
      if(next===width)return;
      width=next;element.replaceChildren();
      google.renderButton(element,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'pill',locale:ar?'ar':'en',width:next,state:buttonState.current});
    };
    render();
    const observer=new ResizeObserver(render);observer.observe(element);
    return()=>{observer.disconnect();element.replaceChildren();};
  },[ar,bridgeRequired,status,buttonVersion]);
  return <div className={compact?"access-google access-google--compact":"access-google"}>
    <div className="access-google-card">
    {!compact&&<div className="access-google-heading"><strong>{ar?'الدخول عبر Gmail':'Login with Gmail'}</strong></div>}
    <div className="access-google-slot">
    <div ref={buttonHost} className="access-google-button" hidden={bridgeRequired||status!=='ready'} inert={disabled||status!=='ready'} aria-busy={status==='busy'}/>
    {bridgeRequired&&status==='ready'&&<button type="button" className="google-bridge-button" disabled={disabled} onClick={openBridge}><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg><span>{ar?'المتابعة باستخدام Google':'Continue with Google'}</span></button>}
    {(status==='loading'||status==='busy')&&<div className="access-google-skeleton" role="status">{status==='busy'?(ar?'جارٍ تسجيل الدخول…':'Signing you in…'):<span className="access-sr-only">{ar?'جارٍ تحميل تسجيل الدخول عبر Google…':'Loading Google sign-in…'}</span>}</div>}
    </div>
    {status==='unavailable'&&<p>{ar?'تسجيل الدخول عبر Google غير متاح حالياً.':'Google sign-in is not available yet.'}</p>}
    {error&&<p className="access-error" role="alert">{error}</p>}
    {status==='failed'&&<button type="button" className="access-text-link" disabled={disabled} onClick={()=>bridgeRequired?setAttempt(value=>value+1):window.location.reload()}>{ar?'إعادة محاولة Google':'Retry Google sign-in'}</button>}
    </div>
    <p className="access-google-divider">{ar?'أو تابع بالبريد الإلكتروني':'or continue with email'}</p>
  </div>;
}
