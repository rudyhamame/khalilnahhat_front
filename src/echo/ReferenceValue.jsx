import './musicPreferenceValue.css';

const safeLink=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
const hostOf=href=>{try{return new URL(href).hostname.replace(/^www\./,'');}catch{return href;}};
// Uploaded files (photos, event documents) and photo links are shown as hyperlinks that open in a new tab.
export default function ReferenceValue({value,path='',ar=false}){
 const tr=(en,arabic)=>ar?arabic:en,items=Array.isArray(value)?value:[];
 if(!items.length)return <span className="music-value-empty">{tr('Not set yet','لم يُحدّد بعد')}</span>;
 return <span className="music-value-list reference-links" role="list">{items.map((item,index)=>{
  const entry=typeof item==='string'?{url:item,name:''}:item,href=safeLink(entry.url);
  const label=entry.name||hostOf(href||String(entry.url||''))||tr('File','ملف');
  return <span role="listitem" key={`${entry.url}:${index}`} dir="auto">{path==='references.photos'&&<b className="reference-number" aria-label={tr(`Photo ${index+1}`,`الصورة ${index+1}`)}>{index+1}.</b>}{href?<a href={href} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>{label}<span className="music-link-arrow" aria-hidden="true"> ↗</span></a>:label}{entry.comment&&<small className="reference-comment"> — {entry.comment}</small>}</span>;
 })}</span>;
}
