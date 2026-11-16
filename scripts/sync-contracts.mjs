// The backend owns the shared rulebooks. This copies them into the frontend (never the other way round).
//   npm run sync:contracts          copy
//   npm run sync:contracts -- --check   exit 1 if any copy differs (also run by the test suite when the backend is checked out)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const front=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const back=path.resolve(front,'..','khalil-back');
export const CONTRACTS=[
 ['src/eventOrderCore.mjs','src/lib/eventOrderCore.mjs'],
 ['src/eventOrderContract.json','src/lib/eventOrderContract.json'],
 ['contracts/booking-journey.json','src/lib/bookingJourneyContract.json'],
];
export const backendPresent=()=>fs.existsSync(path.join(back,'contracts'));
export function drift(){
 return CONTRACTS.filter(([from,to])=>fs.readFileSync(path.join(back,from),'utf8')!==fs.readFileSync(path.join(front,to),'utf8')).map(([from,to])=>`${from} -> ${to}`);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(!backendPresent()){console.error('Backend checkout not found at '+back);process.exit(1);}
 if(process.argv.includes('--check')){const d=drift();if(d.length){console.error('Out of sync (run npm run sync:contracts):\n'+d.join('\n'));process.exit(1);}console.log('Contracts in sync.');}
 else for(const [from,to] of CONTRACTS){fs.copyFileSync(path.join(back,from),path.join(front,to));console.log('copied',from,'->',to);}
}
