import {useEffect,useState} from 'react';
import {Mail,ShieldCheck} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {useEventOrder} from './eventOrderContext';

// A guest has no account yet. Before the booking is sent they confirm their email with a 6-digit code; that creates a passwordless
// account for them (their draft moves into it), so the booking is owned and private like any other client's.
export default function GuestVerify({ar=false,auth}){
 const ctx=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
 const customer=ctx?.order.customer||{},email=(customer.email||'').trim(),fullName=(customer.fullName||'').trim();
 const [step,setStep]=useState('ask'),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[wait,setWait]=useState(0),[exists,setExists]=useState(false);
 useEffect(()=>{if(wait<=0)return undefined;const timer=setTimeout(()=>setWait(value=>value-1),1000);return()=>clearTimeout(timer);},[wait]);
 const onGuestVerified=auth?.onGuestVerified||ctx?.auth?.onGuestVerified;
 if(!email||!fullName)return <div className="guest-verify" role="status"><ShieldCheck size={20} aria-hidden="true"/><h2>{tr('Verify your email to continue','أكّد بريدك الإلكتروني للمتابعة')}</h2><p>{tr('Add your name and email in Personal info on the Booking page first. We will email you a code to confirm it before your booking is sent.','أضف اسمك وبريدك الإلكتروني في المعلومات الشخصية بصفحة الحجز أولاً. سنرسل لك رمزاً لتأكيده قبل إرسال حجزك.')}</p><a className="echo-btn" href="/booking">{tr('Go to Personal info','الانتقال إلى المعلومات الشخصية')}</a></div>;
 const send=async()=>{setBusy(true);setError('');try{const result=await apiRequest('/guest/verify/start',{method:'POST',body:{email}});setStep('code');setWait(Math.max(30,result?.retryAfter||60));}catch(problem){setError(problem.message||tr('Could not send the code.','تعذر إرسال الرمز.'));}finally{setBusy(false);}};
 const confirm=async event=>{event.preventDefault();setBusy(true);setError('');try{const result=await apiRequest('/guest/verify/confirm',{method:'POST',body:{email,code:code.trim(),fullName,phone:customer.phone||'',company:customer.company||''}});onGuestVerified?.(result);}catch(problem){if(problem.payload?.code==='ACCOUNT_EXISTS'||problem.status===409)setExists(true);setError(problem.message||tr('That code did not work.','لم ينجح هذا الرمز.'));}finally{setBusy(false);}};
 return <div className="guest-verify"><Mail size={20} aria-hidden="true"/><h2>{tr('Verify your email to send your booking','أكّد بريدك لإرسال حجزك')}</h2>
  <p>{step==='ask'?tr(`We will email a 6-digit code to ${email}. Enter it here and your booking is saved to your own private space; no password needed.`,`سنرسل رمزاً من 6 أرقام إلى ${email}. أدخله هنا ويُحفظ حجزك في مساحتك الخاصة؛ لا حاجة لكلمة مرور.`):tr(`We sent a code to ${email}. It works for 10 minutes.`,`أرسلنا رمزاً إلى ${email}. صالح لمدة 10 دقائق.`)}</p>
  {step==='ask'?<button type="button" className="echo-btn" disabled={busy} onClick={send}>{busy?tr('Sending…','جارٍ الإرسال…'):tr('Email me a code','أرسل لي رمزاً')}</button>
  :<form onSubmit={confirm}><label><span>{tr('Verification code','رمز التحقق')}</span><input value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" aria-label={tr('6-digit code','رمز من 6 أرقام')} autoFocus/></label>
   <button type="submit" className="echo-btn" disabled={busy||code.length!==6}>{busy?tr('Checking…','جارٍ التحقق…'):tr('Verify and continue','تحقق وتابع')}</button>
   <button type="button" className="echo-link" disabled={busy||wait>0} onClick={send}>{wait>0?tr(`Send a new code in ${wait}s`,`إرسال رمز جديد خلال ${wait} ث`):tr('Send a new code','إرسال رمز جديد')}</button></form>}
  {error&&<p role="alert" className="guest-verify-error">{error}</p>}
  {exists&&<p><a href="/login" onClick={()=>{try{localStorage.setItem('khalil-auth-return','/#event-order');}catch{/* Optional return path. */}}}>{tr('Sign in to your account','سجّل الدخول إلى حسابك')}</a></p>}
 </div>;
}
