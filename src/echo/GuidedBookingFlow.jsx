import {useState} from 'react';
import {Trash2,X} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import QuotePage from './QuotePage';
import './guidedBooking.css';

export default function GuidedBookingFlow({ar,onAsk,onClose}){
 const ctx=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
 const [submitSlot,setSubmitSlot]=useState(null);
 const status=ctx.saveState==='account-saved'?tr('All changes saved','تم حفظ التغييرات'):ctx.saveState==='saving'?tr('Saving…','جارٍ الحفظ…'):ctx.saveState==='conflict'?tr('Draft changed elsewhere. Reload before editing.','تغيرت المسودة في مكان آخر. أعد التحميل قبل التعديل.'):ctx.saveState==='account-failed'?tr('Not saved. Please retry.','لم يتم الحفظ. أعد المحاولة.'):tr('Your draft saves automatically.','تُحفظ المسودة تلقائياً.');
 return <section className="echo-guided-booking" aria-label={tr('Guided event booking','حجز الفعالية الموجّه')} dir={ar?'rtl':undefined}>
  <header className="egb-header"><div><span>{tr('YOUR EVENT DRAFT','مسودة فعاليتك')}</span><h2>{tr('Plan your event','خطط لفعاليتك')}</h2><p>{tr('Fill in the details here or ask Echo to help.','أكمل التفاصيل هنا أو اطلب مساعدة إيكو.')}</p></div><div className="egb-header-actions"><button type="button" className="egb-delete" disabled={!ctx.cloudReady||ctx.clearing} aria-label={tr('Delete booking draft','حذف مسودة الحجز')} title={tr('Delete booking draft','حذف مسودة الحجز')} onClick={()=>{if(window.confirm(tr('Delete this booking draft? Your answers and selected equipment will be removed.','حذف مسودة الحجز؟ ستُحذف إجاباتك والمعدات المختارة.')))ctx.clear();}}><Trash2 size={16}/></button><button type="button" onClick={onAsk}>{tr('Ask Echo','اسأل إيكو')}</button>{onClose&&<button type="button" className="egb-close" aria-label={tr('Close Echo AI','إغلاق إيكو')} title={tr('Close','إغلاق')} onClick={onClose}><X size={15}/></button>}</div></header>
  <div className="egb-body">
   {!ctx.cloudReady||ctx.clearing?<div role="status"><p>{ctx.saveState==='load-failed'?tr('Could not load your saved draft.','تعذر تحميل المسودة المحفوظة.'):tr('Loading your event draft…','جارٍ تحميل المسودة…')}</p>{ctx.saveState==='load-failed'&&<button type="button" onClick={ctx.retrySync}>{tr('Retry loading draft','إعادة المحاولة')}</button>}</div>:<QuotePage lang={ctx.lang} user={ctx.user} isSessionReady={ctx.isSessionReady} onCreateServiceRequest={ctx.onCreateServiceRequest} guided submitSlot={submitSlot}/>}
  </div>
  <div className="egb-bottom"><span role="status">{status}</span><span className="egb-submit-slot" ref={setSubmitSlot}/>{ctx.saveState==='account-failed'&&<button type="button" onClick={ctx.save}>{tr('Retry save','إعادة الحفظ')}</button>}</div>
 </section>;
}
