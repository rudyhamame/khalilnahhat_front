# Projector equipment model

Generic Blender-built projector model for the existing Projector equipment entry. It is illustrative: the catalog item has no supplied manufacturer reference, so brand, dimensions, brightness, resolution, power ratings, and the exact rear connection layout are not claimed.

## Rebuild

```sh
blender -b -t 4 --python design/models/projector/build_model.py -- design/models/projector/generated
```

The generated directory contains the editable `.blend`, viewer `.glb`, and studio preview. All three are stored in Cloudinary and registered in `src/data/cloudinaryAssets.json`.

- [3D GLB](https://res.cloudinary.com/dtoxkii3q/raw/upload/v1793072520/khalil/site-assets/30f47e450052/echo/models/projector.glb)
- [Editable Blender source](https://res.cloudinary.com/dtoxkii3q/raw/upload/v1793072520/khalil/site-assets/04b322f515e1/echo/models/projector.blend)
- [Studio preview](https://res.cloudinary.com/dtoxkii3q/image/upload/v1793072519/khalil/site-assets/4c100e3c93ba/echo/models/projector-preview.png)
