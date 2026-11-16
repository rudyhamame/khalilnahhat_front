import catalog from './contracts/posting-formats.json' with {type:'json'};
export const POSTING_PLATFORMS=catalog.platforms;
export const POSTING_ASPECTS=catalog.aspects;
export const postingGoalId=(platform,type,aspect)=>`${platform}-${type}-${aspect.replace(':','x')}`;
export const POSTING_VIDEO_GOALS=Object.entries(POSTING_PLATFORMS).flatMap(([platform,{label,types}])=>types.filter(type=>type.kind==='video').flatMap(type=>type.ratios.map(aspect=>{
 const [w,h]=POSTING_ASPECTS[aspect];return [postingGoalId(platform,type.id,aspect),`${label} · ${type.label} · ${aspect}`,w/h,platform==='youtube'&&type.id==='short'?180:null,aspect];
})));
export const LEGACY_VIDEO_GOALS=[['instagram-reel-p','Instagram reel · 9:16',9/16,null,'9:16'],['instagram-reel-l','Instagram reel · 16:9',16/9,null,'16:9'],['youtube-short-p','YouTube short · 9:16',9/16,180,'9:16'],['youtube-short-l','YouTube video · 16:9 (legacy)',16/9,null,'16:9'],['youtube-video-l','YouTube video · 16:9',16/9,null,'16:9'],['tiktok-p','TikTok video · 9:16',9/16,null,'9:16'],['tiktok-l','TikTok video · 16:9',16/9,null,'16:9']];
export function customPostingGoal(w,h){
 if(![w,h].every(n=>Number.isInteger(n)&&n>=320&&n<=3840)||w/h<.25||w/h>4)return null;
 return [`custom-${w}x${h}`,`Custom · ${w} × ${h}`,w/h,null,`${w}:${h}`];
}
