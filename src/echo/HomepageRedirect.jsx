import {useEffect} from 'react';

export default function HomepageRedirect({href}){
  useEffect(()=>{
    window.history.replaceState({},'',href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById(href.split('#')[1])?.scrollIntoView({block:'start'})));
  },[href]);
  return null;
}
