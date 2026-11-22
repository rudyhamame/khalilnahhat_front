import {useId,useMemo,useState} from 'react';

// Search the known options and pick one; typing never creates a new entry (Work Elements lists are managed by the admin).
export default function AddableSelect({value,onChange,options=[],ar=false,disabled=false,label,placeholder,maxLength=200}){
 const tr=(en,arabic)=>ar?arabic:en,id=useId();
 const [text,setText]=useState(null),[active,setActive]=useState(-1);
 const shown=text??value,query=shown.trim().toLowerCase();
 const matches=useMemo(()=>[...new Set(options)].filter(name=>name.toLowerCase().includes(query)).sort((a,b)=>a.toLowerCase().startsWith(query)===b.toLowerCase().startsWith(query)?0:a.toLowerCase().startsWith(query)?-1:1).slice(0,8),[options,query]);
 const exact=matches.some(name=>name.toLowerCase()===query);
 const items=matches.map(name=>({name}));
 const pick=name=>{onChange(name);setText(null);setActive(-1);};
 const key=event=>{
  if(event.isComposing)return;
  if(event.key==='ArrowDown'&&items.length){event.preventDefault();setText(shown);setActive(current=>(current+1)%items.length);}
  else if(event.key==='ArrowUp'&&items.length){event.preventDefault();setActive(current=>(current<=0?items.length-1:current-1));}
  else if(event.key==='Enter'&&text!==null){event.preventDefault();const choice=items[active]||(exact?items.find(item=>item.name.toLowerCase()===query):items[0]);if(choice)pick(choice.name);}
  else if(event.key==='Escape')setText(null);
 };
 return <div className="tag-input-box djf-combo">
  <input role="combobox" aria-expanded={text!==null&&items.length>0} aria-controls={`${id}-list`} aria-autocomplete="list" aria-label={label} autoComplete="off" maxLength={maxLength} disabled={disabled} value={shown} placeholder={placeholder}
   onFocus={()=>setText(value)} onChange={event=>{const next=event.target.value,q=next.trim().toLowerCase();if(!q||options.some(name=>name.toLowerCase().includes(q))){setText(next);setActive(-1);}}}// characters that match no stored option are rejected onKeyDown={key}
   onBlur={()=>{if(text===null)return;const hit=options.find(name=>name.toLowerCase()===text.trim().toLowerCase());if(hit)pick(hit);else if(!text.trim())pick('');else{setText(null);setActive(-1);}}}/>
  {text!==null&&items.length>0&&<ul id={`${id}-list`} className="tag-input-menu" role="listbox">{items.map((item,index)=><li key={item.name} role="option" aria-selected={index===active} className={index===active?'is-active':''} onMouseDown={event=>{event.preventDefault();pick(item.name);}}>{item.name}</li>)}</ul>}
 </div>;
}
