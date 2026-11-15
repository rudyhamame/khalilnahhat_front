import {useLayoutEffect} from 'react';

// Sizes a first-viewport section to exactly the screen that is left under the header, so the next section starts below the fold.
// html{zoom:.9} makes rects visual pixels. The shared page rules force direct children of #echo-main to height:100% !important, so this is important too.
export function useFillViewport(ref){
  useLayoutEffect(()=>{
    const fit=()=>{const node=ref.current;if(!node)return;const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1,top=node.getBoundingClientRect().top+window.scrollY;node.style.setProperty('height',`${Math.max(320,Math.ceil((window.innerHeight-top)/zoom))}px`,'important');node.style.setProperty('max-height','none','important');};
    fit();window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);
  },[ref]);
}
