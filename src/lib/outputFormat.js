// What a one-source live sends out: only landscape, only portrait, or both (the default). Two sources always send both.
export const OUTPUT_FORMATS=[['both','Landscape + Portrait'],['landscape','Landscape'],['portrait','Portrait']];
export const normalizeFormat=value=>OUTPUT_FORMATS.some(([id])=>id===value)?value:'both';
export const effectiveFormat=(count,format)=>count===2?'both':normalizeFormat(format);
// YouTube is the landscape output; Instagram and TikTok are the portrait outputs.
export const platformOrientation=platform=>platform==='youtube'?'landscape':'portrait';
export const formatAllows=(format,platform)=>format==='both'||format===platformOrientation(platform);
export const formatBlockedReason=(format,platform)=>formatAllows(format,platform)?'':`This live is set to ${format==='landscape'?'Landscape':'Portrait'} only, so ${platformOrientation(platform)} outputs are off.`;
