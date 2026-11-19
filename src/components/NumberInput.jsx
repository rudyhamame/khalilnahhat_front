import {useRef} from 'react';
import {Minus,Plus} from 'lucide-react';

// Number input with its own − / + buttons (the browser's native spinner is hidden in popups).
export default function NumberInput({className='',disabled,...props}){
 const input=useRef(null);
 const step=direction=>{const node=input.current;if(!node||disabled)return;if(direction>0)node.stepUp();else node.stepDown();node.dispatchEvent(new Event('input',{bubbles:true}));node.focus();};
 return <span className={`num-field ${className}`.trim()}><button type="button" tabIndex={-1} disabled={disabled} aria-label="Decrease" onClick={()=>step(-1)}><Minus size={15} strokeWidth={2.6}/></button><input ref={input} type="number" disabled={disabled} {...props}/><button type="button" tabIndex={-1} disabled={disabled} aria-label="Increase" onClick={()=>step(1)}><Plus size={15} strokeWidth={2.6}/></button></span>;
}
