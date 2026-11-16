// One source sends only landscape or only portrait. Landscape + Portrait needs two sources (two cameras): one records each. A saved 'both' with one source falls back to landscape.
export const OUTPUT_FORMATS=[['landscape','Landscape'],['portrait','Portrait'],['both','Landscape + Portrait']];
export const normalizeFormat=value=>OUTPUT_FORMATS.some(([id])=>id===value)?value:'landscape';
export const effectiveFormat=(count,format)=>count===2?'both':normalizeFormat(format)==='portrait'?'portrait':'landscape';
// YouTube is the landscape output; Instagram and TikTok are the portrait outputs.
export const platformOrientation=platform=>platform==='youtube'?'landscape':'portrait';
export const formatAllows=(format,platform)=>format==='both'||format===platformOrientation(platform);
export const formatBlockedReason=(format,platform)=>formatAllows(format,platform)?'':`This live is set to ${format==='landscape'?'Landscape':'Portrait'} only, so ${platformOrientation(platform)} outputs are off.`;
