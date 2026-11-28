import {useRef, useState} from 'react';
import {ArrowUpRight, Check, Mail, Send} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {contactEmail} from '../lib/publicContact';
import ViewportFit from './ViewportFit';
import './homeContact.css';
import {uuid} from '../lib/uuid.js';

export default function HomeContact({lang}) {
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const [fields, setFields] = useState({name:'',email:'',subject:'',message:'',website:''});
  const [state, setState] = useState('idle');
  const [formOpen, setFormOpen] = useState(false);// the form stays closed until the visitor asks for it
  const [error, setError] = useState('');
  const requestId = useRef(null);
  const busy = state === 'sending';
  const locked = busy || state === 'uncertain';
  const change = event => setFields(previous => ({...previous,[event.target.name]:event.target.value}));
  const submit = async event => {
    event.preventDefault();
    if (locked || state === 'sent') return;
    requestId.current ||= uuid();
    setState('sending'); setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65000);
    try {
      const result = await apiRequest('/contact',{method:'POST',body:{...fields,requestId:requestId.current},signal:controller.signal});
      if (!result.sent) throw new Error('Sending was not confirmed.');
      setState('sent');
    } catch (failure) {
      const uncertain = failure.payload?.uncertain || !failure.status;
      setState(uncertain ? 'uncertain' : 'idle');
      setError(ar
        ? uncertain ? 'لم نتمكن من تأكيد الإرسال. لا ترسل نسخة أخرى؛ تواصل معنا مباشرة عبر البريد الإلكتروني.' : 'تعذّر إرسال الرسالة. تحقّق من البيانات أو تواصل معنا مباشرة عبر البريد الإلكتروني.'
        : failure.message || 'Unable to send. Please email us directly.');
    } finally { clearTimeout(timeout); }
  };
  return <>
  <div className="contact-backdrop" aria-hidden="true"/>
  <section id="contact" className={`home-contact viewport-fit-section${formOpen||state==='sent'?' is-form-open':' is-form-closed'}`} dir={ar?'rtl':'ltr'} aria-labelledby="home-contact-title">
    <img className="contact-photo" src={ar?'/echo/contact-hero-khalil-rtl.webp':'/echo/contact-hero-khalil.webp'} width="1196" height="937" alt={tr('DJ Khalil on the phone, ready to take your call','دي جي خليل على الهاتف جاهز لاستقبال اتصالك')} fetchPriority="high"/>
    <ViewportFit natural>
      <div className="home-contact-intro">
        <h2 id="home-contact-title">{tr('Let’s make','لنصنع')}<br/><span>{tr('something memorable.','لحظات لا تُنسى.')}</span></h2>
        <p>{tr('Have a question or an idea for your next event? Send Khalil a message.','لديك سؤال أو فكرة لفعاليتك القادمة؟ أرسل رسالة إلى خليل.')}</p>
        <div className="home-contact-actions">
          {!formOpen&&state!=='sent'&&<button type="button" className="home-contact-open" onClick={()=>setFormOpen(true)} aria-expanded="false" aria-controls="home-contact-form"><Send size={16} aria-hidden="true"/>{tr('Write a message','اكتب رسالة')}</button>}
          <a className="home-contact-email" href={`mailto:${contactEmail}`}><Mail size={16} aria-hidden="true"/><span dir="ltr">{contactEmail}</span></a>
        </div>
      </div>
      {(formOpen||state==='sent')&&<div className="home-contact-panel" id="home-contact-form">
        {state === 'sent' ? <div className="home-contact-success" role="status" tabIndex={-1}>
          <Check size={34}/><h3>{tr('Message sent.','تم إرسال الرسالة.')}</h3>
          <p>{tr('Thank you for reaching out. We’ll reply to the email address you provided.','شكراً لتواصلك. سنردّ على عنوان البريد الإلكتروني الذي أدخلته.')}</p>
        </div> : <form onSubmit={submit} aria-label={tr('Contact Khalil','تواصل مع خليل')} aria-busy={busy}>
          <div className="home-contact-fields">
            <label>{tr('Your name','الاسم')}<input name="name" autoComplete="name" value={fields.name} onChange={change} required maxLength={100} disabled={locked}/></label>
            <label>{tr('Email address','البريد الإلكتروني')}<input name="email" type="email" autoComplete="email" dir="ltr" value={fields.email} onChange={change} required maxLength={254} disabled={locked}/></label>
          </div>
          <label>{tr('Subject','الموضوع')}<input name="subject" value={fields.subject} onChange={change} required maxLength={160} disabled={locked}/></label>
          <label className="home-contact-message">{tr('Your message','رسالتك')}<textarea name="message" rows={5} value={fields.message} onChange={change} required minLength={10} maxLength={5000} disabled={locked}/></label>
          <label className="home-contact-honey" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={change}/></label>
          {error && <p className="home-contact-error" role="alert">{error} <a href={`mailto:${contactEmail}`}>{tr('Email us','راسلنا')}</a></p>}
          <div className="home-contact-submit"><small>{tr('We use your details to respond to this message.','نستخدم بياناتك للردّ على هذه الرسالة.')}</small><button type="submit" disabled={locked}><Send size={16}/>{busy?tr('Sending…','جارٍ الإرسال…'):tr('Send message','أرسل الرسالة')}</button></div>
        </form>}
      </div>}
    </ViewportFit>
  </section>
  </>;
}
