// Preview frame templates. Each frame is exactly w:h and the preview scales to fit (the label names the template in pixels).
export const PREVIEW_FORMATS=[
  {id:'youtube-landscape',label:'YouTube · Landscape',w:1920,h:1080},
  {id:'youtube-short',label:'YouTube Shorts · Portrait',w:1080,h:1920},
  {id:'instagram-reel-portrait',label:'Instagram Reel · Portrait',w:1080,h:1920},
  {id:'instagram-reel-landscape',label:'Instagram Reel · Landscape',w:1920,h:1080},
  {id:'instagram-post-portrait',label:'Instagram Post · Portrait',w:1080,h:1350},
  {id:'instagram-post-square',label:'Instagram Post · Square',w:1080,h:1080},
  {id:'tiktok',label:'TikTok · Portrait',w:1080,h:1920},
  {id:'facebook-live',label:'Facebook Live · Landscape',w:1280,h:720},
];
export const DEFAULT_PREVIEW_FORMAT='youtube-landscape';
// Choices saved by the old Landscape/Portrait select keep working.
const LEGACY={landscape:'youtube-landscape',portrait:'instagram-reel-portrait'};
export const previewFormat=id=>PREVIEW_FORMATS.find(item=>item.id===(LEGACY[id]||id))||PREVIEW_FORMATS[0];
export const previewTemplate=format=>`${format.w} × ${format.h}`;
