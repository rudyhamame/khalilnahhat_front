// getBoundingClientRect and visualViewport use the same CSS-pixel coordinate space.
export function musicBoxScrollTarget({box,scrollY,viewportTop=0,viewportHeight,headerBottom=0}){
 const top=Math.max(viewportTop,Math.min(headerBottom,viewportTop+viewportHeight));
 const center=top+(viewportTop+viewportHeight-top)/2;
 return Math.max(0,scrollY+box.top+box.height/2-center);
}
