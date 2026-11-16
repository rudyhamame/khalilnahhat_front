import {useLayoutEffect,useRef} from 'react';
import {formatCanadianPhoneInput,formatCanadianPhoneEdit} from '../lib/canadianPhone';

export default function CanadianPhoneInput({value,onChange,...props}){
 const input=useRef(null),caret=useRef(null);
 useLayoutEffect(()=>{
  if(caret.current!==null&&document.activeElement===input.current){input.current.setSelectionRange(caret.current,caret.current);caret.current=null;}
 });
 return <input {...props} ref={input} type="tel" value={formatCanadianPhoneInput(value)} onChange={event=>{
  const edit=formatCanadianPhoneEdit(formatCanadianPhoneInput(value),event.target.value,event.target.selectionStart,event.nativeEvent.inputType);
  caret.current=edit.caret;onChange(edit.value);
 }}/>;
}
