// Animates height changes of content-sized panels (form swaps, expanding sections).
// Add a selector below or put data-smooth on any block element to opt in.
const SELECTOR = '.access-form-wrap,.echo-ai-billing,.eai-card,.eab-operation,details,[data-smooth]';
const MS = 350;
const heights = new WeakMap();

function animate(el, from, to) {
  el.style.transition = 'none';
  el.style.overflow = 'hidden';
  el.style.height = from + 'px';
  el.offsetHeight; // commit start height
  el.style.transition = `height ${MS}ms cubic-bezier(.22,.7,.25,1)`;
  el.style.height = to + 'px';
  clearTimeout(el._smoothTimer);
  el._smoothTimer = setTimeout(() => { el.style.cssText = el.style.cssText.replace(/(height|overflow|transition)[^;]*;?/g, ''); heights.set(el, el.offsetHeight); }, MS + 30);
}

export function installSmoothResize() {
  if (typeof ResizeObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ro = new ResizeObserver(entries => {
    for (const { target: el } of entries) {
      if (el._smoothTimer && el.style.height) continue; // our own animation
      const to = el.getBoundingClientRect().height, from = heights.get(el);
      heights.set(el, to);
      if (from !== undefined && Math.abs(from - to) > 1) animate(el, from, to);
    }
  });
  const watch = root => { if (root.nodeType !== 1) return; if (root.matches(SELECTOR)) ro.observe(root); root.querySelectorAll(SELECTOR).forEach(n => ro.observe(n)); };
  watch(document.body);
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(watch))).observe(document.body, { childList: true, subtree: true });
}
