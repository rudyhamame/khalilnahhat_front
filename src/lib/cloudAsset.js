import assets from '../data/cloudinaryAssets.json';

// Public media is served by Cloudinary; the repository retains editable masters.
export function cloudAsset(path) {
  const url = assets[path];
  if (!url) throw new Error(`Cloudinary asset is not registered: ${path}`);
  return url;
}
