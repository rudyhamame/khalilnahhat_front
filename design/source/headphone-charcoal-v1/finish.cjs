// Offline finishing: retain each selected original's alpha and all non-garment pixels.
// Usage: node finish.cjs /path/to/sharp [frame-index]
const fs=require('fs'),path=require('path'),sharp=require(process.argv[2]);
const root=__dirname,output=path.resolve(root,'../../../public/echo/headphone-charcoal-v1');
(async()=>{const checks=[];const indexes=process.argv[3]===undefined?Array.from({length:8},(_,i)=>i):[Number(process.argv[3])];for(const i of indexes){const name=`pose-0${i}`,generation=JSON.parse(fs.readFileSync(`${root}/generation-0${i}.json`));const {data:source,info}=await sharp(generation.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});const edited=await sharp(generation.generated).resize(info.width,info.height,{fit:'fill'}).ensureAlpha().raw().toBuffer();const result=Buffer.from(source);let changed=0,faceChanges=0,alphaChanges=0,nonGarmentChanges=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const p=(y*info.width+x)*4;const [r,g,b,a]=source.subarray(p,p+4);const weight=y>=425&&y<1158&&a>0?Math.max(0,Math.min(1,(Math.min(g-r,b-r)-3)/12)):0;
if(weight){const next=[...edited.subarray(p,p+3)];const max=Math.max(...next),min=Math.min(...next);if(max-min>25||max>120){const shade=Math.pow((.2126*r+.7152*g+.0722*b)/142,.86);next.splice(0,3,...[43,45,48].map(c=>Math.min(255,c*shade)));}for(let c=0;c<3;c++)result[p+c]=Math.round(source[p+c]*(1-weight)+next[c]*weight);changed++;}
// Discard hidden RGB at alpha zero so raw previews cannot display phantom halos.
if(!a)result.fill(0,p,p+3);
if(y<425&&a>0)for(let c=0;c<3;c++)if(result[p+c]!==source[p+c])faceChanges++;
if(a>0&&!weight)for(let c=0;c<3;c++)if(result[p+c]!==source[p+c])nonGarmentChanges++;
if(result[p+3]!==a)alphaChanges++;}
await sharp(result,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(`${root}/${name}.png`);await sharp(result,{raw:{width:info.width,height:info.height,channels:4}}).webp({lossless:true,effort:6}).toFile(`${output}/${name}.webp`);checks.push({frame:i,source:generation.source,garmentPixels:changed,faceRgbDifferences:faceChanges,nonGarmentRgbDifferences:nonGarmentChanges,alphaDifferences:alphaChanges});console.log(name,checks.at(-1));}fs.writeFileSync(`${root}/verification${process.argv[3]===undefined?'':`-${process.argv[3]}`}.json`,JSON.stringify(checks,null,2)+'\n');})().catch(e=>{console.error(e);process.exit(1)});
