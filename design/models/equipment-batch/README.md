# Spark machine, JBL system and dry ice machine

Photo-guided illustrative Blender models matching the supplied equipment references. Exact manufacturer models, dimensions, power, output ratings, connector layouts and inventory quantities are not established by these models. The JBL image supplies an arrangement reference, not proof that each cabinet is the catalog's named SRX/STX model. No catalog inventory or technical specs were changed. The wedding scene, people, emitted sparks and fog are excluded from the equipment meshes.

- `sparklers`: black cold spark cabinet, top opening/fill cap, white stripe, folding side handle and side fan guard.
- `jbl-system`: eight speaker cabinets with two elevated tops, two low cabinets, two tall cabinets and two angled floor monitors.
- `dry-ice`: black insulated vessel with lid handles, top lock, raised controls, outlet, lever, cables, detached corrugated hose and wide nozzle.

## Rebuild

```sh
blender -b -t 4 --python design/models/equipment-batch/build_models.py -- /tmp/equipment-models
```

Join each `KEY-unjoined.glb` into `KEY.glb` using `npx --yes @gltf-transform/cli join INPUT OUTPUT`. Copy the references into the output directory as `sparklers-reference.png`, `jbl-system-reference.jpg`, and `dry-ice-reference.jpg`. Upload with the backend's `scripts/sync-site-assets.cjs FRONTEND_ROOT OUTPUT_DIRECTORY`; credentials belong in the environment. The native .blend, joined GLB, preview and reference are stored in Cloudinary for every model. See the frontend Cloudinary manifests for URLs and hashes. Local native files are build/edit masters. The shared viewer continues hiding its loading line.

## Cloudinary deliverables


### sparklers

- [3D GLB](https://res.cloudinary.com/nqiooluk/raw/upload/v1793066807/khalil/site-assets/a730df59271d/echo/models/sparklers.glb)
- [Editable Blender source](https://res.cloudinary.com/nqiooluk/raw/upload/v1793066807/khalil/site-assets/2764c5ce4208/echo/models/sparklers.blend)
- [Studio preview](https://res.cloudinary.com/nqiooluk/image/upload/v1793066805/khalil/site-assets/17878c4d84e3/echo/models/sparklers-preview.png)
- [Reference photo](https://res.cloudinary.com/nqiooluk/image/upload/v1793066806/khalil/site-assets/26209a180bf5/echo/models/sparklers-reference.webp)

### jbl-system

- [3D GLB](https://res.cloudinary.com/nqiooluk/raw/upload/v1793066804/khalil/site-assets/21a4e8a9bac6/echo/models/jbl-system.glb)
- [Editable Blender source](https://res.cloudinary.com/nqiooluk/raw/upload/v1793066804/khalil/site-assets/90e1defe466b/echo/models/jbl-system.blend)
- [Studio preview](https://res.cloudinary.com/nqiooluk/image/upload/v1793066802/khalil/site-assets/f955db6c8758/echo/models/jbl-system-preview.png)
- [Reference photo](https://res.cloudinary.com/nqiooluk/image/upload/v1793066803/khalil/site-assets/f3fb63ffc68c/echo/models/jbl-system-reference.jpg)

### dry-ice

- [3D GLB](https://res.cloudinary.com/nqiooluk/raw/upload/v1793066802/khalil/site-assets/e2dcccf4d004/echo/models/dry-ice.glb)
- [Editable Blender source](https://res.cloudinary.com/nqiooluk/raw/upload/v1793066801/khalil/site-assets/60535f5c3d2b/echo/models/dry-ice.blend)
- [Studio preview](https://res.cloudinary.com/nqiooluk/image/upload/v1793066800/khalil/site-assets/8a2f03f14f9b/echo/models/dry-ice-preview.png)
- [Reference photo](https://res.cloudinary.com/nqiooluk/image/upload/v1793066800/khalil/site-assets/f67533322067/echo/models/dry-ice-reference.jpg)
