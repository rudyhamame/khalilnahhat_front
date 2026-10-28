# Shure microphones equipment model

Local Blender 4.5.9 LTS illustration of the user-supplied two-handheld/receiver photo. The receiver's BLX88 marking is reproduced as visible in the image; microphone capsule variant, RF band, electrical ratings and exact dimensions are not asserted. The unseen receiver rear remains plain. Native .blend retains individually editable geometry; the joined GLB reduces static draw calls.

## Rebuild

```sh
blender -b -t 4 --python design/models/shure-microphones/build_model.py -- /tmp/shure-model
npx --yes @gltf-transform/cli join /tmp/shure-model/shure-microphones-unjoined.glb /tmp/shure-model/shure-microphones.glb
```

Copy the supplied photo to `shure-microphones-reference.png` in the generated directory, then upload using the backend's `scripts/sync-site-assets.cjs FRONTEND_ROOT GENERATED_DIRECTORY` with credentials supplied through the environment. All four deliverables (GLB, .blend, preview and reference) belong in Cloudinary. Public URLs are registered in the shared manifests; no credentials are stored in those files.

The equipment key is `shure-mics`, matching the existing catalog and DJ/corporate setup recommendations. The shared viewer's loading line remains hidden.

## Cloudinary deliverables

- [Interactive GLB](https://res.cloudinary.com/nqiooluk/raw/upload/v1793065855/khalil/site-assets/66d15e771c43/echo/models/shure-microphones.glb)
- [Editable Blender file](https://res.cloudinary.com/nqiooluk/raw/upload/v1793065855/khalil/site-assets/846db6cc0804/echo/models/shure-microphones.blend)
- [Studio preview](https://res.cloudinary.com/nqiooluk/image/upload/v1793065853/khalil/site-assets/b6410e07eb95/echo/models/shure-microphones-preview.png)
- [Reference photo](https://res.cloudinary.com/nqiooluk/image/upload/v1793065854/khalil/site-assets/4a77adfe3e76/echo/models/shure-microphones-reference.png)

Verified all four remote downloads against SHA-256. GLB has nine material groups, fits the account's 10 MB limit and contains no studio cameras. Chrome confirmed the Shure equipment preview and thumbnail render from Cloudinary. Lint has no errors; production build passes with existing warnings. No frontend deployment performed.
