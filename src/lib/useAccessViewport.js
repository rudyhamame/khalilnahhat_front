import {useLayoutEffect} from 'react';

export function useAccessViewport(enabled=true){
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const measure = () => {
      // Keep native pinch zoom available; only resize for the toolbar or keyboard.
      if (viewport && Math.abs(viewport.scale - 1) > .01) return;
      const zoom = parseFloat(getComputedStyle(root).zoom) || 1;
      root.style.setProperty('--echo-access-height', `${Math.min(innerHeight, viewport?.height || innerHeight) / zoom}px`);
    };
    root.classList.add('echo-access-open');
    measure();
    window.addEventListener('resize', measure);
    viewport?.addEventListener('resize', measure);
    return () => {
      root.classList.remove('echo-access-open');
      root.style.removeProperty('--echo-access-height');
      window.removeEventListener('resize', measure);
      viewport?.removeEventListener('resize', measure);
    };
  }, [enabled]);
}
