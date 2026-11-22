import {customerNameParts} from '../lib/eventOrderCore.mjs';
import {useEffect,useState} from 'react';
import {Eye,EyeOff,MailCheck,UserPlus} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {useEventOrder} from './eventOrderContext';

// Sending a booking needs an account, and a visitor who is not signed in creates it on purpose, in three steps:
// 1. create the account (name and email from Personal info, plus a password they choose), 2. confirm the email with a 6-digit code
// (that signs them in and their draft moves into the account), 3. send the booking.
export default function BookingSignup({ar=false,auth}){
 const ctx=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
 const customer=ctx?.order.customer||{},email=(customer.email||'').trim(),nameParts=customerNameParts(customer);
 const firstName=(nameParts.firstName||'').trim(),lastName=(nameParts.lastName||'').trim();
 const [step,setStep]=useState('account'),[password,setPassword]=useState(''),[show,setShow]=useState(false),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[wait,setWait]=useState(0),[exists,setExists]=useState(false);
 useEffect(()=>{if(wait<=0)return undefined;const timer=setTimeout(()=>setWait(value=>value-1),1000);return()=>clearTimeout(timer);},[wait]);
 const onVerified=auth?.onGuestVerified||ctx?.auth?.onGuestVerified;
 const steps=[tr('Create account','إنشاء الحساب'),tr('Confirm email','تأكيد البريد'),tr('Send booking','إرسال الحجز')];
 const header=<><ol className="bs-steps" aria-label={tr('Steps to send your booking','خطوات إرسال حجزك')}>{steps.map((label,index)=><li key={label} aria-current={index===(step==='account'?0:1)?'step':undefined}><b>{index+1}</b>{label}</li>)}</ol></>;
 if(!email||!firstName||!lastName)return <div className="guest-verify" role="status"><UserPlus size={20} aria-hidden="true"/><h2>{tr('Create your account to send your booking','أنشئ حسابك لإرسال حجزك')}</h2><p>{tr('Add your first and last name and your email in Personal info on the Booking page first. Then you create your account, confirm your email with a code, and send your booking.','أضف اسمك الأول واسم العائلة وبريدك الإلكتروني في المعلومات الشخصية بصفحة الحجز أولاً. بعدها تنشئ حسابك وتؤكد بريدك برمز ثم ترسل حجزك.')}</p><a className="echo-btn" href="/booking">{tr('Go to Personal info','الانتقال إلى المعلومات الشخصية')}</a></div>;
 const fail=problem=>{if(problem.status===409||problem.payload?.code==='ACCOUNT_EXISTS')setExists(true);setError(problem.message||tr('Something went wrong. Try again.','حدث خطأ. حاول مرة أخرى.'));};
 const create=async event=>{event.preventDefault();setBusy(true);setError('');setExists(false);try{const result=await apiRequest('/booking-signup/start',{method:'POST',body:{firstName,lastName,email,password,phoneNumber:customer.phone||'',company:customer.company||'',...(customer.contactMethod?{preferredContact:customer.contactMethod}:{}),...(customer.phoneContact?{phoneContact:customer.phoneContact}:{})}});setStep('code');setWait(Math.max(30,result?.retryAfter||60));}catch(problem){fail(problem);}finally{setBusy(false);}};
 const resend=async()=>{setBusy(true);setError('');try{await apiRequest('/booking-signup/resend',{method:'POST',body:{email}});setWait(60);}catch(problem){fail(problem);}finally{setBusy(false);}};
 const verify=async event=>{event.preventDefault();setBusy(true);setError('');try{onVerified?.(await apiRequest('/booking-signup/verify',{method:'POST',body:{email,code:code.trim()}}));}catch(problem){fail(problem);}finally{setBusy(false);}};
 return <div className="guest-verify">{header}
  {step==='account'?<>
   <h2>{tr('Create your account to send your booking','أنشئ حسابك لإرسال حجزك')}</h2>
   <p>{tr(`This creates your account for ${email} (${firstName} ${lastName}). Choose a password, then we email you a code to confirm your email address before your booking is sent.`,`ينشئ هذا حسابك لـ ${email} (${firstName} ${lastName}). اختر كلمة مرور، ثم نرسل لك رمزاً لتأكيد بريدك قبل إرسال حجزك.`)}</p>
   <form onSubmit={create}><label><span>{tr('Choose a password (8 characters or more)','اختر كلمة مرور (8 أحرف أو أكثر)')}</span><span className="guest-password"><input type={show?'text':'password'} value={password} onChange={event=>setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required/><button type="button" aria-label={show?tr('Hide password','إخفاء كلمة المرور'):tr('Show password','إظهار كلمة المرور')} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></span></label>
    <button type="submit" className="echo-btn" disabled={busy||password.length<8}>{busy?tr('Creating…','جارٍ الإنشاء…'):tr('Create my account','أنشئ حسابي')}</button></form></>
  :<>
   <h2><MailCheck size={18} aria-hidden="true"/> {tr('Confirm your email','أكّد بريدك الإلكتروني')}</h2>
   <p>{tr(`Your account is created. We sent a 6-digit code to ${email}; it works for 10 minutes. Enter it to confirm your email, then you can send your booking.`,`تم إنشاء حسابك. أرسلنا رمزاً من 6 أرقام إلى ${email}؛ صالح لمدة 10 دقائق. أدخله لتأكيد بريدك ثم أرسل حجزك.`)}</p>
   <form onSubmit={verify}><label><span>{tr('Verification code','رمز التحقق')}</span><input value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" aria-label={tr('6-digit code','رمز من 6 أرقام')} autoFocus/></label>
    <button type="submit" className="echo-btn" disabled={busy||code.length!==6}>{busy?tr('Checking…','جارٍ التحقق…'):tr('Confirm and continue','أكّد وتابع')}</button>
    <button type="button" className="echo-link" disabled={busy||wait>0} onClick={resend}>{wait>0?tr(`Send a new code in ${wait}s`,`إرسال رمز جديد خلال ${wait} ث`):tr('Send a new code','إرسال رمز جديد')}</button></form></>}
  {error&&<p role="alert" className="guest-verify-error">{error}</p>}
  {exists&&<p><a href="/login" onClick={()=>{try{localStorage.setItem('khalil-auth-return','/#event-order');}catch{/* Optional return path. */}}}>{tr('Sign in to your account','سجّل الدخول إلى حسابك')}</a></p>}
 </div>;
}
