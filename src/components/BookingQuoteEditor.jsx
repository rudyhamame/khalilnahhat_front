import {useId} from 'react';
import {Sparkles} from 'lucide-react';
import {sortQuoteLines} from '../lib/quoteAtoms';
import {bookingText,bookingLocale,bookingMoney} from '../lib/bookingUiText';
import AdminSelect from './AdminSelect';
import './bookingQuoteEditor.css';

export default function BookingQuoteEditor({request,draft,totals,catalog=[],equipment=[],ar=false,editable=true,onPriceChange,onFieldChange,onNoteChange,onFillRates}){
 const id=useId(),tr=text=>bookingText(text,ar),money=value=>bookingMoney(value,ar);
 const lines=sortQuoteLines(draft.items,catalog,equipment);
 return <div className="booking-quote-layout" dir={ar?'rtl':'ltr'}>
  <section className="bqe-editor" aria-labelledby={`${id}-pricing`}>
   <header className="bqe-heading"><div><h4 id={`${id}-pricing`}>{tr('Services & pricing')}</h4><p>{ar?'راجع الكميات وحدّد سعر كل بند.':'Review quantities and set a rate for each item.'}</p></div>
    {!!lines.length&&<button type="button" className="bqe-fill" disabled={!editable} onClick={onFillRates}><Sparkles size={15} aria-hidden="true"/>{ar?'تحميل الأسعار':'Load rates'}</button>}
   </header>
   <fieldset className="bqe-fields" disabled={!editable}>
    <legend className="bqe-sr-only">{tr('Services and pricing')}</legend>
    <div className="bqe-table-wrap"><table className="bqe-table">
     <caption className="bqe-sr-only">{ar?'بنود عرض السعر بالدولار الكندي':'Quote line items in Canadian dollars'}</caption>
     <thead><tr><th scope="col">{ar?'البند':'Item'}</th><th scope="col" className="bqe-quantity">{tr('Quantity')}</th><th scope="col" className="bqe-rate">{tr('Unit price')}</th><th scope="col" className="bqe-line-total">{tr('Line total')}</th></tr></thead>
     <tbody>{lines.length?lines.map(({line:item,code})=>{
      const inputId=`${id}-${item.serviceId}`,value=draft.prices?.[item.serviceId]??'';
      return <tr key={item.serviceId}>
       <th scope="row" className="bqe-item">{code&&<span className="bqe-code" dir="ltr">{code}</span>}<span>{item.name}</span></th>
       <td className="bqe-quantity" data-label={tr('Quantity')}><bdi>{item.quantity}</bdi></td>
       <td className="bqe-rate" data-label={tr('Unit price')}><label className="bqe-sr-only" htmlFor={inputId}>{tr('Unit price')} · {item.name} · CAD</label><input id={inputId} type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={event=>onPriceChange(item.serviceId,event.target.value)}/></td>
       <td className="bqe-line-total" data-label={tr('Line total')}><bdi>{money(Number(value||0)*item.quantity)}</bdi></td>
      </tr>;
     }):<tr><td className="bqe-empty" colSpan={4}>{ar?'لا توجد بنود مسعّرة لهذا الطلب.':'No priced items in this request.'}</td></tr>}</tbody>
    </table></div>
    <p className="bqe-currency">{ar?'جميع المبالغ بالدولار الكندي. يُطبّق الخصم قبل الضريبة.':'All amounts in CAD. Discounts are applied before tax.'}</p>
    <section className="bqe-adjustments" aria-labelledby={`${id}-adjustments`}>
     <h5 id={`${id}-adjustments`}>{ar?'تعديلات السعر':'Price adjustments'}</h5>
     <div className="bqe-adjustment-fields">
      <label><span>{ar?'نوع الخصم':'Discount type'}</span><AdminSelect value={draft.discountType} onChange={event=>onFieldChange('discountType',event.target.value)} aria-label={ar?'نوع الخصم':'Discount type'}><option value="amount">{tr('Amount (CAD)')}</option><option value="percent">{ar?'النسبة المئوية (٪)':'Percentage (%)'}</option></AdminSelect></label>
      <label><span>{draft.discountType==='percent'?tr('Discount (%)'):tr('Discount (CAD)')}</span><input type="number" min="0" max={draft.discountType==='percent'?100:totals.subtotal} step="0.01" inputMode="decimal" value={draft.discountValue} onChange={event=>onFieldChange('discountValue',event.target.value)}/></label>
      <label><span>{tr('Tax %')}</span><input type="number" min="0" max="30" step="0.01" inputMode="decimal" value={draft.taxPercent} onChange={event=>onFieldChange('taxPercent',event.target.value)}/></label>
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
     <label><span>{tr('Deposit (CAD)')}</span><input type="number" min="0" step="0.01" inputMode="decimal" value={draft.depositAmount} onChange={event=>onFieldChange('depositAmount',event.target.value)}/></label>
    </div>
    <label className="bqe-payment-note"><span>{tr('Payment instructions')}</span><textarea rows={3} value={draft.paymentInstructions||''} onChange={event=>onFieldChange('paymentInstructions',event.target.value)} placeholder={ar?'التفاصيل التي يحتاجها العميل للدفع':'Details the customer needs to make a payment'}/></label>
    {request.expiresAt&&<p className="bqe-expiry">{ar?'تنتهي صلاحية العرض الحالي':'Current quote expires'} <time dateTime={request.expiresAt}>{new Date(request.expiresAt).toLocaleString(bookingLocale(ar),{dateStyle:'medium',timeStyle:'short'})}</time></p>}
   </fieldset>
   <p className="bqe-review-note">{editable?tr('The customer reviews the quote before accepting.'):(ar?'عرض السعر هذا للقراءة فقط في مرحلته الحالية.':'This quote is read-only at its current stage.')}</p>
  </aside>
 </div>;
}
