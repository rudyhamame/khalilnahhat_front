const cents=value=>Math.round((Number(value)||0)*100);
export function quoteTotals(sr){
 const subtotalCents=Math.max(0,(sr.items||[]).reduce((sum,item)=>sum+cents(item.unitPrice)*Number(item.quantity||0),0));
 const discountType=sr.discountType==='percent'?'percent':'amount';
 const discountValue=Math.max(0,Number(sr.discountValue)||0);
 const discountCents=Math.min(subtotalCents,discountType==='percent'?Math.round(subtotalCents*Math.min(100,discountValue)/100):cents(discountValue));
 const taxableCents=subtotalCents-discountCents;
 const taxPercent=Math.max(0,Number(sr.taxPercent)||0);
 const taxCents=Math.round(taxableCents*taxPercent/100),totalCents=taxableCents+taxCents;
 // The deposit is a fixed amount, or a percentage of the total (after discount and tax); the server stores the resulting amount.
 const depositCents=Math.min(Math.max(0,sr.depositType==='percent'?Math.round(totalCents*Math.min(100,Math.max(0,Number(sr.depositPercent)||0))/100):cents(sr.depositAmount)),totalCents);
 return {subtotal:subtotalCents/100,discountType,discountValue,discount:discountCents/100,taxableSubtotal:taxableCents/100,taxPercent,tax:taxCents/100,total:totalCents/100,deposit:depositCents/100,balance:(totalCents-depositCents)/100};
}
