import './musicPreferenceValue.css';

const safeLink=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
const hostOf=href=>{try{return new URL(href).hostname.replace(/^www\./,'');}catch{return href;}};
// Uploaded files (photos, event documents) and photo links are shown as hyperlinks that open in a new tab.
export default function ReferenceValue({value,path='',ar=false,table=false}){
 const tr=(en,arabic)=>ar?arabic:en,items=Array.isArray(value)?value:[];
 if(!items.length)return <span className="music-value-empty">{tr('Not set yet','لم يُحدّد بعد')}</span>;
 if(table){
  const rows=items.map(item=>{const entry=typeof item==='string'?{url:item,name:''}:item,href=safeLink(entry.url);return {href,label:entry.name||hostOf(href||String(entry.url||''))||tr('File','ملف'),comment:entry.comment||''};}),comments=rows.some(row=>row.comment);
  return <table className="mini-table"><thead><tr><th className="mini-num">#</th><th>{path==='references.images'?tr('Link','الرابط'):path==='references.files'?tr('Document','المستند'):tr('Photo','الصورة')}</th>{comments&&<th>{tr('Comment','التعليق')}</th>}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}><td className="mini-num">{index+1}</td><td dir="auto">{row.href?<a href={row.href} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>{row.label}<span className="music-link-arrow" aria-hidden="true"> ↗</span></a>:row.label}</td>{comments&&<td dir="auto">{row.comment||'—'}</td>}</tr>)}</tbody></table>;
 }
 return <span className="music-value-list reference-links" role="list">{items.map((item,index)=>{
  const entry=typeof item==='string'?{url:item,name:''}:item,href=safeLink(entry.url);
  const label=entry.name||hostOf(href||String(entry.url||''))||tr('File','ملف');
  const numbered=['references.photos','references.files'].includes(path),kind=path==='references.files'?tr('Document','المستند'):tr('Photo','الصورة');
  return <span role="listitem" key={`${entry.url}:${index}`} dir="auto">{numbered&&<b className="reference-number" aria-label={`${kind} ${index+1}`}>{index+1}.</b>}{href?<a href={href} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>{label}<span className="music-link-arrow" aria-hidden="true"> ↗</span></a>:label}{entry.comment&&<small className="reference-comment"> — {entry.comment}</small>}</span>;
 })}</span>;
}
