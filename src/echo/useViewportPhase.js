// Chapters no longer play an intro/outro animation (the TV power-on, the slide-in cards, the spotlight sweep): they are simply shown.
// Chapter changes are handled by the page fade (useViewportAlignment). The hook is kept so every chapter keeps its is-in class.
export function useViewportPhase() {
  return 'in';
}
