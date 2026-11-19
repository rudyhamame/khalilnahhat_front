import patterns from './contracts/rhythm-patterns.json' with {type:'json'};
export const RHYTHM_PATTERNS=patterns;
const normalize=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\b\d+\s*\/\s*\d+\b/g,'').replace(/[^\p{L}\p{N}]/gu,'');
export function rhythmPattern(name){const key=normalize(name);return RHYTHM_PATTERNS.find(row=>row.aliases.some(alias=>normalize(alias)===key))||null;}

export function rhythmBeatMap(name){const row=rhythmPattern(name);return row?{meter:row.meter,subdivision:row.subdivision,steps:[...row.steps],...(row.source?{source:row.source}:{})}:null;}
export function validBeatMap(map){return Boolean(map&&/^(?:[1-9]|1[0-6])\/(?:4|8)$/.test(map.meter)&&[1,2,4].includes(map.subdivision)&&Array.isArray(map.steps)&&map.steps.length===Number(map.meter.split('/')[0])*map.subdivision&&map.steps.length<=64&&map.steps.every(step=>['D','T','K','.'].includes(step))&&map.steps.some(step=>step!=='.'));}
