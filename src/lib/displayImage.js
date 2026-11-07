// Resize public Cloudinary images for the browser without changing stored URLs.
// Signed and authenticated assets must retain their original delivery signature.
export function displayImageUrl(src) {
  if (typeof src !== 'string' || /\.(svg|gif)(?:[?#]|$)/i.test(src)) return src;
  try { if (new URL(src).hostname !== 'res.cloudinary.com') return src; }
  catch { return src; }
  if (!/\/image\/upload\/(?:v\d+\/)?(?!s--)[^,]+/.test(src) || src.includes('/f_auto,q_auto,c_limit,w_1280/')) return src;
  // Existing transformations are already tailored to their consumer.
  const tail = src.split('/image/upload/')[1];
  if (!tail || tail.split('/')[0].includes(',') || tail.startsWith('s--')) return src;
  return src.replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_1280/');
}
