# Uplight — local Blender model

Created locally in Blender 4.5.9 LTS from the user-supplied product photo. This is an illustrative model, not a Microsoft TRELLIS reconstruction or a dimensionally verified product. The unobserved rear is plain. No brand, wattage, battery, DMX or wireless capability is inferred.

The model reproduces nine violet optics, dark housing, cooling fins, protective corners and sloping raised bracket. The visible photo determines colour and proportions; it does not establish real light output.

## Cloudinary assets

- [Interactive GLB](https://res.cloudinary.com/nqiooluk/raw/upload/v1793064494/khalil/site-assets/5f7776b39e8e/echo/models/uplight.glb)
- [Editable Blender source](https://res.cloudinary.com/nqiooluk/raw/upload/v1793064495/khalil/site-assets/4d4c150bcde3/echo/models/uplight.blend)
- [Studio preview](https://res.cloudinary.com/nqiooluk/image/upload/v1793064496/khalil/site-assets/206a7c63f583/echo/models/uplight-preview.png)
- [User reference photo](https://res.cloudinary.com/nqiooluk/image/upload/v1793064227/khalil/site-assets/1d8b0fc48029/echo/models/uplight-reference.jpg)

## Rebuild

```sh
blender -b -t 4 --python design/models/uplight/build_model.py -- /tmp/uplight-build
npx --yes @gltf-transform/cli join /tmp/uplight-build/uplight-blender.glb /tmp/uplight-build/uplight.glb
```

Join combines the static material groups to reduce draw calls. The .blend retains individually editable parts. Cloudinary is the public asset store; local files are editable/build masters. Public media is registered in `design/cloudinary-assets-manifest.json` and `src/data/cloudinaryAssets.json`. New code should resolve logical media paths with `cloudAsset()`.

Upload through the backend's `scripts/sync-site-assets.cjs`, supplying Cloudinary credentials in the environment and the generated directory as its second argument. Never put credentials in frontend code or manifests. Client documents and private recordings retain their authenticated delivery; this public-media migration does not change those permissions.

The existing voice avatar uses Meshopt compression to fit Cloudinary's 10 MB raw-file limit; its loader includes Three.js's Meshopt decoder. Original rig and morph source remains local.

TRELLIS was attempted first but rejected generation under the hosted GPU quota. Blender completed generation locally without a paid service. No production frontend deployment was performed.
