import {Check,X,LoaderCircle,Pencil} from 'lucide-react';
import './aiTaskReview.css';
import {presentAiTask} from '../lib/aiTaskPresentation';

export default function AiTaskReview({tasks,sessionId,saveFailed=false,confirmingId=null,ar=false,disabled=false,onReview,onModify}){
 const tr=(en,arabic)=>ar?arabic:en;
 const current=tasks.filter(task=>task.sessionId===sessionId),past=tasks.filter(task=>task.sessionId!==sessionId);
 const groups=[[tr('Current','الحالية'),current],[tr('Past','السابقة'),past]].filter(([,rows])=>rows.length);
 return <section className="ai-task-review" aria-label={tr('Review completed AI tasks','تقييم مهام المساعد المنجزة')} dir={ar?'rtl':'ltr'}>
  <header><strong>{tr('AI tasks','مهام المساعد')} <small>({tasks.length})</small></strong>{tasks.some(task=>task.confirmed!==true)&&<span>{tr('Correct?','صحيح؟')}</span>}</header>
  {!tasks.length?<p className="ai-task-review-empty">{tr('Draft edits will appear here.','ستظهر تعديلات المسودة هنا.')}</p>:<div className="ai-task-review-history">{groups.map(([title,rows])=><div key={title} className="ai-task-review-group"><h3>{title}</h3><ul>{[...rows].reverse().map(task=>{const view=presentAiTask(task,ar);return <li key={task.id} data-confirmed={task.confirmed===null?'pending':String(task.confirmed)}>
   <span className="ai-task-review-label"><span className="ai-task-review-summary">{view.field&&<span className="ai-task-review-field">{view.field}:</span>}<strong>{view.value}</strong></span>{task.createdAt&&!Number.isNaN(Date.parse(task.createdAt))&&<time dateTime={task.createdAt}>{new Date(task.createdAt).toLocaleString(ar?'ar-CA':'en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time>}</span>
   <div className="ai-task-review-votes" role="group" aria-label={view.label}>
    {task.confirmed===true?<button type="button" className="is-modify" disabled={disabled} aria-label={`${tr('Modify','تعديل')} ${view.field||view.label}`} title={tr('Modify this task','تعديل هذه المهمة')} onClick={()=>onModify(task.id)}><Pencil size={15} aria-hidden="true"/></button>:<>
    <button type="button" className="is-true" disabled={disabled} aria-label={tr('True — apply and save this draft edit','صحيح — تطبيق التغيير وحفظه')} title={tr('Apply and confirm','تطبيق وتأكيد')} aria-pressed={task.confirmed===true} onClick={()=>onReview(task.id,true)}>{confirmingId===task.id?<LoaderCircle className="ai-task-review-saving" size={15} aria-label={tr('Saving…','جارٍ الحفظ…')}/>:<Check size={15} aria-hidden="true"/>}</button>
    <button type="button" className="is-false" disabled={disabled} aria-label={tr('False — this did not happen correctly','خطأ — لم يتم الإجراء بشكل صحيح')} title={tr('False','خطأ')} aria-pressed={task.confirmed===false} onClick={()=>onReview(task.id,false)}><X size={15} aria-hidden="true"/></button>
    </>}
   </div>
  </li>;})}</ul></div>)}</div>}
  {saveFailed&&<p className="ai-task-review-save-error" role="status">{tr('Task history could not be saved in this browser.','تعذر حفظ سجل المهام في هذا المتصفح.')}</p>}
 </section>;
}
