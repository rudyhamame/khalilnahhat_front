# Elite 15-inch speaker

Local Blender illustration based on the owner's supplied speaker photo. Uses the owner-provided 15-inch identification; no exact model, driver dimensions, wattage, active/passive mode, rear connectors or weight is asserted. Cabinet proportions and unseen rear are illustrative. The model includes a tall tapered cabinet, full-height physically perforated grille, recessed circular drivers and horn, side handle and blue Elite badge. Native Blender source retains editable parts.

## Rebuild

```sh
blender -b -t 4 --python design/models/elite-15/build_model.py -- /tmp/elite-model
npx --yes @gltf-transform/cli join /tmp/elite-model/elite-15-unjoined.glb /tmp/elite-model/elite-15.glb
```

Copy the original photo to `elite-15-reference.jpg` in the generated directory. Upload through the backend `scripts/sync-site-assets.cjs FRONTEND_ROOT GENERATED_DIRECTORY`, with Cloudinary credentials in the environment. The GLB, native Blender file, studio preview and original photo belong in Cloudinary. Frontend key `elite-15` matches the catalog; it is included in the Sound Systems equipment selector. The existing loading-line suppression remains in effect.

The GLB, native Blender file, preview and reference photo are registered in the shared Cloudinary manifests. All four downloaded files passed checksum verification. The model was checked in the Sound Systems viewer. No frontend deployment performed.

## Cloudinary deliverables


### elite-15

- [3D GLB](https://res.cloudinary.com/nqiooluk/raw/upload/v1793066463/khalil/site-assets/b8a70681ddd4/echo/models/elite-15.glb)
- [Editable Blender source](https://res.cloudinary.com/nqiooluk/raw/upload/v1793066462/khalil/site-assets/8497f6651287/echo/models/elite-15.blend)
- [Studio preview](https://res.cloudinary.com/nqiooluk/image/upload/v1793066460/khalil/site-assets/029c3ce01a00/echo/models/elite-15-preview.png)
- [Reference photo](https://res.cloudinary.com/nqiooluk/image/upload/v1793066461/khalil/site-assets/159b01e912a5/echo/models/elite-15-reference.jpg)
