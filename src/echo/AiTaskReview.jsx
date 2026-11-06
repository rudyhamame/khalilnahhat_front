import {Check,X} from 'lucide-react';
import './aiTaskReview.css';

export default function AiTaskReview({tasks,ar=false,disabled=false,onReview}){
 const tr=(en,arabic)=>ar?arabic:en;
 return <section className="ai-task-review" aria-label={tr('Review completed AI tasks','تقييم مهام المساعد المنجزة')} dir={ar?'rtl':'ltr'}>
  <header><strong>{tr('AI tasks','مهام المساعد')}</strong><span>{tr('Did this happen?','هل تم هذا؟')}</span></header>
  {!tasks.length?<p className="ai-task-review-empty">{tr('Completed actions will appear here.','ستظهر الإجراءات المنجزة هنا.')}</p>:<ul>{tasks.map(task=><li key={task.id} data-confirmed={task.confirmed===null?'pending':String(task.confirmed)}>
   <span className="ai-task-review-label">{task.label}</span>
   <div className="ai-task-review-votes" role="group" aria-label={task.label}>
    <button type="button" className="is-true" disabled={disabled} aria-label={tr('True — this happened','صحيح — تم الإجراء')} title={tr('True','صحيح')} aria-pressed={task.confirmed===true} onClick={()=>onReview(task.id,true)}><Check size={15} aria-hidden="true"/></button>
    <button type="button" className="is-false" disabled={disabled} aria-label={tr('False — this did not happen correctly','خطأ — لم يتم الإجراء بشكل صحيح')} title={tr('False','خطأ')} aria-pressed={task.confirmed===false} onClick={()=>onReview(task.id,false)}><X size={15} aria-hidden="true"/></button>
   </div>
  </li>)}</ul>}
 </section>;
}
