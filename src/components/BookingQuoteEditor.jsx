import {useId} from 'react';
import {Sparkles} from 'lucide-react';
import {sortQuoteLines,quoteLineName} from '../lib/quoteAtoms';
import {bookingText,bookingLocale,bookingMoney} from '../lib/bookingUiText';
import './bookingQuoteEditor.css';

export default function BookingQuoteEditor({request,draft,totals,catalog=[],equipment=[],ar=false,editable=true,rateFeedback='',onPriceChange,onFieldChange,onNoteChange,onFillRates,onSaveTerms,termsDefaults,onApplyTerms}){
 const id=useId(),tr=text=>bookingText(text,ar),money=value=>bookingMoney(value,ar);
 const lines=sortQuoteLines(draft.items,catalog,equipment);
 return <div className="booking-quote-layout" dir={ar?'rtl':'ltr'}>
  <section className="bqe-editor" aria-labelledby={`${id}-pricing`}>
   <header className="bqe-heading"><div><h4 id={`${id}-pricing`}>{tr('Services & pricing')}</h4><p>{ar?'راجع الكميات وحدّد سعر كل بند.':'Review quantities and set a rate for each item.'}</p></div>
    {!!lines.length&&<button type="button" className="bqe-fill" disabled={!editable} onClick={onFillRates}><Sparkles size={15} aria-hidden="true"/>{ar?'تحميل الأسعار':'Load rates'}</button>}
   </header>
   {rateFeedback&&<p className="bqe-rate-feedback" role="status">{rateFeedback}</p>}
   <fieldset className="bqe-fields" disabled={!editable}>
    <legend className="bqe-sr-only">{tr('Services and pricing')}</legend>
    <div className="bqe-table-wrap"><table className="bqe-table">
     <caption className="bqe-sr-only">{ar?'بنود عرض السعر بالدولار الكندي':'Quote line items in Canadian dollars'}</caption>
     <thead><tr><th scope="col">{ar?'البند':'Item'}</th><th scope="col" className="bqe-quantity">{tr('Quantity')}</th><th scope="col" className="bqe-rate">{tr('Unit price')}</th><th scope="col" className="bqe-line-total">{tr('Line total')}</th></tr></thead>
     <tbody>{lines.length?lines.map(({line:item,code})=>{
      const inputId=`${id}-${item.serviceId}`,value=draft.prices?.[item.serviceId]??'';
      return <tr key={item.serviceId}>
       <th scope="row" className="bqe-item">{code&&<span className="bqe-code" dir="ltr">{code}</span>}<span>{quoteLineName(item,catalog)}</span></th>
       <td className="bqe-quantity" data-label={tr('Quantity')}><bdi>{item.quantity}</bdi></td>
       <td className="bqe-rate" data-label={tr('Unit price')}><label className="bqe-sr-only" htmlFor={inputId}>{tr('Unit price')} · {quoteLineName(item,catalog)} · CAD</label><input id={inputId} type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={event=>onPriceChange(item.serviceId,event.target.value)}/></td>
       <td className="bqe-line-total" data-label={tr('Line total')}><bdi>{money(Number(value||0)*item.quantity)}</bdi></td>
      </tr>;
     }):<tr><td className="bqe-empty" colSpan={4}>{ar?'لا توجد بنود مسعّرة لهذا الطلب.':'No priced items in this request.'}</td></tr>}</tbody>
    </table></div>
    <p className="bqe-currency">{ar?'جميع المبالغ بالدولار الكندي. يُطبّق الخصم قبل الضريبة.':'All amounts in CAD. Discounts are applied before tax.'}</p>
    <section className="bqe-adjustments" aria-labelledby={`${id}-adjustments`}>
     <h5 id={`${id}-adjustments`}>{ar?'تعديلات السعر':'Price adjustments'}</h5>
     <div className="bqe-adjustment-fields">
      <div className="bqe-discount">
       <div className="bqe-discount-head"><span>{ar?'خصم الحجز':'Booking discount'}</span>
        <div className="bqe-mini-tabs" role="group" aria-label={ar?'نوع الخصم':'Discount type'}>
         {[['amount',tr('Amount')],['percent',ar?'نسبة':'Percent']].map(([kind,label])=><button key={kind} type="button" aria-pressed={draft.discountType===kind} className={draft.discountType===kind?'is-active':''} onClick={()=>onFieldChange('discountType',kind)}>{label}</button>)}
        </div>
       </div>
       <input type="number" min="0" max={draft.discountType==='percent'?100:totals.subtotal} step="0.01" inputMode="decimal" placeholder={draft.discountType==='percent'?'0 %':'0.00'} aria-label={draft.discountType==='percent'?tr('Discount (%)'):tr('Discount (CAD)')} value={draft.discountValue} onChange={event=>onFieldChange('discountValue',event.target.value)}/>
      </div>
      <label><span>{tr('Tax %')}</span><input type="number" min="0" max="30" step="0.01" inputMode="decimal" value={draft.taxPercent} onChange={event=>onFieldChange('taxPercent',event.target.value)}/></label>
      <div className="bqe-discount bqe-deposit">
       <div className="bqe-discount-head"><span>{ar?'العربون':'Deposit'}</span>
        <div className="bqe-mini-tabs" role="group" aria-label={ar?'نوع العربون':'Deposit type'}>
         {[['amount',tr('Amount')],['percent',ar?'نسبة':'Percent']].map(([kind,label])=><button key={kind} type="button" aria-pressed={draft.depositType===kind} className={draft.depositType===kind?'is-active':''} onClick={()=>onFieldChange('depositType',kind)}>{label}</button>)}
        </div>
       </div>
       {draft.depositType==='percent'
        ?<input type="number" min="0" max="100" step="0.01" inputMode="decimal" placeholder="0 %" aria-label={tr('Deposit (%)')} value={draft.depositPercent} onChange={event=>onFieldChange('depositPercent',event.target.value)}/>
        :<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" aria-label={tr('Deposit (CAD)')} value={draft.depositAmount} onChange={event=>onFieldChange('depositAmount',event.target.value)}/>}
       {draft.depositType==='percent'&&<small className="bqe-deposit-amount">{tr('Deposit')}: <bdi>{money(totals.deposit)}</bdi></small>}
      </div>
     </div>
    </section>
    <label className="bqe-note"><span>{ar?'رسالة للعميل':'Message to customer'}<small>{tr('(optional)')}</small></span><textarea rows={3} value={draft.adminNote||''} onChange={event=>onNoteChange(event.target.value)} placeholder={ar?'أضف تفاصيل أو ملاحظات حول هذا العرض':'Add context or notes about this quote'}/></label>
   </fieldset>
  </section>
  <aside className="bqe-sidebar" aria-label={ar?'ملخص العرض وشروطه':'Quote summary and terms'}>
   <section className="bqe-summary" aria-labelledby={`${id}-total`}>
    <header><h4 id={`${id}-total`}>{tr('Quote total')}</h4><span>CAD</span></header>
    <output className="bqe-total" aria-live="polite" aria-atomic="true"><bdi>{money(totals.total)}</bdi></output>
    <dl className="bqe-breakdown">
     <div><dt>{tr('Subtotal')}</dt><dd><bdi>{money(totals.subtotal)}</bdi></dd></div>
     <div><dt>{tr('Discount')}{draft.discountType==='percent'?` (${draft.discountValue||0}%)`:''}</dt><dd><bdi>−{money(totals.discount)}</bdi></dd></div>
     <div><dt>{tr('Tax')} ({draft.taxPercent||0}%)</dt><dd><bdi>{money(totals.tax)}</bdi></dd></div>
    </dl>
    <dl className="bqe-balance"><div><dt>{tr('Deposit')}</dt><dd><bdi>{money(totals.deposit)}</bdi></dd></div><div><dt>{tr('Remaining balance')}</dt><dd><bdi>{money(totals.balance)}</bdi></dd></div></dl>
   </section>
   <fieldset className="bqe-fields bqe-terms" disabled={!editable}>
    <legend>{tr('Quote terms')}</legend>
    <div className="bqe-term-fields">
     <label><span>{tr('Valid days')}</span><input type="number" min="1" max="60" step="1" inputMode="numeric" value={draft.validDays} onChange={event=>onFieldChange('validDays',event.target.value)}/></label>
    </div>
    <label className="bqe-payment-note"><span>{tr('Payment instructions')}</span><textarea rows={3} value={draft.paymentInstructions||''} onChange={event=>onFieldChange('paymentInstructions',event.target.value)} placeholder={ar?'التفاصيل التي يحتاجها العميل للدفع':'Details the customer needs to make a payment'}/></label>
    <fieldset className="bqe-payment-options"><legend>{tr('Payment options')}</legend>
     {[['etransfer',tr('E-transfer')],['cheque',tr('Cheque')],['bank_transfer',tr('Bank transfer')],['other',tr('Other')]].map(([method,label])=>{const picked=(draft.paymentOptions||[]).includes(method);
      return <label key={method} className={picked?'is-on':''}><input type="checkbox" checked={picked} onChange={()=>onFieldChange('paymentOptions',picked?(draft.paymentOptions||[]).filter(item=>item!==method):[...(draft.paymentOptions||[]),method])}/><span>{label}</span></label>;})}
     {(draft.paymentOptions||[]).includes('etransfer')&&<label className="bqe-etransfer-email"><span>{tr('E-transfer: email address that receives the payment')}</span><input type="email" inputMode="email" autoComplete="off" placeholder="payments@example.com" value={draft.etransferEmail||''} onChange={event=>onFieldChange('etransferEmail',event.target.value)}/></label>}
    </fieldset>
    {termsDefaults&&Object.keys(termsDefaults).length>0&&<details className="bqe-default-terms"><summary>{tr('Default terms')}</summary>
     <dl>
      <div><dt>{tr('Valid days')}</dt><dd>{termsDefaults.validDays}</dd></div>
      <div><dt>{tr('Payment instructions')}</dt><dd>{termsDefaults.paymentInstructions||'—'}</dd></div>
      <div><dt>{tr('Payment options')}</dt><dd>{(termsDefaults.paymentOptions||[]).length?termsDefaults.paymentOptions.map(method=>tr({etransfer:'E-transfer',cheque:'Cheque',bank_transfer:'Bank transfer',other:'Other'}[method]||method)).join(', '):'—'}</dd></div>
      {(termsDefaults.paymentOptions||[]).includes('etransfer')&&<div><dt>{tr('E-transfer: email address that receives the payment')}</dt><dd>{termsDefaults.etransferEmail||'—'}</dd></div>}
     </dl>
     {onApplyTerms&&<button type="button" className="secondary-button" disabled={!editable} onClick={onApplyTerms}>{tr('Use these terms for this quote')}</button>}
    </details>}
    {onSaveTerms&&<div className="bqe-save-terms"><button type="button" className="secondary-button" disabled={!editable} onClick={onSaveTerms}>{tr('Save as default terms')}</button><small>{tr('New quotes start from these terms. Quotes already published keep their own.')}</small></div>}
    {request.expiresAt&&<p className="bqe-expiry">{ar?'تنتهي صلاحية العرض الحالي':'Current quote expires'} <time dateTime={request.expiresAt}>{new Date(request.expiresAt).toLocaleString(bookingLocale(ar),{dateStyle:'medium',timeStyle:'short'})}</time></p>}
   </fieldset>
   {!editable&&<p className="bqe-review-note">{ar?'عرض السعر هذا للقراءة فقط في مرحلته الحالية.':'This quote is read-only at its current stage.'}</p>}
  </aside>
 </div>;
}
