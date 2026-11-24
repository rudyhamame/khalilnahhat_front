import {useEffect} from 'react';
import {decorate,fullTextOnHover} from '../lib/adminAltText';

// Keeps every control in the admin workspace described (tooltip + screen-reader label), including content that appears later.
export function useAdminAltText(ref,ar=false){
  useEffect(()=>{
    const root=ref.current;if(!root)return undefined;
    let frame=0;
    const run=()=>{frame=0;decorate(root,ar);};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(run);};
    run();
    const observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});
    const hover=event=>fullTextOnHover(event.target);root.addEventListener('mouseover',hover);
    return()=>{observer.disconnect();root.removeEventListener('mouseover',hover);if(frame)cancelAnimationFrame(frame);};
  },[ref,ar]);
}
