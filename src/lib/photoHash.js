const SHA256=/^[a-f0-9]{64}$/i;

export function attachmentPhotoHash(item){
 const saved=String(item?.sha256||'').toLowerCase();
 if(SHA256.test(saved))return saved;
 // Older uploads are content-addressed. Recover the digest from their Cloudinary URL
 // so adding the same bytes again is still rejected after this feature ships.
 try{return decodeURIComponent(new URL(item?.url||'').pathname).match(/(?:^|\/)([a-f0-9]{64})(?:\.[a-z0-9]+)?$/i)?.[1]?.toLowerCase()||'';}catch{return '';}
}

export function duplicatePhotoHash(items,sha256){
 const wanted=String(sha256||'').toLowerCase();
 return SHA256.test(wanted)&&(items||[]).some(item=>attachmentPhotoHash(item)===wanted);
}

export async function hashPhoto(file,cryptoApi=globalThis.crypto){
 if(!file?.arrayBuffer||!cryptoApi?.subtle?.digest)throw new Error('This browser cannot verify the photo. Try a current browser.');
 const digest=await cryptoApi.subtle.digest('SHA-256',await file.arrayBuffer());
 return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
