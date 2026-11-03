import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {emailDetailLabel,readEmailEditor,templateSegments} from './emailTemplateEditor';

export default forwardRef(function EmailTextEditor({id,label,value,onChange,disabled=false,singleLine=false,onFocus},ref){
 const root=useRef(null),selection=useRef(null);
 const remember=()=>{const current=window.getSelection();if(current?.rangeCount&&root.current?.contains(current.anchorNode))selection.current=current.getRangeAt(0).cloneRange();};
 const chip=key=>{const node=document.createElement('span');node.dataset.emailDetail=key;node.className='notification-detail-chip';node.contentEditable='false';node.textContent=emailDetailLabel(key);return node;};
 const insertNode=node=>{
  const element=root.current;const range=selection.current&&element.contains(selection.current.startContainer)?selection.current:document.createRange();
  if(!selection.current||!element.contains(range.startContainer)){range.selectNodeContents(element);range.collapse(false);}
  element.focus();range.deleteContents();range.insertNode(node);range.setStartAfter(node);range.collapse(true);const current=window.getSelection();current.removeAllRanges();current.addRange(range);selection.current=range.cloneRange();onChange(readEmailEditor(element));
 };
 useImperativeHandle(ref,()=>({insert:key=>insertNode(chip(key))}));
 useEffect(()=>{
  const element=root.current;if(!element||readEmailEditor(element)===value)return;
  const fragment=document.createDocumentFragment();for(const part of templateSegments(value))fragment.append(part.variable?chip(part.variable):document.createTextNode(part.text));element.replaceChildren(fragment);selection.current=null;
 },[value]);
 return <div ref={root} id={id} className={`notification-text-editor${singleLine?' is-subject':''}`} role="textbox" aria-label={label} aria-multiline={!singleLine} aria-required="true" aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning spellCheck tabIndex={disabled?-1:0} onFocus={onFocus} onInput={()=>{remember();onChange(readEmailEditor(root.current));}} onKeyUp={remember} onMouseUp={remember} onKeyDown={event=>{if(singleLine&&event.key==='Enter')event.preventDefault();}} onPaste={event=>{event.preventDefault();remember();const text=event.clipboardData.getData('text/plain');insertNode(document.createTextNode(singleLine?text.replace(/[\r\n]+/g,' '):text));}}/>;
});
