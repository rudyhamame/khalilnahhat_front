import CanadianPhoneInput from './CanadianPhoneInput';
import {formatCanadianPhone} from '../lib/canadianPhone';
import {useState} from 'react';
import {apiRequest} from '../lib/api';

// "Personal info" tab of the client dashboard: edits only the signed-in person's own profile (PATCH /auth/profile).
const FIELDS=['firstName','lastName','phoneNumber','preferredContact','phoneContact','company','emailNotifications'];
const PHONE_LABELS={'whatsapp-text':'WhatsApp text','whatsapp-call':'WhatsApp call',sms:'Text message',call:'Phone call'};
import {PHONE_CONTACTS,contactChoices} from '../lib/contactChoices.mjs';
export default function ClientProfile({user,token,onSaved}){
  const [form,setForm]=useState(()=>({firstName:user?.firstName||'',lastName:user?.lastName||'',phoneNumber:formatCanadianPhone(user?.phoneNumber),preferredContact:user?.preferredContact||'email',phoneContact:user?.phoneContact||'',company:user?.company||'',emailNotifications:user?.emailNotifications!==false}));
  const [state,setState]=useState({busy:false,error:'',saved:false});
  const choices=contactChoices({email:user?.email,phone:form.phoneNumber});
  const set=key=>value=>{setForm(current=>({...current,[key]:value}));setState(current=>({...current,saved:false}));};
  const dirty=FIELDS.some(key=>form[key]!==(key==='preferredContact'?user?.preferredContact||'email':key==='phoneContact'?user?.phoneContact||'':key==='emailNotifications'?user?.emailNotifications!==false:key==='phoneNumber'?formatCanadianPhone(user?.phoneNumber):user?.[key]||''));
  const submit=async event=>{
    event.preventDefault();
    if(choices.hasPhone&&!form.phoneContact){setState({busy:false,error:'Choose how we may reach you on your phone: WhatsApp text, WhatsApp call, text message or phone call.',saved:false});return;}
    setState({busy:true,error:'',saved:false});
    // The contact method always matches what exists: email only, phone only, or any of the two when both are entered.
    const preferredContact=choices.enabled.includes(form.preferredContact)?form.preferredContact:choices.only||'email';
    try{const {user:next}=await apiRequest('/auth/profile',{method:'PATCH',token,body:{...form,preferredContact,phoneContact:choices.hasPhone?form.phoneContact:'',phoneNumber:formatCanadianPhone(form.phoneNumber)}});onSaved?.(next);setState({busy:false,error:'',saved:true});}
    catch(error){setState({busy:false,error:error.message,saved:false});}
  };
  return <>
    <header className="cw-heading"><div><h1>Personal info</h1><p>Keep your contact details current so we can reach you about your events.</p></div></header>
    <form className="cw-panel cw-profile" onSubmit={submit}>
      <label>First name<input required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={e=>set('firstName')(e.target.value)}/></label>
      <label>Last name<input maxLength={80} autoComplete="family-name" value={form.lastName} onChange={e=>set('lastName')(e.target.value)}/></label>
      <label>Phone number<CanadianPhoneInput maxLength={30} autoComplete="tel" value={form.phoneNumber} placeholder="+1 (416) 555-0123" onChange={set('phoneNumber')}/></label>
      <label>Preferred contact<select value={form.preferredContact} onChange={e=>set('preferredContact')(e.target.value)}><option value="any" disabled={!choices.enabled.includes('any')}>Any (email or phone)</option><option value="email" disabled={!choices.enabled.includes('email')}>Email only</option><option value="phone" disabled={!choices.enabled.includes('phone')}>Phone only</option></select></label>
      {choices.hasPhone&&<fieldset className="cw-profile-wide cw-phone-contact"><legend>How may we reach you on your phone?</legend>{PHONE_CONTACTS.map(option=><label key={option}><input type="radio" name="phoneContact" required value={option} checked={form.phoneContact===option} onChange={()=>set('phoneContact')(option)}/><span>{PHONE_LABELS[option]}</span></label>)}</fieldset>}
      <label className="cw-profile-wide">Company name <small>(optional)</small><input maxLength={120} autoComplete="organization" value={form.company} onChange={e=>set('company')(e.target.value)}/></label>
      <label className="cw-profile-wide cw-profile-toggle"><span><strong>Receive notifications via email</strong><small>Quote reminders and updates about your events. Account and booking confirmations are always sent.</small></span><input type="checkbox" role="switch" checked={form.emailNotifications} onChange={e=>set('emailNotifications')(e.target.checked)}/></label>
      <p className="cw-profile-email">Signed in as <strong>{user?.email}</strong></p>
      <div className="cw-profile-actions">{state.error&&<p role="alert" className="cw-profile-error">{state.error}</p>}{state.saved&&<p role="status">Saved.</p>}<button className="primary-button" type="submit" disabled={state.busy||!dirty}>{state.busy?'Saving…':'Save changes'}</button></div>
    </form>
  </>;
}
