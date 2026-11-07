import {useRef, useState} from 'react';
import {ArrowUpRight, Check, Mail, Send} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {contactEmail} from '../lib/publicContact';
import ViewportFit from './ViewportFit';
import './homeContact.css';

export default function HomeContact({lang}) {
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const [fields, setFields] = useState({name:'',email:'',subject:'',message:'',website:''});
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const requestId = useRef(null);
  const busy = state === 'sending';
  const locked = busy || state === 'uncertain';
  const change = event => setFields(previous => ({...previous,[event.target.name]:event.target.value}));
  const submit = async event => {
    event.preventDefault();
    if (locked || state === 'sent') return;
    requestId.current ||= crypto.randomUUID();
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
  return <section id="contact" className="home-contact viewport-fit-section" dir={ar?'rtl':'ltr'} aria-labelledby="home-contact-title">
    <ViewportFit>
      <div className="home-contact-intro">
        <p className="echo-eyebrow">05 / {tr('GET IN TOUCH','تواصل معنا')}</p>
        <span className="home-contact-mark" aria-hidden="true"><Mail size={32} strokeWidth={1.2}/></span>
        <h2 id="home-contact-title">{tr('Let’s make','لنصنع')}<br/><span>{tr('something memorable.','لحظات لا تُنسى.')}</span></h2>
        <p>{tr('Have a question or an idea for your next event? Send Khalil a message.','لديك سؤال أو فكرة لفعاليتك القادمة؟ أرسل رسالة إلى خليل.')}</p>
        <a className="home-contact-address" href={`mailto:${contactEmail}`}><span dir="ltr">{contactEmail}</span><ArrowUpRight size={20}/></a>
        <small>{tr('Your message goes straight to our bookings inbox.','تصل رسالتك مباشرة إلى صندوق بريد الحجوزات.')}</small>
      </div>
      <div className="home-contact-panel">
        <div className="home-contact-panel-heading"><span><Mail size={20} strokeWidth={1.5}/></span><h3>{tr('Contact us','تواصل معنا')}</h3></div>
        {state === 'sent' ? <div className="home-contact-success" role="status" tabIndex={-1}>
          <Check size={34}/><h3>{tr('Message sent.','تم إرسال الرسالة.')}</h3>
          <p>{tr('Thank you for reaching out. We’ll reply to the email address you provided.','شكراً لتواصلك. سنردّ على عنوان البريد الإلكتروني الذي أدخلته.')}</p>
        </div> : <form onSubmit={submit} aria-label={tr('Contact Khalil','تواصل مع خليل')} aria-busy={busy}>
          <div className="home-contact-fields">
            <label>{tr('Your name','الاسم')}<input name="name" autoComplete="name" value={fields.name} onChange={change} required maxLength={100} disabled={locked}/></label>
            <label>{tr('Email address','البريد الإلكتروني')}<input name="email" type="email" autoComplete="email" dir="ltr" value={fields.email} onChange={change} required maxLength={254} disabled={locked}/></label>
          </div>
          <label>{tr('Subject','الموضوع')}<input name="subject" value={fields.subject} onChange={change} required maxLength={160} disabled={locked}/></label>
          <label>{tr('Your message','رسالتك')}<textarea name="message" rows={5} value={fields.message} onChange={change} required minLength={10} maxLength={5000} disabled={locked}/></label>
          <label className="home-contact-honey" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={change}/></label>
          {error && <p className="home-contact-error" role="alert">{error} <a href={`mailto:${contactEmail}`}>{tr('Email us','راسلنا')}</a></p>}
          <div className="home-contact-submit"><small>{tr('We use your details to respond to this message.','نستخدم بياناتك للردّ على هذه الرسالة.')}</small><button type="submit" disabled={locked}><Send size={16}/>{busy?tr('Sending…','جارٍ الإرسال…'):tr('Send message','أرسل الرسالة')}</button></div>
        </form>}
      </div>
    </ViewportFit>
  </section>;
}
