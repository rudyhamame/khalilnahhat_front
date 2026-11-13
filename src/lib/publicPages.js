// Public navigation uses document loads, with one destination per page.
export const PUBLIC_PAGE_PATHS=Object.freeze({home:'/',live:'/live',work:'/music',music:'/music',setup:'/rentals',room:'/room',simulation:'/room',availability:'/booking',assistant:'/echo-ai',booking:'/echo-ai',contact:'/contact',about:'/about',tree:'/tree'});
export function publicPageSection(pathname){return Object.entries(PUBLIC_PAGE_PATHS).find(([,path])=>path===pathname)?.[0]||null;}
