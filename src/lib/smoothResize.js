// Animates height changes of content-sized panels (form swaps, expanding sections).
// Collapsibles inside the Echo AI administrator are excluded: nested ones kept re-triggering this and made the chat jitter.
// Add a selector below or put data-smooth on any block element to opt in.
const SELECTOR = '.echo-order-access .access-form-wrap,.echo-ai-billing,.eai-card,.eab-operation,details:not(.echo-admin-agent details),[data-smooth]';
const MS = 350;
const heights = new WeakMap();
// Computed height is in the same CSS pixels and box model as style.height.
// Viewport rects include CSS zoom (90% in admin), which makes the observer animate its own result again.
const layoutHeight = el => parseFloat(getComputedStyle(el).height);

function animate(el, from, to) {
  const original = ['height', 'overflow', 'transition'].map(name => [name, el.style.getPropertyValue(name), el.style.getPropertyPriority(name)]);
  el.style.transition = 'none';
  el.style.overflow = 'hidden';
  el.style.height = from + 'px';
  void el.offsetHeight; // commit start height
  el.style.transition = `height ${MS}ms cubic-bezier(.22,.7,.25,1)`;
  el.style.height = to + 'px';
  clearTimeout(el._smoothTimer);
  el._smoothTimer = setTimeout(() => {
    for (const [name, value, priority] of original) {
      if (value) el.style.setProperty(name, value, priority);
      else el.style.removeProperty(name);
    }
    heights.set(el, layoutHeight(el));
    el._smoothTimer = null;
  }, MS + 30);
}

export function installSmoothResize() {
  if (typeof ResizeObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ro = new ResizeObserver(entries => {
    for (const { target: el } of entries) {
      if (el._smoothTimer && el.style.height) continue; // our own animation
      const to = layoutHeight(el), from = heights.get(el);
      if (!Number.isFinite(to)) continue;
      heights.set(el, to);
      if (from !== undefined && Math.abs(from - to) > 1) animate(el, from, to);
    }
  });
  const watch = root => { if (root.nodeType !== 1) return; if (root.matches(SELECTOR)) ro.observe(root); root.querySelectorAll(SELECTOR).forEach(n => ro.observe(n)); };
  watch(document.body);
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(watch))).observe(document.body, { childList: true, subtree: true });
}
