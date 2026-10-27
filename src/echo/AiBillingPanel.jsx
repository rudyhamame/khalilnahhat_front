import {useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import './aiBilling.css';
const adminBase='/ai-booking/admin/billing';
const money=(cents,currency)=>new Intl.NumberFormat('en-CA',{style:'currency',currency}).format((cents||0)/100);
const date=value=>new Date(value).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'});
const query=values=>new URLSearchParams(Object.entries(values).filter(([,value])=>value!==''&&value!=null)).toString();
function Pages({data,page,onChange}){
 const pages=Math.max(1,Math.ceil((data?.total||0)/(data?.pageSize||20)));
 return <nav className="eab-pages" aria-label="Billing pages"><span>{data?.total||0} records · Page {page} of {pages}</span><button type="button" disabled={page===1} onClick={()=>onChange(page-1)}>Previous</button><button type="button" disabled={page>=pages} onClick={()=>onChange(page+1)}>Next</button></nav>;
}
export function AiInvoice({invoice,onClose}){
 return <section className="eab-invoice" aria-labelledby="eab-invoice-title">
  <div className="eab-toolbar eab-no-print"><button type="button" onClick={onClose}>Close invoice</button><button type="button" onClick={()=>window.print()}>Print / Save PDF</button></div>
  <header><div><span className="eab-eyebrow">ECHO EVENT ENTERTAINMENT</span><h2 id="eab-invoice-title">AI usage invoice</h2><p className="eab-number">{invoice.number}</p></div><span className={`eab-status is-${invoice.status}`}>{invoice.status}</span></header>
  <div className="eab-invoice-meta"><div><small>BILL TO</small><strong>{invoice.client.name}</strong><span>{invoice.client.email}</span></div><div><span>Issued {date(invoice.issuedAt)}</span><span>Due {date(invoice.dueAt)}</span><span>Currency {invoice.currency}</span></div></div>
  <div className="eab-scroll"><table><thead><tr><th>Date</th><th>AI service / model</th><th>Qty</th><th>Amount ({invoice.currency})</th></tr></thead><tbody>{invoice.items.map(item=><tr key={item.usageId}><td>{date(item.date)}</td><td>{item.mode==='chat'?'Completed chat reply':'Voice session'}<small>{item.model}</small></td><td>1</td><td>{money(item.cents,invoice.currency)}</td></tr>)}</tbody></table></div>
  <dl className="eab-totals"><dt>Invoice total</dt><dd>{money(invoice.totalCents,invoice.currency)}</dd><dt>Payments received</dt><dd>{money(invoice.paidCents,invoice.currency)}</dd><dt>Balance due</dt><dd>{money(invoice.balanceCents,invoice.currency)}</dd></dl>
  {invoice.note&&<p className="eab-note">{invoice.note}</p>}
  {invoice.status==='void'&&<p>Voided: {invoice.voidReason}</p>}
  {!!invoice.payments.length&&<><h3>Payment receipts</h3><div className="eab-scroll"><table><thead><tr><th>Received</th><th>Method</th><th>Reference</th><th>Amount ({invoice.currency})</th></tr></thead><tbody>{invoice.payments.map(payment=><tr key={payment.id}><td>{date(payment.recordedAt)}</td><td>{payment.method.replaceAll('_',' ')}</td><td>{payment.reference}</td><td>{money(payment.cents,invoice.currency)}</td></tr>)}</tbody></table></div></>}
  <p className="eab-help">Charges reflect the AI prices accepted at the time of use. Contact Echo to arrange payment by e-transfer, cheque or bank transfer. This invoice does not charge your account automatically.</p>
 </section>;
}
export default function AiBillingPanel({token}){
 const admin=true,base=adminBase;
 const [accounts,setAccounts]=useState(null),[accountPage,setAccountPage]=useState(1),[search,setSearch]=useState(''),[searchInput,setSearchInput]=useState('');
 const [account,setAccount]=useState(null),[usage,setUsage]=useState(null),[usagePage,setUsagePage]=useState(1),[status,setStatus]=useState('');
 const [invoices,setInvoices]=useState(null),[invoicePage,setInvoicePage]=useState(1),[invoice,setInvoice]=useState(null);
 const [selected,setSelected]=useState({}),[operation,setOperation]=useState(null),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [dueDays,setDueDays]=useState(30),[note,setNote]=useState(''),[amount,setAmount]=useState(''),[reference,setReference]=useState(''),[method,setMethod]=useState('etransfer');
 const mutationId=useRef(''),operationRef=useRef(null),invoiceRef=useRef(null);
 useEffect(()=>{if(operation)operationRef.current?.scrollIntoView({behavior:'smooth',block:'start'});},[operation]);
 useEffect(()=>{if(invoice)invoiceRef.current?.scrollIntoView({behavior:'smooth',block:'start'});},[invoice]);
 useEffect(()=>{
  let alive=true;setAccounts(null);
  apiRequest(`${base}/accounts?${query({page:accountPage,...(admin?{search}:{})})}`,{token}).then(result=>{if(alive)setAccounts(result);}).catch(e=>{if(alive)setError(e.message);});
  return()=>{alive=false;};
 },[base,token,admin,accountPage,search,refresh]);
 useEffect(()=>{
  let alive=true;setInvoices(null);
  apiRequest(`${base}/invoices?${query({page:invoicePage,...(admin&&account?{owner:account.owner}:{})})}`,{token}).then(result=>{if(alive)setInvoices(result);}).catch(e=>{if(alive)setError(e.message);});
  return()=>{alive=false;};
 },[base,token,admin,account,invoicePage,refresh]);
 useEffect(()=>{
  if(!admin||!account)return;
  let alive=true;setUsage(null);
  apiRequest(`${base}/usage?${query({owner:account.owner,currency:account.currency,page:usagePage,status})}`,{token}).then(result=>{if(alive)setUsage(result);}).catch(e=>{if(alive)setError(e.message);});
  return()=>{alive=false;};
 },[base,token,admin,account,usagePage,status,refresh]);
 const reload=()=>{setError('');setRefresh(value=>value+1);};
 const selectAccount=item=>{setAccount(item);setSelected({});setOperation(null);setUsagePage(1);setInvoicePage(1);setStatus('');setError('');setNotice('');};
 const showInvoice=async id=>{setError('');try{const result=await apiRequest(`${base}/invoices/${id}`,{token});setInvoice(result.item);}catch(e){setError(e.message);}};
 const startOperation=value=>{setOperation(value);setError('');setNotice('');setReference('');setNote('');setDueDays(30);setAmount(value.invoice?(value.invoice.balanceCents/100).toFixed(2):'');mutationId.current=value.action==='create'?crypto.randomUUID().replaceAll('-',''):crypto.randomUUID();};
 const submit=async event=>{
  event.preventDefault();setBusy(true);setError('');
  try{
   if(operation.action==='create'){
    const result=await apiRequest(`${adminBase}/invoices`,{method:'POST',token,body:{id:mutationId.current,owner:account.owner,currency:account.currency,usageIds:Object.keys(selected),dueDays:Number(dueDays),note}});
    setInvoice(result.item);setSelected({});setNotice('Invoice created. This billing record is visible only to administrators.');
   }else if(operation.action==='legacy-paid'||operation.action==='usage-void'){
    await apiRequest(`/ai-booking/admin/usage/${operation.usage.id}`,{method:'PATCH',token,body:{status:operation.action==='legacy-paid'?'paid':'void',reference,...(operation.action==='legacy-paid'?{paymentMethod:method}:{})}});
    setNotice('Usage billing updated.');
   }else{
    const body=operation.action==='payment'?{action:'payment',id:mutationId.current,cents:Math.round(Number(amount)*100),method,reference}:{action:'void',reason:reference};
    const result=await apiRequest(`${adminBase}/invoices/${operation.invoice.id}`,{method:'PATCH',token,body});
    if(invoice?.id===result.item.id)setInvoice(result.item);
    setNotice(operation.action==='payment'?'Received payment recorded.':'Invoice voided.');
   }
   setOperation(null);reload();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const selectedTotal=Object.values(selected).reduce((sum,item)=>sum+item.customerCents,0);
 return <section className="echo-ai-billing eai-card" aria-labelledby="eab-title">
  <header className="eab-heading"><div><span className="eab-eyebrow">{admin?'CLIENT ACCOUNTS':'YOUR ACCOUNT'}</span><h2 id="eab-title">{admin?'Usage & billing':'Your AI bills'}</h2><p>All-time account totals, itemized invoices and recorded payments. CAD and USD stay separate.</p></div><button type="button" onClick={reload}>Refresh</button></header>
  {error&&<p className="eab-alert" role="alert">{error}</p>}{notice&&<p className="eab-success" role="status">{notice}</p>}
  {admin&&<form className="eab-toolbar" onSubmit={event=>{event.preventDefault();setSearch(searchInput);setAccountPage(1);selectAccount(null);}}><label>Find a client<input type="search" maxLength="120" placeholder="Name, email or account ID" value={searchInput} onChange={e=>setSearchInput(e.target.value)}/></label><button type="submit">Search</button></form>}
  {account&&<div className="eab-toolbar"><button type="button" onClick={()=>selectAccount(null)}>All clients</button><div><strong>{account.client.name} · {account.currency}</strong><small>{account.client.email}</small></div></div>}
  {!accounts?<p role="status">Loading account totals…</p>:<><div className="eab-accounts">{accounts.items.map(item=><article className={`eab-account ${account?.owner===item.owner&&account?.currency===item.currency?'is-selected':''}`} key={`${item.owner}:${item.currency}`}><header><h3>{item.client.name}</h3><span>{item.currency}</span></header><p>{item.client.email||'Email unavailable'}</p><dl><dt>Unbilled</dt><dd>{money(item.unbilledCents,item.currency)}</dd><dt>Invoiced balance</dt><dd>{money(item.invoicedCents,item.currency)}</dd><dt>Paid</dt><dd>{money(item.paidCents,item.currency)}</dd><dt>Total outstanding</dt><dd><strong>{money(item.outstandingCents,item.currency)}</strong></dd><dt>Voided</dt><dd>{money(item.voidCents,item.currency)}</dd></dl><small>{item.requests} AI requests{admin?` · Provider estimate USD $${item.providerUsdEstimate.toFixed(6)}${item.unmeasuredRequests?` · ${item.unmeasuredRequests} not measured`:''}`:''}</small>{admin&&<button type="button" onClick={()=>selectAccount(item)}>View usage & invoices</button>}</article>)}</div>{!accounts.items.length&&<p className="eab-empty">No AI usage yet{search?' for this search':''}.</p>}<Pages data={accounts} page={accountPage} onChange={setAccountPage}/></>}
  {admin&&account&&<section className="eab-usage"><header className="eab-heading"><div><h3>Itemized usage</h3><p>Select unbilled charges to create an invoice.</p></div><label>Status<select value={status} onChange={e=>{setStatus(e.target.value);setUsagePage(1);}}><option value="">All usage</option>{['unbilled','invoiced','paid','included','void'].map(value=><option key={value}>{value}</option>)}</select></label></header>
   {!!Object.keys(selected).length&&<div className="eab-toolbar"><strong>{Object.keys(selected).length} selected · {money(selectedTotal,account.currency)}</strong><button type="button" onClick={()=>startOperation({action:'create'})}>Create invoice</button><button type="button" onClick={()=>setSelected({})}>Clear selection</button></div>}
   {!usage?<p role="status">Loading usage…</p>:<><div className="eab-scroll"><table><thead><tr><th>Select</th><th>Date / model</th><th>Service</th><th>Provider estimate (USD)</th><th>Customer ({account.currency})</th><th>Status</th><th>Action</th></tr></thead><tbody>{usage.items.map(item=><tr key={item.id}><td>{item.state==='completed'&&item.billingStatus==='unbilled'&&!item.invoiceId&&item.customerCents>0&&<input aria-label={`Select ${item.mode} charge from ${date(item.createdAt)} ${item.id.slice(-6)}`} type="checkbox" checked={Boolean(selected[item.id])} onChange={e=>setSelected(current=>{const next={...current};if(e.target.checked&&Object.keys(next).length<500)next[item.id]=item;else delete next[item.id];return next;})}/>}</td><td>{date(item.createdAt)}<small>{item.model}</small></td><td>{item.mode}</td><td>{item.providerUsdEstimate==null?'Not measured':`$${item.providerUsdEstimate.toFixed(6)}`}</td><td>{money(item.customerCents,item.currency)}</td><td><span className="eab-status">{item.state==='completed'?item.billingStatus:item.state}</span>{item.reference&&<small>{item.reference}</small>}</td><td>{item.invoiceId?<button type="button" onClick={()=>showInvoice(item.invoiceId)}>View invoice</button>:item.state==='completed'&&['unbilled','invoiced'].includes(item.billingStatus)?<div className="eab-toolbar">{item.billingStatus==='invoiced'&&<button type="button" onClick={()=>startOperation({action:'legacy-paid',usage:item})}>Record legacy payment</button>}<button type="button" onClick={()=>startOperation({action:'usage-void',usage:item})}>Void usage</button></div>:null}</td></tr>)}</tbody></table></div>{!usage.items.length&&<p className="eab-empty">No matching usage.</p>}<Pages data={usage} page={usagePage} onChange={setUsagePage}/></>}
  </section>}
  <section className="eab-invoices"><h3>{account?`${account.client.name} — invoices`:'Invoices'}</h3>{!invoices?<p role="status">Loading invoices…</p>:<><div className="eab-scroll"><table><thead><tr><th>Invoice / client</th><th>Due</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>{invoices.items.map(item=><tr key={item.id}><td><button className="eab-link" type="button" onClick={()=>showInvoice(item.id)}>{item.number}</button><small>{item.client.name} · {item.client.email}</small></td><td>{date(item.dueAt)}</td><td>{money(item.totalCents,item.currency)}</td><td>{money(item.paidCents,item.currency)}</td><td>{money(item.balanceCents,item.currency)}</td><td><span className={`eab-status is-${item.status}`}>{item.status}</span></td><td><div className="eab-toolbar"><button type="button" onClick={()=>showInvoice(item.id)}>View / PDF</button>{admin&&item.balanceCents>0&&<button type="button" onClick={()=>startOperation({action:'payment',invoice:item})}>Record payment</button>}{admin&&item.status==='unpaid'&&<button type="button" onClick={()=>startOperation({action:'void',invoice:item})}>Void</button>}</div></td></tr>)}</tbody></table></div>{!invoices.items.length&&<p className="eab-empty">No invoices have been issued.</p>}<Pages data={invoices} page={invoicePage} onChange={setInvoicePage}/></>}</section>
  {admin&&operation&&<form ref={operationRef} className="eab-operation" onSubmit={submit}><h3>{operation.action==='create'?'Create itemized invoice':operation.action==='payment'||operation.action==='legacy-paid'?'Record a received payment':'Void uncollected charges'}</h3>{operation.action==='create'?<><p>{Object.keys(selected).length} charges · {money(selectedTotal,account.currency)}</p><label>Due in days<input required type="number" min="0" max="90" value={dueDays} onChange={e=>setDueDays(e.target.value)}/></label><label>Invoice note / payment instructions<textarea maxLength="2000" value={note} onChange={e=>setNote(e.target.value)}/></label></>:<>{operation.action==='payment'&&<label>Received amount ({operation.invoice.currency})<input required type="number" min="0.01" max={operation.invoice.balanceCents/100} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>}{['payment','legacy-paid'].includes(operation.action)&&<label>Received by<select value={method} onChange={e=>setMethod(e.target.value)}><option value="etransfer">E-transfer</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label>}<label>{['void','usage-void'].includes(operation.action)?'Reason':'Payment reference'}<input required maxLength="200" value={reference} onChange={e=>setReference(e.target.value)}/></label></>}<div className="eab-toolbar"><button type="submit" disabled={busy}>{busy?'Saving…':operation.action==='create'?'Issue invoice':'Save record'}</button><button type="button" disabled={busy} onClick={()=>setOperation(null)}>Cancel</button></div></form>}
  {invoice&&<div ref={invoiceRef}><AiInvoice invoice={invoice} onClose={()=>setInvoice(null)}/></div>}
  <p className="eab-help">Included and failed requests do not create customer charges. Invoices keep the original accepted prices. Payment records confirm money received outside Echo; no automatic collection or email is sent.</p>
 </section>;
}
