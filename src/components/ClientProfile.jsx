import CanadianPhoneInput from './CanadianPhoneInput';
import {formatCanadianPhone} from '../lib/canadianPhone';
import {useState} from 'react';
import {apiRequest} from '../lib/api';

// "Personal info" tab of the client dashboard: edits only the signed-in person's own profile (PATCH /auth/profile).
const FIELDS=['firstName','lastName','phoneNumber','preferredContact','company','emailNotifications'];
export default function ClientProfile({user,token,onSaved}){
  const [form,setForm]=useState(()=>({firstName:user?.firstName||'',lastName:user?.lastName||'',phoneNumber:formatCanadianPhone(user?.phoneNumber),preferredContact:user?.preferredContact||'email',company:user?.company||'',emailNotifications:user?.emailNotifications!==false}));
  const [state,setState]=useState({busy:false,error:'',saved:false});
  const set=key=>value=>{setForm(current=>({...current,[key]:value}));setState(current=>({...current,saved:false}));};
  const dirty=FIELDS.some(key=>form[key]!==(key==='preferredContact'?user?.preferredContact||'email':key==='emailNotifications'?user?.emailNotifications!==false:key==='phoneNumber'?formatCanadianPhone(user?.phoneNumber):user?.[key]||''));
  const submit=async event=>{
    event.preventDefault();setState({busy:true,error:'',saved:false});
    try{const {user:next}=await apiRequest('/auth/profile',{method:'PATCH',token,body:{...form,phoneNumber:formatCanadianPhone(form.phoneNumber)}});onSaved?.(next);setState({busy:false,error:'',saved:true});}
    catch(error){setState({busy:false,error:error.message,saved:false});}
  };
  return <>
    <header className="cw-heading"><div><h1>Personal info</h1><p>Keep your contact details current so we can reach you about your events.</p></div></header>
    <form className="cw-panel cw-profile" onSubmit={submit}>
      <label>First name<input required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={e=>set('firstName')(e.target.value)}/></label>
      <label>Last name<input maxLength={80} autoComplete="family-name" value={form.lastName} onChange={e=>set('lastName')(e.target.value)}/></label>
      <label>Phone number<CanadianPhoneInput maxLength={30} autoComplete="tel" value={form.phoneNumber} placeholder="+1 (416) 555-0123" onChange={set('phoneNumber')}/></label>
      <label>Preferred contact<select value={form.preferredContact} onChange={e=>set('preferredContact')(e.target.value)}><option value="any">Any</option><option value="email">Email only</option><option value="phone">Phone only</option><option value="whatsapp">WhatsApp only</option></select></label>
      <label className="cw-profile-wide">Company name <small>(optional)</small><input maxLength={120} autoComplete="organization" value={form.company} onChange={e=>set('company')(e.target.value)}/></label>
      <label className="cw-profile-wide cw-profile-toggle"><span><strong>Receive notifications via email</strong><small>Quote reminders and updates about your events. Account and booking confirmations are always sent.</small></span><input type="checkbox" role="switch" checked={form.emailNotifications} onChange={e=>set('emailNotifications')(e.target.checked)}/></label>
      <p className="cw-profile-email">Signed in as <strong>{user?.email}</strong></p>
      <div className="cw-profile-actions">{state.error&&<p role="alert" className="cw-profile-error">{state.error}</p>}{state.saved&&<p role="status">Saved.</p>}<button className="primary-button" type="submit" disabled={state.busy||!dirty}>{state.busy?'Saving…':'Save changes'}</button></div>
    </form>
  </>;
}
