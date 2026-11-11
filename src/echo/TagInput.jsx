import {useId,useMemo,useRef,useState} from 'react';
import {X} from 'lucide-react';

// A token input: type and press Enter (or a comma) to add, click x or Backspace to remove, paste a list to add several at once,
// and pick from suggestions with the arrow keys. Duplicates are ignored (case-insensitive).
export default function TagInput({label,values=[],onChange,suggestions=[],placeholder='',max=30,maxLength=80,ar=false,disabled=false}){
 const tr=(en,arabic)=>ar?arabic:en,id=useId(),input=useRef(null);
 const [text,setText]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const taken=useMemo(()=>new Set(values.map(value=>value.toLowerCase())),[values]);
 const matches=useMemo(()=>{const query=text.trim().toLowerCase();if(!query)return []; // suggestions appear only while typing, never just because the box has focus
  return suggestions.filter(item=>!taken.has(item.toLowerCase())&&item.toLowerCase().includes(query)).sort((a,b)=>a.toLowerCase().startsWith(query)===b.toLowerCase().startsWith(query)?0:a.toLowerCase().startsWith(query)?-1:1).slice(0,8);},[suggestions,taken,text]);
 const add=raw=>{
  const items=String(raw).split(/[\n,;]+/).map(item=>item.trim().slice(0,maxLength)).filter(Boolean);
  const next=[...values];for(const item of items)if(next.length<max&&!next.some(value=>value.toLowerCase()===item.toLowerCase()))next.push(item);
  if(next.length!==values.length)onChange(next);
  setText('');setActive(-1);
 };
 const remove=index=>{onChange(values.filter((_,at)=>at!==index));input.current?.focus();};
 const key=event=>{
  if(event.key==='Enter'||event.key===','){if(active>=0&&matches[active]){event.preventDefault();add(matches[active]);return;}if(text.trim()){event.preventDefault();add(text);}return;}
  if(event.key==='Backspace'&&!text&&values.length){remove(values.length-1);return;}
  if(event.key==='ArrowDown'&&matches.length){event.preventDefault();setOpen(true);setActive(current=>(current+1)%matches.length);}
  if(event.key==='ArrowUp'&&matches.length){event.preventDefault();setActive(current=>(current<=0?matches.length-1:current-1));}
  if(event.key==='Escape'){setOpen(false);setActive(-1);}
 };
 const full=values.length>=max;
 return <div className={`tag-input${disabled?' is-disabled':''}`}>
  <div className="tag-input-box">
   <input ref={input} role="combobox" aria-expanded={open&&matches.length>0} aria-controls={`${id}-list`} aria-autocomplete="list" aria-label={label} disabled={disabled||full} maxLength={maxLength} autoComplete="off" value={text} placeholder={full?tr('List is full','القائمة ممتلئة'):placeholder}
    onChange={event=>{const next=event.target.value;if(/[,\n;]/.test(next))add(next);else{setText(next);setOpen(true);setActive(-1);}}}
    onKeyDown={key} onBlur={()=>{setOpen(false);if(text.trim())add(text);}} onPaste={event=>{const pasted=event.clipboardData.getData('text');if(/[\n,;]/.test(pasted)){event.preventDefault();add(pasted);}}}/>
   {open&&matches.length>0&&<ul id={`${id}-list`} className="tag-input-menu" role="listbox">{matches.map((item,index)=><li key={item} role="option" aria-selected={index===active} className={index===active?'is-active':''} onMouseDown={event=>{event.preventDefault();add(item);}}>{item}</li>)}</ul>}
  </div>
  <small className="tag-input-hint">{tr('Press Enter or comma to add','اضغط Enter أو فاصلة للإضافة')} · {values.length}/{max}</small>
  {values.length>0&&<ul className="tag-input-pills" aria-label={label}>
   {values.map((value,index)=><li key={value} className="tag-input-chip"><span>{value}</span><button type="button" disabled={disabled} aria-label={`${tr('Remove','إزالة')} ${value}`} onClick={()=>remove(index)}><X size={12} aria-hidden="true"/></button></li>)}
  </ul>}
 </div>;
}
