// Pieces of Echo's equipment replies that the app writes itself, so they stay exact: the Item | Qty table of a saved change and the stock check before saving.
const nameOf=(item,id,ar)=>(ar&&item?.nameAr)||item?.name||id;

// A markdown table of the saved equipment (the chat renders it as a real table). Empty when there is nothing to show.
export function equipmentTable(rows,catalog,ar=false){
 const list=Array.isArray(rows)?rows.filter(row=>row&&row.id&&row.quantity>0):[];
 if(!list.length)return '';
 const body=list.map(row=>`| ${String(nameOf(catalog.find(entry=>entry.id===row.id),row.id,ar)).replace(/\|/g,'/')} | ${row.quantity} |`).join('\n');
 return `\n\n| ${ar?'المعدات':'Item'} | ${ar?'الكمية':'Qty'} |\n| --- | --- |\n${body}`;
}

// One plain sentence per request the stock cannot meet: an item out of stock, or more asked than is in stock. Empty list = stock is fine.
export function equipmentStockProblems(rows,catalog,ar=false){
 const tr=(en,arabic)=>ar?arabic:en;
 return (rows||[]).map(row=>{
  const item=catalog.find(entry=>entry.id===row.id);if(!item)return null;
  const name=nameOf(item,row.id,ar),have=item.availableQuantity;
  if(item.availabilityStatus==='unavailable')return tr(`${name} is out of stock right now.`,`${name} غير متوفر حالياً.`);
  if(item.availabilityStatus==='available'&&Number.isSafeInteger(have)&&row.quantity>have)return tr(`We have ${have} ${name} in stock, so I can't add ${row.quantity}.`,`لدينا ${have} من ${name} في المخزون، لذلك لا أستطيع إضافة ${row.quantity}.`);
  return null;
 }).filter(Boolean);
}
