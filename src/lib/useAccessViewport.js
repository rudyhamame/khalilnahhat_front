import {useLayoutEffect} from 'react';

const isEditable = el => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function useAccessViewport(enabled=true){
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    // The on-screen keyboard must not resize the page (that squashes and distorts the scene): the layout keeps the height it had
    // before the keyboard, the keyboard overlays it, and only the form is lifted when it would otherwise be covered.
    let stable = 0;
    const measure = () => {
      // Keep native pinch zoom available; only resize for the toolbar, not for the keyboard.
      if (viewport && Math.abs(viewport.scale - 1) > .01) return;
      const zoom = parseFloat(getComputedStyle(root).zoom) || 1;
      const height = Math.min(innerHeight, viewport?.height || innerHeight);
      const keyboard = isEditable(document.activeElement) && stable > 0 && height < stable - 120;
      if (!keyboard) stable = height;
      root.style.setProperty('--echo-access-height', `${stable / zoom}px`);
      let lift = 0;
      if (keyboard && viewport) {
        const bottom = document.activeElement.getBoundingClientRect().bottom;
        lift = Math.max(0, bottom + 24 - (viewport.offsetTop + viewport.height)) / zoom;
      }
      root.style.setProperty('--echo-kb-lift', `${Math.round(lift)}px`);
    };
    const later = () => setTimeout(measure, 120);
    root.classList.add('echo-access-open');
    measure();
    window.addEventListener('resize', measure);
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    document.addEventListener('focusin', later);
    document.addEventListener('focusout', later);
    return () => {
      root.classList.remove('echo-access-open');
      root.style.removeProperty('--echo-access-height');
      root.style.removeProperty('--echo-kb-lift');
      window.removeEventListener('resize', measure);
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
      document.removeEventListener('focusin', later);
      document.removeEventListener('focusout', later);
    };
  }, [enabled]);
}
