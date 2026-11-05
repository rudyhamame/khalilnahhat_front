# Equipment artwork

Studio renders of the live catalog's 3D equipment models, with a square crop,
soft lighting and a charcoal background. These are model renders, not photographs
of physical inventory. Existing model geometry, materials and set placements are
retained. The manifest records the model sources and previous artwork URLs. Images are 1000–1200 pixels square.

## Render

From the frontend root:

```sh
python3 design/equipment-artwork/render_queue.py
```

For one item, use `blender -b -t 2 --python design/equipment-artwork/render.py -- design/equipment-artwork/manifest.json EQUIPMENT_ID`. Existing PNGs are skipped. Model
downloads are local working files under `models/` and are not tracked.

## Gallery import and equipment assignment

With the existing local Vite server running, open:

<http://localhost:5176/design/equipment-artwork/import.html>

Sign in to the local site as admin first. The import page uses that session
directly; no credentials are embedded in these files. It is a local task page,
outside the production application's entry points.

Once all previews have loaded, use **Upload and apply 20 artworks**. The page:

1. Checks admin access and verifies the equipment's model and artwork still match
   the preparation snapshot.
2. Uploads through the existing Gallery endpoint and registers each image as a
   published `photo` in the `equipment` category.
3. Saves only `imageUrl` on the matching equipment entry.
4. Reads Gallery and equipment back to confirm the assignments.

Progress is resumable in the local browser. Existing Gallery records are reused
by image URL. Equipment whose source or artwork changed after preparation is
skipped instead of replacing the newer edit.

Two catalog entries have no 3D model or source photo: **Khalil's Lighting** and
**DJ Service**. They are listed as skipped and are not given invented artwork.
