# Base plates / trussing

Single silver square-lattice vertical tower, centered on one black base plate.
There is no overhead truss span or second tower. Internal cross ties and diagonal
braces remain part of the vertical tower. Proportions are illustrative; dimensions
and structural capacity have not been verified.

- Editable master: `generated/trussing.blend`
- Joined runtime model: `public/echo/models/trussing.glb`
- Matching artwork: `design/equipment-artwork/images/trussing.png`
- Local profile image: `public/echo/models/trussing-preview.png`

Rebuild from the frontend root:

```sh
blender -b -t 2 --python design/models/trussing/build_model.py -- design/models/trussing/generated
```

The local artwork importer supports uploading this replacement GLB through the
existing authenticated 3D upload API and saving its model job and Gallery artwork
in the same equipment update. Open:

<http://localhost:5176/design/equipment-artwork/import.html?equipment=trussing>

Use **Apply truss model and artwork** while signed in as admin. The new assets
are prepared locally; publication requires that import to complete successfully.
