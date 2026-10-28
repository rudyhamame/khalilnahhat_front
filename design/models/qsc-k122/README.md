# QSC K12.2 speaker

Photo-guided illustration created in local Blender. Reproduces the supplied cabinet silhouette, curved perforated front grille, single woofer and upper horn, recessed side handles, protective bumpers and QSC badge. Model identity follows the owner's identification. Exact dimensions, ratings and unseen rear connections are unverified; the geometry is illustrative. No catalog price, stock or other model identity changes.

## Rebuild

```sh
blender -b -t 4 --python design/models/qsc-k122/build_model.py -- /tmp/qsc-model
npx --yes @gltf-transform/cli join /tmp/qsc-model/qsc-k122-unjoined.glb /tmp/qsc-model/qsc-k122.glb
```

Copy the original photo to `qsc-k122-reference.jpg` in the generated directory. Upload using the backend's `scripts/sync-site-assets.cjs FRONTEND_ROOT GENERATED_DIRECTORY`, with credentials supplied through the environment. Native Blender source, joined GLB, studio preview and reference belong in Cloudinary. Local files are editable build masters; public manifests contain only URLs and metadata. Equipment key `qsc-k122` matches the existing DJ and Sound Systems setup entries. The shared viewer's loading line stays hidden. No frontend deployment performed.

## Cloudinary files

- [3D GLB](https://res.cloudinary.com/nqiooluk/raw/upload/v1793067301/khalil/site-assets/b098af6b50a1/echo/models/qsc-k122.glb)
- [Blender source](https://res.cloudinary.com/nqiooluk/raw/upload/v1793067300/khalil/site-assets/6efff966c673/echo/models/qsc-k122.blend)
- [Preview](https://res.cloudinary.com/nqiooluk/image/upload/v1793067299/khalil/site-assets/0110b4f891bc/echo/models/qsc-k122-preview.png)
- [Reference](https://res.cloudinary.com/nqiooluk/image/upload/v1793067300/khalil/site-assets/7a968842e7d6/echo/models/qsc-k122-reference.jpg)

All four remote downloads matched SHA-256. GLB has nine material groups, is under 10 MB, and contains no studio cameras. Chrome confirmed loaded main preview and thumbnail. 52 tests pass; lint/build pass with existing warnings.
