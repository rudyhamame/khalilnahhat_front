import {useId,useMemo,useState} from 'react';

// Search the known options, or add a new one when none matches.
export default function AddableSelect({value,onChange,options=[],ar=false,disabled=false,label,placeholder}){
 const tr=(en,arabic)=>ar?arabic:en,id=useId();
 const [text,setText]=useState(null),[active,setActive]=useState(0);
 const shown=text??value,query=shown.trim().toLowerCase();
 const matches=useMemo(()=>[...new Set(options)].filter(name=>name.toLowerCase().includes(query)).sort((a,b)=>a.toLowerCase().startsWith(query)===b.toLowerCase().startsWith(query)?0:a.toLowerCase().startsWith(query)?-1:1).slice(0,8),[options,query]);
 const exact=matches.some(name=>name.toLowerCase()===query);
 const items=[...matches.map(name=>({name})),...(query&&!exact?[{name:shown.trim(),added:true}]:[])];
 const pick=name=>{onChange(name);setText(null);setActive(0);};
 const key=event=>{
  if(event.key==='ArrowDown'&&items.length){event.preventDefault();setText(shown);setActive(current=>(current+1)%items.length);}
  else if(event.key==='ArrowUp'&&items.length){event.preventDefault();setActive(current=>(current<=0?items.length-1:current-1));}
  else if(event.key==='Enter'&&text!==null){event.preventDefault();if(items[active])pick(items[active].name);else pick('');}
  else if(event.key==='Escape')setText(null);
 };
 return <div className="tag-input-box djf-combo">
  <input role="combobox" aria-expanded={text!==null&&items.length>0} aria-controls={`${id}-list`} aria-autocomplete="list" aria-label={label} autoComplete="off" maxLength={200} disabled={disabled} value={shown} placeholder={placeholder}
   onFocus={()=>setText(value)} onChange={event=>{setText(event.target.value);setActive(0);}} onKeyDown={key}
   onBlur={()=>{if(text!==null)pick(text.trim());}}/>
  {text!==null&&items.length>0&&<ul id={`${id}-list`} className="tag-input-menu" role="listbox">{items.map((item,index)=><li key={item.name+item.added} role="option" aria-selected={index===active} className={index===active?'is-active':''} onMouseDown={event=>{event.preventDefault();pick(item.name);}}>{item.added?tr(`Add “${item.name}”`,`إضافة «${item.name}»`):item.name}</li>)}</ul>}
 </div>;
}
