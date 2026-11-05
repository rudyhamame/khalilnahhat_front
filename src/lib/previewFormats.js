// Live screen geometry is independent of streaming destinations and capture quality.
export const PREVIEW_FORMATS=[
  {id:'landscape',label:'16:9 (landscape)',w:1920,h:1080},
  {id:'portrait',label:'9:16 (portrait)',w:1080,h:1920},
];
export const DEFAULT_PREVIEW_FORMAT='landscape';
// Preserve orientation for previously saved platform-labelled choices.
const LEGACY={'youtube-landscape':'landscape','youtube-short':'portrait','instagram-reel-portrait':'portrait','instagram-reel-landscape':'landscape','instagram-post-portrait':'portrait','instagram-post-square':'landscape',tiktok:'portrait','facebook-live':'landscape'};
export const previewFormat=id=>PREVIEW_FORMATS.find(item=>item.id===(LEGACY[id]||id))||PREVIEW_FORMATS[0];
export const previewTemplate=format=>`${format.w} × ${format.h}`;
