import {useState} from 'react';
import {Trash2,X,MessageCircle} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import QuotePage from './QuotePage';
import './guidedBooking.css';

export default function GuidedBookingFlow({ar,onAsk,onClose}){
 const ctx=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
 const [submitSlot,setSubmitSlot]=useState(null);
 const status=ctx.saveState==='deleted'?tr('Draft deleted. Start a new event.','حُذفت المسودة. ابدأ فعالية جديدة.'):ctx.saveState==='delete-failed'?tr('Draft was not deleted. Check your connection and retry.','لم تُحذف المسودة. تحقق من الاتصال وحاول مجدداً.'):ctx.saveState==='delete-conflict'?tr('A different draft is active. Reload it before deleting.','توجد مسودة أخرى. أعد تحميلها قبل الحذف.'):ctx.saveState==='account-saved'?tr('All changes saved','تم حفظ التغييرات'):['pending','saving'].includes(ctx.saveState)?tr('Saving…','جارٍ الحفظ…'):ctx.saveState==='conflict'?tr('Draft changed elsewhere. Reload before editing.','تغيرت المسودة في مكان آخر. أعد التحميل قبل التعديل.'):ctx.saveState==='account-failed'?tr('Not saved. Please retry.','لم يتم الحفظ. أعد المحاولة.'):tr('Your draft saves automatically.','تُحفظ المسودة تلقائياً.');
 return <section className="echo-guided-booking" aria-label={tr('Guided event booking','حجز الفعالية الموجّه')} dir={ar?'rtl':undefined}>
  <header className="egb-header"><div className="egb-header-actions"><button type="button" className="egb-delete" disabled={!ctx.cloudReady||ctx.clearing} aria-label={tr('Delete booking draft','حذف مسودة الحجز')} data-tooltip={tr('Delete booking draft','حذف مسودة الحجز')} onClick={()=>ctx.clear()}><Trash2 size={16}/></button><button type="button" className="egb-chat-toggle" aria-label={tr('Open Echo AI chat','فتح دردشة إيكو')} data-tooltip={tr('Chat with Echo AI','تحدث مع إيكو')} aria-controls="booking-assistant-face" onClick={onAsk}><MessageCircle size={19}/></button>{onClose&&<button type="button" className="egb-close" data-tooltip={tr('Close','إغلاق')} onClick={onClose} aria-label={tr('Close event planner','إغلاق مخطط الفعالية')}><X size={16}/></button>}</div></header>
  <div className="egb-body">
   {!ctx.cloudReady||ctx.clearing?<div role="status"><p>{ctx.saveState==='load-failed'?tr('Could not load your saved draft.','تعذر تحميل المسودة المحفوظة.'):tr('Loading your event draft…','جارٍ تحميل المسودة…')}</p>{ctx.saveState==='load-failed'&&<button type="button" onClick={ctx.retrySync}>{tr('Retry loading draft','إعادة المحاولة')}</button>}</div>:<QuotePage lang={ctx.lang} user={ctx.user} isSessionReady={ctx.isSessionReady} onCreateServiceRequest={ctx.onCreateServiceRequest} guided submitSlot={submitSlot}/>}
  </div>
  <div className="egb-bottom"><span role="status">{status}</span>{['conflict','delete-conflict'].includes(ctx.saveState)&&<button type="button" onClick={ctx.retrySync}>{tr('Reload draft','إعادة تحميل المسودة')}</button>}<span className="egb-submit-slot" ref={setSubmitSlot}/>{ctx.saveState==='account-failed'&&<button type="button" onClick={()=>ctx.save()}>{tr('Retry save','إعادة الحفظ')}</button>}</div>
 </section>;
}
