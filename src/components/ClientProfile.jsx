import CanadianPhoneInput from './CanadianPhoneInput';
import {formatCanadianPhone} from '../lib/canadianPhone';
import {useState} from 'react';
import {apiRequest} from '../lib/api';
import AvatarEditor from './AvatarEditor';
import {confirmDeletion} from '../lib/confirmDeletion';
import {deleteClientAccount} from '../lib/deleteClientAccount';

// "Personal info" tab of the client dashboard: edits only the signed-in person's own profile (PATCH /auth/profile).
const FIELDS=['firstName','lastName','phoneNumber','preferredContact','phoneContact','company','emailNotifications'];
import {PHONE_CONTACTS,contactChoices} from '../lib/contactChoices.mjs';
import {optionName} from '../lib/eventOrderCore.mjs';
export default function ClientProfile({user,token,onSaved,onDeleted}){
  const [form,setForm]=useState(()=>({firstName:user?.firstName||'',lastName:user?.lastName||'',phoneNumber:formatCanadianPhone(user?.phoneNumber),preferredContact:user?.preferredContact||'email',phoneContact:user?.phoneContact||'',company:user?.company||'',emailNotifications:user?.emailNotifications!==false}));
  const [state,setState]=useState({busy:false,error:'',saved:false});
  const [deletion,setDeletion]=useState({busy:false,error:''});
  const removeAccount=async()=>{
    if(state.busy||deletion.busy)return;
    setDeletion({busy:true,error:''});
    try{
      let storage;try{storage=window.localStorage;}catch{/* Browser storage is optional. */}
      const removed=await deleteClientAccount({user,token,request:apiRequest,confirm:confirmDeletion,storage});
      if(removed){if(onDeleted)await onDeleted();else window.location.replace('/login');return;}
      setDeletion({busy:false,error:''});
    }catch(error){setDeletion({busy:false,error:error.message});}
  };
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
    <AvatarEditor user={user} token={token} onChanged={onSaved}/>
    <form className="cw-panel cw-profile" onSubmit={submit} inert={deletion.busy}>
      <label>First name<input required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={e=>set('firstName')(e.target.value)}/></label>
      <label>Last name<input maxLength={80} autoComplete="family-name" value={form.lastName} onChange={e=>set('lastName')(e.target.value)}/></label>
      <label>Phone number<CanadianPhoneInput maxLength={30} autoComplete="tel" value={form.phoneNumber} placeholder="+1 (416) 555-0123" onChange={set('phoneNumber')}/></label>
      <label>Preferred contact<select value={form.preferredContact} onChange={e=>set('preferredContact')(e.target.value)}>{['any','email','phone'].map(option=><option key={option} value={option} disabled={!choices.enabled.includes(option)}>{optionName('customer.contactMethod',option)}</option>)}</select></label>
      {choices.hasPhone&&<fieldset className="cw-profile-wide cw-phone-contact"><legend>How may we reach you on your phone?</legend>{PHONE_CONTACTS.map(option=><label key={option}><input type="radio" name="phoneContact" required value={option} checked={form.phoneContact===option} onChange={()=>set('phoneContact')(option)}/><span>{optionName('customer.phoneContact',option)}</span></label>)}</fieldset>}
      <label className="cw-profile-wide">Company name <small>(optional)</small><input maxLength={120} autoComplete="organization" value={form.company} onChange={e=>set('company')(e.target.value)}/></label>
      <label className="cw-profile-wide cw-profile-toggle"><span><strong>Receive notifications via email</strong><small>Quote reminders and updates about your events. Account and booking confirmations are always sent.</small></span><input type="checkbox" role="switch" checked={form.emailNotifications} onChange={e=>set('emailNotifications')(e.target.checked)}/></label>
      <p className="cw-profile-email">Signed in as <strong>{user?.email}</strong></p>
      <div className="cw-profile-actions">{state.error&&<p role="alert" className="cw-profile-error">{state.error}</p>}{state.saved&&<p role="status">Saved.</p>}<button className="primary-button" type="submit" disabled={state.busy||!dirty}>{state.busy?'Saving…':'Save changes'}</button></div>
    </form>
    {!user?.isAdmin&&<section className="cw-panel cw-account-delete" aria-labelledby="delete-account-title">
      <div><h2 id="delete-account-title">Delete account</h2><p>Permanently delete your profile, saved drafts and Echo conversations. Submitted bookings remain with the Echo team and are not cancelled.</p></div>
      {deletion.error&&<p role="alert" className="cw-profile-error">{deletion.error}</p>}
      <button type="button" disabled={state.busy||deletion.busy} onClick={removeAccount}>{deletion.busy?'Deleting account…':'Delete account'}</button>
    </section>}
  </>;
}
