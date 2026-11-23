import {bookingText} from '../lib/bookingUiText';
import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';

export default function AccountEmailEditor({user,token,onSaved,onBusyChange,disabled=false,ar=false}){
 const tr=text=>bookingText(text,ar);
 const [email,setEmail]=useState(user?.email||''),[pending,setPending]=useState(''),[code,setCode]=useState(''),[wait,setWait]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{setEmail(user?.email||'');setPending('');setCode('');},[user?.email]);
 useEffect(()=>{if(wait<=0)return;const timer=setTimeout(()=>setWait(value=>value-1),1000);return()=>clearTimeout(timer);},[wait]);
 const working=value=>{setBusy(value);onBusyChange?.(value);};
 const start=async()=>{
  if(busy||disabled)return;working(true);setError('');setSaved(false);
  try{const result=await apiRequest('/auth/profile/email/start',{method:'POST',token,body:{email:email.trim().toLowerCase()}});setPending(result.email);setCode('');setWait(result.retryAfter||60);}
  catch(problem){setError(problem.message||tr("The verification email could not be sent."));}
  finally{working(false);}
 };
 const verify=async()=>{
  if(busy||disabled)return;working(true);setError('');
  try{const {user:next}=await apiRequest('/auth/profile/email/verify',{method:'POST',token,body:{email:pending,code:code.trim()}});onSaved?.(next);setEmail(next.email);setPending('');setCode('');setSaved(true);}
  catch(problem){setError(problem.message||tr("The email address could not be verified."));}
  finally{working(false);}
 };
 return <form className="cw-email-editor" onSubmit={event=>{event.preventDefault();void(pending?verify():start());}}>
  <label>{tr("Email address *")}<input type="email" required maxLength={254} autoComplete="email" value={email} disabled={busy||disabled||!!pending} onChange={event=>{setEmail(event.target.value);setSaved(false);setError('');}}/></label>
  <p>{tr("Your current email stays active until you verify the new address.")}</p>
  {pending&&<><p role="status">{ar?'أدخل الرمز المكوّن من 6 أرقام المُرسل إلى':'Enter the 6-digit code sent to'} <strong>{pending}</strong>.</p><label>{tr("Verification code *")}<input value={code} required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" disabled={busy||disabled} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/></label></>}
  {error&&<p className="cw-profile-error" role="alert">{error}</p>}{saved&&<p role="status">{tr("Email address updated.")}</p>}
  <div className="cw-email-actions"><button type="submit" className="primary-button" disabled={busy||disabled||(pending?code.length!==6:email.trim().toLowerCase()===(user?.email||'').toLowerCase())}>{busy?tr("Please wait…"):pending?tr("Verify & update email"):tr("Verify new email")}</button>{pending&&<><button type="button" disabled={busy||disabled||wait>0} onClick={start}>{wait>0?ar?`إعادة الإرسال بعد ${wait} ث`:`Resend in ${wait}s`:tr("Resend code")}</button><button type="button" disabled={busy||disabled} onClick={()=>{setPending('');setCode('');setError('');}}>{tr("Cancel")}</button></>}</div>
 </form>;
}
