// Public navigation uses document loads, with one destination per page.
export const PUBLIC_PAGE_PATHS=Object.freeze({home:'/',live:'/live',work:'/music',music:'/music',setup:'/rentals',room:'/room',simulation:'/room',availability:'/booking',assistant:'/echo-ai',booking:'/echo-ai',contact:'/contact',about:'/about',tree:'/tree'});
export function publicPageSection(pathname){return Object.entries(PUBLIC_PAGE_PATHS).find(([,path])=>path===pathname)?.[0]||null;}
// Preserve bookmarks made before the public sections became separate pages.
const LEGACY_PAGE_HASHES=Object.freeze({live:'live',availability:'availability',services:'setup','khalil-work-archive':'work','home-music-archive':'work',work:'work',setup:'setup','room-3d':'room','echo-ai':'assistant','event-order':'assistant','how-to-book':'assistant',contact:'contact','about-dj-khalil':'about','seasonal-tree-viewport':'tree'});
export function publicPageForHash(hash){return PUBLIC_PAGE_PATHS[LEGACY_PAGE_HASHES[hash.replace(/^#/,'')]]||null;}
