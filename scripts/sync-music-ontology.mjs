import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=new URL('../../khalil-back/contracts/music-ontology.json',import.meta.url);
const bytes=await readFile(source);
const hash=createHash('sha256').update(bytes).digest('hex')+'\n';
await writeFile(new URL('../src/lib/contracts/music-ontology.json',import.meta.url),bytes);
await writeFile(new URL('../src/lib/contracts/music-ontology.sha256',import.meta.url),hash);
await writeFile(new URL('../../khalil-back/contracts/music-ontology.sha256',import.meta.url),hash);
console.log('Synchronized canonical music ontology vocabulary and checksums.');
