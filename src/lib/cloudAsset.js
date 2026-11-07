import {displayImageUrl} from './displayImage';
import assets from '../data/cloudinaryAssets.json';

// Public media is served by Cloudinary; the repository retains editable masters.
export function cloudAsset(path) {
  const url = assets[path];
  if (!url) throw new Error(`Cloudinary asset is not registered: ${path}`);
  return /\/(headphone-motion-(?:clean-v2|cutout)|song-test-performance-v1)\//.test(path) ? displayImageUrl(url) : url;
}
