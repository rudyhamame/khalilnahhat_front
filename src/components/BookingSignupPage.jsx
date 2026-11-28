import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Eye,EyeOff,LoaderCircle,LockKeyhole,Mail,MailCheck,UserRound} from 'lucide-react';
import EchoShell from '../echo/EchoShell';
import {useAccessViewport} from '../lib/useAccessViewport';
import {usePageMeta} from '../echo/meta';
import {apiRequest} from '../lib/api';
import {normalizeEventOrder,customerNameParts} from '../lib/eventOrderCore.mjs';
import './loginPage.css';
import './bookingSignupPage.css';

const DRAFT_KEY='echo-event-order:v1:guest',RETURN_KEY='khalil-auth-return',SEND_PATH='/echo-ai?send=1';
const PENDING_KEY='echo-booking-signup:v1',CODE_MINUTES=10;
// The code step survives a reload: the email, when the code was sent and when it can be sent again are kept in this browser until it is confirmed or expires.
const readPending=email=>{try{const saved=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');return saved&&saved.email===email&&Date.now()<saved.sentAt+CODE_MINUTES*60000?saved:null;}catch{return null;}};
const writePending=value=>{try{if(value)localStorage.setItem(PENDING_KEY,JSON.stringify(value));else localStorage.removeItem(PENDING_KEY);}catch{/* Optional storage. */}};
const readCustomer=()=>{try{return normalizeEventOrder(JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')||{}).customer||{};}catch{return {};}};

// The login page's special form for a visitor who pressed "Submit booking": create the account from the Personal info already in the draft,
// confirm the email with a code, then land back on the booking where it can be sent.
// The card's height follows its content (step, error, fields); this slides it from the old height to the new one instead of jumping.
function useAnimatedHeight(){
 const ref=useRef(null),last=useRef(0);
 useLayoutEffect(()=>{ // runs after every render of the page
  const el=ref.current;if(!el)return;
  el.style.height='';const next=el.offsetHeight,prev=last.current;last.current=next;
  if(!prev||prev===next||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  el.style.height=prev+'px';el.style.overflow='hidden';void el.offsetHeight;
  el.style.transition='height .35s cubic-bezier(.2,.8,.2,1)';el.style.height=next+'px';
  const done=()=>{el.style.height='';el.style.overflow='';el.style.transition='';};
  el.addEventListener('transitionend',done,{once:true});setTimeout(done,450);
 });
 return ref;
}
export default function BookingSignupPage({lang,onVerified}){
 const wrap=useAnimatedHeight();
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
 useAccessViewport();
 usePageMeta(tr('Create your account to send your booking | DJ Khalil × Echo','أنشئ حسابك لإرسال حجزك | دي جي خليل × إيكو'),tr('Create your account and confirm your email to send your booking to DJ Khalil and Echo.','أنشئ حسابك وأكّد بريدك الإلكتروني لإرسال حجزك إلى دي جي خليل وإيكو.'));
 const [customer]=useState(readCustomer),email=(customer.email||'').trim(),nameParts=customerNameParts(customer),firstName=(nameParts.firstName||'').trim(),lastName=(nameParts.lastName||'').trim();
 const [pending]=useState(()=>readPending(email));
 const [sending,setSending]=useState(false),[notice,setNotice]=useState('');
 const [sentAt,setSentAt]=useState(pending?.sentAt||0);// when the server last really sent a code; the details wait on the server only 10 minutes after that// after the code is confirmed the page becomes a full-screen "Sending your booking…" until the booking is sent
 const [step,setStep]=useState(pending?'code':'account'),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[show,setShow]=useState(false),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[wait,setWait]=useState(pending?Math.max(0,Math.ceil((pending.resendAt-Date.now())/1000)):0),[exists,setExists]=useState(false);
 useEffect(()=>{if(wait<=0)return undefined;const timer=setTimeout(()=>setWait(value=>value-1),1000);return()=>clearTimeout(timer);},[wait]);
 const ready=Boolean(email&&firstName&&lastName),mismatch=confirm.length>0&&password!==confirm;
 const fail=problem=>{if(problem.status===409||problem.payload?.code==='ACCOUNT_EXISTS')setExists(true);setError(problem.message||tr('Something went wrong. Try again.','حدث خطأ. حاول مرة أخرى.'));};
 const create=async event=>{event.preventDefault();if(busy||password!==confirm)return;setBusy(true);setError('');setExists(false);
  try{const result=await apiRequest('/booking-signup/start',{method:'POST',body:{firstName,lastName,email,password,phoneNumber:customer.phone||'',company:customer.company||'',...(customer.contactMethod?{preferredContact:customer.contactMethod}:{}),...(customer.phoneContact?{phoneContact:customer.phoneContact}:{})}});const seconds=Number(result?.retryAfter)||60;writePending({email,sentAt:Date.now(),resendAt:Date.now()+seconds*1000});setSentAt(Date.now());setStep('code');setWait(seconds);}catch(problem){fail(problem);}finally{setBusy(false);}};
 const expire=()=>{writePending(null);setSentAt(0);setStep('account');setCode('');setNotice('');setError(tr('Your code expired. Enter your password again and we will send a new one.','انتهت صلاحية الرمز. أدخل كلمة المرور مرة أخرى وسنرسل رمزاً جديداً.'));};
 const resend=async()=>{if(sentAt&&Date.now()>sentAt+CODE_MINUTES*60000){expire();return;}setBusy(true);setError('');setNotice('');try{const result=await apiRequest('/booking-signup/resend',{method:'POST',body:{email}});if(result?.expired){expire();return;}const seconds=Number(result?.retryAfter)||60,really=result?.sent===true;if(really)setSentAt(Date.now());writePending({email,sentAt:really?Date.now():(sentAt||Date.now()),resendAt:Date.now()+seconds*1000});setWait(seconds);setCode('');setNotice(result?.sent===false?tr(`A code was sent a moment ago. You can ask for another in ${seconds}s.`,`أُرسل رمز قبل لحظات. يمكنك طلب رمز آخر خلال ${seconds} ث.`):tr(`We asked for a new code for ${email}. Check your inbox and spam folder. If nothing arrives within a minute, your sign-up may have expired: go back and start again.`,`طلبنا رمزاً جديداً لـ ${email}. تحقق من البريد الوارد والمزعج. إن لم يصل خلال دقيقة فقد تكون صلاحية التسجيل انتهت: ارجع وابدأ من جديد.`));}catch(problem){fail(problem);}finally{setBusy(false);}};
 const verify=async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{const result=await apiRequest('/booking-signup/verify',{method:'POST',body:{email,code:code.trim()}});writePending(null);onVerified?.(result);setSending(true);window.location.assign(SEND_PATH);}catch(problem){fail(problem);setBusy(false);}};
 const steps=[tr('Create account','إنشاء الحساب'),tr('Confirm email','تأكيد البريد'),tr('Send booking','إرسال الحجز')];
 const current=step==='account'?0:1;
 return <EchoShell lang={lang}>{sending&&<div className="booking-signup-sending" role="status" aria-live="assertive" dir={ar?'rtl':'ltr'}><LoaderCircle size={44} aria-hidden="true"/><h2>{tr('Sending your booking…','جارٍ إرسال حجزك…')}</h2><p>{tr('Your email is confirmed. Please keep this page open; you will land on your bookings in a moment.','تم تأكيد بريدك. أبقِ هذه الصفحة مفتوحة، وستصل إلى حجوزاتك بعد لحظات.')}</p></div>}<section className="echo-access access-booking" dir={ar?'rtl':'ltr'} aria-labelledby="booking-access-title">
  <div className="access-backdrop" aria-hidden="true"/>
  <img className="access-hero-photo" src="/echo/login-hero-khalil.webp" width="1016" height="1536" alt="" aria-hidden="true" fetchPriority="high"/>
  <div className="access-content"><div className="access-form-wrap" ref={wrap}>
   <ol className="access-steps" aria-label={tr('Steps to send your booking','خطوات إرسال حجزك')}>{steps.map((label,index)=><li key={label} aria-current={index===current?'step':undefined} data-done={index<current?'':undefined}><b>{index+1}</b>{label}</li>)}</ol>
   <h1 id="booking-access-title">{step==='account'?<>{tr('Almost','أوشكنا')} <em>{tr('there.','على الانتهاء.')}</em></>:<>{tr('Check your','تحقق من')} <em>{tr('email.','بريدك.')}</em></>}</h1>
   {!ready?<>
    <p className="access-intro">{tr('Add your first and last name and your email in Personal info on the booking page first. Your details are saved there.','أضف اسمك الأول واسم العائلة وبريدك الإلكتروني في المعلومات الشخصية بصفحة الحجز أولاً. تفاصيلك محفوظة هناك.')}</p>
    <a className="access-submit" href="/echo-ai"><span>{tr('Back to your booking','العودة إلى حجزك')}</span><ArrowLeft size={18} aria-hidden="true"/></a>
   </>:step==='account'?<>
    <p className="access-intro">{tr('Your booking is saved. Create your account to send it: choose a password, then confirm your email with a code.','حجزك محفوظ. أنشئ حسابك لإرساله: اختر كلمة مرور ثم أكّد بريدك الإلكتروني برمز.')}</p>
    <dl className="access-summary"><div><dt><UserRound size={15} aria-hidden="true"/>{tr('Name','الاسم')}</dt><dd>{firstName} {lastName}</dd></div><div><dt><Mail size={15} aria-hidden="true"/>{tr('Email','البريد')}</dt><dd>{email}</dd></div></dl>
    <form className="access-form" onSubmit={create} aria-busy={busy}>
     {error&&<p className="access-error" role="alert">{error}</p>}
     <fieldset className="access-fields" disabled={busy}><legend className="access-sr-only">{tr('Choose a password','اختر كلمة مرور')}</legend>
      <label className="access-field" htmlFor="booking-access-password"><span>{tr('Password (8 characters or more)','كلمة المرور (8 أحرف أو أكثر)')}</span><span className="access-input"><LockKeyhole size={18} aria-hidden="true"/><input id="booking-access-password" type={show?'text':'password'} autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)}/><button type="button" className="access-password-toggle" aria-label={show?tr('Hide password','إخفاء كلمة المرور'):tr('Show password','إظهار كلمة المرور')} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button></span></label>
      <label className="access-field" htmlFor="booking-access-confirm"><span>{tr('Confirm password','تأكيد كلمة المرور')}</span><span className="access-input"><LockKeyhole size={18} aria-hidden="true"/><input id="booking-access-confirm" type={show?'text':'password'} autoComplete="new-password" minLength={8} maxLength={128} required aria-invalid={mismatch||undefined} aria-describedby={mismatch?'booking-access-mismatch':undefined} value={confirm} onChange={event=>setConfirm(event.target.value)}/></span></label>
      {mismatch&&<p className="access-error" id="booking-access-mismatch" role="alert">{tr('The two passwords do not match.','كلمتا المرور غير متطابقتين.')}</p>}
     </fieldset>
     <button className="access-submit" type="submit" disabled={busy||password.length<8||password!==confirm}><span>{busy?tr('One moment…','لحظة واحدة…'):tr('Create my account','أنشئ حسابي')}</span><ArrowRight size={18} aria-hidden="true"/></button>
    </form>
    <div className="access-footnote"><a href="/echo-ai"><ArrowLeft size={16} aria-hidden="true"/>{tr('Back to your booking','العودة إلى حجزك')}</a></div>
   </>:<>
    <div className="access-verify" role="status"><MailCheck size={34} aria-hidden="true"/><strong>{tr('We sent you a code','أرسلنا إليك رمزاً')}</strong><p>{tr(`Enter the 6-digit code sent to ${email}. It works for 10 minutes.`,`أدخل الرمز المكوّن من 6 أرقام المُرسل إلى ${email}. صالح لمدة 10 دقائق.`)}</p></div>
    <form className="access-form" onSubmit={verify} aria-busy={busy}>
     {error&&<p className="access-error" role="alert">{error}</p>}
     {notice&&!error&&<p className="access-notice" role="status">{notice}</p>}
     <fieldset className="access-fields" disabled={busy}><legend className="access-sr-only">{tr('Verification code','رمز التحقق')}</legend>
      <label className="access-field" htmlFor="booking-access-code"><span>{tr('Verification code','رمز التحقق')}</span><span className="access-input"><MailCheck size={18} aria-hidden="true"/><input id="booking-access-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/></span></label>
     </fieldset>
     <button className="access-submit" type="submit" disabled={busy||code.length!==6}><span>{busy?tr('Checking…','جارٍ التحقق…'):tr('Confirm and continue','أكّد وتابع')}</span><ArrowRight size={18} aria-hidden="true"/></button>
     <button type="button" className="access-submit access-back" onClick={()=>window.location.assign('/echo-ai')}><ArrowLeft size={18} aria-hidden="true"/><span>{tr('Back to Booking','العودة إلى الحجز')}</span></button>
     <button type="button" className="access-text-link" disabled={busy||wait>0} onClick={resend}>{wait>0?tr(`Send a new code in ${wait}s`,`إرسال رمز جديد خلال ${wait} ث`):tr('Send a new code','إرسال رمز جديد')}</button>
    </form>
   </>}
   {exists&&<p className="access-footnote"><a href="/login" onClick={()=>{try{localStorage.setItem(RETURN_KEY,SEND_PATH);}catch{/* Optional return path. */}}}>{tr('You already have an account. Sign in','لديك حساب بالفعل. سجّل الدخول')}</a></p>}
   <div className="access-reassurance"><LockKeyhole size={13} aria-hidden="true"/><span>{tr('Nothing is sent until you confirm your email.','لا يُرسل شيء قبل تأكيد بريدك الإلكتروني.')}</span></div>
  </div></div>
 </section></EchoShell>;
}
