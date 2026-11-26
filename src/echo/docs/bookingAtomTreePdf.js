import {bookingAtomTree} from './bookingAtomTree.js';

const esc=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const atomRow=atom=>`<tr><td class="c">${esc(atom.code)}</td><td><b>${esc(atom.name)}${atom.required?' *':''}</b><br><code>${esc(atom.key)}</code>${atom.gate?`<br><i>Shown when ${esc(atom.gate)} = true</i>`:''}${atom.choices.length?`<br><small>${atom.choices.map(choice=>esc(choice.label||choice.value)).join(' · ')}</small>`:''}</td><td>${esc(atom.type)}</td></tr>`;
const table=atoms=>`<table><thead><tr><th>Code</th><th>Atom</th><th>Type</th></tr></thead><tbody>${atoms.map(atomRow).join('')}</tbody></table>`;

// Black and white only, on a clean page the browser prints or saves as PDF (same approach as the booking confirmation).
export function bookingAtomTreeHtml(){
 const body=bookingAtomTree.map(step=>`<h2>${esc(step.code)} ${esc(step.title)}</h2>${step.sections.map(section=>`<h3>${esc(section.code)} ${esc(section.title)}</h3>${table(section.atoms)}`).join('')}`).join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Data Atoms Booking Tree</title><style>
 @page{margin:14mm}*{color:#000!important;background:#fff!important;border-color:#000!important;box-shadow:none!important}
 body{font:11px/1.4 Arial,sans-serif;margin:0}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:20px 0 6px;border-bottom:2px solid #000;padding-bottom:3px;break-after:avoid}h3{font-size:12px;margin:12px 0 4px;break-after:avoid}
 table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{border:1px solid #000;padding:3px 6px;text-align:start;vertical-align:top}tr{break-inside:avoid}.c{white-space:nowrap;font-family:monospace}code{font-family:monospace;font-size:10px}small{font-size:10px}
 </style><h1>Data Atoms Booking Tree</h1><p>Echo Event Entertainment · generated ${esc(new Date().toISOString().slice(0,10))} · * required</p>${body}</html>`;
}
export function exportBookingAtomTreePdf(){
 const win=window.open('','_blank');
 if(!win)return false; // a blocked pop-up: the button tells the user
 win.document.open();win.document.write(bookingAtomTreeHtml());win.document.close();win.focus();
 setTimeout(()=>{try{win.print();}catch{/* The window can be printed by hand. */}},300);
 return true;
}
