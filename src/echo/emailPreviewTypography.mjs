// The API may still return older styling. Embedded fonts and the Music-page
// texture keep both sandboxed email previews consistent with the local design.
export function applyEmailPreviewTypography(html,{regular,bold,headerTexture}){
 const headerStyle=headerTexture?`.email-header{background-color:#0d1418!important;background-image:url('${headerTexture}')!important;background-repeat:repeat!important;background-size:180px 180px!important}.email-photo-cell,.email-photo{background:transparent!important}.email-photo-cell{width:192px!important;padding:16px!important;box-sizing:border-box}.email-photo{width:160px!important;max-width:100%!important;height:auto!important}.email-brand{overflow-wrap:anywhere}@media(max-width:480px){.email-photo-cell{width:128px!important;padding:12px!important}.email-photo{width:104px!important}}`:'';
 const style=`<style id="email-preview-typography">@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;font-display:swap;src:url('${regular}') format('woff2')}@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:700;font-display:swap;src:url('${bold}') format('woff2')}html,body,body *{font-family:'IBM Plex Mono','Courier New',monospace!important}${headerStyle}</style>`;
 const source=String(html||'').replace(/<style\b[^>]*id=["']email-preview-typography["'][^>]*>[\s\S]*?<\/style>/gi,'');
 return /<\/head\s*>/i.test(source)?source.replace(/<\/head\s*>/i,`${style}</head>`):style+source;
}
