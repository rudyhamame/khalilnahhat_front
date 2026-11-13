// Site-wide switches and values you can change without touching components. Set them in .env (Vite) or the host's environment.
// The Tree chapter is hidden unless VITE_SEASONAL_TREE_ENABLED=true.
export const SEASONAL_TREE_ENABLED=String(import.meta.env?.VITE_SEASONAL_TREE_ENABLED||'').toLowerCase()==='true';
// When the next live is, e.g. 2026-11-14T20:00:00-05:00. Shown on the Live chapter while off air. Empty = nothing shown.
export const NEXT_LIVE_DATE=String(import.meta.env?.VITE_NEXT_LIVE_DATE||'').trim();
// "Khalil will reply within N hours" (used on the quote confirmation).
export const QUOTE_REPLY_HOURS=Number(import.meta.env?.VITE_QUOTE_REPLY_HOURS)||24;
