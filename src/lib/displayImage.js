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

// Small square thumbnail for picker grids (public Cloudinary images only; anything else is returned unchanged).
export function thumbImageUrl(src, size = 320) {
  if (typeof src !== 'string' || /\.(svg|gif)(?:[?#]|$)/i.test(src)) return src;
  try { if (new URL(src).hostname !== 'res.cloudinary.com') return src; } catch { return src; }
  const [head, tail] = src.split('/image/upload/');
  if (!tail || tail.startsWith('s--')) return src;
  const [first, ...rest] = tail.split('/');
  const transform = /^(?:[a-z]{1,2}_[\w:.-]+,?)+$/.test(first);
  return `${head}/image/upload/c_fill,w_${size},h_${size},f_auto,q_auto/${(transform ? rest : [first, ...rest]).join('/')}`;
}
