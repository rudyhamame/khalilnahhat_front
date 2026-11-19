// Basic teaching skeletons, without a player's ornamentation.
// References: https://darbuka.org/study/technique/first-darbuka-rhythms/
// https://darbuka.org/study/rhythms/two-four-rhythms/
// https://darbuka.org/study/rhythms/masmoudi-and-chiftetelli/
const pattern=(name,meter,subdivision,strokes,aliases,source)=>({name,meter,subdivision,steps:[...strokes],aliases,source});
const four='https://darbuka.org/study/rhythms/maqsum-baladi-saidi/';
const first='https://darbuka.org/study/technique/first-darbuka-rhythms/',two='https://darbuka.org/study/rhythms/two-four-rhythms/',eight='https://darbuka.org/study/rhythms/masmoudi-and-chiftetelli/';
export const RHYTHM_PATTERNS=[
 pattern('Maqsum','4/4',2,'DT.TD.T.',['maqsum','maqsoum','maksum','maksoum','مقسوم'],first),
 pattern('Baladi','4/4',2,'DD.TD.T.',['baladi','balady','beledi','بلدي','masmoudi saghir','masmudi saghir'],four),
 pattern('Saidi','4/4',2,'DT.DD.T.',['saidi','saeidi','sa’idi',"sa'idi",'صعيدي'],four),
 pattern('Malfuf','2/4',4,'D..T..T.',['malfuf','malfouf','laff','لف','ملفوف'],two),
 pattern('Ayyub','2/4',4,'D..KD.T.',['ayyub','ayoub','ayub','أيوب','ايوب'],two),
 pattern('Karachi','2/4',4,'T..KT.D.',['karachi','كراتشي'],two),
 pattern('Fox','2/4',4,'D.T.D.T.',['fox','vox','فوكس'],two),
 pattern('Khaleegi','2/4',4,'D..D..T.',['khaleegi','khaleeji','khaliji','khaligi','saudi','خليجي','سعودي'],two),
 pattern('Fallahi','2/4',4,'DT.TD.T.',['fallahi','falahi','fellahi','فلاحي'],two),
 pattern('Wahda','4/4',2,'D...T...',['wahda','wahde','وحدة'],four),
 pattern('Wahda w Nuss','4/4',4,'D..T..T.D...T...',['wahda w nuss','wahda wa nuss','wahda we noss','وحدة ونص'],four),
 pattern('Sombati','4/4',4,'D..T..T.D...T...',['sombati','sunbati','sumbati','سنباطي'],four),
 pattern('Zaffa','4/4',4,'D.TKT.T.D.T.T...',['zaffa','zafa','زفة'],four),
 pattern('Nawari','4/4',2,'TD.TD.T.',['nawari','nawary','نواري'],four),
 pattern('Jerk','4/4',4,'D...T...DD..T...',['jerk','جيرك'],four),
 pattern('Masmoudi Kabir','8/4',1,'DD.TD.T.',['masmoudi kabir','masmudi kabir','masmoudi kebir','masmudi kebir','مصمودي كبير'],eight),
 pattern('Bambi','8/4',2,'D..T..T..T..D.D.',['bambi','بمبي'],eight),
 pattern('Ciftetelli','8/4',2,'D..T..T.D.D.T...',['ciftetelli','chiftetelli','çiftetelli','tsiftetelli','shiftetelli','chiftitelli','chifteteli','cifteteli','شفتتلي'],eight),
];
const normalize=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\b\d+\s*\/\s*\d+\b/g,'').replace(/[^\p{L}\p{N}]/gu,'');
export function rhythmPattern(name){const key=normalize(name);return RHYTHM_PATTERNS.find(row=>row.aliases.some(alias=>normalize(alias)===key))||null;}
